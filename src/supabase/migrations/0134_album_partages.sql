create table _20260725_album_partages (
  id          uuid        default gen_random_uuid() primary key,
  code        text        unique not null,
  sequence_id uuid        not null,
  label       text        not null,
  active      boolean     default true not null,
  created_at  timestamptz default now() not null
);

alter table _20260725_album_partages enable row level security;

create policy "anon_all" on _20260725_album_partages
  for all to anon using (true) with check (true);
