-- Responsable par mission : même pattern polymorphe que domaine_responsables
-- (person_id = fiancé, guest_id = personne de confiance — jamais les deux).
-- Règle : seules les missions des phases installation/jour_j/désinstallation
-- peuvent être confiées à une personne de confiance. Cette contrainte est
-- appliquée côté application, pas en DB.
alter table _20260725_missions
  add column if not exists responsible_person_id uuid references _20260725_people(id) on delete set null,
  add column if not exists responsible_guest_id  uuid references _20260725_guests(id)  on delete set null;

alter table _20260725_missions
  add constraint _20260725_missions_responsible_at_most_one
    check (not (responsible_person_id is not null and responsible_guest_id is not null));
