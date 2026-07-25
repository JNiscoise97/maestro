-- Historique de toutes les modifications d'assigné/responsable
-- (pôle, domaine, mission, item checklist).
create table _20260725_assignee_history (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  actor_id     uuid,        -- id Identity (person ou guest)
  actor_name   text not null,
  entity_type  text not null check (entity_type in ('pole', 'domaine', 'mission', 'checklist_item')),
  entity_id    uuid not null,
  entity_label text not null,
  previous_name text,       -- null = non assigné
  new_name      text        -- null = assigné retiré
);

alter table _20260725_assignee_history enable row level security;
create policy "temp_anon_all__20260725_assignee_history"
  on _20260725_assignee_history for all using (true) with check (true);

create index _20260725_assignee_history_created_at_idx
  on _20260725_assignee_history(created_at desc);
