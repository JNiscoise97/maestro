/**
 * Contenu de l'invitation complète (/Sarah-Jordan-2027/invitation/details).
 *
 * Tout le texte de la page est ici : il suffit de remplacer les valeurs.
 * Un texte qui commence par « À compléter » s'affiche en italique grisé, pour repérer ce qui manque.
 * Ordre de la page : mot → invitation → programme → lieux → ambiance & tenues → cortège → venir & se loger → liste → FAQ → réponse.
 */

export const TODO = "À compléter"
export const isTodo = (s: string | null | undefined) => !s || s.startsWith(TODO)

// ── En-tête ───────────────────────────────────────────────────────────────────

export const HERO = {
  /** Sous les prénoms. */
  dates: "Du vendredi 25 au lundi 28 juin 2027",
  place: "Montpellier",
}

// ── 1. L'invitation (faire-part) ──────────────────────────────────────────────

export const INVITATION = {
  /** Parents de la mariée, un nom par ligne. */
  brideParents: ["M. Fida Aly HASSANALY", "Mme Marie RASOANANDRASANA"],
  /** Parents du marié, un nom par ligne. */
  groomParents: ["M. Georges NISÇOISE", "Mme Corine NISÇOISE"],
  /** Texte d'annonce, entre les parents et les prénoms. */
  announce: "ont la joie de vous faire part du mariage de leurs enfants",
  /** Sous les prénoms : le jour du mariage (le même que sur le carton de l'enveloppe). */
  date: "qui sera célébré le lundi 28 juin 2027 à Montpellier.",
  /** Explique pourquoi les festivités durent quatre jours et pourquoi chacun n'est pas convié à tout. */
  context: "Les festivités se dérouleront en plusieurs temps (civils, religieux et conviviaux) du vendredi 25 au lundi 28 juin 2027. Les lieux ne pouvant pas tous accueillir l'ensemble des invités, chacun est convié à une partie de ces moments.",
}

// ── 2. Un mot de nous ─────────────────────────────────────────────────────────
// Ce texte est lu par tous les invités : ne pas y citer de moment réservé à certains.

export const OUR_WORD = {
  paragraphs: [
    "Il y a des moments qu'on imagine et qui deviennent encore plus beaux lorsqu'on pense aux personnes avec qui on va les partager.",
    "Pour notre mariage, nous avons eu envie de réunir nos familles, nos amis, nos cultures et nos traditions, le temps de journées qui nous ressemblent.",
    "Des moments solennels aux instants les plus simples, nous espérons surtout des retrouvailles, des conversations qui n'en finissent pas, des éclats de rire, quelques larmes de joie et beaucoup de danse.",
    "Nous avons hâte de vivre tout cela avec toi et de créer ensemble des souvenirs qui nous accompagneront longtemps.",
  ],
  signature: "Sarah & Jordan",
}

// ── 3. Programme ──────────────────────────────────────────────────────────────
// Chaque invité ne voit que les moments auxquels il est convié, tels que cochés dans
// l'appli mariage (Invités › Séquences). Le lien se fait par sequenceId (table _20270628_event_sequences).

export type Moment = {
  /** Séquence de l'appli mariage : décide qui voit ce moment. */
  sequenceId: string
  /** Heure de début (et de fin si utile), ex. « 15 h 30 » ou « 15 h 30 – 17 h ». */
  time: string
  title: string
  text: string
  /** Identifiant du lieu (voir PLACES ci-dessous). */
  placeId: string
  /** Tenue conseillée pour ce moment (facultatif). */
  dressCode?: string
  /** Capacité limitée : affiche la mention « Places limitées ». */
  limited?: boolean
  /** Pastille d'avertissement affichée sous le texte (ex. moment sous réserve). */
  warning?: string
}

export type Day = {
  /** Date au format AAAA-MM-JJ : sert aussi au formulaire de réponse (« jours de présence »). */
  date: string
  /** Libellé affiché, ex. « Vendredi 25 juin ». */
  label: string
  moments: Moment[]
}

