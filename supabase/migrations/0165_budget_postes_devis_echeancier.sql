-- 0165_budget_postes_devis_echeancier.sql
-- Refonte du budget : postes / sous-postes, devis groupés et échéanciers.
--   · budget_items          : postes (parent_id null) et sous-postes (un niveau) ; + acompte requis.
--   · budget_devis          : devis fournisseur (montant total, statut en cours / retenu / refusé).
--   · budget_devis_lines    : lignes couvertes par un devis, avec la part de chacune.
--   · budget_payments       : versements (acompte, solde, paiement) d'un devis retenu OU d'une ligne.
-- Reprise : sous-lignes → séquence du parent ; anciens devis (budget_quotes) → devis à une ligne
-- (sélectionné → retenu) ; montant réel déjà saisi → versement payé (sur le devis retenu sinon la ligne).
-- Pour chaque déploiement ayant un budget. Réexécutable sans risque. Tables avec RLS + « anon_all ».

do $$
declare p text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    if to_regclass('public.' || p || 'budget_items') is null then continue; end if;

    execute format('alter table public.%I add column if not exists deposit_required boolean not null default false', p || 'budget_items');

    execute format($sql$
      create table if not exists public.%1$I (
        id              uuid primary key default gen_random_uuid(),
        vendor          text,
        title           text,
        quote_date      date,
        valid_until     date,
        url             text,
        notes           text,
        total_amount    numeric,
        status          text not null default 'en_cours' check (status in ('en_cours', 'retenu', 'refuse')),
        legacy_quote_id uuid unique,
        created_at      timestamptz not null default now()
      )$sql$, p || 'budget_devis');

    execute format($sql$
      create table if not exists public.%1$I (
        devis_id uuid not null references public.%2$I(id) on delete cascade,
        item_id  uuid not null references public.%3$I(id) on delete cascade,
        amount   numeric,
        primary key (devis_id, item_id)
      )$sql$, p || 'budget_devis_lines', p || 'budget_devis', p || 'budget_items');

    execute format($sql$
      create table if not exists public.%1$I (
        id         uuid primary key default gen_random_uuid(),
        item_id    uuid references public.%2$I(id) on delete cascade,
        devis_id   uuid references public.%3$I(id) on delete cascade,
        kind       text not null default 'paiement' check (kind in ('acompte', 'solde', 'paiement')),
        label      text,
        amount     numeric,
        due_date   date,
        paid       boolean not null default false,
        paid_date  date,
        account    text,
        sort_order int not null default 0,
        created_at timestamptz not null default now(),
        check ((item_id is null) <> (devis_id is null))
      )$sql$, p || 'budget_payments', p || 'budget_items', p || 'budget_devis');

    -- RLS + accès anonyme, comme le reste de l'appli d'organisation.
    execute format('alter table public.%I enable row level security', p || 'budget_devis');
    execute format('alter table public.%I enable row level security', p || 'budget_devis_lines');
    execute format('alter table public.%I enable row level security', p || 'budget_payments');
    execute format('drop policy if exists "anon_all" on public.%I', p || 'budget_devis');
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', p || 'budget_devis');
    execute format('drop policy if exists "anon_all" on public.%I', p || 'budget_devis_lines');
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', p || 'budget_devis_lines');
    execute format('drop policy if exists "anon_all" on public.%I', p || 'budget_payments');
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', p || 'budget_payments');

    -- 1. Sous-postes : séquence de leur poste s'ils n'en ont pas.
    execute format($sql$
      update public.%1$I c set sequence_id = p.sequence_id
      from public.%1$I p
      where c.parent_id = p.id and c.sequence_id is null and p.sequence_id is not null
    $sql$, p || 'budget_items');

    -- 2. Anciens devis (un par ligne) → devis à une ligne.
    if to_regclass('public.' || p || 'budget_quotes') is not null then
      execute format($sql$
        insert into public.%1$I (vendor, title, valid_until, url, notes, total_amount, status, legacy_quote_id, created_at)
        select q.vendor_name, i.label, q.valid_until, q.url, q.notes, q.price,
               case when q.is_selected then 'retenu' else 'en_cours' end, q.id, q.created_at
        from public.%2$I q
        join public.%3$I i on i.id = q.item_id
        where not exists (select 1 from public.%1$I d where d.legacy_quote_id = q.id)
      $sql$, p || 'budget_devis', p || 'budget_quotes', p || 'budget_items');
      execute format($sql$
        insert into public.%1$I (devis_id, item_id, amount)
        select d.id, q.item_id, q.price
        from public.%2$I d
        join public.%3$I q on q.id = d.legacy_quote_id
        on conflict do nothing
      $sql$, p || 'budget_devis_lines', p || 'budget_devis', p || 'budget_quotes');
    end if;

    -- 3. Montant réel déjà saisi → versement payé, sur le devis retenu de la ligne s'il existe.
    execute format($sql$
      insert into public.%1$I (devis_id, kind, label, amount, paid, paid_date, account)
      select l.devis_id, 'paiement', 'Reprise', i.actual_total, true, i.paid_date, i.account
      from public.%2$I i
      join public.%3$I l on l.item_id = i.id
      join public.%4$I d on d.id = l.devis_id and d.status = 'retenu'
      where coalesce(i.actual_total, 0) > 0
        and not exists (select 1 from public.%1$I x where x.devis_id = l.devis_id and x.label = 'Reprise')
    $sql$, p || 'budget_payments', p || 'budget_items', p || 'budget_devis_lines', p || 'budget_devis');
    execute format($sql$
      insert into public.%1$I (item_id, kind, label, amount, paid, paid_date, account)
      select i.id, 'paiement', 'Reprise', i.actual_total, true, i.paid_date, i.account
      from public.%2$I i
      where coalesce(i.actual_total, 0) > 0
        and not exists (
          select 1 from public.%3$I l join public.%4$I d on d.id = l.devis_id and d.status = 'retenu'
          where l.item_id = i.id)
        and not exists (select 1 from public.%1$I x where x.item_id = i.id and x.label = 'Reprise')
    $sql$, p || 'budget_payments', p || 'budget_items', p || 'budget_devis_lines', p || 'budget_devis');
  end loop;
end $$;

-- Contrôle (mariage) : devis repris, lignes couvertes, versements repris
select
  (select count(*) from public._20270628_budget_devis)       as devis,
  (select count(*) from public._20270628_budget_devis_lines) as lignes_de_devis,
  (select count(*) from public._20270628_budget_payments)    as versements;
