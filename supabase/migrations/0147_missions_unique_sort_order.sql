-- 0147_missions_unique_sort_order.sql
-- 217 missions sur 376 avaient sort_order = 0 : à rang égal, l'ordre affiché suivait
-- l'ordre physique des lignes, qui change à chaque mise à jour d'une mission.
-- Renumérote les missions de 0 à n-1 dans chaque domaine (comme le glisser-déposer), en gardant l'ordre actuel
-- (sort_order, puis titre — le même départage que l'application).

begin;

update public._20270628_missions m
set sort_order = r.rn
from (
  select id, row_number() over (partition by domaine_id order by sort_order, title, id) - 1 as rn
  from public._20270628_missions
) r
where m.id = r.id and m.sort_order is distinct from r.rn;

commit;

-- Contrôle : aucun rang en double dans un domaine (attendu : 0 ligne)
select domaine_id, sort_order, count(*)
from public._20270628_missions
group by domaine_id, sort_order
having count(*) > 1;
