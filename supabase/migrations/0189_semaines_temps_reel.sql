-- 0189_semaines_temps_reel.sql
-- Semaines : mises à jour en direct (sans rafraîchir la page). Les tables de 0187 sont ajoutées à la
-- publication Supabase Realtime ; l'appli s'y abonne (use-realtime-sync) et recharge les données à chaque
-- changement — ce que l'un déplace sur son téléphone apparaît aussitôt chez l'autre.
-- Aucune table créée : RLS inchangée (anon_all). Idempotent : table déjà publiée ou absente ignorée.

do $$
declare
  t text;
  prefix text;
  full_name text;
begin
  foreach prefix in array array['_20270628_', '_20260725_'] loop
    foreach t in array array['sprints', 'sprint_tasks'] loop
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

-- Contrôle
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename like '%sprint%';