export const PROGRAMME = {
  /** Invité à tous les moments. */
  titleAll: "Neuf moments à vivre",
  introAll: "Du vendredi au lundi, neuf moments pour célébrer ensemble : des plus officiels aux plus festifs.",
  /** Invité à une partie des moments : « {n} » est remplacé par le nombre en lettres (« Trois moments »…). */
  titleSome: "{n} à partager",
  introSome: "Voici les moments que nous serions heureux de vivre avec toi.",
  /** Affiché quand au moins un des moments de l'invité est à places limitées. */
  limitedNote: "Les moments marqués « places limitées » se déroulent en comité restreint : merci de nous confirmer ta présence au plus tôt.",
  /** Compte non rattaché à la liste des invités : seuls les moments sans places limitées s'affichent. */
  /** Invité retrouvé mais aucune séquence cochée : programme pas encore préparé (ni lieux, ni formulaire de réponse). */
  pending: "Ton programme est en cours de préparation : reviens bientôt pour découvrir les moments que nous partagerons.",
  pendingReply: "Tu pourras nous répondre dès que ton programme sera prêt.",
  unknownNote: "Nous n'avons pas encore retrouvé ton invitation personnalisée : seuls les moments ouverts à tous s'affichent. N'hésite pas à nous écrire.",
}

export const DAYS: Day[] = [
  {
    date: "2027-06-25", label: "Vendredi 25 juin", moments: [
      { sequenceId: "443599cb-aec3-4071-9e55-5af87663ca58", time: "14 h 30", title: "Mariage civil", text: "Le « oui » officiel", placeId: "mairie", limited: true },
      { sequenceId: "579716f5-2616-4dc0-ba77-133ed8826510", time: "16 h – 18 h 30", title: "Goûter d'honneur", text: "Douceurs et champagne", placeId: "terrasse", limited: true },
    ],
  },
  {
    date: "2027-06-26", label: "Samedi 26 juin", moments: [
      { sequenceId: "52990fa4-fc1e-4b99-b51d-50b1efef38a9", time: "12 h", title: "Pique-nique partagé", text: "Chacun apporte un plat", placeId: "pique-nique" },
      { sequenceId: "5347d0f2-31b0-4e69-9a8f-f6f3d10c0969", time: "18 h 30 – minuit", title: "Soirée conviviale", text: "Soirée jeux entre invités de notre génération", placeId: "doppio", limited: true },
    ],
  },
  {
    date: "2027-06-27", label: "Dimanche 27 juin", moments: [
      { sequenceId: "493c6164-7ff2-4c87-a037-b59c6bcfe008", time: "14 h 30", title: "Nikkah", text: "Bénédiction religieuse indienne selon la tradition musulmane ismaélienne", placeId: "khane", dressCode: "indienne si souhaitée", limited: true, warning: "À confirmer : nous faisons tout pour qu'il ait lieu" },
    ],
  },
  {
    date: "2027-06-28", label: "Lundi 28 juin", moments: [
      { sequenceId: "19eb750b-88d2-471e-b06d-749da2ee40c6", time: "Matinée", title: "Préparation des mariés", text: "Brunch, mise en beauté, habillage", placeId: "villas", limited: true },
      { sequenceId: "baf9abc9-74fb-4273-a9ff-cd60a64bf5ec", time: "15 h 30", title: "Bénédiction à l'église", text: "Bénédiction religieuse selon la tradition catholique", placeId: "eglise" },
      { sequenceId: "e19ecc45-67ae-4319-9887-6d67b39ed24e", time: "17 h 00", title: "Séance photo", text: "Portraits et photos de groupe", placeId: "photo" },
      { sequenceId: "c14a9820-2d9f-466f-9d19-1b732b2733c1", time: "17 h 30 – fin de nuit", title: "Célébration de mariage", text: "Cocktail et dîner dansant", placeId: "ostara" },
    ],
  },
]

// ── 4. Les lieux ──────────────────────────────────────────────────────────────

export type Place = {
  id: string
  name: string
  address: string
  /** Accès, parking, navette… (facultatif). */
  access?: string
}

/** Seuls les lieux des moments de l'invité s'affichent, avec les horaires repris du programme. */
export const PLACES: Place[] = [
  { id: "mairie", name: "Hôtel de Ville de Montpellier", address: "1 place Georges Frêche, 34000 Montpellier", access: "Accessible en tramway. Parkings payants à proximité." },
  { id: "terrasse", name: "La Terrasse by La Salle", address: "Rooftop du complexe La Salle, Mauguio" },
  { id: "pique-nique", name: "Pique-nique en plein air", address: "Lieu communiqué prochainement", access: "" },
  { id: "doppio", name: "Doppio Malto", address: "Centre commercial Odysseum, Montpellier", access: "Étage du restaurant privatisé pour l'occasion." },
  { id: "khane", name: "Jamatkhana de Montpellier", address: "85 rue du Pr Antonin Balmès, ZAC de Tournezy, 34070 Montpellier" },
  { id: "villas", name: "Les villas des mariés", address: "Villa des filles : 191 rue Adrienne Boland, 34070 Montpellier · Villa des garçons : 14 impasse du Roitelet, Mauguio" },
  { id: "eglise", name: "Église Saint-Cléophas", address: "2 place de l'Abbé Crébassol, 34070 Montpellier" },
  { id: "photo", name: "Séance photo", address: "Lieu communiqué prochainement" },
  { id: "ostara", name: "Domaine Ostara", address: "134 chemin de la Pierre Bleue, Castries", access: "Parking sur place. À une vingtaine de minutes de Montpellier en voiture : pense au **covoiturage** et à désigner un conducteur pour le retour." },
]

