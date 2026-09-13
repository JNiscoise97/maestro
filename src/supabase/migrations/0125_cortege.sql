-- Cortège v2 : config par séquence, groupes personnalisés, assignations

-- ── Fiançailles (_20260725_) ───────────────────────────────────────────────────

create table if not exists _20260725_cortege_config (
  id               uuid primary key default gen_random_uuid(),
  sequence_id      uuid not null references _20260725_event_sequences(id) on delete cascade,
  enabled_roles    text[] not null default '{}',
  cavalier_count   int   not null default 0,
  demoiselle_count int   not null default 0,
  unique(sequence_id)
);

create table if not exists _20260725_cortege_groups (
  id          uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references _20260725_event_sequences(id) on delete cascade,
  label       text not null,
  role_keys   text[] not null default '{}',
  sort_order  int   not null default 0
);

create table if not exists _20260725_cortege_assignments (
  id          uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references _20260725_event_sequences(id) on delete cascade,
  role_key    text not null,
  guest_id    uuid references _20260725_guests(id) on delete set null,
  unique(sequence_id, role_key)
);

-- ── Mariage (_20270628_) ───────────────────────────────────────────────────────

create table if not exists _20270628_cortege_config (
  id               uuid primary key default gen_random_uuid(),
  sequence_id      uuid not null references _20270628_event_sequences(id) on delete cascade,
  enabled_roles    text[] not null default '{}',
  cavalier_count   int   not null default 0,
  demoiselle_count int   not null default 0,
  unique(sequence_id)
);

create table if not exists _20270628_cortege_groups (
  id          uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references _20270628_event_sequences(id) on delete cascade,
  label       text not null,
  role_keys   text[] not null default '{}',
  sort_order  int   not null default 0
);

create table if not exists _20270628_cortege_assignments (
  id          uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references _20270628_event_sequences(id) on delete cascade,
  role_key    text not null,
  guest_id    uuid references _20270628_guests(id) on delete set null,
  unique(sequence_id, role_key)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table _20260725_cortege_config      enable row level security;
alter table _20260725_cortege_groups      enable row level security;
alter table _20260725_cortege_assignments enable row level security;
alter table _20270628_cortege_config      enable row level security;
alter table _20270628_cortege_groups      enable row level security;
alter table _20270628_cortege_assignments enable row level security;

create policy "anon_all" on _20260725_cortege_config      for all to anon using (true) with check (true);
create policy "anon_all" on _20260725_cortege_groups      for all to anon using (true) with check (true);
create policy "anon_all" on _20260725_cortege_assignments for all to anon using (true) with check (true);
create policy "anon_all" on _20270628_cortege_config      for all to anon using (true) with check (true);
create policy "anon_all" on _20270628_cortege_groups      for all to anon using (true) with check (true);
create policy "anon_all" on _20270628_cortege_assignments for all to anon using (true) with check (true);
