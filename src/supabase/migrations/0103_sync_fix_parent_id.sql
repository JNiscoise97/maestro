-- Rattache les liens parent_id et paired_with_id manquants dans _20270628_guests
-- en les copiant depuis _20260725_guests (même IDs).
-- Les invités référencés existent déjà dans _20270628_guests car les IDs sont préservés.

update _20270628_guests w
set
  parent_id     = case when f.parent_id in (select id from _20270628_guests)      then f.parent_id      else w.parent_id     end,
  paired_with_id = case when f.paired_with_id in (select id from _20270628_guests) then f.paired_with_id else w.paired_with_id end
from _20260725_guests f
where w.id = f.id
  and (
    (f.parent_id     is not null and w.parent_id     is null and f.parent_id     in (select id from _20270628_guests)) or
    (f.paired_with_id is not null and w.paired_with_id is null and f.paired_with_id in (select id from _20270628_guests))
  );

-- Corriger le RPC pour inclure parent_id dans les syncs futurs

create or replace function _20270628_sync_from_fiancailles()
returns json
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  new_groups integer;
  new_guests integer;
begin
  -- Groupes manquants
  insert into _20270628_guest_groups (id, family_name, notes, sort_order)
  select id, family_name, notes, sort_order
  from _20260725_guest_groups
  where id not in (select id from _20270628_guest_groups)
  on conflict (id) do nothing;
  get diagnostics new_groups = row_count;

  -- Invités manquants (avec parent_id et paired_with_id si la cible existe déjà)
  insert into _20270628_guests (
    id, group_id, first_name, last_name, nickname,
    dietary_constraints, allergies, is_child, child_age,
    side, age_range, relation_category, city,
    cultural_origin, primary_language,
    parent_id, paired_with_id,
    source_guest_id, source_attendance
  )
  select
    g.id, g.group_id, g.first_name, g.last_name, g.nickname,
    g.dietary_constraints, g.allergies, g.is_child, g.child_age,
    g.side, g.age_range, g.relation_category, g.city,
    g.cultural_origin, g.primary_language,
    case when g.parent_id      in (select id from _20270628_guests) then g.parent_id      else null end,
    case when g.paired_with_id in (select id from _20270628_guests) then g.paired_with_id else null end,
    g.id,
    case
      when g.rsvp_status = 'declined'                                  then 'declined'
      when g.rsvp_status = 'confirmed' and g.checked_in_at is not null then 'present'
      when g.rsvp_status = 'confirmed' and g.checked_in_at is null     then 'no-show'
      else null
    end
  from _20260725_guests g
  where g.id not in (select id from _20270628_guests)
  on conflict (id) do nothing;
  get diagnostics new_guests = row_count;

  -- Rattacher parent_id et paired_with_id devenus disponibles après l'insert ci-dessus
  update _20270628_guests w
  set
    parent_id      = case when f.parent_id      in (select id from _20270628_guests) then f.parent_id      else w.parent_id      end,
    paired_with_id = case when f.paired_with_id in (select id from _20270628_guests) then f.paired_with_id else w.paired_with_id end
  from _20260725_guests f
  where w.id = f.id
    and (
      (f.parent_id      is not null and w.parent_id      is null and f.parent_id      in (select id from _20270628_guests)) or
      (f.paired_with_id is not null and w.paired_with_id is null and f.paired_with_id in (select id from _20270628_guests))
    );

  return json_build_object('new_groups', new_groups, 'new_guests', new_guests);
end;
$$;
