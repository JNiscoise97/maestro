-- Origine des demandes d'accès : galerie photos (/photos) ou invitation (/Sarah-Jordan-2027/invitation).
-- Même base de comptes pour les deux interfaces ; l'origine sert aux e-mails (demandeur et admins)
-- et à l'affichage dans les écrans d'administration.
-- Pas de nouvelle table : la RLS existante de _20260725_gal_access_requests (admin_all) s'applique.

alter table public._20260725_gal_access_requests
  add column if not exists source text not null default 'photos';

alter table public._20260725_gal_access_requests
  drop constraint if exists _20260725_gal_access_requests_source_check;
alter table public._20260725_gal_access_requests
  add constraint _20260725_gal_access_requests_source_check check (source in ('photos', 'invitation'));
