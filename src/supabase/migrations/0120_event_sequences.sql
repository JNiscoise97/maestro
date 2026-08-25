-- ── Séquences d'événement ────────────────────────────────────────────────────
-- Un événement peut être découpé en N séquences (ex. cérémonie civile, repas).
-- Une séquence "défaut" est créée automatiquement pour chaque événement.

-- ── Fiançailles ──────────────────────────────────────────────────────────────

create table if not exists _20260725_event_sequences (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  event_date   date null,
  start_time   time null,
  description  text null,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists _20260725_guest_sequences (
  guest_id    uuid not null references _20260725_guests(id)           on delete cascade,
  sequence_id uuid not null references _20260725_event_sequences(id)  on delete cascade,
  primary key (guest_id, sequence_id)
);

create table if not exists _20260725_guest_checkins (
  id            uuid primary key default gen_random_uuid(),
  guest_id      uuid not null references _20260725_guests(id)           on delete cascade,
  sequence_id   uuid not null references _20260725_event_sequences(id)  on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (guest_id, sequence_id)
);

create table if not exists _20260725_guest_meal_choices (
  guest_id    uuid not null references _20260725_guests(id)           on delete cascade,
  sequence_id uuid not null references _20260725_event_sequences(id)  on delete cascade,
  meal_choice text null check (meal_choice in ('poulet','poisson','enfant_poulet','enfant_poisson')),
  primary key (guest_id, sequence_id)
);

alter table _20260725_tables
  add column if not exists sequence_id uuid references _20260725_event_sequences(id) on delete set null;

-- Séquence défaut pour les fiançailles (événement sans découpage)
insert into _20260725_event_sequences (name, sort_order)
values ('Fiançailles', 0);

-- Assigner tous les invités existants à la séquence défaut
insert into _20260725_guest_sequences (guest_id, sequence_id)
select g.id, s.id
from _20260725_guests g
cross join _20260725_event_sequences s
where s.sort_order = 0;

-- Migrer les pointages existants vers la séquence défaut
insert into _20260725_guest_checkins (guest_id, sequence_id, checked_in_at)
select g.id, s.id, g.checked_in_at
from   _20260725_guests g
cross  join _20260725_event_sequences s
where  g.checked_in_at is not null
  and  s.sort_order = 0
on conflict do nothing;

-- Migrer les choix de plat existants vers la séquence défaut
insert into _20260725_guest_meal_choices (guest_id, sequence_id, meal_choice)
select g.id, s.id, g.meal_choice
from   _20260725_guests g
cross  join _20260725_event_sequences s
where  g.meal_choice is not null
  and  s.sort_order = 0
on conflict do nothing;

-- Scoper les tables existantes sur la séquence défaut
update _20260725_tables
  set sequence_id = (select id from _20260725_event_sequences where sort_order = 0 limit 1)
  where sequence_id is null;

-- ── Mariage ──────────────────────────────────────────────────────────────────

create table if not exists _20270628_event_sequences (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  event_date   date null,
  start_time   time null,
  description  text null,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists _20270628_guest_sequences (
  guest_id    uuid not null references _20270628_guests(id)           on delete cascade,
  sequence_id uuid not null references _20270628_event_sequences(id)  on delete cascade,
  primary key (guest_id, sequence_id)
);

create table if not exists _20270628_guest_checkins (
  id            uuid primary key default gen_random_uuid(),
  guest_id      uuid not null references _20270628_guests(id)           on delete cascade,
  sequence_id   uuid not null references _20270628_event_sequences(id)  on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (guest_id, sequence_id)
);

create table if not exists _20270628_guest_meal_choices (
  guest_id    uuid not null references _20270628_guests(id)           on delete cascade,
  sequence_id uuid not null references _20270628_event_sequences(id)  on delete cascade,
  meal_choice text null check (meal_choice in ('poulet','poisson','enfant_poulet','enfant_poisson')),
  primary key (guest_id, sequence_id)
);

alter table _20270628_tables
  add column if not exists sequence_id uuid references _20270628_event_sequences(id) on delete set null;

-- Séquence défaut pour le mariage
insert into _20270628_event_sequences (name, sort_order)
values ('Mariage', 0);

insert into _20270628_guest_sequences (guest_id, sequence_id)
select g.id, s.id
from _20270628_guests g
cross join _20270628_event_sequences s
where s.sort_order = 0;

insert into _20270628_guest_checkins (guest_id, sequence_id, checked_in_at)
select g.id, s.id, g.checked_in_at
from   _20270628_guests g
cross  join _20270628_event_sequences s
where  g.checked_in_at is not null
  and  s.sort_order = 0
on conflict do nothing;

insert into _20270628_guest_meal_choices (guest_id, sequence_id, meal_choice)
select g.id, s.id, g.meal_choice
from   _20270628_guests g
cross  join _20270628_event_sequences s
where  g.meal_choice is not null
  and  s.sort_order = 0
on conflict do nothing;

update _20270628_tables
  set sequence_id = (select id from _20270628_event_sequences where sort_order = 0 limit 1)
  where sequence_id is null;
