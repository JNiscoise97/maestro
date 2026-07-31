-- Ajoute la colonne target_rsvp_statuses sur les deux événements.
-- Permet de définir quels statuts RSVP sont ciblés par chaque communication.

alter table _20260725_communications add column if not exists target_rsvp_statuses text[] default null;
alter table _20270628_communications add column if not exists target_rsvp_statuses text[] default null;
