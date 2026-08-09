alter table _20260725_gifts add column if not exists gift_type text;
alter table _20260725_gifts add column if not exists has_card boolean not null default false;
