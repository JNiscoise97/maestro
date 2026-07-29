-- Ajout du rôle admin (accès complet, distinct de fiance qui est lié
-- à l'identité des fiancés) et d'un champ role_label pour l'affichage
-- personnalisé (ex. "Marié", "Mariée", "Coordinateur"…).

alter type app_role add value if not exists 'admin';
-- ⚠️ Ne pas ajouter d'UPDATE sur app_role ici : un enum value ajouté
-- dans une transaction ne peut pas être utilisé dans la même transaction.
-- Voir 0094 pour la migration des données.

alter table _20260725_people add column if not exists role_label text;
alter table _20270628_people add column if not exists role_label text;

-- Mise à jour de la RPC create_person pour les fiançailles
create or replace function _20260725_create_person(
  p_full_name  text,
  p_role       app_role,
  p_code       text,
  p_phone      text    default null,
  p_avatar_url text    default null,
  p_is_active  boolean default true,
  p_role_label text    default null
)
returns _20260725_people
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  new_row _20260725_people;
begin
  insert into _20260725_people (full_name, role, access_code, phone, avatar_url, is_active, role_label)
  values (p_full_name, p_role, upper(p_code), p_phone, p_avatar_url, p_is_active, p_role_label)
  returning * into new_row;
  return new_row;
end;
$$;

-- Mise à jour de la RPC create_person pour le mariage
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
