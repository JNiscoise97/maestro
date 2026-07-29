-- 0088 a été joué avec access_code_hash ; on le renomme en access_code
-- (cohérent avec la migration 0038 des fiançailles) puis on ajoute les RPCs.

alter table _20260629_people  rename column access_code_hash to access_code;
alter table _20260629_guests  rename column access_code_hash to access_code;

revoke select (access_code) on _20260629_people from anon, authenticated;
revoke select (access_code) on _20260629_guests from anon, authenticated;

create or replace function _20260629_resolve_access_code(code text)
returns setof _20260629_people
language sql security definer
set search_path = public, extensions
as $$
  select * from _20260629_people where access_code = upper(code) limit 1;
$$;

create or replace function _20260629_set_access_code(p_person_id uuid, p_code text)
returns void
language sql security definer
set search_path = public, extensions
as $$
  update _20260629_people set access_code = upper(p_code) where id = p_person_id;
$$;

create or replace function _20260629_create_person(
  p_full_name text,
  p_role app_role,
  p_code text,
  p_phone text default null,
  p_avatar_url text default null,
  p_is_active boolean default true
)
returns _20260629_people
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  new_row _20260629_people;
begin
  insert into _20260629_people (full_name, role, access_code, phone, avatar_url, is_active)
  values (p_full_name, p_role, upper(p_code), p_phone, p_avatar_url, p_is_active)
  returning * into new_row;
  return new_row;
end;
$$;

create or replace function _20260629_resolve_guest_access_code(code text)
returns setof _20260629_guests
language sql security definer
set search_path = public, extensions
as $$
  select * from _20260629_guests where is_active and access_code = upper(code) limit 1;
$$;

create or replace function _20260629_set_guest_access_code(p_guest_id uuid, p_code text)
returns void
language sql security definer
set search_path = public, extensions
as $$
  update _20260629_guests set access_code = upper(p_code) where id = p_guest_id;
$$;
