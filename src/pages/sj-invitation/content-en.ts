/**
 * English version of the online invitation (same structure as ./content.ts).
 * Guests whose invitation language is set to English in the app (Invités › Invitations) see this text.
 * Keep sequenceId, placeId, dates and image names identical to content.ts.
 */

import type { Day, Place, Tenue } from "./content"

export { TODO, isTodo, type Day, type Moment, type Place, type Tenue } from "./content"

// ── Header ────────────────────────────────────────────────────────────────────

export const HERO = {
  dates: "From Friday 25 to Monday 28 June 2027",
  place: "Montpellier",
}

// ── 1. The invitation ────────────────────────────────────────────────────────

export const INVITATION = {
  brideParents: ["Mr Fida Aly HASSANALY", "Mrs Marie RASOANANDRASANA"],
  groomParents: ["Mr Georges NISÇOISE", "Mrs Corine NISÇOISE"],
  announce: "are delighted to announce the marriage of their children",
  date: "which will take place on Monday 28 June 2027 in Montpellier.",
  context: "The celebrations will unfold over several occasions (civil, religious and festive) from Friday 25 to Monday 28 June 2027. As not every venue can welcome all of the guests, you are invited to some of these moments.",
}

// ── 2. A word from us ────────────────────────────────────────────────────────

export const OUR_WORD = {
  paragraphs: [
    "Some moments we imagine become even more beautiful when we think of the people we will share them with.",
    "For our wedding, we wanted to bring together our families, our friends, our cultures and our traditions, over days that truly reflect who we are.",
    "From the solemn moments to the simplest ones, what we hope for most is reunions, conversations that never end, bursts of laughter, a few happy tears and lots of dancing.",
    "We can't wait to experience all of this with you and to create memories together that will stay with us for a long time.",
  ],
  signature: "Jordan & Sarah",
}

// ── 3. Programme ──────────────────────────────────────────────────────────────

export const PROGRAMME = {
  titleAll: "Nine moments to share",
  introAll: "From Friday to Monday, nine moments to celebrate together: from the most official to the most festive.",
  titleSome: "{n} to share",
  introSome: "Here are the moments we would be delighted to share with you.",
  limitedNote: "Moments marked “limited places” take place in a small group: please confirm your attendance as soon as possible.",
  pending: "Your programme is being prepared: come back soon to discover the moments we will share.",
  pendingReply: "You will be able to reply as soon as your programme is ready.",
  unknownNote: "We haven't found your personal invitation yet: only the moments open to everyone are shown. Feel free to get in touch.",
}

export const DAYS: Day[] = [
  {
    date: "2027-06-25", label: "Friday 25 June", moments: [
      { sequenceId: "443599cb-aec3-4071-9e55-5af87663ca58", time: "2:30 pm", title: "Civil wedding", text: "The official “I do”", placeId: "mairie", limited: true },
      { sequenceId: "579716f5-2616-4dc0-ba77-133ed8826510", time: "4 – 6:30 pm", title: "Afternoon reception", text: "Sweet treats and champagne", placeId: "terrasse", limited: true },
    ],
  },
  {
    date: "2027-06-26", label: "Saturday 26 June", moments: [
      { sequenceId: "52990fa4-fc1e-4b99-b51d-50b1efef38a9", time: "12 pm", title: "Shared picnic", text: "Everyone brings a dish", placeId: "pique-nique" },
      { sequenceId: "5347d0f2-31b0-4e69-9a8f-f6f3d10c0969", time: "6:30 pm – midnight", title: "Friendly evening", text: "Games night with guests of our generation", placeId: "doppio", limited: true },
    ],
  },
  {
    date: "2027-06-27", label: "Sunday 27 June", moments: [
      { sequenceId: "493c6164-7ff2-4c87-a037-b59c6bcfe008", time: "2:30 pm", title: "Nikkah", text: "Indian religious blessing in the Ismaili Muslim tradition", placeId: "khane", dressCode: "Indian, if you wish", limited: true, warning: "To be confirmed: we are doing everything we can to make it happen" },
    ],
  },
  {
    date: "2027-06-28", label: "Monday 28 June", moments: [
      { sequenceId: "19eb750b-88d2-471e-b06d-749da2ee40c6", time: "Morning", title: "Getting ready", text: "Brunch, hair and make-up, dressing", placeId: "villas", limited: true },
      { sequenceId: "baf9abc9-74fb-4273-a9ff-cd60a64bf5ec", time: "3:30 pm", title: "Church blessing", text: "Religious blessing in the Catholic tradition", placeId: "eglise" },
      { sequenceId: "e19ecc45-67ae-4319-9887-6d67b39ed24e", time: "5 pm", title: "Photo session", text: "Portraits and group photos", placeId: "photo" },
      { sequenceId: "c14a9820-2d9f-466f-9d19-1b732b2733c1", time: "5:30 pm – late", title: "Wedding celebration", text: "Cocktails and dinner with dancing", placeId: "ostara" },
    ],
  },
]

