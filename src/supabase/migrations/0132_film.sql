-- ── Film / partage vidéo ──────────────────────────────────────────────────────

-- Config (une ligne par event)
create table if not exists _20260725_film_config (
  id         text        primary key default 'main',
  video_url  text,
  updated_at timestamptz not null default now()
);
alter table _20260725_film_config enable row level security;
create policy "anon_all" on _20260725_film_config for all to anon using (true) with check (true);

create table if not exists _20270628_film_config (
  id         text        primary key default 'main',
  video_url  text,
  updated_at timestamptz not null default now()
);
alter table _20270628_film_config enable row level security;
create policy "anon_all" on _20270628_film_config for all to anon using (true) with check (true);

-- Groupes d'accès (témoins, famille, amis, …)
create table if not exists _20260725_film_groups (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  code          text        not null,
  intro_message text,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);
alter table _20260725_film_groups enable row level security;
create policy "anon_all" on _20260725_film_groups for all to anon using (true) with check (true);

create table if not exists _20270628_film_groups (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  code          text        not null,
  intro_message text,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);
alter table _20270628_film_groups enable row level security;
create policy "anon_all" on _20270628_film_groups for all to anon using (true) with check (true);

-- Logs de visionnage
create table if not exists _20260725_film_views (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references _20260725_film_groups(id) on delete cascade,
  viewer_name  text        not null,
  played_at    timestamptz not null default now()
);
alter table _20260725_film_views enable row level security;
create policy "anon_all" on _20260725_film_views for all to anon using (true) with check (true);

create table if not exists _20270628_film_views (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references _20270628_film_groups(id) on delete cascade,
  viewer_name  text        not null,
  played_at    timestamptz not null default now()
);
alter table _20270628_film_views enable row level security;
create policy "anon_all" on _20270628_film_views for all to anon using (true) with check (true);
