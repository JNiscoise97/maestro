import * as XLSX from "xlsx"

import {
  PAYMENT_STATUS_LABELS, PRIORITY_LABELS, budgetItemComparator, effectivePriority, paymentStatus, type BudgetModel,
} from "@/lib/budget-calc"
import {
  REVIEW_MAX, REVIEW_QUESTIONS, VERDICT_LABELS, costPerPoint, effectiveReview, reviewTotal, reviewVerdict,
} from "@/lib/budget-review"
import type { BudgetItem } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"

type Seq = { id: string; name: string }
type Cell = string | number | boolean | Date | null

const EUR = '#,##0.00 "€"'
const DATE = "dd/mm/yyyy"
const STATUS_LABELS = { estimated: "Estimé", to_estimate: "Pas encore estimable", included: "Inclus dans une autre ligne" } as const
const DEVIS_LABELS = { en_cours: "En cours", retenu: "Retenu", refuse: "Refusé" } as const
const KIND_LABELS = { acompte: "Acompte", solde: "Solde", paiement: "Paiement" } as const

/** Une feuille : en-têtes, lignes, formats par colonne (euros / dates), largeurs et filtre automatique. */
function sheet(headers: string[], rows: Cell[][], formats: Record<number, string> = {}): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true })
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
  for (let r = 1; r <= range.e.r; r++) {
    for (const [c, z] of Object.entries(formats)) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: Number(c) })]
      if (cell && (cell.t === "n" || cell.t === "d")) cell.z = z
    }
  }
  ws["!cols"] = headers.map((h, c) => ({
    wch: Math.min(60, Math.max(h.length + 2, ...rows.map((row) => String(row[c] ?? "").length + 1))),
  }))
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: headers.length - 1 } }) }
  return ws
}

