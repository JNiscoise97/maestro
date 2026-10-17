-- 0146_drop_item_deadline_use_milestone.sql
-- Rétroplanning : la date limite d'un item n'est plus stockée sur l'item.
-- Elle EST l'échéance de son jalon (_20270628_milestones.target_date) ;
-- un item sans jalon n'a pas de date limite.
--   · date cible  : facultative, au plus tard l'échéance du jalon (contrôlé à la saisie)
--   · début idéal : facultatif, au plus tard la cible (valeurs existantes conservées)
-- Avant suppression, les dates cibles postérieures à l'échéance de leur jalon
-- sont ramenées à cette échéance (155 items au 17/10/2026).
-- Pas de nouvelle table : RLS inchangée.

begin;

-- 1. Cibles trop tardives → échéance du jalon
update public._20270628_checklist_items i
set target_date = m.target_date
from public._20270628_milestones m
where i.milestone_id = m.id
  and i.target_date is not null
  and i.target_date > m.target_date;

-- 2. Début idéal après la cible (incohérent après la correction ci-dessus) :
--    conservé mais ramené à la cible, pour garder l'information (121 items au 17/10/2026)
update public._20270628_checklist_items
set ideal_start_date = target_date
where ideal_start_date is not null
  and target_date is not null
  and ideal_start_date > target_date;

-- 3. La date limite devient celle du jalon : colonne supprimée
alter table public._20270628_checklist_items drop column if exists deadline_date;

commit;

-- Contrôle : aucune cible ne doit dépasser l'échéance de son jalon (attendu : 0)
select count(*) as cibles_apres_jalon
from public._20270628_checklist_items i
join public._20270628_milestones m on m.id = i.milestone_id
where i.target_date > m.target_date;
