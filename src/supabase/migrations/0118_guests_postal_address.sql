-- Adresse postale complète (pour l'envoi papeterie)
alter table _20260725_guests
  add column if not exists postal_address text null;

alter table _20270628_guests
  add column if not exists postal_address text null;
