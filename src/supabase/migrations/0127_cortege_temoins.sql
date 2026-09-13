-- Cortège : ajout compteurs témoins (marié + mariée)

alter table _20260725_cortege_config add column if not exists temoins_marie_count  int not null default 0;
alter table _20260725_cortege_config add column if not exists temoins_mariee_count int not null default 0;

alter table _20270628_cortege_config add column if not exists temoins_marie_count  int not null default 0;
alter table _20270628_cortege_config add column if not exists temoins_mariee_count int not null default 0;
