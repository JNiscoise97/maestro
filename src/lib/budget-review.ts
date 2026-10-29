import { effectivePriority, type BudgetModel } from "@/lib/budget-calc"
import type { BudgetItem, ReviewKey, ReviewScores } from "@/services/supabase/budget"

/** Les 6 questions de la seconde passe, notées 0 (non), 1 (un peu) ou 2 (oui). */
export const REVIEW_QUESTIONS: { key: ReviewKey; short: string; question: string; hint: string }[] = [
  { key: "souvenir", short: "Souvenir", question: "En parlerons-nous encore dans 5, 10, 15 ans ?", hint: "Ce qui compte pour nous sur le long terme." },
  { key: "signature", short: "Signature", question: "C'est nous, ou on le verrait à n'importe quel mariage ?", hint: "2 = très spécifique à nous ; 0 = générique, « parce que ça se fait »." },
  { key: "absence", short: "Absence", question: "Si ça manquait, un invité le remarquerait-il ?", hint: "Beaucoup de dépenses ne sont visibles que par nous et le prestataire." },
  { key: "confort", short: "Confort", question: "Ça touche au confort des invités (manger, boire, chaud/froid, attendre, se déplacer, s'asseoir) ?", hint: "2 = garde-fou : on ne déprioritise pas, on cherche moins cher." },
  { key: "trace", short: "Trace", question: "Ça apparaîtra sur les photos et la vidéo ?", hint: "Ce qui survit à la journée." },
  { key: "duree", short: "Durée", question: "Ça sert 5 minutes ou tout le week-end ?", hint: "0 = quelques minutes ; 2 = toute une séquence ou plus." },
]

export const REVIEW_MAX = REVIEW_QUESTIONS.length * 2
/** Seuils sur 12 : note faible ≤ 5, note forte ≥ 9. */
export const REVIEW_LOW = 5
export const REVIEW_HIGH = 9

/** Notes de la ligne, ou celles de son poste pour un sous-poste pas encore noté. */
export function effectiveReview(model: BudgetModel, item: BudgetItem): { scores: ReviewScores; inherited: boolean } | null {
  if (item.reviewScores && Object.keys(item.reviewScores).length) return { scores: item.reviewScores, inherited: false }
  const parent = item.parentId ? model.itemsById.get(item.parentId) : undefined
  if (parent?.reviewScores && Object.keys(parent.reviewScores).length) return { scores: parent.reviewScores, inherited: true }
  return null
}

export function reviewTotal(scores: ReviewScores): number {
  return REVIEW_QUESTIONS.reduce((t, q) => t + (scores[q.key] ?? 0), 0)
}

export function reviewComplete(scores: ReviewScores): boolean {
  return REVIEW_QUESTIONS.every((q) => scores[q.key] != null)
}

export type ReviewVerdict = "a_couper" | "a_challenger" | "sous_estime" | "protege" | "ok" | "a_noter"

export const VERDICT_LABELS: Record<ReviewVerdict, string> = {
  a_couper: "À couper",
  a_challenger: "Must à challenger",
  sous_estime: "Must sous-estimé ?",
  protege: "Protégé (confort)",
  ok: "Cohérent",
  a_noter: "À noter",
}

export const VERDICT_HINTS: Record<ReviewVerdict, string> = {
  a_couper: "Could avec une note faible : à couper sans débat.",
  a_challenger: "Must avec une note faible : souvent le « parce que ça se fait ».",
  sous_estime: "Should ou Could avec une note forte : peut-être un Must.",
  protege: "Confort des invités à 2 : on garde, mais on cherche moins cher.",
  ok: "Priorité et note cohérentes.",
  a_noter: "Pas encore notée.",
}

/** Croisement note × priorité MoSCoW (le confort des invités à 2 sert de veto). */
export function reviewVerdict(model: BudgetModel, item: BudgetItem): ReviewVerdict {
  const review = effectiveReview(model, item)
  if (!review) return "a_noter"
  const total = reviewTotal(review.scores)
  const priority = effectivePriority(model, item)
  if (review.scores.confort === 2) return "protege"
  if (priority === "could" && total <= REVIEW_LOW) return "a_couper"
  if (priority === "must" && total <= REVIEW_LOW) return "a_challenger"
  if ((priority === "should" || priority === "could") && total >= REVIEW_HIGH) return "sous_estime"
  return "ok"
}

/** Montant de référence d'une ligne : le réel s'il est connu, sinon l'estimé. */
export function reviewAmount(model: BudgetModel, item: BudgetItem): number {
  const f = model.line(item)
  return f.real ?? f.estimated
}

/** € par point de note : plus c'est haut, plus la dépense rapporte peu. Infinity si la note est 0. */
export function costPerPoint(amount: number, total: number): number {
  return total > 0 ? amount / total : amount > 0 ? Infinity : 0
}
