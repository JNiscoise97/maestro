import type { BudgetDevis, BudgetItem, BudgetPayment, DevisLine } from "@/services/supabase/budget"

/**
 * Règles de calcul du budget (postes, sous-postes, devis groupés, échéanciers).
 *
 *   · Ligne = poste sans sous-poste, ou sous-poste. Un poste avec sous-postes additionne ses lignes.
 *   · Estimé d'une ligne : montant estimé saisi, sinon quantité × prix unitaire.
 *   · Réel d'une ligne : sa part dans le devis retenu qui la couvre, sinon le montant réel saisi.
 *   · Payé d'une ligne : couverte par un devis retenu → versements payés du devis au prorata de sa part ;
 *     sinon ses propres versements payés. Le poste ajoute ses propres versements (facture commune).
 */

export function fmt(n: number | null | undefined): string {
  if (n == null) return "—"
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
}

export function fmtCompact(n: number): string {
  if (n >= 1000) return (n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "k€"
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €"
}

export type PaymentStatus = "none" | "a_payer" | "acompte_a_verser" | "acompte_paye" | "partiel" | "paye"

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  none: "—",
  a_payer: "À payer",
  acompte_a_verser: "Acompte à verser",
  acompte_paye: "Acompte payé",
  partiel: "Partiellement payé",
  paye: "Payé",
}

export type LineFigures = { estimated: number; real: number | null; paid: number; hasPaidDeposit: boolean }

export class BudgetModel {
  readonly itemsById: Map<string, BudgetItem>
  readonly childrenOf: Map<string, BudgetItem[]>
  /** Devis retenu couvrant chaque ligne (un seul possible) et part de la ligne. */
  readonly retained: Map<string, { devis: BudgetDevis; amount: number | null }>
  readonly devisById: Map<string, BudgetDevis>
  readonly linesByDevis: Map<string, DevisLine[]>
  readonly linesByItem: Map<string, DevisLine[]>
  readonly paymentsByItem: Map<string, BudgetPayment[]>
  readonly paymentsByDevis: Map<string, BudgetPayment[]>

  constructor(items: BudgetItem[], devis: BudgetDevis[], lines: DevisLine[], payments: BudgetPayment[]) {
    this.itemsById = new Map(items.map((i) => [i.id, i]))
    this.childrenOf = new Map()
    for (const i of items) {
      if (!i.parentId) continue
      this.childrenOf.set(i.parentId, [...(this.childrenOf.get(i.parentId) ?? []), i])
    }
    for (const list of this.childrenOf.values()) list.sort((a, b) => a.label.localeCompare(b.label, "fr"))
    this.devisById = new Map(devis.map((d) => [d.id, d]))
    this.linesByDevis = groupBy(lines, (l) => l.devisId)
    this.linesByItem = groupBy(lines, (l) => l.itemId)
    this.paymentsByItem = groupBy(payments.filter((p) => p.itemId), (p) => p.itemId!)
    this.paymentsByDevis = groupBy(payments.filter((p) => p.devisId), (p) => p.devisId!)
    this.retained = new Map()
    for (const l of lines) {
      const d = this.devisById.get(l.devisId)
      if (d?.status === "retenu" && !this.retained.has(l.itemId)) this.retained.set(l.itemId, { devis: d, amount: l.amount })
    }
  }

  children(posteId: string): BudgetItem[] {
    return this.childrenOf.get(posteId) ?? []
  }

  /** Lignes d'un poste : ses sous-postes, ou le poste lui-même s'il n'en a pas. */
  leaves(poste: BudgetItem): BudgetItem[] {
    const kids = this.children(poste.id)
    return kids.length ? kids : [poste]
  }

  devisPaid(devisId: string): number {
    return sum((this.paymentsByDevis.get(devisId) ?? []).filter((p) => p.paid).map((p) => p.amount))
  }

  devisLinesTotal(devisId: string): number {
    return sum((this.linesByDevis.get(devisId) ?? []).map((l) => l.amount))
  }

