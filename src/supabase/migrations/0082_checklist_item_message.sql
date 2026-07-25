-- Lien optionnel entre une tâche checklist et un message du Run of Show.
alter table _20260725_checklist_items
  add column if not exists ros_message_id uuid
  references _20260725_ros_messages(id) on delete set null;
