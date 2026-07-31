-- Crée les 3 tables présentes dans les fiançailles mais absentes du schéma mariage.

-- ── Commentaires polymorphes ──────────────────────────────────────────────────

create table _20270628_comments (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  author_id   uuid references _20270628_people(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index _20270628_comments_entity_idx on _20270628_comments(entity_type, entity_id);

alter table _20270628_comments enable row level security;
create policy "full access" on _20270628_comments for all using (true);

-- ── Communications & suivi d'envoi ────────────────────────────────────────────

create table _20270628_communications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  sort_order  bigint not null default extract(epoch from now()),
  created_at  timestamptz not null default now()
);

create table _20270628_communication_sends (
  id               uuid primary key default gen_random_uuid(),
  communication_id uuid not null references _20270628_communications(id) on delete cascade,
  guest_id         uuid not null references _20270628_guests(id) on delete cascade,
  sent_at          timestamptz not null default now(),
  unique(communication_id, guest_id)
);

alter table _20270628_communications enable row level security;
create policy "full access" on _20270628_communications for all using (true);

alter table _20270628_communication_sends enable row level security;
create policy "full access" on _20270628_communication_sends for all using (true);