const date = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`) : null)
const yesNo = (b: boolean) => (b ? "Oui" : "Non")

/**
 * Export Excel complet du budget, sans perte de détail :
 * Synthèse · Lignes (une par poste simple / sous-poste) · Postes · Devis · Lignes de devis · Versements ·
 * Pôle × séquence.
 */
export function exportBudgetXlsx({ items, model, poles, sequences }: {
  items: BudgetItem[]
  model: BudgetModel
  poles: Pole[]
  sequences: Seq[]
}): void {
  const poleName = (id: string | null) => poles.find((p) => p.id === id)?.name ?? "Sans pôle"
  const seqName = (id: string | null) => sequences.find((s) => s.id === id)?.name ?? "Sans séquence"
  const poleOrder = new Map(poles.map((p, i) => [p.id, i]))
  const seqOrder = new Map(sequences.map((s, i) => [s.id, i]))
  const byBudget = budgetItemComparator(model, poles)

  // ── Lignes : postes sans sous-poste et sous-postes ──
  const leaves = items
    .filter((i) => i.parentId || model.children(i.id).length === 0)
    .map((i) => ({ item: i, top: (i.parentId ? model.itemsById.get(i.parentId) : i) ?? i }))
    .sort((a, b) =>
      (poleOrder.get(a.top.poleId ?? "") ?? 99) - (poleOrder.get(b.top.poleId ?? "") ?? 99)
      || (seqOrder.get(a.item.sequenceId ?? "") ?? 99) - (seqOrder.get(b.item.sequenceId ?? "") ?? 99)
      || byBudget(a.item, b.item))

  const lineRows: Cell[][] = leaves.map(({ item, top }) => {
    const f = model.line(item)
    const retained = model.retained.get(item.id)
    const allDevis = (model.linesByItem.get(item.id) ?? []).map((l) => model.devisById.get(l.devisId)).filter(Boolean)
    const prio = effectivePriority(model, item)
    const due = f.real ?? f.estimated
    const review = effectiveReview(model, item)
    const total = review ? reviewTotal(review.scores) : null
    const perPoint = total == null || item.amountStatus !== "estimated" ? null : costPerPoint(due, total)
    return [
      poleName(top.poleId), top.label, item.parentId ? item.label : "", seqName(item.sequenceId),
      prio ? PRIORITY_LABELS[prio] : "Non priorisé", item.parentId && !item.priority ? "Héritée du poste" : item.priority ? "Propre" : "",
      STATUS_LABELS[item.amountStatus], item.amountStatus === "included" ? model.fullLabel(item.includedInId) : "",
      yesNo(item.guestDependent),
      item.quantity, item.unitPrice, item.amountStatus === "estimated" ? f.estimated : null, f.real, f.paid,
      Math.max(0, due - f.paid), PAYMENT_STATUS_LABELS[paymentStatus({ ...f, depositRequired: item.depositRequired })],
      yesNo(item.depositRequired), yesNo(f.hasPaidDeposit),
      retained ? "Devis retenu" : (model.paymentsByItem.get(item.id)?.length || item.actualTotal != null) ? "Achat direct" : "Pas encore décidé",
      retained?.devis.vendor ?? item.vendor ?? "", retained?.devis.title ?? "", retained?.amount ?? null,
      allDevis.map((d) => `${d!.vendor ?? d!.title ?? "?"} (${DEVIS_LABELS[d!.status]})`).join(" ; "),
      item.account ?? "", item.origin ?? "", item.notes ?? "", top.notes && item.parentId ? top.notes : "",
      // Seconde passe
      ...REVIEW_QUESTIONS.map((q) => review?.scores[q.key] ?? null),
      total, perPoint === Infinity ? "∞" : perPoint,
      item.amountStatus === "included" ? "" : VERDICT_LABELS[reviewVerdict(model, item)],
      review?.inherited ? "Notes du poste" : review ? "Propres" : "", yesNo(item.diyPossible), item.reviewNote ?? "",
    ]
  })

  // ── Postes ──
  const postes = items.filter((i) => !i.parentId)
    .sort(byBudget)
  const posteRows: Cell[][] = postes.map((p) => {
    const f = model.poste(p)
    const kids = model.children(p.id)
    const leavesOf = kids.length ? kids : [p]
    return [
      poleName(p.poleId), p.label, kids.length, model.sequencesOf(p).map(seqName).join(", "),
      p.priority ? PRIORITY_LABELS[p.priority] : "Non priorisé",
      f.estimated, f.real, f.paid, Math.max(0, (f.real ?? f.estimated) - f.paid), PAYMENT_STATUS_LABELS[paymentStatus(f)],
      leavesOf.filter((l) => l.amountStatus === "to_estimate").length, yesNo(leavesOf.some((l) => l.guestDependent)),
      p.notes ?? "",
    ]
  })

  // ── Devis et lignes de devis ──
  const devis = [...model.devisById.values()].sort((a, b) => (a.vendor ?? "").localeCompare(b.vendor ?? "", "fr"))
  const devisRows: Cell[][] = devis.map((d) => {
    const lines = model.linesByDevis.get(d.id) ?? []
    const linesTotal = model.devisLinesTotal(d.id)
    return [
      d.vendor ?? "", d.title ?? "", DEVIS_LABELS[d.status], date(d.quoteDate), date(d.validUntil),
      d.totalAmount, linesTotal, d.totalAmount != null ? d.totalAmount - linesTotal : null,
      model.devisPaid(d.id), lines.length, lines.map((l) => model.fullLabel(l.itemId)).join(" ; "), d.url ?? "", d.notes ?? "",
    ]
  })
  const devisLineRows: Cell[][] = devis.flatMap((d) => (model.linesByDevis.get(d.id) ?? []).map((l) => {
    const item = model.itemsById.get(l.itemId)
    const top = item?.parentId ? model.itemsById.get(item.parentId) : item
    return [d.vendor ?? "", d.title ?? "", DEVIS_LABELS[d.status], poleName(top?.poleId ?? null), model.fullLabel(l.itemId), seqName(item?.sequenceId ?? null), l.amount]
  }))

  // ── Versements ──
  const paymentRows: Cell[][] = [
    ...[...model.paymentsByDevis.entries()].flatMap(([devisId, list]) => {
      const d = model.devisById.get(devisId)
      return list.map((p) => ["Devis", `${d?.vendor ?? ""}${d?.title ? ` · ${d.title}` : ""}`, d ? DEVIS_LABELS[d.status] : "",
        KIND_LABELS[p.kind], p.label ?? "", p.amount, date(p.dueDate), yesNo(p.paid), date(p.paidDate), p.account ?? ""])
    }),
    ...[...model.paymentsByItem.entries()].flatMap(([itemId, list]) =>
      list.map((p) => ["Achat direct", model.fullLabel(itemId), "", KIND_LABELS[p.kind], p.label ?? "", p.amount,
        date(p.dueDate), yesNo(p.paid), date(p.paidDate), p.account ?? ""])),
  ].sort((a, b) => String(a[6] ?? "9").localeCompare(String(b[6] ?? "9")))

  // ── Synthèse ──
  const sumBy = (key: (l: (typeof leaves)[number]) => string) => {
    const map = new Map<string, { est: number; real: number; paid: number; n: number; toEst: number }>()
    for (const l of leaves) {
      const f = model.line(l.item)
      const k = key(l)
      const v = map.get(k) ?? { est: 0, real: 0, paid: 0, n: 0, toEst: 0 }
      v.est += f.estimated; v.real += f.real ?? 0; v.paid += f.paid; v.n += 1
      if (l.item.amountStatus === "to_estimate") v.toEst += 1
      map.set(k, v)
    }
    return map
  }
  const total = { est: 0, real: 0, paid: 0 }
  for (const l of leaves) { const f = model.line(l.item); total.est += f.estimated; total.real += f.real ?? 0; total.paid += f.paid }
  const block = (title: string, map: Map<string, { est: number; real: number; paid: number; n: number; toEst: number }>, order: string[]): Cell[][] => [
    [title, "Estimé", "Réel", "Payé", "% du budget estimé", "Lignes", "Dont à estimer"],
    ...order.filter((k) => map.has(k)).map((k) => {
      const v = map.get(k)!
      return [k, v.est, v.real, v.paid, total.est ? v.est / total.est : 0, v.n, v.toEst]
    }),
    [],
  ]
  const byPole = sumBy((l) => poleName(l.top.poleId))
  const bySeq = sumBy((l) => seqName(l.item.sequenceId))
  const byPrio = sumBy((l) => { const p = effectivePriority(model, l.item); return p ? PRIORITY_LABELS[p] : "Non priorisé" })
  const summaryRows: Cell[][] = [
    ["Budget du mariage", "", "", "", "", "", ""],
    ["Exporté le", new Date(), "", "", "", "", ""],
    ["Total estimé", total.est], ["Total réel (engagé)", total.real], ["Total payé", total.paid],
    ["Lignes pas encore estimées", leaves.filter((l) => l.item.amountStatus === "to_estimate").length],
    ["Montant dépendant du nombre d'invités", leaves.filter((l) => l.item.guestDependent).reduce((t, l) => t + model.line(l.item).estimated, 0)],
    [],
    ...block("Pôle", byPole, [...poles.map((p) => p.name), "Sans pôle"]),
    ...block("Séquence", bySeq, [...sequences.map((s) => s.name), "Sans séquence"]),
    ...block("Priorité", byPrio, [...Object.values(PRIORITY_LABELS), "Non priorisé"]),
  ]
  const summary = XLSX.utils.aoa_to_sheet(summaryRows, { cellDates: true })
  // Formats : montants (colonnes 2 à 4, sauf le compteur de lignes à estimer), pourcentage (colonne 5), date.
  const countRow = 5
  for (const [addr, cell] of Object.entries(summary)) {
    if (addr.startsWith("!") || typeof cell !== "object") continue
    const { r, c } = XLSX.utils.decode_cell(addr)
    if (cell.t === "d") cell.z = DATE
    else if (cell.t === "n" && c >= 1 && c <= 3 && r !== countRow) cell.z = EUR
    else if (cell.t === "n" && c === 4) cell.z = "0.0%"
  }
  summary["!cols"] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 15 }]

  // ── Pôle × séquence ──
  const cells = sumBy((l) => `${poleName(l.top.poleId)}|${seqName(l.item.sequenceId)}`)
  const seqCols = [...sequences.map((s) => s.name), "Sans séquence"].filter((s) => [...cells.keys()].some((k) => k.endsWith(`|${s}`)))
  const poleRowsNames = [...poles.map((p) => p.name), "Sans pôle"].filter((p) => [...cells.keys()].some((k) => k.startsWith(`${p}|`)))
  const matrixRows: Cell[][] = poleRowsNames.map((p) => [
    p, ...seqCols.flatMap((s) => { const v = cells.get(`${p}|${s}`); return [v?.est ?? null, v?.real ?? null] }),
  ])
  const matrixHeaders = ["Pôle", ...seqCols.flatMap((s) => [`${s} — estimé`, `${s} — réel`])]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summary, "Synthèse")
  XLSX.utils.book_append_sheet(wb, sheet([
    "Pôle", "Poste", "Sous-poste", "Séquence", "Priorité", "Origine de la priorité", "État du montant", "Inclus dans",
    "Dépend du nb d'invités", "Quantité", "Prix unitaire", "Estimé", "Réel", "Payé", "Reste à payer", "Statut de paiement",
    "Acompte requis", "Acompte payé", "Mode d'achat", "Fournisseur / enseigne", "Devis retenu (intitulé)", "Part dans le devis",
    "Tous les devis", "Compte", "Origine (qui paie)", "Notes", "Notes du poste",
    ...REVIEW_QUESTIONS.map((q) => `2e passe — ${q.short} (0-2)`), `2e passe — Note /${REVIEW_MAX}`, "2e passe — € par point",
    "2e passe — Verdict", "2e passe — Origine des notes", "2e passe — DIY envisageable", "2e passe — Remarque",
  ], lineRows, { 10: EUR, 11: EUR, 12: EUR, 13: EUR, 14: EUR, 21: EUR, [27 + REVIEW_QUESTIONS.length + 1]: EUR }), "Lignes")
  XLSX.utils.book_append_sheet(wb, sheet([
    "Pôle", "Poste", "Sous-postes", "Séquences", "Priorité", "Estimé", "Réel", "Payé", "Reste à payer", "Statut de paiement",
    "Lignes à estimer", "Dépend du nb d'invités", "Notes",
  ], posteRows, { 5: EUR, 6: EUR, 7: EUR, 8: EUR }), "Postes")
  XLSX.utils.book_append_sheet(wb, sheet([
    "Fournisseur", "Intitulé", "Statut", "Date du devis", "Valable jusqu'au", "Montant total", "Somme des parts", "Écart",
    "Payé", "Lignes couvertes", "Détail des lignes", "Lien", "Notes",
  ], devisRows, { 3: DATE, 4: DATE, 5: EUR, 6: EUR, 7: EUR, 8: EUR }), "Devis")
  XLSX.utils.book_append_sheet(wb, sheet(
    ["Fournisseur", "Intitulé", "Statut", "Pôle", "Ligne couverte", "Séquence", "Part"],
    devisLineRows, { 6: EUR }), "Lignes de devis")
  XLSX.utils.book_append_sheet(wb, sheet(
    ["Porté par", "Devis / ligne", "Statut du devis", "Type", "Libellé", "Montant", "Date prévue", "Payé", "Date de paiement", "Compte"],
    paymentRows, { 5: EUR, 6: DATE, 8: DATE }), "Versements")
  XLSX.utils.book_append_sheet(wb, sheet(matrixHeaders, matrixRows,
    Object.fromEntries(matrixHeaders.slice(1).map((_, i) => [i + 1, EUR]))), "Pôle × séquence")

  XLSX.writeFile(wb, `budget-${new Date().toISOString().slice(0, 10)}.xlsx`, { cellDates: true })
}
