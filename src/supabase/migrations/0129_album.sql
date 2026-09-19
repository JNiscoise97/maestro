-- Sélection d'album photo : photos + votes par utilisateur

-- ── Fiançailles ───────────────────────────────────────────────────────────────

create table if not exists _20260725_album_photos (
  id           uuid primary key default gen_random_uuid(),
  sequence_id  uuid not null references _20260725_event_sequences(id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  sort_order   int  not null default 0,
  created_at   timestamptz default now()
);

create table if not exists _20260725_album_votes (
  photo_id   uuid not null references _20260725_album_photos(id) on delete cascade,
  voter_id   text not null,
  voter_name text not null,
  rating     int  not null check (rating between 1 and 4),
  voted_at   timestamptz default now(),
  primary key (photo_id, voter_id)
);

-- ── Mariage ───────────────────────────────────────────────────────────────────

create table if not exists _20270628_album_photos (
  id           uuid primary key default gen_random_uuid(),
  sequence_id  uuid not null references _20270628_event_sequences(id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  sort_order   int  not null default 0,
  created_at   timestamptz default now()
);

create table if not exists _20270628_album_votes (
  photo_id   uuid not null references _20270628_album_photos(id) on delete cascade,
  voter_id   text not null,
  voter_name text not null,
  rating     int  not null check (rating between 1 and 4),
  voted_at   timestamptz default now(),
  primary key (photo_id, voter_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table _20260725_album_photos enable row level security;
alter table _20260725_album_votes  enable row level security;
alter table _20270628_album_photos enable row level security;
alter table _20270628_album_votes  enable row level security;

create policy "anon_all" on _20260725_album_photos for all to anon using (true) with check (true);
create policy "anon_all" on _20260725_album_votes  for all to anon using (true) with check (true);
create policy "anon_all" on _20270628_album_photos for all to anon using (true) with check (true);
create policy "anon_all" on _20270628_album_votes  for all to anon using (true) with check (true);
