-- 0149_domaines_unique_sort_order.sql
-- 3 pôles avaient des domaines de même rang : leur ordre relatif changeait selon
-- l'ordre de chargement. Renumérote les domaines de 0 à n-1 dans chaque pôle, en
-- gardant l'ordre actuel (sort_order, puis nom — le même départage que l'application).

begin;

update public._20270628_domaines d
set sort_order = r.rn
from (
  select id, row_number() over (partition by pole_id order by sort_order, name, id) - 1 as rn
  from public._20270628_domaines
) r
where d.id = r.id and d.sort_order is distinct from r.rn;

commit;

-- Contrôle : aucun rang en double dans un pôle (attendu : 0 ligne)
select pole_id, sort_order, count(*)
from public._20270628_domaines
group by pole_id, sort_order
having count(*) > 1;
