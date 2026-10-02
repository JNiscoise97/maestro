-- 0140_milestones_criticality_dependencies.sql
-- Modèle de pilotage :
--   · deadline_date + criticality sur checklist_items
--   · milestone_id (FK directe 1:N) sur checklist_items
--   · table _20270628_milestones
--   · table _20270628_checklist_item_dependencies (dépendances N:N, conservées)

-- ─── JALONS ──────────────────────────────────────────────────────────────────
-- Créé avant checklist_items pour que la FK puisse le référencer.

create table public._20270628_milestones (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text        null,
  target_date date        not null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

alter table public._20270628_milestones enable row level security;

create policy "anon_all" on public._20270628_milestones
  for all to anon using (true) with check (true);

-- ─── CHECKLIST_ITEMS : 3 nouvelles colonnes ──────────────────────────────────

alter table public._20270628_checklist_items
  add column if not exists deadline_date date null,
  add column if not exists criticality   text not null default 'normal'
    check (criticality in ('low', 'normal', 'high', 'blocking')),
  add column if not exists milestone_id  uuid null
    references public._20270628_milestones(id) on delete set null;

-- ─── DÉPENDANCES ENTRE ITEMS (N:N auto-référentielle) ────────────────────────

create table public._20270628_checklist_item_dependencies (
  item_id            uuid not null
    references public._20270628_checklist_items(id) on delete cascade,
  depends_on_item_id uuid not null
    references public._20270628_checklist_items(id) on delete cascade,
  primary key (item_id, depends_on_item_id),
  check (item_id <> depends_on_item_id)
);

alter table public._20270628_checklist_item_dependencies enable row level security;

create policy "anon_all" on public._20270628_checklist_item_dependencies
  for all to anon using (true) with check (true);
