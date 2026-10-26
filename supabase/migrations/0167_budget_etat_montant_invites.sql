-- 0167_budget_etat_montant_invites.sql
-- Budget : état du montant de chaque ligne et étiquette « dépend du nombre d'invités ».
--   · amount_status   : 'estimated' (montant estimé, par défaut), 'to_estimate' (pas encore estimable,
--                       compte 0 € et signalé), 'included' (inclus dans une autre ligne, 0 €).
--   · included_in_id  : la ligne (poste ou sous-poste) qui inclut celle-ci (ex. Sonorisation → Domaine Ostara).
--   · guest_dependent : le montant dépend du nombre d'invités (étiquette, sans calcul).
-- Si la ligne qui en inclut d'autres est supprimée, celles-ci repassent en « pas encore estimable ».
-- Pour chaque déploiement ayant un budget. Réexécutable sans risque.

-- Déclencheur générique : avant suppression d'une ligne, ses lignes incluses passent « à estimer ».
create or replace function public.budget_items_release_included()
returns trigger language plpgsql as $$
begin
  execute format(
    'update public.%I set amount_status = ''to_estimate'', included_in_id = null where included_in_id = $1',
    tg_table_name) using old.id;
  return old;
end;
$$;

do $$
declare p text; t text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    t := p || 'budget_items';
    if to_regclass('public.' || t) is null then continue; end if;

    execute format('alter table public.%I add column if not exists amount_status text not null default ''estimated''', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_amount_status_check');
    execute format('alter table public.%I add constraint %I check (amount_status in (''estimated'', ''to_estimate'', ''included''))',
      t, t || '_amount_status_check');
    execute format('alter table public.%I add column if not exists included_in_id uuid references public.%I(id) on delete set null', t, t);
    execute format('alter table public.%I add column if not exists guest_dependent boolean not null default false', t);

    execute format('drop trigger if exists %I on public.%I', t || '_release_included', t);
    execute format('create trigger %I before delete on public.%I for each row execute function public.budget_items_release_included()',
      t || '_release_included', t);
  end loop;
end $$;

-- Contrôle (mariage) : répartition des états (attendu au départ : tout en « estimated »)
select amount_status, count(*), count(*) filter (where guest_dependent) as dependant_invites
from public._20270628_budget_items group by amount_status;
