-- 0142_checklist_items_retroplanning_dates.sql
-- Complète le rétroplanning des items (cf. 0140) :
--   · ideal_start_date : date à partir de laquelle il est idéal de commencer
--   · target_date      : date cible de réalisation (deadline_date = date limite)
-- Pas de nouvelle table → RLS inchangée.

alter table public._20270628_checklist_items
  add column if not exists ideal_start_date date null,
  add column if not exists target_date      date null;
