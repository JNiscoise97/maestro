-- 0155_galerie_privee_categorie_ceremonie.sql
-- Ajoute la catégorie « Cérémonie », placée avant « Cocktail ».
-- Ordre final : Cérémonie, Cocktail, Photos de groupe, Soirée. Réexécutable sans risque.

begin;

insert into public._20260725_gal_albums (name, sort_order)
select 'Cérémonie', 0
where not exists (select 1 from public._20260725_gal_albums where name = 'Cérémonie');

update public._20260725_gal_albums a
set sort_order = o.sort_order
from (values ('Cérémonie', 0), ('Cocktail', 1), ('Photos de groupe', 2), ('Soirée', 3)) as o(name, sort_order)
where a.name = o.name;

commit;

-- Contrôle (attendu : Cérémonie, Cocktail, Photos de groupe, Soirée)
select name, sort_order from public._20260725_gal_albums order by sort_order, name;
