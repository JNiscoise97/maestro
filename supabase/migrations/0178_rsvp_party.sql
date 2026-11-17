-- 0178_rsvp_party.sql
-- Formulaire de réponse de l'invitation en ligne, par étapes :
--   · party : personnes concernées par la réponse (la première est celle qui répond), au format
--     [{ "firstName", "lastName", "under10": bool, "moments": { "<event_sequences.id>": "yes" | "no" | "unsure" } }].
--   party_size, party_names et sequences_attending (0177) restent remplis, déduits de party.
--   « Je ne sais pas encore » (présence globale) est enregistré avec attendance = 'probably'.
-- Pour chaque déploiement ayant une table de réponses. Réexécutable sans risque.

do $$
declare p text; r text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    r := p || 'rsvp_responses';
    if to_regclass('public.' || r) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists party jsonb', r);

    execute format('alter table public.%I enable row level security', r);
    execute format('drop policy if exists "anon_all" on public.%I', r);
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', r);
  end loop;
end $$;

-- Contrôle (mariage) : la colonne existe
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = '_20270628_rsvp_responses' and column_name = 'party';
