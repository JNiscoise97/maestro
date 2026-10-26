# Galerie privée — mise en service

Galerie des photos de fiançailles (CDCF v1.0 du 18/10/2026), servie sur `/photos`.
Prototype comparatif : `/photos/prototype`.

## 1. Base de données (éditeur SQL Supabase)

1. `supabase/migrations/0150_galerie_privee_socle.sql`
2. `supabase/migrations/0151_galerie_privee_complements.sql`
3. Déclarer les administrateurs (adresses en minuscules) :
   ```sql
   insert into public._20260725_gal_admin_emails (email) values ('adresse1@exemple.com'), ('adresse2@exemple.com');
   ```

## 2. Edge functions

```bash
npx supabase login
npx supabase link --project-ref <ref-du-projet>
npx supabase secrets set RESEND_API_KEY=re_... \
  MAIL_FROM="Sarah & Jordan <connexion@20260725.geniius.io>" \
  GALLERY_PUBLIC_URL=https://<domaine-du-site> \
  GALLERY_WEBHOOK_SECRET=<longue-chaine-aleatoire>
npx supabase functions deploy gallery-identify --no-verify-jwt
npx supabase functions deploy gallery-admin --no-verify-jwt
npx supabase functions deploy gallery-download --no-verify-jwt
npx supabase functions deploy gallery-notify --no-verify-jwt
```

Chaque fonction est un fichier unique et autonome (`supabase/functions/<nom>/index.ts`) : on peut aussi
la coller dans l'éditeur du tableau de bord (Edge Functions › Deploy a new function › nom exact), en
**désactivant « Verify JWT »** dans ses réglages.

`--no-verify-jwt` est voulu : les clés `sb_publishable_` ne sont pas des JWT ; chaque fonction
vérifie elle-même l'utilisateur (sauf `gallery-identify`, publique par nature, et `gallery-notify`,
protégée par le secret du webhook).

## 3. Alertes e-mail des signalements et connexions inhabituelles

Supabase › Database › Webhooks › Create :
- Table : `_20260725_gal_notifications`, événement **Insert**
- Type : Supabase Edge Function → `gallery-notify`, méthode POST
- En-tête HTTP : `x-webhook-secret: <GALLERY_WEBHOOK_SECRET>`

## 4. Authentification

- Modèle « Magic Link » (et « Confirm signup ») : `supabase/templates/email-code-acces.html`.
- Email OTP Expiration `900`, Email OTP Length `6`, SMTP Resend.
- Rate limit des e-mails relevé (ex. 100/h) avant l'ouverture.

## 5. Ouverture

Depuis `/photos/admin` (connecté avec une adresse administrateur) :
1. Réglages : direction artistique, défilement, texte d'accueil, **publier l'engagement de confidentialité**.
2. Photos : importer par album ; Accueil : choisir et ordonner les 50 photos.
3. Réglages : ouvrir la galerie (et dates d'ouverture/fermeture).
4. Partager le lien `https://<domaine-du-site>/photos`.

## Archive

`node supabase/scripts/export_galerie.mjs ./archive-galerie` (variables `SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY`) : originaux par album, renommés SJ-0001…, et catalogue JSON.

## Connexion par année de naissance (liste blanche, migration 0168)

- Admin › Accès › « Connexion par année de naissance » : choisir un compte invité et saisir son année.
- La personne saisit son e-mail puis son année : `gallery-identify` vérifie l'essai via
  `_20260725_gal_year_attempt` (atomique), puis génère un jeton à usage unique (`generateLink`, aucun mail)
  que le navigateur échange contre une session (`verifyOtp({ token_hash, type: "magiclink" })`).
- 2 années incorrectes → voie bloquée 1 h, code envoyé par mail, alerte aux admins ; « Débloquer » dans l'admin.
- Les comptes administrateurs ne sont jamais concernés (code par mail uniquement).
- Après la migration, redéployer `gallery-identify`.
