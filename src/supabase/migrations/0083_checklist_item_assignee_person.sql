-- Permet d'assigner un item checklist à un fiancé (en plus des invités).
alter table _20260725_checklist_items
  add column if not exists assignee_person_id uuid
  references _20260725_people(id) on delete set null;

-- Une seule assignation à la fois.
alter table _20260725_checklist_items
  add constraint _20260725_checklist_items_assignee_at_most_one
    check (not (assignee_guest_id is not null and assignee_person_id is not null));
