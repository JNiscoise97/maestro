-- 0153_galerie_privee_admin_email.sql
-- Déclare l'adresse administrateur de la galerie privée : le compte admin est créé
-- à la première connexion sur /photos (edge function gallery-identify).
-- Réexécutable sans risque.

insert into public._20260725_gal_admin_emails (email)
values ('sj18082020@gmail.com')
on conflict (email) do nothing;

-- Contrôle (attendu : 1 ligne)
select email from public._20260725_gal_admin_emails where email = 'sj18082020@gmail.com';
