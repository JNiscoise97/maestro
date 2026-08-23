-- Suivi papeterie : type de courrier papier et statut d'envoi
alter table _20260725_guests
  add column if not exists paper_type text check (paper_type in ('invitation', 'faire_part')) null,
  add column if not exists paper_sent boolean not null default false;

alter table _20270628_guests
  add column if not exists paper_type text check (paper_type in ('invitation', 'faire_part')) null,
  add column if not exists paper_sent boolean not null default false;