// ── 4 bis. Ambiance & tenues ──────────────────────────────────────────────────

/** Illustrations de tenues (public/sj-invitation/tenue-*.webp). */
export type Tenue =
  | "cocktail-longue" | "cocktail-drapee" | "cocktail-courte" | "indienne-lehenga" | "indienne-sari"
  | "malgache-lamba" | "creole-madras" | "creole-fleurie" | "detente"

/**
 * Pas de dress code : une ambiance par jour, pour orienter sans imposer (réponse aux questions des invités).
 * Chaque jour ne s'affiche que si l'invité est convié à au moins un moment de ce jour (même date que DAYS).
 */
export const AMBIANCE = {
  intro: "Pas de dress code ni de couleurs imposées : chacun s'habille comme il le souhaite.",
  why: "Comme plusieurs d'entre vous nous ont posé la question, voici l'ambiance que nous imaginons pour chaque journée. De simples pistes pour t'inspirer, **rien d'obligatoire**.",
  days: [
    {
      date: "2027-06-25", mood: "Solennelle et chic",
      text: "Pour {moments}, une ambiance cocktail : robe, costume ou tenue habillée.",
      moments: { "443599cb-aec3-4071-9e55-5af87663ca58": "le « oui » officiel", "579716f5-2616-4dc0-ba77-133ed8826510": "le goûter d'honneur" },
      tenues: ["cocktail-courte"],
    },
    {
      date: "2027-06-26", mood: "Détente",
      text: "Pour {moments}, une tenue décontractée, dans laquelle tu te sens à l'aise.",
      moments: { "52990fa4-fc1e-4b99-b51d-50b1efef38a9": "le pique-nique", "5347d0f2-31b0-4e69-9a8f-f6f3d10c0969": "la soirée jeux" },
      tenues: ["detente"],
    },
    {
      date: "2027-06-27", mood: "Indienne",
      text: "Pour {moments}, une tenue indienne si tu le souhaites : sari, lehenga, kurta…",
      moments: { "493c6164-7ff2-4c87-a037-b59c6bcfe008": "le Nikkah" },
      tenues: ["indienne-sari"],
    },
    {
      date: "2027-06-28", mood: "Élégante et festive",
      text: "Nous imaginons une ambiance élégante et festive, qui mêlera des influences gujaraties, malgaches, réunionnaises et guadeloupéennes. Les tenues traditionnelles ou inspirées de tes origines sont les bienvenues, sans être obligatoires : costume, robe élégante, sari, kurta, lamba, tenue créole ou tenue de soirée.",
      tenues: ["creole-fleurie", "indienne-lehenga", "cocktail-drapee", "creole-madras", "malgache-lamba"],
    },
  ] as {
    date: string; mood: string
    /** « {moments} » = moments du jour auxquels l'invité est convié, d'après `moments` (« le pique-nique et la soirée jeux »). */
    text: string
    moments?: Record<string, string>
    note?: string; tenues: Tenue[]
  }[],
}

// ── 5. Le cortège (facultatif : mettre show à false pour masquer la section) ───

export const CORTEGE = {
  /** Masquée tant que les noms ne sont pas renseignés : remplacer les noms puis passer à true. */
  show: false,
  intro: "Ils nous accompagnent depuis toujours et seront à nos côtés ce jour-là. N'hésite pas à te tourner vers eux.",
  groups: [
    { title: "Témoins de la mariée", people: [{ name: `${TODO}`, role: "" }] },
    { title: "Témoins du marié", people: [{ name: `${TODO}`, role: "" }] },
    { title: "Demoiselles et garçons d'honneur", people: [{ name: `${TODO}`, role: "" }] },
    { title: "Enfants d'honneur", people: [{ name: `${TODO}`, role: "" }] },
  ],
}

