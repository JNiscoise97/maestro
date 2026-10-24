import type { Pole } from "@/types/domain"

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z]+/g, " ").trim()

/** Anciennes catégories du budget → pôle des missions (même correspondance que la migration 0164). */
const CATEGORY_TO_POLE: Record<string, string> = {
  "tenues": "Tenues & préparation personnelle",
  "tenues et accessoires": "Tenues & préparation personnelle",
  "mise en beaute": "Tenues & préparation personnelle",
  "bagues": "Tenues & préparation personnelle",
  "decoration": "Décoration & ambiance",
  "fleurs et decoration": "Décoration & ambiance",
  "papeterie": "Communication & papeterie",
  "animation": "Cérémonies & animation",
  "animation de la sortie de mairie": "Cérémonies & animation",
  "animation de la sortie de l eglise": "Cérémonies & animation",
  "ceremonie traditionnelle": "Cérémonies & animation",
  "cadeaux et souvenirs": "Invités & accueil",
  "depenses souvent oubliees": "Matériel & logistique",
  "photographie et video": "Image & souvenirs",
  "lieu de reception": "Lieu & prestataires",
  "restauration": "Restauration & boissons",
  "boissons": "Restauration & boissons",
  "transport et deplacements": "Transport & déplacements",
}

/**
 * Pôle d'une ligne importée (CSV) d'après sa catégorie : nom de pôle identique, sinon la
 * correspondance des anciennes catégories ; null si rien ne correspond.
 */
export function poleIdForCategory(category: string, poles: Pole[]): string | null {
  const c = norm(category)
  if (!c) return null
  const direct = poles.find((p) => norm(p.name) === c)
  if (direct) return direct.id
  const target = CATEGORY_TO_POLE[c]
  return target ? poles.find((p) => p.name === target)?.id ?? null : null
}
