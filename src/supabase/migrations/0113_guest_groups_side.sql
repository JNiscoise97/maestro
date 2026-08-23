-- Déplace le champ 'side' (côté de la famille) de guests vers guest_groups.
-- Un groupe entier appartient à un côté, pas chaque invité individuellement.

alter table _20260725_guest_groups
  add column if not exists side text check (side in ('jordan', 'sarah'));

alter table _20270628_guest_groups
  add column if not exists side text check (side in ('jordan', 'sarah'));

alter table _20260725_guests drop column if exists side;
alter table _20270628_guests drop column if exists side;
