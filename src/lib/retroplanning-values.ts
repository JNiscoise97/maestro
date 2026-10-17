import type { ChecklistItem, Criticality } from "@/types/domain"
import { formatDate } from "@/lib/retroplanning"

/** Valeur spéciale des listes : « aucun jalon » / « ne pas modifier ». */
export const RETRO_NONE = "__none__"
export const RETRO_KEEP = "__keep__"

/**
 * Champs du rétroplanning d'un item, sous forme éditable.
 * Dates au format YYYY-MM-DD, chaîne vide = pas de date (ou « ne pas modifier » en mode lot).
 * La date limite n'est pas un champ : c'est l'échéance du jalon.
 */
export type RetroValues = {
  milestoneId: string
  idealStartDate: string
  targetDate: string
  criticality: Criticality | typeof RETRO_KEEP
}

export function retroValuesFromItem(item?: ChecklistItem): RetroValues {
  return {
    milestoneId: item?.milestoneId ?? RETRO_NONE,
    // Facultatif : vide par défaut.
    idealStartDate: item?.idealStartDate ?? "",
    targetDate: item?.targetDate ?? "",
    criticality: item?.criticality ?? "normal",
  }
}

/** Valeurs vides pour une modification en lot : rien n'est modifié tant qu'on ne remplit pas. */
export const EMPTY_BULK_VALUES: RetroValues = {
  milestoneId: RETRO_KEEP, idealStartDate: "", targetDate: "", criticality: RETRO_KEEP,
}

/**
 * Règles des dates d'un item : début idéal ≤ date cible ≤ échéance du jalon (date limite).
 * Renvoie le message d'erreur, ou null si tout est cohérent.
 */
export function retroDatesError(
  dates: { idealStartDate?: string | null; targetDate?: string | null },
  milestoneDate?: string | null,
): string | null {
  const { idealStartDate, targetDate } = dates
  if (targetDate && milestoneDate && targetDate > milestoneDate) {
    return `La date cible doit être au plus tard l'échéance du jalon (${formatDate(milestoneDate, { day: "numeric", month: "long", year: "numeric" })}).`
  }
  if (idealStartDate && targetDate && idealStartDate > targetDate) {
    return "Le début idéal doit être au plus tard la date cible."
  }
  if (idealStartDate && !targetDate && milestoneDate && idealStartDate > milestoneDate) {
    return "Le début idéal doit être au plus tard l'échéance du jalon."
  }
  return null
}

/** Patch complet d'un item (édition unitaire) : une date vidée est effacée. */
export function retroPatch(v: RetroValues): Partial<ChecklistItem> {
  return {
    milestoneId: v.milestoneId === RETRO_NONE || v.milestoneId === RETRO_KEEP ? null : v.milestoneId,
    idealStartDate: v.idealStartDate || null,
    targetDate: v.targetDate || null,
    ...(v.criticality !== RETRO_KEEP ? { criticality: v.criticality } : {}),
  }
}

/** Patch d'une modification en lot : seuls les champs renseignés sont appliqués. */
export function retroBulkPatch(v: RetroValues): Partial<ChecklistItem> {
  const patch: Partial<ChecklistItem> = {}
  if (v.milestoneId !== RETRO_KEEP) patch.milestoneId = v.milestoneId === RETRO_NONE ? null : v.milestoneId
  if (v.idealStartDate) patch.idealStartDate = v.idealStartDate
  if (v.targetDate) patch.targetDate = v.targetDate
  if (v.criticality !== RETRO_KEEP) patch.criticality = v.criticality
  return patch
}