// ── 6. Venir & se loger ───────────────────────────────────────────────────────

export const TRAVEL = {
  /** Comment venir (train, avion, voiture…), un bloc par moyen. */
  getting: [
    { title: "En train", text: "Gare de Montpellier Saint-Roch, en plein centre-ville, ou gare Montpellier Sud de France pour certains TGV. Compte environ 3 h 30 depuis Paris." },
    { title: "En avion", text: "Aéroport Montpellier Méditerranée, à une vingtaine de minutes du centre en navette ou en taxi." },
    { title: "En voiture", text: "Les lieux sont répartis autour de Montpellier : une voiture facilite les déplacements. Le **covoiturage** entre invités est vivement encouragé." },
  ],
  /**
   * Hébergements conseillés. « {lieux} » = lieux de `places` où l'invité est convié (« la mairie et l'église ») ;
   * s'il n'est convié à aucun, `fallback` s'affiche à la place de `details`.
   */
  stays: [
    {
      name: "Centre-ville de Montpellier",
      details: "Le plus pratique pour {lieux}, avec de nombreux hôtels et locations.",
      fallback: "Au cœur de la ville, avec de nombreux hôtels et locations.",
      places: { mairie: "la mairie", eglise: "l'église" },
      url: "",
    },
    {
      name: "Quartier Odysseum et Port Marianne",
      details: "Proche des grands axes et {lieux}, pratique pour rejoindre les lieux situés hors de la ville.",
      fallback: "Proche des grands axes, pratique pour rejoindre les lieux situés hors de la ville.",
      places: { doppio: "du Doppio Malto" },
      url: "",
    },
  ] as { name: string; details: string; fallback: string; places: Record<string, string>; url: string }[],
}

// ── 7. Liste de mariage ───────────────────────────────────────────────────────

export const GIFTS = {
  text: "Ta présence à nos côtés est notre plus beau cadeau. Si tu le souhaites, une urne sera à ta disposition pendant la célébration.",
  /** Lien vers la cagnotte ou la liste (laisser vide pour ne pas afficher de bouton). */
  url: "",
  label: "Voir la liste",
}

// ── 8. FAQ ────────────────────────────────────────────────────────────────────
// Lue par tous les invités : ne pas y citer de moment réservé à certains.

export const FAQ: { q: string; a: string }[] = [
  { q: "Quand dois-je répondre à l'invitation ?", a: "Avant le 15 février 2027, grâce au formulaire « Seras-tu des nôtres ? » en bas de cette page. Tu pourras modifier ta réponse jusqu'à cette date." },
  { q: "Puis-je venir accompagné(e) d'un invité supplémentaire ?", a: "Ton invitation est nominative et indique les personnes conviées. Si tu souhaites venir accompagné(e), parle-nous-en avant de répondre." },
  { q: "Les enfants sont-ils les bienvenus ?", a: "Oui, les enfants mentionnés sur ton invitation sont les bienvenus. Ajoute-les un à un dans le formulaire de réponse (une case indique les moins de 10 ans)." },
  { q: "Puis-je venir seulement à certains moments ?", a: "Bien sûr. Le formulaire de réponse te demande ta présence moment par moment, pour chaque personne." },
  { q: "Le programme est-il le même pour tous les invités ?", a: "Non : certains lieux ont une capacité réduite. Cette page présente les moments auxquels tu es convié(e)." },
  // Questions ajoutées, à garder ou à supprimer :
  { q: "Y a-t-il un parking sur place ?", a: "Oui au Domaine Ostara. En centre-ville, privilégie le tramway ou les parkings publics." },
  { q: "Qui contacter en cas de question ou le jour J ?", a: "Écris-nous directement pour toute question. Le jour J, nos témoins seront tes interlocuteurs." },
]

// ── 9. Votre réponse ──────────────────────────────────────────────────────────

