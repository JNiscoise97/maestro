import type { BudgetModel } from "@/lib/budget-calc"
import type { BudgetItem } from "@/services/supabase/budget"
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

/** Financement d'une ou plusieurs lignes par les cadeaux anticipés reçus, regroupé par donateurs. */
export function fundingOf(model: BudgetModel, lines: BudgetItem[], donorsByGift: Map<string, string>) {
  const byName = new Map<string, number>()
  for (const l of lines) {
    for (const { giftId, amount } of model.offeredBy(l)) {
      const name = donorsByGift.get(giftId) ?? "Donateur inconnu"
      byName.set(name, (byName.get(name) ?? 0) + amount)
    }
  }
  const donors = [...byName].map(([name, amount]) => ({ name, amount }))
  const offered = donors.reduce((t, d) => t + d.amount, 0)
  const cost = lines.reduce((t, l) => t + model.cost(l), 0)
  return { donors, offered, cost, rest: Math.max(0, cost - offered) }
}

/**
 * Origine (« qui paie ») affichée : déduite des cadeaux anticipés. Entièrement offert → les donateurs ;
 * en partie → les donateurs + qui paie le reste (origine saisie) ; sans cadeau → l'origine saisie.
 * Calculée à l'affichage : elle suit les modifications des cadeaux sans rien écrire en base.
 */
export function effectiveOrigin(model: BudgetModel, item: BudgetItem, donorsByGift: Map<string, string>): string | null {
  const kids = model.children(item.id)
  const lines = kids.length ? kids : [item]
  const f = fundingOf(model, lines, donorsByGift)
  const own = kids.length
    ? [...new Set([item.origin, ...kids.filter((k) => model.cost(k) - model.offered(k) > 0.005).map((k) => k.origin)].filter(Boolean))].join(", ") || null
    : item.origin
  if (!f.donors.length) return own
  const names = f.donors.map((d) => d.name).join(", ")
  if (f.rest <= 0.005) return names
  return `${names} + ${own ?? "reste ?"}`
}
