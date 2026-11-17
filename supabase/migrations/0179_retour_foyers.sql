-- 0179_retour_foyers.sql
-- Retour de la notion de foyer (supprimée par 0178_suppression_foyers.sql) :
--   · households : foyers, constitués à la main dans chaque groupe d'invités — une invitation par foyer ;
--     label = texte de l'invitation pour le foyer (null = noms des membres, calculé) ;
--   · guests.household_id : foyer de l'invité (null = pas encore rattaché).
-- Pour chaque déploiement ayant des invités. Réexécutable sans risque.

do $$
declare p text; g text; gg text; h text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    g  := p || 'guests';
    gg := p || 'guest_groups';
    h  := p || 'households';
    if to_regclass('public.' || g) is null or to_regclass('public.' || gg) is null then
      continue;
    end if;

    execute format($f$
      create table if not exists public.%I (
        id         uuid primary key default gen_random_uuid(),
        group_id   uuid references public.%I(id) on delete set null,
        label      text,
        notes      text,
        sort_order int not null default 0,
        created_at timestamptz not null default now()
      )$f$, h, gg);
    execute format('create index if not exists %I on public.%I(group_id)', h || '_group_idx', h);

    execute format('alter table public.%I add column if not exists household_id uuid', g);
    if not exists (select 1 from pg_constraint where conname = g || '_household_fkey') then
      execute format('alter table public.%I add constraint %I foreign key (household_id) references public.%I(id) on delete set null',
        g, g || '_household_fkey', h);
    end if;
    execute format('create index if not exists %I on public.%I(household_id)', g || '_household_idx', g);

    execute format('alter table public.%I enable row level security', h);
    execute format('drop policy if exists "anon_all" on public.%I', h);
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', h);
  end loop;
end $$;

-- Contrôle (mariage) : table recréée
select count(*) as foyers from public._20270628_households;
