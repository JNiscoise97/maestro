-- Crée _20270628_attachments et aligne _20270628_documents sur le schéma fiançailles.
-- _20270628_documents est vide au moment de cette migration : restructuration non-destructive.

create table _20270628_attachments (
  id          uuid primary key default gen_random_uuid(),
  entity_type text,
  entity_id   uuid,
  file_path   text not null,
  file_name   text not null,
  mime_type   text,
  uploaded_by uuid references _20270628_people(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index _20270628_attachments_entity_idx
  on _20270628_attachments(entity_type, entity_id);

alter table _20270628_attachments enable row level security;
create policy "full access" on _20270628_attachments for all using (true);

-- Aligne documents : ajouter attachment_id, supprimer les colonnes plates
alter table _20270628_documents
  add column attachment_id uuid references _20270628_attachments(id) on delete cascade;

alter table _20270628_documents
  drop column file_name,
  drop column file_path;