// ── 4. Venues ─────────────────────────────────────────────────────────────────

export const PLACES: Place[] = [
  { id: "mairie", name: "Montpellier City Hall", address: "1 place Georges Frêche, 34000 Montpellier", access: "Accessible by tram. Paid car parks nearby." },
  { id: "terrasse", name: "La Terrasse by La Salle", address: "Rooftop of the La Salle complex, Mauguio" },
  { id: "pique-nique", name: "Open-air picnic", address: "Location to be announced", access: "" },
  { id: "doppio", name: "Doppio Malto", address: "Odysseum shopping centre, Montpellier", access: "The restaurant's upper floor is reserved for the occasion." },
  { id: "khane", name: "Jamatkhana of Montpellier", address: "85 rue du Pr Antonin Balmès, ZAC de Tournezy, 34070 Montpellier" },
  { id: "villas", name: "The couple's villas", address: "Girls' villa: 191 rue Adrienne Boland, 34070 Montpellier · Boys' villa: 14 impasse du Roitelet, Mauguio" },
  { id: "eglise", name: "Saint-Cléophas Church", address: "2 place de l'Abbé Crébassol, 34070 Montpellier" },
  { id: "photo", name: "Photo session", address: "Location to be announced" },
  { id: "ostara", name: "Domaine Ostara", address: "134 chemin de la Pierre Bleue, Castries", access: "Parking on site. About twenty minutes from Montpellier by car: think about **car-sharing** and choosing a driver for the way back." },
]

// ── 4 bis. Mood & outfits ─────────────────────────────────────────────────────

export const AMBIANCE = {
  intro: "No dress code and no set colours: everyone dresses as they like.",
  why: "As many of you have asked, here is the mood we imagine for each day. Simple ideas to inspire you, **nothing compulsory**.",
  days: [
    {
      date: "2027-06-25", mood: "Formal and chic",
      text: "For {moments}, a cocktail mood: dress, suit or smart outfit.",
      moments: { "443599cb-aec3-4071-9e55-5af87663ca58": "the official “I do”", "579716f5-2616-4dc0-ba77-133ed8826510": "the afternoon reception" },
      tenues: ["cocktail-courte"],
    },
    {
      date: "2027-06-26", mood: "Relaxed",
      text: "For {moments}, a casual outfit you feel comfortable in.",
      moments: { "52990fa4-fc1e-4b99-b51d-50b1efef38a9": "the picnic", "5347d0f2-31b0-4e69-9a8f-f6f3d10c0969": "the games night" },
      tenues: ["detente"],
    },
    {
      date: "2027-06-27", mood: "Indian",
      text: "For {moments}, an Indian outfit if you wish: sari, lehenga, kurta…",
      moments: { "493c6164-7ff2-4c87-a037-b59c6bcfe008": "the Nikkah" },
      tenues: ["indienne-sari"],
    },
    {
      date: "2027-06-28", mood: "Elegant and festive",
      text: "We imagine an elegant and festive mood, blending Gujarati, Malagasy, Réunionese and Guadeloupean influences. Traditional outfits or outfits inspired by your roots are welcome, but never compulsory: suit, elegant dress, sari, kurta, lamba, Creole outfit or evening wear.",
      tenues: ["creole-fleurie", "indienne-lehenga", "cocktail-drapee", "creole-madras", "malgache-lamba"],
    },
  ] as { date: string; mood: string; text: string; moments?: Record<string, string>; note?: string; tenues: Tenue[] }[],
}

// ── 5. Wedding party ──────────────────────────────────────────────────────────

export const CORTEGE = {
  show: false,
  intro: "They have always been by our side and will be with us on the day. Feel free to turn to them.",
  groups: [
    { title: "Bride's witnesses", people: [{ name: "À compléter", role: "" }] },
    { title: "Groom's witnesses", people: [{ name: "À compléter", role: "" }] },
    { title: "Bridesmaids and groomsmen", people: [{ name: "À compléter", role: "" }] },
    { title: "Flower girls and page boys", people: [{ name: "À compléter", role: "" }] },
  ],
}

// ── 6. Travel & accommodation ─────────────────────────────────────────────────

