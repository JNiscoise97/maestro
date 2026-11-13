import type { BudgetModel } from "@/lib/budget-calc"
import type { Gift } from "@/services/gifts.service"
import type { Guest } from "@/types/domain"

/** Nom des donateurs : invités sélectionnés, sinon donateur hors liste. */
export function giftDonors(gift: Gift, guestsById: Map<string, Guest>): string {
  const names = gift.guestIds.map((id) => guestsById.get(id)?.fullName).filter(Boolean)
  if (names.length) return names.join(", ")
  return gift.externalGiverName || "Donateur inconnu"
}

/** Cible d'une affectation encodée pour la liste : « i:<ligne> » ou « d:<devis> ». */
export const targetKey = (a: { itemId: string | null; devisId: string | null }) => (a.itemId ? `i:${a.itemId}` : a.devisId ? `d:${a.devisId}` : "")
export const parseTarget = (key: string) => (key.startsWith("i:") ? { itemId: key.slice(2), devisId: null } : { itemId: null, devisId: key.slice(2) })

export function targetLabel(model: BudgetModel, a: { itemId: string | null; devisId: string | null }): string {
  if (a.itemId) {
    const it = model.itemsById.get(a.itemId)
    if (!it) return "Ligne supprimée"
    return model.children(it.id).length ? `${it.label} (tout le poste)` : model.fullLabel(it.id)
  }
  const d = a.devisId ? model.devisById.get(a.devisId) : undefined
  return d ? `Devis ${d.vendor ?? d.title ?? ""}`.trim() : "Devis supprimé"
}
