-- seed_cleanup_anciennes_donnees_fiancailles.sql
-- Supprime les 1 782 anciennes lignes fiançailles résiduelles dans les tables _20270628_.
-- Cible :
--   · l'ancien pôle "Cérémonie & animation" (singulier, sans s) → cascade FK
--   · les missions/checklists/items orphelins (1 571 lignes sans pôle)
-- Résultat attendu après exécution : 2 583 checklist items, 13 pôles.
-- NE TOUCHE PAS à "Cérémonies & animation" (pluriel, avec s).

-- ─── VÉRIFICATION AVANT SUPPRESSION ─────────────────────────────────────────
-- Exécuter ce bloc seul pour valider les comptes attendus (sans rien supprimer).

select
  'ancien pôle'                   as cible,
  count(distinct ci.id)           as checklist_items_concernes
from _20270628_poles p
join _20270628_domaines d   on d.pole_id    = p.id
join _20270628_missions m   on m.domaine_id = d.id
join _20270628_checklists c on c.owner_id   = m.id and c.owner_type = 'mission'
join _20270628_checklist_items ci on ci.checklist_id = c.id
where p.name = 'Cérémonie & animation'   -- singulier, ancien

union all

select
  'items sans pôle (orphelins)'   as cible,
  count(distinct ci.id)           as checklist_items_concernes
from _20270628_checklist_items ci
join _20270628_checklists c on c.id = ci.checklist_id
left join _20270628_missions m on m.id = c.owner_id and c.owner_type = 'mission'
left join _20270628_domaines d on d.id = m.domaine_id
left join _20270628_poles p    on p.id = d.pole_id
where p.id is null;

-- ─── SUPPRESSION ─────────────────────────────────────────────────────────────
-- Une fois les comptes validés (211 + 1 571 = 1 782), exécuter ce bloc.

-- 1. Ancien pôle "Cérémonie & animation" (cascade FK → domaines → missions → checklists → items)
delete from _20270628_poles
where name = 'Cérémonie & animation';

-- 2. Missions orphelines (domaine supprimé ou inexistant)
delete from _20270628_missions
where domaine_id not in (select id from _20270628_domaines);

-- 3. Checklists orphelines (mission supprimée ou inexistante)
delete from _20270628_checklists
where owner_type = 'mission'
  and owner_id not in (select id from _20270628_missions);

-- 4. Checklist items orphelins (checklist supprimée ou inexistante)
delete from _20270628_checklist_items
where checklist_id not in (select id from _20270628_checklists);

-- ─── CONTRÔLE FINAL ──────────────────────────────────────────────────────────
select
  (select count(*) from _20270628_poles)           as poles,
  (select count(*) from _20270628_domaines)        as domaines,
  (select count(*) from _20270628_missions)        as missions,
  (select count(*) from _20270628_checklist_items) as checklist_items;
-- Résultat attendu : 13 pôles, 157 domaines, 373 missions, 2 583 items
