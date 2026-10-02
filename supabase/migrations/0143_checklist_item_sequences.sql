-- 0143_checklist_item_sequences.sql
-- Avancement d'un item de checklist PAR séquence.
-- Un item générique (« Obtenir un devis… ») s'applique à chaque séquence de sa
-- mission (cf. _20270628_mission_sequences) : on le coche séquence par séquence.
--   · status : 'todo' | 'done' | 'na' (séquence non concernée par cet item)
--   · absence de ligne = 'todo'
-- L'item (checklist_items.is_done) est coché quand toutes ses séquences sont
-- 'done' ou 'na' — synchronisé côté app.

create table public._20270628_checklist_item_sequences (
  item_id     uuid        not null
    references public._20270628_checklist_items(id) on delete cascade,
  sequence_id uuid        not null
    references public._20270628_event_sequences(id) on delete cascade,
  status      text        not null default 'todo'
    check (status in ('todo', 'done', 'na')),
  updated_at  timestamptz not null default now(),
  primary key (item_id, sequence_id)
);

alter table public._20270628_checklist_item_sequences enable row level security;

create policy "anon_all" on public._20270628_checklist_item_sequences
  for all to anon using (true) with check (true);
