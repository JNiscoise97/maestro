alter table _20260725_event_sequences add column if not exists end_time time null;
alter table _20270628_event_sequences add column if not exists end_time time null;

-- RLS déjà couvert par 0122 pour les deux tables.