export const TRAVEL = {
  getting: [
    { title: "By train", text: "Montpellier Saint-Roch station, right in the city centre, or Montpellier Sud de France station for some TGV trains. About 3 hours 30 minutes from Paris." },
    { title: "By plane", text: "Montpellier Méditerranée airport, about twenty minutes from the centre by shuttle or taxi." },
    { title: "By car", text: "The venues are spread around Montpellier: a car makes getting around easier. **Car-sharing** between guests is warmly encouraged." },
  ],
  stays: [
    {
      name: "Montpellier city centre",
      details: "The most convenient for {lieux}, with plenty of hotels and rentals.",
      fallback: "In the heart of the city, with plenty of hotels and rentals.",
      places: { mairie: "City Hall", eglise: "the church" },
      url: "",
    },
    {
      name: "Odysseum and Port Marianne area",
      details: "Close to the main roads and to {lieux}, handy for reaching the venues outside the city.",
      fallback: "Close to the main roads, handy for reaching the venues outside the city.",
      places: { doppio: "Doppio Malto" },
      url: "",
    },
  ] as { name: string; details: string; fallback: string; places: Record<string, string>; url: string }[],
}

// ── 7. Gift list ──────────────────────────────────────────────────────────────

export const GIFTS = {
  text: "Having you with us is the best gift of all. If you wish, a gift box will be available during the celebration.",
  url: "",
  label: "See the list",
}

// ── 8. FAQ ────────────────────────────────────────────────────────────────────

export const FAQ: { q: string; a: string }[] = [
  { q: "When should I reply to the invitation?", a: "Before 15 February 2027, in the “Reply” tab of this page. You can change your reply until then." },
  { q: "Can I bring an extra guest?", a: "Your invitation is personal and lists the people invited. If you would like to bring someone, please talk to us before replying." },
  { q: "Are children welcome?", a: "Yes, the children named on your invitation are welcome. Add them one by one in the reply form (a box marks children under 10)." },
  { q: "Can I come to only some of the moments?", a: "Of course. The reply form asks for your attendance moment by moment, for each person." },
  { q: "Is the programme the same for all guests?", a: "No: some venues have limited capacity. This page shows the moments you are invited to." },
  { q: "Is there parking on site?", a: "Yes at Domaine Ostara. In the city centre, the tram or public car parks are the best option." },
  { q: "Who should I contact with questions or on the day?", a: "Write to us directly with any question. On the day, our witnesses will be there to help you." },
]

// ── 9. Your reply ─────────────────────────────────────────────────────────────

export const RSVP = {
  deadline: "15 February 2027",
  deadlineDate: "2027-02-15",
  intro: "We would be so happy to have you with us to celebrate our wedding, surrounded by our families and loved ones. Please confirm your attendance by filling in this form, step by step.",
  steps: { presence: "Your attendance", moments: "Your moments", party: "Who's coming with you", word: "A little note" },
  name: { label: "What is your name?", help: "First name and surname of the person filling in this form." },
  attendance: {
    label: "Will you be there?",
    help: "Will you be at our wedding, in June 2027 in Montpellier?",
    yes: "Yes, with pleasure",
    no: "Sadly, no",
    unsure: "I don't know yet",
  },
  moments: { label: "Which moments will you attend?", help: "Please answer for each moment." },
  answers: { yes: "Yes", no: "No", unsure: "Not sure yet" },
  answersAll: { label: "Quick select:", yes: "Yes to all", no: "No to all", unsure: "Not sure to all" },
  party: {
    label: "Who's coming with you?",
    help: "Tell us about any dietary requirements, then add each person you are replying for (partner, children…) with their attendance at each moment.",
    add: "Add a person",
    under10: "Under 10",
    alone: "No one else: you are replying just for yourself.",
  },
  dietary: {
    label: "Dietary requirements",
    checkSelf: "I have allergies or dietary requirements",
    checkOther: "Has allergies or dietary requirements",
    help: "Please specify.",
  },
  message: { label: "A little note for us?", help: "Free message (optional)." },
}

// ── Thank you ─────────────────────────────────────────────────────────────────

export const THANKS = {
  title: "Thank you!",
  text: "Having you there will make our wedding even more beautiful. We can't wait to share these moments with you.",
  titleDeclined: "Such a shame!",
  textDeclined: "Having you there would have made our wedding even more beautiful. We would so have loved to share these moments with you.",
  closing: "With all our love,",
  signature: "Jordan & Sarah",
}

// ── Interface text ────────────────────────────────────────────────────────────

