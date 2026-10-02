import type { ChecklistItem, Criticality } from "@/types/domain"

/** Valeur spéciale des listes : « aucun jalon » / « ne pas modifier ». */
export const RETRO_NONE = "__none__"
export const RETRO_KEEP = "__keep__"

/**
 * Champs du rétroplanning d'un item, sous forme éditable.
 * Dates au format YYYY-MM-DD, chaîne vide = pas de date (ou « ne pas modifier » en mode lot).
 */
export type RetroValues = {
  milestoneId: string
  idealStartDate: string
  targetDate: string
  deadlineDate: string
  criticality: Criticality | typeof RETRO_KEEP
}

export function retroValuesFromItem(item?: ChecklistItem): RetroValues {
  return {
    milestoneId: item?.milestoneId ?? RETRO_NONE,
    idealStartDate: item?.idealStartDate ?? "",
    targetDate: item?.targetDate ?? "",
    deadlineDate: item?.deadlineDate ?? "",
    criticality: item?.criticality ?? "normal",
  }
}

/** Valeurs vides pour une modification en lot : rien n'est modifié tant qu'on ne remplit pas. */
export const EMPTY_BULK_VALUES: RetroValues = {
  milestoneId: RETRO_KEEP, idealStartDate: "", targetDate: "", deadlineDate: "", criticality: RETRO_KEEP,
}

/** Les dates renseignées doivent se suivre : début idéal ≤ cible ≤ limite. */
export function retroDatesInvalid(v: RetroValues): boolean {
  const ordered = [v.idealStartDate, v.targetDate, v.deadlineDate].filter(Boolean)
  return ordered.some((d, i) => i > 0 && d < ordered[i - 1])
}

/** Patch complet d'un item (édition unitaire) : une date vidée est effacée. */
export function retroPatch(v: RetroValues): Partial<ChecklistItem> {
  return {
    milestoneId: v.milestoneId === RETRO_NONE || v.milestoneId === RETRO_KEEP ? null : v.milestoneId,
    idealStartDate: v.idealStartDate || null,
    targetDate: v.targetDate || null,
    deadlineDate: v.deadlineDate || null,
    ...(v.criticality !== RETRO_KEEP ? { criticality: v.criticality } : {}),
  }
}

/** Patch d'une modification en lot : seuls les champs renseignés sont appliqués. */
export function retroBulkPatch(v: RetroValues): Partial<ChecklistItem> {
  const patch: Partial<ChecklistItem> = {}
  if (v.milestoneId !== RETRO_KEEP) patch.milestoneId = v.milestoneId === RETRO_NONE ? null : v.milestoneId
  if (v.idealStartDate) patch.idealStartDate = v.idealStartDate
  if (v.targetDate) patch.targetDate = v.targetDate
  if (v.deadlineDate) patch.deadlineDate = v.deadlineDate
  if (v.criticality !== RETRO_KEEP) patch.criticality = v.criticality
  return patch
}