export const RSVP = {
  /** Date limite affichée au-dessus du formulaire. */
  deadline: "15 février 2027",
  /** Même date, au format AAAA-MM-JJ (graphique de suivi dans l'appli). */
  deadlineDate: "2027-02-15",
  intro: "Nous serions très heureux de te compter parmi nous pour célébrer notre mariage, entourés de nos familles et de nos proches. Merci de confirmer ta présence en remplissant ce formulaire, étape par étape.",
  /** Titres des étapes (l'étape « Tes moments » n'apparaît que si l'invité est convié à plusieurs moments). */
  steps: { presence: "Ta présence", moments: "Tes moments", party: "Qui vient avec toi", word: "Un petit mot" },
  name: { label: "Quel est ton nom ?", help: "Prénom et nom de la personne qui remplit ce formulaire." },
  attendance: {
    label: "Seras-tu présent ?",
    help: "Seras-tu présent à notre mariage, en juin 2027 à Montpellier ?",
    yes: "Oui, avec plaisir",
    no: "Non, malheureusement",
    unsure: "Je ne sais pas encore",
  },
  moments: { label: "À quels moments seras-tu présent ?", help: "Réponds pour chacun des moments." },
  /** Réponses possibles pour chaque moment. */
  answers: { yes: "Oui", no: "Non", unsure: "Je ne sais pas encore" },
  /** Sélection rapide : même réponse pour tous les moments. */
  answersAll: { label: "Sélection rapide :", yes: "Oui à tout", no: "Non à tout", unsure: "Je ne sais pas à tout" },
  party: {
    label: "Qui vient avec toi ?",
    help: "Indique tes éventuelles restrictions alimentaires, puis ajoute chaque personne pour laquelle tu réponds (conjoint, enfants…) avec sa présence à chaque moment.",
    add: "Ajouter une personne",
    under10: "Moins de 10 ans",
    alone: "Personne d'autre : tu réponds pour toi seul.",
  },
  dietary: {
    label: "Restrictions alimentaires",
    /** Posée pour chaque personne. Case à cocher : la zone de texte n'apparaît que si elle est cochée. */
    checkSelf: "J'ai des allergies ou des restrictions alimentaires",
    checkOther: "A des allergies ou des restrictions alimentaires",
    help: "Précise lesquelles.",
  },
  message: { label: "Un petit mot pour nous ?", help: "Message libre (facultatif)." },
}

// ── Remerciement (polaroïd et petit mot, en bas de page) ──────────────────────

export const THANKS = {
  title: "Merci !",
  text: "Ta présence rendra notre mariage encore plus beau. Nous avons tellement hâte de vivre ces moments avec toi.",
  closing: "Avec tout notre amour,",
  signature: "Sarah & Jordan",
}

// ── Textes d'interface (boutons, formulaire, enveloppe, messages) ─────────────
// Même structure dans content-en.ts (version anglaise).