export const UI = {
  subtitle: "Wedding · June 2027",
  common: {
    loading: "Loading…",
    signOut: "Sign out",
    admin: "Administration",
    unavailable: "Invitation unavailable",
    missingConfig: "Supabase configuration missing.",
    notFound: "Page not found",
    accountMissing: "Account not found",
    accountMissingText: "Your access is not (or no longer) active.",
    suspended: "Access suspended",
    suspendedText: "Your account has been deactivated. Please contact Jordan or Sarah if needed.",
    and: "and",
    langLabel: "Language",
  },
  landing: { cta: "Open my invitation" },
  envelope: {
    open: "Open the envelope",
    letterFor: (name: string) => `A letter for ${name || "you"}`,
    hello: (name: string) => `Hello ${name || "you"},`,
    letter: [
      "We are delighted to invite you to our wedding, on **Monday 28 June 2027** in **Montpellier**.",
      "On this site, you will find the schedule of the celebrations and everything you need to know to fully enjoy this time with us.",
    ],
    close: "Close the envelope",
    discover: "Discover the invitation",
  },
  nav: {
    aria: "Invitation sections",
    invitation: "The invitation", mot: "A word from us", programme: "The programme", pratique: "Practical info",
    ambiance: "Dress code", questions: "Questions", reply: "Reply",
  },
  hero: {
    intro: (first: string) => (first ? `${first}, here is everything you need to know about our wedding.` : "Here is everything you need to know about our wedding."),
    scroll: "See more",
  },
  preview: { label: "Admin preview", all: "Whole programme", pdf: "Download as PDF", pdfBusy: "Preparing…" },
  sections: {
    invitation: { eyebrow: "Announcement", title: "The invitation" },
    mot: { eyebrow: "From the heart", title: "A word from us" },
    programme: { eyebrow: "Programme", title: "The programme", loadingTitle: "Your programme", loading: "Loading your programme…" },
    lieux: { eyebrow: "Where to find us", title: "The venues" },
    ambiance: { eyebrow: "Mood & outfits", title: "What to wear?" },
    cortege: { eyebrow: "By our side", title: "The wedding party" },
    venir: { eyebrow: "Practical info", title: "Getting there & staying" },
    liste: { eyebrow: "If you feel like it", title: "Gift list" },
    faq: { eyebrow: "Your questions", title: "Frequently asked questions" },
    reponse: { eyebrow: "RSVP", title: "Will you join us?" },
  },
  programme: {
    days: ["", "One day", "Two days", "Three days", "Four days"],
    dress: "Outfit:",
    limited: "Limited places",
  },
  places: { directions: "Directions", mapAria: "Map of the venues around Montpellier" },
  ambiance: { record: "Let's set the mood", song: "/sj-invitation/ambiance.aac", play: "Play the music", pause: "Pause the music",
  },
  music: {
    eyebrow: "In music", title: "Our vibe",
    text: "A little foretaste of the atmosphere that will carry us through these days.",
    play: "Listen", pause: "Pause", broken: "The music could not be loaded.",
  },
  travel: { stay: "Where to stay", book: "Book" },
  polaroids: { first: "Our first photo, 2020!", mexico: "Mexico, 2023", reunion: "Réunion Island, 2023", us: "Cheers to us!" },
  rsvp: {
    before: "Please reply before",
    stepsAria: "Form steps",
    stepStatus: (n: number, total: number, name: string) => `Step ${n} of ${total}: ${name}`,
    firstName: "First name",
    lastName: "Surname",
    unlockName: "Edit the name",
    lockName: "Lock the name",
    total: (n: number) => `${n > 1 ? "people" : "person"} in total, including you`,
    under10Count: (n: number) => ` · including ${n} under 10`,
    you: "You",
    person: (n: number) => `Person ${n}`,
    remove: "Remove",
    firstNameOf: (n: number) => `First name of person ${n}`,
    lastNameOf: (n: number) => `Surname of person ${n}`,
    thisPerson: "This person",
    messagePlaceholder: "Your message",
    previous: "Back",
    next: "Next",
    sending: "Sending…",
    send: "Send my reply",
    cancel: "Cancel",
    dietDetails: "details",
    dietExample: "E.g. nut allergy",
    errors: {
      name: "Please enter your first name and surname.",
      presence: "Please tell us whether you will be there.",
      moments: "Please answer for each moment.",
      personName: (n: number) => `Please enter the first name and surname of person ${n}.`,
      personMoments: (name: string) => `Please tell us whether ${name} will attend each moment.`,
      diet: "Please specify your dietary requirements, or untick the box.",
      personDiet: (name: string) => `Please specify ${name}'s dietary requirements, or untick the box.`,
      send: "Your reply could not be sent. Please try again.",
    },
    done: { yes: "Thank you, see you very soon!", no: "Thank you for letting us know. We will miss you and will be thinking of you!", unsure: "Thank you, keep us posted!" },
    savedOn: (date: string) => `Reply saved on ${date}:`,
    people: (n: number) => `${n} ${n > 1 ? "people" : "person"}`,
    under10: "under 10",
    restrictions: "Dietary requirements:",
    edit: "Change my reply",
    unsureLater: "Not sure yet about some moments? You can come back and change your reply until",
  },
  thanks: { aria: "Thank you" },
  footer: { letter: "See the letter again", rings: "Rings" },
  momentsInWords: (n: number) => `${["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][n] ?? n} moment${n > 1 ? "s" : ""}`,
  locale: "en-GB",
  mapLabels: { mairie: ["City Hall"], eglise: ["Saint-Cléophas Church"], villas: ["Boys' villa", "Girls' villa"] } as Record<string, string[]>,
}
