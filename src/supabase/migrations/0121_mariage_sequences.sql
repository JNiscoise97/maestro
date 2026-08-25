-- ── Séquences du mariage (2027-06-25 → 2027-06-28) ──────────────────────────
-- Remplace la séquence "Mariage" créée par défaut lors de la migration 0120.
-- Les assignations invités sont vidées : à refaire depuis Invités → Séquences.

-- Supprimer les assignations de la séquence défaut (sort_order = 0)
delete from _20270628_guest_sequences
where sequence_id in (
  select id from _20270628_event_sequences where sort_order = 0
);

-- Supprimer la séquence défaut
delete from _20270628_event_sequences where sort_order = 0;

-- Insérer les 8 séquences réelles
insert into _20270628_event_sequences (name, event_date, start_time, description, sort_order) values
  ('Mariage civil & vin d''honneur', '2027-06-25', '15:00', 'Cérémonie civile suivie d''un vin d''honneur', 0),
  ('Repas intime en famille',        '2027-06-25', '20:00', 'Dîner en famille, vendredi soir',             1),
  ('Moment convivial entre amis',    '2027-06-26', null,    'Samedi, journée entre amis',                  2),
  ('Pique-nique partagé',            '2027-06-27', '12:00', 'Dimanche midi, pique-nique',                  3),
  ('Bénédiction au khane',           '2027-06-27', '17:00', 'Bénédiction de mariage religieuse au khane', 4),
  ('Bénédiction à l''église',        '2027-06-28', '14:00', 'Bénédiction de mariage religieuse à l''église', 5),
  ('Photos',                         '2027-06-28', null,    'Séance photos, lundi après-midi',             6),
  ('Célébration de mariage',         '2027-06-28', '19:00', 'Grande célébration, lundi soir',              7);
