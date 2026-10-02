-- 0141_milestone_direct_fk.sql
-- Remplace la relation N:N checklist_item_milestones
-- par une FK directe milestone_id sur checklist_items (1 jalon par item).

-- La table N:N créée dans 0140 n'est plus utilisée.
drop table if exists public._20270628_checklist_item_milestones;

-- FK directe : chaque item appartient à au plus un jalon.
alter table public._20270628_checklist_items
  add column if not exists milestone_id uuid null
    references public._20270628_milestones(id) on delete set null;
