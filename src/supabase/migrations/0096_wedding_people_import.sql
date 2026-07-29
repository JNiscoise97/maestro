-- Copie les personnes (admins et référents) depuis les fiançailles vers le mariage.
-- Ne copie pas referent_category_id / partner_referent_id (FK vers un autre namespace).
-- Idempotent : on conflict (id) do update.

insert into _20270628_people (
  id,
  full_name,
  nickname,
  phone,
  role,
  access_code,
  avatar_url,
  is_active,
  meal_choice,
  dietary_constraints,
  allergies,
  role_label
)
select
  id,
  full_name,
  nickname,
  phone,
  role,
  access_code,
  avatar_url,
  is_active,
  meal_choice,
  dietary_constraints,
  allergies,
  role_label
from _20260725_people
on conflict (id) do update set
  access_code          = excluded.access_code,
  role                 = excluded.role,
  role_label           = excluded.role_label,
  full_name            = excluded.full_name,
  nickname             = excluded.nickname,
  phone                = excluded.phone,
  avatar_url           = excluded.avatar_url,
  is_active            = excluded.is_active,
  meal_choice          = excluded.meal_choice,
  dietary_constraints  = excluded.dietary_constraints,
  allergies            = excluded.allergies;
