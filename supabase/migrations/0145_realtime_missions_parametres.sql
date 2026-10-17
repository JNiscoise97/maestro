-- 0145_realtime_missions_parametres.sql
-- Mises à jour en direct (sans rafraîchir la page) des écrans Missions et
-- Paramètres › Pôles, domaines & missions : les tables sont ajoutées à la
-- publication Supabase Realtime. L'app s'y abonne et recharge les données
-- concernées à chaque insertion, modification ou suppression.
--
-- Aucune table créée : RLS inchangée. Realtime respecte les policies existantes
-- (anon_all) pour décider quelles lignes notifier.
-- Idempotent : une table déjà publiée ou absente pour un préfixe est ignorée.

do $$
declare
  t text;
  prefix text;
  full_name text;
begin
  foreach prefix in array array['_20270628_', '_20260725_'] loop
    foreach t in array array[
      'poles', 'domaines', 'missions', 'checklists', 'checklist_items',
      'mission_sequences', 'checklist_item_sequences', 'milestones', 'event_sequences',
      'domaine_responsables', 'mission_acceptances', 'assignee_history',
      'people', 'guests', 'guest_groups'
    ] loop
      full_name := prefix || t;
      if to_regclass('public.' || full_name) is not null
         and not exists (
           select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = full_name
         )
      then
        execute format('alter publication supabase_realtime add table public.%I', full_name);
      end if;
    end loop;
  end loop;
end $$;

-- Contrôle : tables publiées pour ces écrans
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and (tablename like '\_20270628\_%' or tablename like '\_20260725\_%')
order by tablename;
