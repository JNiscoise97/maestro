-- Horodatage de confirmation du tour des tables (Jour J).
alter table _20260725_tables
  add column if not exists confirmed_at timestamptz;
