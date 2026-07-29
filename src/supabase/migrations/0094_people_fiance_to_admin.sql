-- Migration des données : fiance → admin.
-- Doit être exécutée dans une transaction séparée après 0093,
-- une fois que la valeur 'admin' de l'enum est committée.

update _20260725_people set role = 'admin' where role = 'fiance';
update _20270628_people set role = 'admin' where role = 'fiance';
