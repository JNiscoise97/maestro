-- 0172_cadeaux_anticipes.sql
-- Cadeaux anticipés : un cadeau (table gifts, page Cadeaux, avec ses invités et son suivi des
-- remerciements) peut financer des dépenses du budget.
--   · gifts.anticipated : cadeau anticipé (créé depuis le budget, affiché aussi dans Cadeaux) ;
--   · gifts.promised    : promis mais pas encore versé (ne compte pas dans « Offert ») ;
--   · gifts.received_on : date de réception ; gifts.account : compte où l'argent est arrivé ;
--   · budget_gift_allocations : affectation d'un montant du cadeau à une ligne (poste ou sous-poste)
--     OU à un devis (réparti sur les lignes du devis).
-- Le financement est distinct du paiement : une ligne offerte reste « à payer » tant que le
-- fournisseur n'est pas payé. Pour chaque déploiement ayant un budget. Réexécutable sans risque.

do $$
declare p text; g text; a text; i text; d text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    g := p || 'gifts';
    i := p || 'budget_items';
    d := p || 'budget_devis';
    a := p || 'budget_gift_allocations';
    if to_regclass('public.' || g) is null or to_regclass('public.' || i) is null or to_regclass('public.' || d) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists anticipated boolean not null default false', g);
    execute format('alter table public.%I add column if not exists promised boolean not null default false', g);
    execute format('alter table public.%I add column if not exists received_on date', g);
    execute format('alter table public.%I add column if not exists account text', g);

    execute format($f$
      create table if not exists public.%I (
        id         uuid primary key default gen_random_uuid(),
        gift_id    uuid not null references public.%I(id) on delete cascade,
        item_id    uuid references public.%I(id) on delete cascade,
        devis_id   uuid references public.%I(id) on delete cascade,
        amount     numeric(12,2) not null check (amount > 0),
        sort_order int not null default 0,
        created_at timestamptz not null default now(),
        constraint %I check (num_nonnulls(item_id, devis_id) = 1)
      )$f$, a, g, i, d, a || '_target_check');
    execute format('create index if not exists %I on public.%I(gift_id)', a || '_gift_idx', a);

    execute format('alter table public.%I enable row level security', a);
    execute format('drop policy if exists "anon_all" on public.%I', a);
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', a);
  end loop;
end $$;

-- Contrôle (mariage) : table créée, aucune affectation au départ
select count(*) as affectations from public._20270628_budget_gift_allocations;
