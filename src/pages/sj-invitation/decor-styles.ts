/** Fond de page, cartes et choix des pictogrammes de l'invitation (composants dans ./decor). */

/** Fond de la page : blanc. */
export const TABLE_STYLE: React.CSSProperties = { backgroundColor: "#ffffff" }

/** Cartes posées sur le fond blanc : blanc, ombre douce. */
export const PAPER_STYLE: React.CSSProperties = {
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 3px rgba(70,52,25,.08), 0 18px 40px -22px rgba(70,52,25,.28)",
}

export type PictoName =
  | "mairie" | "champagne" | "panier" | "jeux" | "lotus" | "pinceau" | "eglise" | "photo" | "boule"
  | "robe" | "train" | "avion" | "voiture" | "hotel" | "cadeau" | "question" | "enveloppe" | "coeurs" | "pin"

/** Icône illustrée d'un moment du programme (images des mariés, public/sj-invitation/icone-*.webp), d'après son intitulé. */
export function iconForMoment(title: string): string {
  const t = title.toLowerCase()
  const icon = (name: string) => `/sj-invitation/icone-${name}.webp`
  if (/civil|mairie/.test(t)) return icon("mairie")
  if (/goûter|cocktail|champagne|vin d'honneur/.test(t)) return icon("coupes")
  if (/pique-nique/.test(t)) return icon("panier")
  if (/jeux|convivial|amis/.test(t)) return icon("des")
  if (/nikkah|khane|indien/.test(t)) return icon("lotus")
  if (/église|religieu/.test(t)) return icon("eglise")
  if (/préparation|coiffure|habillage/.test(t)) return icon("tenues")
  if (/photo/.test(t)) return icon("appareil-photo")
  if (/célébration|soirée|dîner/.test(t)) return icon("boule-a-facettes")
  return icon("coupes")
}

/** Pictogramme d'un moyen de transport (Venir & se loger). */
export function pictoForTravel(title: string): PictoName {
  const t = title.toLowerCase()
  if (t.includes("train")) return "train"
  if (t.includes("avion") || t.includes("plane")) return "avion"
  if (t.includes("voiture") || t.includes("car")) return "voiture"
  return "pin"
}
