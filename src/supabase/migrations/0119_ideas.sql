-- Carnet d'idées : inspirations à étudier avant décision
create table if not exists _20260725_ideas (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text null,
  source       text not null default 'us'
               check (source in ('us', 'pinterest', 'social', 'other')),
  source_detail text null,
  category     text null,
  status       text not null default 'to_study'
               check (status in ('to_study', 'keeping', 'discarded', 'in_progress')),
  notes        text null,
  created_at   timestamptz not null default now()
);

create table if not exists _20270628_ideas (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text null,
  source       text not null default 'us'
               check (source in ('us', 'pinterest', 'social', 'other')),
  source_detail text null,
  category     text null,
  status       text not null default 'to_study'
               check (status in ('to_study', 'keeping', 'discarded', 'in_progress')),
  notes        text null,
  created_at   timestamptz not null default now()
);
