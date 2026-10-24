-- 0166_budget_priorite_moscow.sql
-- Priorité MoSCoW des dépenses : must (indispensable), should (important), could (souhaitable).
-- Sur le poste ; un sous-poste sans priorité propre hérite de celle de son poste (null = hérite / non priorisé).
-- Pour chaque déploiement ayant un budget. Réexécutable sans risque.

do $$
declare p text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    if to_regclass('public.' || p || 'budget_items') is null then continue; end if;
    execute format('alter table public.%I add column if not exists priority text', p || 'budget_items');
    execute format('alter table public.%I drop constraint if exists %I', p || 'budget_items', p || 'budget_items_priority_check');
    execute format('alter table public.%I add constraint %I check (priority in (''must'', ''should'', ''could''))',
      p || 'budget_items', p || 'budget_items_priority_check');
  end loop;
end $$;

-- Contrôle (mariage) : colonne présente (attendu : 1 ligne)
select column_name from information_schema.columns
where table_name = '_20270628_budget_items' and column_name = 'priority';
