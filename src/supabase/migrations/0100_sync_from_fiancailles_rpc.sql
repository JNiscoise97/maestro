-- RPC de synchronisation : copie les groupes et invités nouveaux depuis les fiançailles
-- vers le mariage. Idempotente (on conflict do nothing). Retourne les compteurs.

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

  -- Invités manquants
  insert into _20270628_guests (
    id, group_id, first_name, last_name, nickname,
    dietary_constraints, allergies, is_child, child_age,
    side, age_range, relation_category, city,
    cultural_origin, primary_language,
    source_guest_id, source_attendance
  )
  select
    g.id, g.group_id, g.first_name, g.last_name, g.nickname,
    g.dietary_constraints, g.allergies, g.is_child, g.child_age,
    g.side, g.age_range, g.relation_category, g.city,
    g.cultural_origin, g.primary_language,
    g.id,
    case
      when g.rsvp_status = 'declined'                                    then 'declined'
      when g.rsvp_status = 'confirmed' and g.checked_in_at is not null   then 'present'
      when g.rsvp_status = 'confirmed' and g.checked_in_at is null       then 'no-show'
      else null
    end
  from _20260725_guests g
  where g.id not in (select id from _20270628_guests)
  on conflict (id) do nothing;
  get diagnostics new_guests = row_count;

  return json_build_object('new_groups', new_groups, 'new_guests', new_guests);
end;
$$;