export const UI = {
  subtitle: "Mariage · juin 2027",
  common: {
    loading: "Chargement…",
    signOut: "Se déconnecter",
    admin: "Administration",
    unavailable: "Invitation indisponible",
    missingConfig: "Configuration Supabase manquante.",
    notFound: "Page introuvable",
    accountMissing: "Compte introuvable",
    accountMissingText: "Ton accès n'est pas (ou plus) actif.",
    suspended: "Accès suspendu",
    suspendedText: "Ton compte a été désactivé. Contacte Sarah ou Jordan si besoin.",
    and: "et",
    langLabel: "Langue",
  },
  landing: { cta: "Accéder à mon invitation" },
  envelope: {
    open: "Ouvrir l'enveloppe",
    letterFor: (name: string) => `Une lettre pour ${name || "toi"}`,
    hello: (name: string) => `Bonjour ${name || "à toi"},`,
    /** **texte** = en gras. */
    letter: [
      "Nous avons la joie de t'inviter à notre mariage, le **lundi 28 juin 2027** à **Montpellier**.",
      "Sur ce site, tu trouveras le déroulé des festivités et tout ce qu'il faut savoir pour profiter pleinement de ce moment avec nous.",
    ],
    close: "Refermer l'enveloppe",
    discover: "Découvrir l'invitation",
  },
  nav: {
    aria: "Rubriques de l'invitation",
    invitation: "Invitation", mot: "Un mot", programme: "Programme", lieux: "Lieux", ambiance: "Tenues",
    cortege: "Cortège", venir: "Venir & dormir", liste: "Liste", faq: "Questions", reply: "Répondre",
  },
  hero: {
    intro: (first: string) => (first ? `${first}, voici tout ce qu'il faut savoir sur notre mariage.` : "Voici tout ce qu'il faut savoir sur notre mariage."),
    scroll: "Découvrir la suite",
  },
  preview: { label: "Aperçu administrateur", all: "Tout le programme", pdf: "Télécharger en PDF", pdfBusy: "Préparation…" },
  sections: {
    invitation: { eyebrow: "Faire-part", title: "L'invitation" },
    mot: { eyebrow: "De tout cœur", title: "Un mot de nous" },
    programme: { eyebrow: "Programme", title: "Le programme", loadingTitle: "Ton programme", loading: "Chargement de ton programme…" },
    lieux: { eyebrow: "Où nous retrouver", title: "Les lieux" },
    ambiance: { eyebrow: "Ambiance & tenues", title: "Comment s'habiller ?" },
    cortege: { eyebrow: "À nos côtés", title: "Le cortège" },
    venir: { eyebrow: "Infos pratiques", title: "Venir & se loger" },
    liste: { eyebrow: "Si le cœur t'en dit", title: "Liste de mariage" },
    faq: { eyebrow: "Tes questions", title: "Questions fréquentes" },
    reponse: { eyebrow: "Confirmation de présence", title: "Seras-tu des nôtres ?" },
  },
  programme: {
    days: ["", "Un jour", "Deux jours", "Trois jours", "Quatre jours"],
    dress: "Tenue :",
    limited: "Places limitées",
  },
  places: { directions: "Itinéraire", mapAria: "Plan des lieux autour de Montpellier" },
  /** song : morceau joué en cliquant sur le tourne-disque (fichier dans public/sj-invitation/). */
  ambiance: { record: "Mettons l'ambiance", song: "/sj-invitation/ambiance.aac", play: "Lancer la musique", pause: "Mettre la musique en pause" },
  travel: { stay: "Où dormir", book: "Réserver" },
  polaroids: { first: "1ère photo de nous, 2020 !", mexico: "Mexique, 2023", reunion: "La Réunion, 2023", us: "À nous !" },
  rsvp: {
    before: "Merci de nous répondre avant le",
    stepsAria: "Étapes du formulaire",
    stepStatus: (n: number, total: number, name: string) => `Étape ${n} sur ${total} : ${name}`,
    firstName: "Prénom",
    lastName: "Nom",
    unlockName: "Modifier le nom",
    lockName: "Verrouiller le nom",
    total: (n: number) => `personne${n > 1 ? "s" : ""} au total, toi compris`,
    under10Count: (n: number) => ` · dont ${n} de moins de 10 ans`,
    you: "Toi",
    person: (n: number) => `Personne ${n}`,
    remove: "Retirer",
    firstNameOf: (n: number) => `Prénom de la personne ${n}`,
    lastNameOf: (n: number) => `Nom de la personne ${n}`,
    thisPerson: "Cette personne",
    messagePlaceholder: "Ton message",
    previous: "Précédent",
    next: "Suivant",
    sending: "Envoi…",
    send: "Envoyer ma réponse",
    cancel: "Annuler",
    dietDetails: "précisions",
    dietExample: "Ex. : allergie aux fruits à coque",
    errors: {
      name: "Merci d'indiquer ton prénom et ton nom.",
      presence: "Merci d'indiquer si tu seras présent.",
      moments: "Merci de répondre pour chacun des moments.",
      personName: (n: number) => `Merci d'indiquer le prénom et le nom de la personne ${n}.`,
      personMoments: (name: string) => `Merci d'indiquer la présence de ${name} à chacun des moments.`,
      diet: "Merci de préciser tes restrictions alimentaires, ou de décocher la case.",
      personDiet: (name: string) => `Merci de préciser les restrictions alimentaires de ${name}, ou de décocher la case.`,
      send: "L'envoi n'a pas abouti. Merci de réessayer.",
    },
    done: { yes: "Merci, à très bientôt !", no: "Merci de nous avoir répondu.", unsure: "Merci, tiens-nous au courant !" },
    savedOn: (date: string) => `Réponse enregistrée le ${date} :`,
    people: (n: number) => `${n} personne${n > 1 ? "s" : ""}`,
    under10: "moins de 10 ans",
    restrictions: "Restrictions :",
    edit: "Modifier ma réponse",
    /** Sous la réponse enregistrée, s'il reste des « je ne sais pas encore ». */
    unsureLater: "Tu hésites encore pour certains moments ? Tu peux revenir modifier ta réponse jusqu'au",
  },
  thanks: { aria: "Merci" },
  footer: { letter: "Revoir la lettre" },
  /** Nombre de moments en lettres (« Trois moments »). */
  momentsInWords: (n: number) => `${["Aucun", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"][n] ?? n} moment${n > 1 ? "s" : ""}`,
  /** Format des dates (réponse enregistrée le…). */
  locale: "fr-FR",
  /** Étiquettes du plan (par lieu ; plusieurs épingles : dans l'ordre de MAP_PINS). */
  mapLabels: {} as Record<string, string[]>,
}
