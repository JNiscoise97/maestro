-- Table de collecte des réponses préliminaires (formulaire public mariage).
-- guest_id est rempli manuellement après rapprochement avec la liste d'invités.

create table _20270628_rsvp_responses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  attendance text not null,
  adults     integer,
  children   integer,
  message    text,
  guest_id   uuid references _20270628_guests(id) on delete set null,
  processed  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table _20270628_rsvp_responses enable row level security;
create policy "full access" on _20270628_rsvp_responses for all using (true);
