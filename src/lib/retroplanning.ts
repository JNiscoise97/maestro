import type { ChecklistItem, ItemSequenceStatusValue } from "@/types/domain"

/**
 * Règles communes du rétroplanning (vue Rétroplanning et vue pilotage).
 *
 * État d'un item par rapport à sa fenêtre début idéal → date cible → date limite :
 *   late   = date limite dépassée (en retard)
 *   behind = date cible dépassée, limite pas encore atteinte (à rattraper)
 *   now    = début idéal atteint (à faire maintenant)
 */
export type ItemState = "done" | "late" | "behind" | "now" | "upcoming"

export const ITEM_STATE_LABELS: Record<ItemState, string> = {
  done: "Fait", late: "En retard", behind: "À rattraper", now: "À faire maintenant", upcoming: "À venir",
}
export const ITEM_STATE_ORDER: Record<ItemState, number> = { late: 0, behind: 1, now: 2, upcoming: 3, done: 4 }
export const ITEM_STATE_TEXT: Record<ItemState, string> = {
  late: "text-bordeaux", behind: "text-corail", now: "text-lagon", upcoming: "text-muted-foreground", done: "text-vert-vegetal",
}

export const SEQ_STATUS_LABELS: Record<ItemSequenceStatusValue, string> = {
  todo: "à faire", done: "fait", na: "non concernée",
}
export const NEXT_SEQ_STATUS: Record<ItemSequenceStatusValue, ItemSequenceStatusValue> = {
  todo: "done", done: "na", na: "todo",
}

export const CRITICALITY_LABELS: Record<NonNullable<ChecklistItem["criticality"]>, string> = {
  low: "Faible", normal: "Normale", high: "Haute", blocking: "Bloquante",
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** État daté d'un item encore à faire (ignore la case « fait »). */
export function dateState(item: ChecklistItem, today: string): ItemState {
  if (item.deadlineDate && today > item.deadlineDate) return "late"
  if (item.targetDate && today > item.targetDate) return "behind"
  if (item.idealStartDate && today >= item.idealStartDate) return "now"
  return "upcoming"
}

/** Un item est fait quand chacune de ses séquences est faite ou non concernée. */
export function isComplete(statuses: ItemSequenceStatusValue[]): boolean {
  return statuses.every((s) => s !== "todo")
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", opts)
}
