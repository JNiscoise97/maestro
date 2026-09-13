-- Budget : postes de dépenses par événement

-- ── Fiançailles (_20260725_) ───────────────────────────────────────────────────

create table if not exists _20260725_budget_items (
  id               uuid primary key default gen_random_uuid(),
  sequence_id      uuid references _20260725_event_sequences(id) on delete set null,
  category         text not null default '',
  label            text not null,
  quantity         numeric,
  unit_price       numeric,
  estimated_total  numeric,
  actual_total     numeric,
  vendor           text,
  paid_date        date,
  account          text,
  origin           text,
  item_type        text,
  notes            text,
  sort_order       int  not null default 0,
  created_at       timestamptz default now()
);

-- ── Mariage (_20270628_) ───────────────────────────────────────────────────────

create table if not exists _20270628_budget_items (
  id               uuid primary key default gen_random_uuid(),
  sequence_id      uuid references _20270628_event_sequences(id) on delete set null,
  category         text not null default '',
  label            text not null,
  quantity         numeric,
  unit_price       numeric,
  estimated_total  numeric,
  actual_total     numeric,
  vendor           text,
  paid_date        date,
  account          text,
  origin           text,
  item_type        text,
  notes            text,
  sort_order       int  not null default 0,
  created_at       timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table _20260725_budget_items enable row level security;
alter table _20270628_budget_items enable row level security;

create policy "anon_all" on _20260725_budget_items for all to anon using (true) with check (true);
create policy "anon_all" on _20270628_budget_items for all to anon using (true) with check (true);
