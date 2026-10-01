-- Ajoute sequence_id sur les tables organisationnelles des deux portails.
-- NULL = transverse (valable toutes séquences), UUID = dédié à une séquence précise.

-- Fiançailles (_20260725_)
alter table _20260725_poles    add column if not exists sequence_id uuid;
alter table _20260725_domaines add column if not exists sequence_id uuid;
alter table _20260725_missions add column if not exists sequence_id uuid;

-- Mariage (_20270628_)
alter table _20270628_poles    add column if not exists sequence_id uuid;
alter table _20270628_domaines add column if not exists sequence_id uuid;
alter table _20270628_missions add column if not exists sequence_id uuid;
