-- Sous-dépenses : parent_id sur budget_items (auto-référence)
alter table _20260725_budget_items
  add column if not exists parent_id uuid references _20260725_budget_items(id) on delete cascade;

alter table _20270628_budget_items
  add column if not exists parent_id uuid references _20270628_budget_items(id) on delete cascade;

-- Table devis / comparatif de prestataires
create table if not exists _20260725_budget_quotes (
  id           uuid        primary key default gen_random_uuid(),
  item_id      uuid        not null references _20260725_budget_items(id) on delete cascade,
  vendor_name  text,
  price        numeric,
  notes        text,
  url          text,
  valid_until  date,
  is_selected  boolean     not null default false,
  created_at   timestamptz not null default now()
);
alter table _20260725_budget_quotes enable row level security;
create policy "anon_all" on _20260725_budget_quotes for all to anon using (true) with check (true);

create table if not exists _20270628_budget_quotes (
  id           uuid        primary key default gen_random_uuid(),
  item_id      uuid        not null references _20270628_budget_items(id) on delete cascade,
  vendor_name  text,
  price        numeric,
  notes        text,
  url          text,
  valid_until  date,
  is_selected  boolean     not null default false,
  created_at   timestamptz not null default now()
);
alter table _20270628_budget_quotes enable row level security;
create policy "anon_all" on _20270628_budget_quotes for all to anon using (true) with check (true);
