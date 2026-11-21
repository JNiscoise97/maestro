-- 0185_galerie_code_connexion.sql
-- Code de connexion par mail géré par gallery-identify (et non plus envoyé par Supabase Auth) :
--   · un code reste valable 30 minutes ; toute nouvelle demande dans ce délai renvoie le MÊME code
--     (pas de nouveau code qui annule et remplace le précédent) ;
--   · le mail est envoyé par la fonction (Resend), avec un texte adapté (invitation ou galerie, FR ou EN).
-- Le code est généré par Supabase Auth (auth.admin.generateLink → email_otp) puis vérifié par le
-- navigateur avec verifyOtp, comme avant.
--
-- Table de la galerie : RLS activée SANS politique (lecture et écriture réservées à la clé service,
-- donc à la fonction). Jamais lisible par le navigateur. Réexécutable sans risque.

create table if not exists public._20260725_gal_login_codes (
  email      text primary key,
  code       text not null,
  -- Création du code : il expire 30 minutes plus tard.
  created_at timestamptz not null default now(),
  -- Dernier envoi du mail (renvoi du même code limité à un par minute).
  sent_at    timestamptz not null default now()
);

alter table public._20260725_gal_login_codes enable row level security;
revoke all on public._20260725_gal_login_codes from anon, authenticated;
