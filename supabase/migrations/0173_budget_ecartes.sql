-- 0173_budget_ecartes.sql
-- Postes écartés : un poste ou un sous-poste étudié puis volontairement écarté (ex. langoustes).
-- Il sort de tous les totaux et statistiques, reste consultable (interrupteur « Écartés ») et peut
-- être réintégré. Écarter un poste écarte aussi ses sous-postes.
--   · budget_items.discarded_on     : date à laquelle il a été écarté (null = retenu dans le budget) ;
--   · budget_items.discarded_reason : pourquoi (facultatif).
-- Colonnes ajoutées à une table existante (RLS et policy anon_all déjà en place). Réexécutable.

do $$
declare p text; t text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    t := p || 'budget_items';
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists discarded_on date', t);
    execute format('alter table public.%I add column if not exists discarded_reason text', t);
  end loop;
end $$;

-- Contrôle (mariage) : aucun poste écarté au départ
select count(*) filter (where discarded_on is not null) as ecartes from public._20270628_budget_items;
