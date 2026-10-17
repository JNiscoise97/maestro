-- 0148_checklist_items_unique_sort_order.sql
-- 2071 items sur 2934 avaient sort_order = 0 (268 checklists avec des rangs en double) :
-- à rang égal, l'ordre affiché suivait l'ordre physique des lignes, qui change à chaque
-- mise à jour d'un item (case cochée, dates…).
-- Renumérote les items de 0 à n-1 dans chaque checklist, en gardant l'ordre actuel
-- (sort_order, puis date cible, puis libellé — le même départage que l'application).

begin;

update public._20270628_checklist_items i
set sort_order = r.rn
from (
  select id,
         row_number() over (
           partition by checklist_id
           order by sort_order, target_date nulls last, label, id
         ) - 1 as rn
  from public._20270628_checklist_items
) r
where i.id = r.id and i.sort_order is distinct from r.rn;

commit;

-- Contrôle : aucun rang en double dans une checklist (attendu : 0 ligne)
select checklist_id, sort_order, count(*)
from public._20270628_checklist_items
group by checklist_id, sort_order
having count(*) > 1;
