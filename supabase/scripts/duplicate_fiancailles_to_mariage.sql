-- ============================================================
-- Duplication fiançailles (_20260725_) → mariage (_20270628_)
-- Hiérarchie complète : Pôles → Domaines → Missions → Checklists → Items
--
-- Prérequis :
--   - Migration 0136 appliquée (colonne sequence_id présente)
--   - Tables _20270628_ vides (poles, domaines, missions, checklists, checklist_items)
--   - Lancer dans l'éditeur SQL Supabase (rôle service_role)
-- ============================================================

with

-- ── 1. Pôles ────────────────────────────────────────────────
pole_map as materialized (
  select
    id                  as old_id,
    gen_random_uuid()   as new_id,
    name,
    sort_order
  from _20260725_poles
),

-- ── 2. Domaines ─────────────────────────────────────────────
domaine_map as materialized (
  select
    d.id                as old_id,
    gen_random_uuid()   as new_id,
    d.name,
    d.slug,
    d.sort_order,
    d.description,
    d.phase,
    d.icon,
    d.color,
    d.solicited_milestone,
    pm.new_id           as new_pole_id
  from _20260725_domaines d
  left join pole_map pm on d.pole_id = pm.old_id
),

-- ── 3. Missions ─────────────────────────────────────────────
mission_map as materialized (
  select
    m.id                as old_id,
    gen_random_uuid()   as new_id,
    m.title,
    m.description,
    m.prerequisites,
    m.sort_order,
    m.scheduling_type,
    dm.new_id           as new_domaine_id
  from _20260725_missions m
  left join domaine_map dm on m.domaine_id = dm.old_id
),

-- ── 4. Checklists ────────────────────────────────────────────
-- owner_type peut être 'mission' ou 'domaine'
checklist_map as materialized (
  select
    c.id                as old_id,
    gen_random_uuid()   as new_id,
    c.owner_type,
    c.title,
    case
      when c.owner_type = 'mission' then mm.new_id
      when c.owner_type = 'domaine' then dm.new_id
      else null
    end                 as new_owner_id
  from _20260725_checklists c
  left join mission_map mm on c.owner_type = 'mission'  and c.owner_id = mm.old_id
  left join domaine_map dm on c.owner_type = 'domaine' and c.owner_id = dm.old_id
),

-- ── Insertions ───────────────────────────────────────────────

insert_poles as (
  insert into _20270628_poles (id, name, sort_order, sequence_id)
  select new_id, name, sort_order, null
  from pole_map
),

insert_domaines as (
  insert into _20270628_domaines (
    id, pole_id, name, slug, sort_order, description,
    phase, icon, color, solicited_milestone, sequence_id
    -- preferred_contact_id laissé à NULL : UUID fiançailles invalide côté mariage
  )
  select
    new_id, new_pole_id, name, slug, sort_order, description,
    phase, icon, color, solicited_milestone, null
  from domaine_map
),

insert_missions as (
  insert into _20270628_missions (
    id, domaine_id, title, description, prerequisites,
    status, sort_order, scheduling_type, sequence_id
    -- scheduled_*_date/time et responsible_* laissés à NULL
  )
  select
    new_id, new_domaine_id, title, description, prerequisites,
    'pending', sort_order, scheduling_type, null
  from mission_map
),

insert_checklists as (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select new_id, owner_type, new_owner_id, title
  from checklist_map
  where new_owner_id is not null
)

-- ── 5. Checklist items ───────────────────────────────────────
-- Assignees, dates et ros_message_id remis à zéro
insert into _20270628_checklist_items (
  id, checklist_id, label, is_done, sort_order,
  priority, status, task_scheduling_type, task_phase
)
select
  gen_random_uuid(),
  cm.new_id,
  ci.label,
  false,
  ci.sort_order,
  ci.priority,
  'todo',
  ci.task_scheduling_type,
  ci.task_phase
from _20260725_checklist_items ci
join checklist_map cm on ci.checklist_id = cm.old_id
where cm.new_owner_id is not null;
