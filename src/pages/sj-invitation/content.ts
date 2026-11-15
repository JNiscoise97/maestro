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
  /** Texte sous les prénoms. */
  invite: "et vous prient de partager avec eux les moments de célébration présentés ci-dessous, à Montpellier.",
}

// ── 2. Un mot de nous ─────────────────────────────────────────────────────────
// Ce texte est lu par tous les invités : ne pas y citer de moment réservé à certains.

export const OUR_WORD = {
  paragraphs: [
    "Il y a des moments qu'on ne veut vivre qu'entourés de ceux qu'on aime. Notre mariage en fait partie, et vous en faites partie.",
    "Nos familles, nos amis et nos origines ont fait de nous ce que nous sommes. Pour notre mariage, nous voulons tout réunir : la tradition, l'émotion, les rires et une grande fête.",
    "Venez comme vous êtes, avec votre bonne humeur et l'envie de danser. Nous avons hâte de vous retrouver.",
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
  introSome: "Voici les moments que nous serions heureux de vivre avec vous.",
  /** Affiché quand au moins un des moments de l'invité est à places limitées. */
  limitedNote: "Les moments marqués « places limitées » se déroulent en comité restreint : merci de nous confirmer votre présence au plus tôt.",
  /** Compte non rattaché à la liste des invités : seuls les moments sans places limitées s'affichent. */
  unknownNote: "Nous n'avons pas encore retrouvé votre invitation personnalisée : seuls les moments ouverts à tous s'affichent. N'hésitez pas à nous écrire.",
}

export const DAYS: Day[] = [
  {
    date: "2027-06-25", label: "Vendredi 25 juin", moments: [
      { sequenceId: "443599cb-aec3-4071-9e55-5af87663ca58", time: "15 h", title: "Mariage civil", text: "Le « oui » officiel", placeId: "mairie", limited: true },
      { sequenceId: "579716f5-2616-4dc0-ba77-133ed8826510", time: "16 h – 18 h 30", title: "Goûter d'honneur", text: "Douceurs et champagne", placeId: "terrasse", limited: true },
    ],
  },
  {
    date: "2027-06-26", label: "Samedi 26 juin", moments: [
      { sequenceId: "52990fa4-fc1e-4b99-b51d-50b1efef38a9", time: "12 h", title: "Pique-nique partagé", text: "Chacun apporte un plat", placeId: "pique-nique" },
      { sequenceId: "5347d0f2-31b0-4e69-9a8f-f6f3d10c0969", time: "19 h – minuit", title: "Moment convivial entre amis", text: "Soirée jeux entre amis", placeId: "doppio", limited: true },
    ],
  },
  {
    date: "2027-06-27", label: "Dimanche 27 juin", moments: [
      { sequenceId: "493c6164-7ff2-4c87-a037-b59c6bcfe008", time: "15 h", title: "Nikkah", text: "Bénédiction religieuse indienne selon la tradition musulmane ismaélienne", placeId: "khane", dressCode: "tenue indienne", limited: true },
    ],
  },
  {
    date: "2027-06-28", label: "Lundi 28 juin", moments: [
      { sequenceId: "19eb750b-88d2-471e-b06d-749da2ee40c6", time: "Matinée", title: "Préparation des mariés", text: "Brunch, coiffure, habillage", placeId: "villas" },
      { sequenceId: "baf9abc9-74fb-4273-a9ff-cd60a64bf5ec", time: "16 h", title: "Bénédiction à l'église", text: "Bénédiction religieuse selon la tradition catholique", placeId: "eglise" },
      { sequenceId: "e19ecc45-67ae-4319-9887-6d67b39ed24e", time: "17 h 30", title: "Séance photo", text: "Portraits et photos de groupe", placeId: "photo" },
      { sequenceId: "c14a9820-2d9f-466f-9d19-1b732b2733c1", time: "19 h – fin de nuit", title: "Célébration de mariage", text: "Cocktail et dîner dansant", placeId: "ostara" },
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
  { id: "pique-nique", name: "Pique-nique en plein air", address: "Lieu communiqué prochainement", access: "Pensez à une couverture et à un chapeau." },
  { id: "doppio", name: "Doppio Malto", address: "Centre commercial Odysseum, Montpellier", access: "Étage du restaurant privatisé pour l'occasion." },
  { id: "khane", name: "Jamatkhana de Montpellier", address: "85 rue du Pr Antonin Balmès, ZAC de Tournezy, 34070 Montpellier" },
  { id: "villas", name: "Les villas des mariés", address: "Villa des filles : 191 rue Adrienne Boland, 34070 Montpellier · Villa des garçons : 14 impasse du Roitelet, Mauguio" },
  { id: "eglise", name: "Église Saint-Cléophas", address: "2 place de l'Abbé Crébassol, 34070 Montpellier" },
  { id: "photo", name: "Séance photo", address: "Lieu communiqué prochainement" },
  { id: "ostara", name: "Domaine Ostara", address: "134 chemin de la Pierre Bleue, Castries", access: "Parking sur place. À une vingtaine de minutes de Montpellier en voiture : pensez au covoiturage et à désigner un conducteur pour le retour." },
]

// ── 4 bis. Ambiance & tenues ──────────────────────────────────────────────────

/** Repris du faire-part des fiançailles : à relire et adapter pour le mariage. */
export const AMBIANCE = {
  text: "Nous imaginons une ambiance élégante et festive, qui mêlera des influences :",
  influences: ["gujaraties", "malgaches", "réunionnaises", "guadeloupéennes"],
  dress: "Les tenues traditionnelles ou inspirées de vos origines sont les bienvenues, sans être obligatoires :",
  examples: "costume, robe élégante, sari, kurta, tenue créole ou tenue de soirée.",
  avoid: "Merci d'éviter les tenues trop décontractées.",
  /** Précisions par moment : chacune ne s'affiche que si l'invité est convié à l'un des moments indiqués. */
  notes: [
    { text: "Nikkah : tenue indienne.", sequenceIds: ["493c6164-7ff2-4c87-a037-b59c6bcfe008"] },
    { text: "Pique-nique : tenue décontractée.", sequenceIds: ["52990fa4-fc1e-4b99-b51d-50b1efef38a9"] },
    { text: "Soirée entre amis : tenue décontractée.", sequenceIds: ["5347d0f2-31b0-4e69-9a8f-f6f3d10c0969"] },
    { text: "Célébration au domaine : prévoyez des chaussures confortables pour danser et une petite laine pour la nuit.", sequenceIds: ["c14a9820-2d9f-466f-9d19-1b732b2733c1"] },
  ],
}

// ── 5. Le cortège (facultatif : mettre show à false pour masquer la section) ───

export const CORTEGE = {
  /** Masquée tant que les noms ne sont pas renseignés : remplacer les noms puis passer à true. */
  show: false,
  intro: "Ils nous accompagnent depuis toujours et seront à nos côtés ce jour-là. N'hésitez pas à vous tourner vers eux.",
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
    { title: "En train", text: "Gare de Montpellier Saint-Roch, en plein centre-ville, ou gare Montpellier Sud de France pour certains TGV. Comptez environ 3 h 30 depuis Paris." },
    { title: "En avion", text: "Aéroport Montpellier Méditerranée, à une vingtaine de minutes du centre en navette ou en taxi." },
    { title: "En voiture", text: "Les lieux sont répartis autour de Montpellier : une voiture facilite les déplacements. Le covoiturage entre invités est vivement encouragé." },
  ],
  /** Hébergements conseillés. */
  stays: [
    { name: "Centre-ville de Montpellier", details: "Le plus pratique pour la mairie et l'église, avec de nombreux hôtels et locations.", url: "" },
    { name: "Quartier Odysseum et Port Marianne", details: "Proche des grands axes, pratique pour rejoindre les lieux situés hors de la ville.", url: "" },
  ],
}

// ── 7. Liste de mariage ───────────────────────────────────────────────────────

export const GIFTS = {
  text: "Votre présence à nos côtés est notre plus beau cadeau. Pour celles et ceux qui le souhaitent, une urne sera à votre disposition pendant la célébration.",
  /** Lien vers la cagnotte ou la liste (laisser vide pour ne pas afficher de bouton). */
  url: "",
  label: "Voir la liste",
}

// ── 8. FAQ ────────────────────────────────────────────────────────────────────
// Lue par tous les invités : ne pas y citer de moment réservé à certains.

export const FAQ: { q: string; a: string }[] = [
  { q: "Quand dois-je répondre à l'invitation ?", a: "Avant le 15 février 2027, grâce au formulaire « Votre réponse » en bas de cette page. Vous pourrez la modifier jusqu'à cette date." },
  { q: "Puis-je venir accompagné(e) d'un invité supplémentaire ?", a: "Votre invitation est nominative et indique les personnes conviées. Si vous souhaitez venir accompagné(e), parlez-nous-en avant de répondre." },
  { q: "Les enfants sont-ils les bienvenus ?", a: "Oui, les enfants mentionnés sur votre invitation sont les bienvenus. Indiquez-les dans la liste des personnes du formulaire de réponse." },
  { q: "Puis-je venir seulement à certains moments ?", a: "Bien sûr. Cochez simplement, dans le formulaire de réponse, les moments auxquels vous serez présents." },
  { q: "Le programme est-il le même pour tous les invités ?", a: "Non : certains lieux ont une capacité réduite. Cette page présente les moments auxquels vous êtes conviés." },
  { q: "Comment dois-je m'habiller ?", a: "Tout est expliqué dans la rubrique « Ambiance & tenues », et les tenues particulières figurent dans le programme." },
  { q: "Où puis-je dormir ?", a: "Nos adresses conseillées sont dans la rubrique « Venir & se loger »." },
  // Questions ajoutées, à garder ou à supprimer :
  { q: "Y a-t-il un parking sur place ?", a: "Oui au Domaine Ostara. En centre-ville, privilégiez le tramway ou les parkings publics." },
  { q: "Qui contacter en cas de question ou le jour J ?", a: "Écrivez-nous directement pour toute question. Le jour J, nos témoins seront vos interlocuteurs." },
]

// ── 9. Votre réponse ──────────────────────────────────────────────────────────

export const RSVP = {
  /** Date limite affichée au-dessus du formulaire. */
  deadline: "15 février 2027",
  intro: "Nous serions très heureux de vous compter parmi nous pour célébrer notre mariage, entourés de nos familles et de nos proches. Merci de bien vouloir confirmer votre présence en remplissant ce formulaire.",
  name: { label: "Quel est votre nom ?", help: "Prénom et nom de la personne qui remplit ce formulaire." },
  attendance: {
    label: "Serez-vous présents ?",
    help: "Serez-vous présents à notre mariage, en juin 2027 à Montpellier ?",
    yes: "Oui, avec plaisir",
    no: "Non, malheureusement",
  },
  /** Posée seulement si l'invité est convié à plusieurs moments. */
  moments: { label: "À quels moments serez-vous présents ?", help: "Décochez les moments auxquels vous ne pourrez pas venir." },
  partySize: { label: "Nombre de personnes concernées", help: "Merci d'indiquer le nombre de personnes pour lesquelles vous répondez (y compris vous-même)." },
  partyNames: {
    label: "Liste des personnes concernées",
    help: "Merci d'indiquer le prénom et le nom de toutes les personnes pour lesquelles vous répondez (y compris vous-même). Une ligne par personne.",
  },
  dietary: {
    label: "Restrictions alimentaires",
    help: "Certaines personnes ont-elles des allergies ou restrictions alimentaires ? Si oui, merci de préciser lesquelles et pour qui.",
  },
  message: { label: "Un petit mot pour nous ?", help: "Message libre (facultatif)." },
}

// ── Remerciement (polaroïd et petit mot, en bas de page) ──────────────────────

export const THANKS = {
  title: "Merci !",
  text: "Votre présence rendra notre mariage encore plus beau. Nous avons tellement hâte de vivre ces moments avec vous.",
  closing: "Avec tout notre amour,",
  signature: "Sarah & Jordan",
}
