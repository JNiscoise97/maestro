-- 0156_galerie_privee_categories_preparation_fiances.sql
-- Ajoute les catégories « Préparation » et « Les fiancés » et fixe l'ordre :
--   Préparation, Cérémonie, Les fiancés, Photos de groupe, Soirée, puis Cocktail (sans photo
--   pour l'instant : une catégorie vide n'est pas affichée aux invités).
-- Réexécutable sans risque.

begin;

insert into public._20260725_gal_albums (name, sort_order)
select v.name, v.sort_order
from (values ('Préparation', 0), ('Les fiancés', 3)) as v(name, sort_order)
where not exists (select 1 from public._20260725_gal_albums a where a.name = v.name);

update public._20260725_gal_albums a
set sort_order = o.sort_order
from (values
  ('Préparation', 0), ('Cérémonie', 1), ('Cocktail', 2), ('Les fiancés', 3), ('Photos de groupe', 4), ('Soirée', 5)
) as o(name, sort_order)
where a.name = o.name;

commit;

-- Contrôle (attendu : Préparation, Cérémonie, Les fiancés, Photos de groupe, Soirée, Cocktail)
select name, sort_order from public._20260725_gal_albums order by sort_order, name;
