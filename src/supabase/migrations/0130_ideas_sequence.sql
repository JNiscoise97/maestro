-- Rattache chaque idée à une séquence d'événement

alter table _20260725_ideas
  add column if not exists sequence_id uuid
    references _20260725_event_sequences(id) on delete set null;

alter table _20270628_ideas
  add column if not exists sequence_id uuid
    references _20270628_event_sequences(id) on delete set null;
