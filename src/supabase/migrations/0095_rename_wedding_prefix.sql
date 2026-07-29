-- Renommage du préfixe mariage : _20260629_ → _20270628_
-- À jouer après 0090 (schema + RPCs).
-- Les FK et policies suivent automatiquement le renommage des tables.

alter table _20260629_role_categories           rename to _20270628_role_categories;
alter table _20260629_people                    rename to _20270628_people;
alter table _20260629_app_settings              rename to _20270628_app_settings;
alter table _20260629_guest_groups              rename to _20270628_guest_groups;
alter table _20260629_guests                    rename to _20270628_guests;
alter table _20260629_poles                     rename to _20270628_poles;
alter table _20260629_domaines                  rename to _20270628_domaines;
alter table _20260629_domaine_responsables      rename to _20270628_domaine_responsables;
alter table _20260629_missions                  rename to _20270628_missions;
alter table _20260629_mission_acceptances       rename to _20270628_mission_acceptances;
alter table _20260629_checklists                rename to _20270628_checklists;
alter table _20260629_checklist_items           rename to _20270628_checklist_items;
alter table _20260629_planning_events           rename to _20270628_planning_events;
alter table _20260629_run_of_show_steps         rename to _20270628_run_of_show_steps;
alter table _20260629_run_of_show_responsibles  rename to _20270628_run_of_show_responsibles;
alter table _20260629_ros_messages              rename to _20270628_ros_messages;
alter table _20260629_ros_delays                rename to _20270628_ros_delays;
alter table _20260629_ros_launches              rename to _20270628_ros_launches;
alter table _20260629_logistique_items          rename to _20270628_logistique_items;
alter table _20260629_equipment                 rename to _20270628_equipment;
alter table _20260629_prestataires              rename to _20270628_prestataires;
alter table _20260629_documents                 rename to _20270628_documents;
alter table _20260629_tables                    rename to _20270628_tables;
alter table _20260629_table_assignments         rename to _20270628_table_assignments;
alter table _20260629_photo_sessions            rename to _20270628_photo_sessions;
alter table _20260629_photo_groups              rename to _20270628_photo_groups;
alter table _20260629_photo_group_members       rename to _20270628_photo_group_members;
alter table _20260629_gifts                     rename to _20270628_gifts;
alter table _20260629_gift_guests               rename to _20270628_gift_guests;
alter table _20260629_rsvp_responses            rename to _20270628_rsvp_responses;

-- ── Fonctions : drop ancien préfixe, recréer avec nouveau ────────────────────

drop function if exists _20260629_resolve_access_code(text);
drop function if exists _20260629_set_access_code(uuid, text);
drop function if exists _20260629_create_person(text, app_role, text, text, text, boolean);
drop function if exists _20260629_resolve_guest_access_code(text);
drop function if exists _20260629_set_guest_access_code(uuid, text);

create or replace function _20270628_resolve_access_code(code text)
returns setof _20270628_people
language sql security definer
set search_path = public, extensions
as $$
  select * from _20270628_people where access_code = upper(code) limit 1;
$$;

create or replace function _20270628_set_access_code(p_person_id uuid, p_code text)
returns void
language sql security definer
set search_path = public, extensions
as $$
  update _20270628_people set access_code = upper(p_code) where id = p_person_id;
$$;

create or replace function _20270628_create_person(
  p_full_name  text,
  p_role       app_role,
  p_code       text,
  p_phone      text    default null,
  p_avatar_url text    default null,
  p_is_active  boolean default true,
  p_role_label text    default null
)
returns _20270628_people
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  new_row _20270628_people;
begin
  insert into _20270628_people (full_name, role, access_code, phone, avatar_url, is_active, role_label)
  values (p_full_name, p_role, upper(p_code), p_phone, p_avatar_url, p_is_active, p_role_label)
  returning * into new_row;
  return new_row;
end;
$$;

create or replace function _20270628_resolve_guest_access_code(code text)
returns setof _20270628_guests
language sql security definer
set search_path = public, extensions
as $$
  select * from _20270628_guests where is_active and access_code = upper(code) limit 1;
$$;

create or replace function _20270628_set_guest_access_code(p_guest_id uuid, p_code text)
returns void
language sql security definer
set search_path = public, extensions
as $$
  update _20270628_guests set access_code = upper(p_code) where id = p_guest_id;
$$;
