-- Champ booléen pour signaler les personnes que Jordan/Sarah pensent ne pas voir venir
alter table _20260725_guests add column if not exists likely_absent boolean not null default false;
alter table _20270628_guests add column if not exists likely_absent boolean not null default false;
