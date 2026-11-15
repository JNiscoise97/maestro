-- 0177_rsvp_invitation_questions.sql
-- Réponses envoyées depuis l'invitation en ligne (/Sarah-Jordan-2027/invitation/details) :
--   · party_size          : nombre de personnes concernées par la réponse (y compris la personne qui répond) ;
--   · party_names         : prénom et nom de chacune, une ligne par personne ;
--   · arrival_ack         : confirmation horaire — 'ok' (c'est bien noté) ou 'late' (risque d'arriver plus tard) ;
--   · sequences_attending : séquences (event_sequences.id) auxquelles le foyer sera présent ;
--   · guest_id            : invité de la liste (déjà présent dans la plupart des bases, ajouté sinon).
-- Pour chaque déploiement ayant une table de réponses. Réexécutable sans risque.

do $$
declare p text; r text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    r := p || 'rsvp_responses';
    if to_regclass('public.' || r) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists party_size int', r);
    execute format('alter table public.%I add column if not exists party_names text', r);
    execute format('alter table public.%I add column if not exists arrival_ack text', r);
    execute format('alter table public.%I add column if not exists sequences_attending text[]', r);
    execute format('alter table public.%I add column if not exists guest_id uuid', r);

    execute format('alter table public.%I enable row level security', r);
    execute format('drop policy if exists "anon_all" on public.%I', r);
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', r);
  end loop;
end $$;

-- Contrôle (mariage) : les nouvelles colonnes existent
select column_name from information_schema.columns
where table_schema = 'public' and table_name = '_20270628_rsvp_responses'
  and column_name in ('party_size', 'party_names', 'arrival_ack', 'sequences_attending', 'guest_id');
