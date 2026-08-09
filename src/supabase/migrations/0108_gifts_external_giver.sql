-- Cadeaux offerts par des personnes hors liste invités (virement, etc.)
alter table _20260725_gifts add column if not exists external_giver_name text;
