-- 0178_suppression_foyers.sql
-- Abandon de la notion de foyer (créée par 0176) : suppression de guests.household_id et de la
-- table households. Le nom sur l'invitation (guests.invitation_name) est conservé.
-- Pour chaque déploiement. Réexécutable sans risque.

do $$
declare p text; g text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    g := p || 'guests';
    if to_regclass('public.' || g) is not null then
      execute format('alter table public.%I drop constraint if exists %I', g, g || '_household_fkey');
      execute format('drop index if exists public.%I', g || '_household_idx');
      execute format('alter table public.%I drop column if exists household_id', g);
    end if;
    execute format('drop table if exists public.%I', p || 'households');
  end loop;
end $$;

-- Contrôle (mariage) : plus de colonne household_id, plus de table households
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = '_20270628_guests' and column_name = 'household_id') as colonne_foyer,
  to_regclass('public._20270628_households') as table_foyers;
