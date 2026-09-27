-- Plusieurs vidéos par event + master password

alter table _20260725_film_config add column if not exists master_code text;
alter table _20270628_film_config add column if not exists master_code text;

create table if not exists _20260725_film_videos (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  url        text        not null,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);
alter table _20260725_film_videos enable row level security;
create policy "anon_all" on _20260725_film_videos for all to anon using (true) with check (true);

create table if not exists _20270628_film_videos (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  url        text        not null,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);
alter table _20270628_film_videos enable row level security;
create policy "anon_all" on _20270628_film_videos for all to anon using (true) with check (true);
