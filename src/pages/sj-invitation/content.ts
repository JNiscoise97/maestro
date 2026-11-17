/**
 * Contenu de l'invitation complète (/Sarah-Jordan-2027/invitation/details).
 *
 * Tout le texte de la page est ici : il suffit de remplacer les valeurs.
 * Un texte qui commence par « À compléter » s'affiche en italique grisé, pour repérer ce qui manque.
 * Ordre de la page : invitation → mot → programme → lieux → ambiance & tenues → cortège → venir & se loger → liste → FAQ → réponse.
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
  context: "Les festivités se dérouleront en plusieurs temps, civils, religieux et conviviaux, du vendredi 25 au lundi 28 juin 2027. Les lieux ne pouvant pas tous accueillir l'ensemble des invités, chacun est convié à une partie de ces moments.",
  /** Dernière phrase de l'invitation. */
  invite: "Ils vous prient de partager avec eux ceux présentés ci-dessous.",
}

// ── 2. Un mot de nous ─────────────────────────────────────────────────────────
// Ce texte est lu par tous les invités : ne pas y citer de moment réservé à certains.

export const OUR_WORD = {
  paragraphs: [
    "Il y a des moments qu'on ne veut vivre qu'entourés de ceux qu'on aime. Notre mariage en fait partie, et tu en fais partie.",
    "Nos familles, nos amis et nos origines ont fait de nous ce que nous sommes. Pour notre mariage, nous voulons tout réunir : la tradition, l'émotion, les rires et une grande fête.",
    "Viens comme tu es, avec ta bonne humeur et l'envie de danser. Nous avons hâte de te retrouver.",
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
      text: "Pour le « oui » officiel et le goûter d'honneur, une ambiance cocktail : robe, costume ou tenue habillée.",
      tenues: ["cocktail-courte"],
    },
    {
      date: "2027-06-26", mood: "Détente",
      text: "Pique-nique et soirée jeux : une tenue décontractée, dans laquelle tu te sens à l'aise.",
      tenues: ["detente"],
    },
    {
      date: "2027-06-27", mood: "Indienne",
      text: "Pour le Nikkah, une tenue indienne si tu le souhaites : sari, lehenga, kurta…",
      tenues: ["indienne-lehenga", "indienne-sari"],
    },
    {
      date: "2027-06-28", mood: "Élégante et festive",
      text: "Nous imaginons une ambiance élégante et festive, qui mêlera des influences gujaraties, malgaches, réunionnaises et guadeloupéennes. Les tenues traditionnelles ou inspirées de tes origines sont les bienvenues, sans être obligatoires : costume, robe élégante, sari, kurta, lamba, tenue créole ou tenue de soirée.",
      tenues: ["creole-madras", "cocktail-drapee", "indienne-sari", "malgache-lamba", "cocktail-longue", "creole-fleurie", "indienne-lehenga", "cocktail-courte"],
    },
  ] as { date: string; mood: string; text: string; note?: string; tenues: Tenue[] }[],
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
  /** Hébergements conseillés. */
  stays: [
    { name: "Centre-ville de Montpellier", details: "Le plus pratique pour la mairie et l'église, avec de nombreux hôtels et locations.", url: "" },
    { name: "Quartier Odysseum et Port Marianne", details: "Proche des grands axes, pratique pour rejoindre les lieux situés hors de la ville.", url: "" },
  ],
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
