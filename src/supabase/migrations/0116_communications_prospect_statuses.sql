-- Filtre par prospectStatus sur les communications (Liste A, Liste B, etc.)
alter table _20260725_communications add column if not exists target_prospect_statuses text[] null;
alter table _20270628_communications add column if not exists target_prospect_statuses text[] null;
