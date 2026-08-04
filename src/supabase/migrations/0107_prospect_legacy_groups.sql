-- Crée des entrées dans _20270628_guest_groups pour les group_name
-- déjà présents dans _20270628_prospect_guests qui n'ont pas encore de groupe.

insert into _20270628_guest_groups (family_name, sort_order)
select
  p.group_name,
  (select coalesce(max(sort_order), 0) from _20270628_guest_groups)
    + row_number() over (order by p.group_name)
from (
  select distinct group_name
  from _20270628_prospect_guests
  where group_name is not null
) p
where not exists (
  select 1 from _20270628_guest_groups g
  where g.family_name = p.group_name
);
