-- ── Relation many-to-many missions ↔ séquences ──────────────────────────────
create table _20270628_mission_sequences (
  mission_id  uuid not null references _20270628_missions(id)        on delete cascade,
  sequence_id uuid not null references _20270628_event_sequences(id) on delete cascade,
  constraint _20270628_mission_sequences_pkey primary key (mission_id, sequence_id)
);
alter table _20270628_mission_sequences enable row level security;
create policy "anon_all" on _20270628_mission_sequences for all to anon using (true) with check (true);

-- ── Conducteur : étapes par séquence ────────────────────────────────────────
create table _20270628_sequence_steps (
  id                    uuid        not null default gen_random_uuid() primary key,
  sequence_id           uuid        not null references _20270628_event_sequences(id) on delete cascade,
  title                 text        not null,
  description           text,
  start_date            date,
  start_time            time,
  end_date              date,
  end_time              time,
  responsible_person_id uuid        references _20270628_people(id) on delete set null,
  sort_order            integer     not null default 0,
  created_at            timestamptz not null default now()
);
alter table _20270628_sequence_steps enable row level security;
create policy "anon_all" on _20270628_sequence_steps for all to anon using (true) with check (true);

-- ── Suppression des colonnes sequence_id devenues inutiles ──────────────────
alter table _20270628_missions  drop column if exists sequence_id;
alter table _20270628_domaines  drop column if exists sequence_id;
alter table _20270628_poles     drop column if exists sequence_id;

alter table _20260725_missions  drop column if exists sequence_id;
alter table _20260725_domaines  drop column if exists sequence_id;
alter table _20260725_poles     drop column if exists sequence_id;
