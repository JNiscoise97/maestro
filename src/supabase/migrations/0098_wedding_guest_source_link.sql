-- Lien de traçabilité entre un invité mariage et son enregistrement fiançailles.
-- null  = invité nouveau, pas aux fiançailles.
-- value = pointe vers _20260725_guests(id), donne accès au RSVP / présence fiançailles.

alter table _20270628_guests
  add column source_guest_id uuid references _20260725_guests(id) on delete set null;

-- Remplissage rétroactif : 0089 ayant copié les IDs à l'identique,
-- tout invité dont l'ID existe dans les deux tables est le même individu.
update _20270628_guests w
set source_guest_id = w.id
where exists (
  select 1 from _20260725_guests f where f.id = w.id
);
