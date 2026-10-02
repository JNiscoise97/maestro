create table _20270628_assignee_history (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null    default now(),
  actor_id       uuid,
  actor_name     text,
  entity_type    text        not null,
  entity_id      uuid        not null,
  entity_label   text,
  previous_name  text,
  new_name       text
);

alter table _20270628_assignee_history enable row level security;
create policy "anon_all" on _20270628_assignee_history for all to anon using (true) with check (true);
