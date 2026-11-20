/** Adresse de l'interface invitation (doit correspondre à la route de src/app/routes.tsx et aux e-mails). */
export const INVITATION_PATH = "/Jordan-Sarah-2027/invitation"

/** Écrans de l'invitation, chacun à sa propre adresse. */
export const INVITATION_ROUTES = {
  /** 1. Accueil public : bouton « Accéder à mon invitation ». */
  landing: INVITATION_PATH,
  /** 2. Connexion (même parcours que /photos : e-mail → code ou année de naissance). */
  login: `${INVITATION_PATH}/connexion`,
  /** 3. Enveloppe fermée. */
  envelope: `${INVITATION_PATH}/enveloppe`,
  /** 4. Enveloppe ouverte : message personnalisé. */
  opened: `${INVITATION_PATH}/enveloppe-ouverte`,
  /** 5. Invitation complète. */
  details: `${INVITATION_PATH}/details`,
  /** Administration (lien des e-mails : …/admin/acces). */
  admin: `${INVITATION_PATH}/admin/acces`,
} as const

/**
 * Photos plein écran de l'accueil (/Jordan-Sarah-2027/invitation), une par format :
 *   - ordinateur (écran de 640 px de large et plus) : photo en paysage, idéalement 2400 × 1600 px ;
 *   - téléphone (moins de 640 px)                    : photo en portrait, idéalement 1080 × 1920 px.
 * Provisoires : paysages Unsplash (licence libre). Pour les remplacer, déposer les images dans
 * public/sj-invitation/ (accueil-ordinateur.jpg et accueil-telephone.jpg) puis remplacer ces valeurs
 * par "/sj-invitation/accueil-ordinateur.jpg" et "/sj-invitation/accueil-telephone.jpg".
 */
// entete.webp : tirée de IMG_7794.JPG (photo d'en-tête de la page de détails jusqu'au 17/11).
export const LANDING_PHOTO_DESKTOP = "/sj-invitation/entete.webp"
export const LANDING_PHOTO_MOBILE = "/sj-invitation/entete.webp"

/** Sous-titre de l'en-tête « Sarah & Jordan » sur l'invitation (la galerie garde celui des fiançailles). */
export const INVITATION_SUBTITLE = "Mariage · juin 2027"