  /** Chiffres d'une ligne (poste simple ou sous-poste). */
  line(item: BudgetItem): LineFigures {
    const estimated = item.estimatedTotal ?? (item.quantity != null && item.unitPrice != null ? item.quantity * item.unitPrice : 0)
    const r = this.retained.get(item.id)
    if (r) {
      const share = r.amount ?? 0
      const base = this.devisLinesTotal(r.devis.id) || r.devis.totalAmount || 0
      const devisPayments = (this.paymentsByDevis.get(r.devis.id) ?? []).filter((p) => p.paid)
      const paid = base > 0 ? this.devisPaid(r.devis.id) * (share / base) : 0
      return { estimated, real: share, paid, hasPaidDeposit: devisPayments.some((p) => p.kind === "acompte") }
    }
    const own = (this.paymentsByItem.get(item.id) ?? []).filter((p) => p.paid)
    return { estimated, real: item.actualTotal, paid: sum(own.map((p) => p.amount)), hasPaidDeposit: own.some((p) => p.kind === "acompte") }
  }

  /** Chiffres d'un poste, éventuellement limités aux sous-postes d'une séquence. */
  poste(poste: BudgetItem, sequenceId?: string | null): LineFigures & { depositRequired: boolean } {
    const kids = this.children(poste.id)
    const leaves = kids.length
      ? (sequenceId === undefined ? kids : kids.filter((k) => k.sequenceId === sequenceId))
      : [poste]
    const figures = leaves.map((l) => this.line(l))
    let paid = sum(figures.map((f) => f.paid))
    let hasPaidDeposit = figures.some((f) => f.hasPaidDeposit)
    // Versements propres d'un poste à sous-postes (facture commune) : comptés sur le poste entier.
    if (kids.length && sequenceId === undefined) {
      const own = (this.paymentsByItem.get(poste.id) ?? []).filter((p) => p.paid)
      paid += sum(own.map((p) => p.amount))
      hasPaidDeposit ||= own.some((p) => p.kind === "acompte")
    }
    const reals = figures.map((f) => f.real)
    return {
      estimated: sum(figures.map((f) => f.estimated)),
      real: reals.every((r) => r == null) ? null : sum(reals),
      paid,
      hasPaidDeposit,
      depositRequired: poste.depositRequired || leaves.some((l) => l.depositRequired),
    }
  }

  /** Séquences d'un poste : celles de ses sous-postes, ou la sienne. */
  sequencesOf(poste: BudgetItem): (string | null)[] {
    const kids = this.children(poste.id)
    if (!kids.length) return [poste.sequenceId]
    return [...new Set(kids.map((k) => k.sequenceId))]
  }
}

export function paymentStatus(f: { estimated: number; real: number | null; paid: number; hasPaidDeposit: boolean; depositRequired?: boolean }): PaymentStatus {
  const due = f.real ?? f.estimated
  if (!due && !f.paid) return "none"
  if (due > 0 && f.paid >= due - 0.005) return "paye"
  if (f.paid > 0) return f.hasPaidDeposit ? "acompte_paye" : "partiel"
  return f.depositRequired ? "acompte_a_verser" : "a_payer"
}

function groupBy<T>(list: T[], key: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const x of list) map.set(key(x), [...(map.get(key(x)) ?? []), x])
  return map
}

function sum(values: (number | null | undefined)[]): number {
  return values.reduce<number>((t, v) => t + (v ?? 0), 0)
}

/** Suggestions pré-remplies des champs Compte et Origine. */
export const ACCOUNT_SUGGESTIONS = ["Jordan CA", "Jordan N26", "Sarah", "Commun", "Parents Jordan", "Parents Sarah"]
export const ORIGIN_SUGGESTIONS = ["Jordan", "Sarah", "Parents Jordan", "Parents Sarah", "Commun"]

/** Saisie française d'un montant (« 1 234,50 ») → nombre, ou null si vide / invalide. */
export function parseAmount(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".")
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function amountInput(n: number | null | undefined): string {
  return n == null ? "" : String(n).replace(".", ",")
}
