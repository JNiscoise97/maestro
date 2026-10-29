-- 0170_budget_diy.sql
-- Budget : étiquette « DIY envisageable » sur un poste ou un sous-poste (seconde passe d'arbitrage).
-- Seule une colonne est ajoutée : RLS et policy anon_all de la table restent celles d'origine.
-- Pour chaque déploiement ayant un budget. Réexécutable sans risque.

do $$
declare p text; t text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    t := p || 'budget_items';
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists diy_possible boolean not null default false', t);
  end loop;
end;
$$;
