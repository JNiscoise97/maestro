import { useState } from "react"
import { ChevronRight, Plus } from "lucide-react"

import { SequenceName } from "@/components/shared/SequenceName"
import {
  PAYMENT_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_SHORT, effectivePriority, fmt, lineMatches, paymentStatus,
  type BudgetModel, type PaymentStatus,
} from "@/lib/budget-calc"
import type { BudgetItem } from "@/services/supabase/budget"

type Seq = { id: string; name: string; color?: string | null; sortOrder?: number }
export type OptionalCol = "qty" | "pu" | "account" | "origin"

const STATUS_CLASS: Record<PaymentStatus, string> = {
  none: "text-muted-foreground",
  a_payer: "bg-muted text-muted-foreground",
  acompte_a_verser: "bg-amber-400/15 text-amber-700 dark:text-amber-400",
  acompte_paye: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  partiel: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  paye: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

/**
 * Un pôle du budget : ses postes regroupés par séquence. Un poste dont les sous-postes sont sur
 * plusieurs séquences apparaît sous chacune, avec seulement les sous-postes de cette séquence ;
 * les sous-totaux par séquence restent ainsi exacts. Un clic ouvre la fenêtre complète du poste.
 */
export function PoleTable({ title, postes, model, sequences, seqFilter, priorityFilter, guestOnly, search, visibleCols, open, onToggle, onOpen, onAdd }: {
  title: string
  /** Seulement les lignes qui dépendent du nombre d'invités. */
  guestOnly: boolean
  /** Recherche : un poste qui correspond s'affiche entier ; sinon seuls ses sous-postes qui correspondent. */
  search: string
  /** Filtre de priorité : seules les lignes de cette priorité comptent (« none » = non priorisées). */
  priorityFilter: string | null
  /** Pôle déplié (piloté par la page : « Tout déplier / Tout replier »). */
  open: boolean
  onToggle: () => void
  postes: BudgetItem[]
  model: BudgetModel
  sequences: Seq[]
  seqFilter: string | null
  visibleCols: Set<OptionalCol>
  onOpen: (poste: BudgetItem) => void
  onAdd: (sequenceId: string | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Séquences présentes dans ce pôle (ordre des séquences, « Sans séquence » en dernier).
  const order = new Map(sequences.map((s, i) => [s.id, i]))
  const byPriority = (l: BudgetItem) => !priorityFilter || (effectivePriority(model, l) ?? "none") === priorityFilter
  // Filtre des lignes d'un poste : priorité, puis recherche si le nom du poste lui-même ne correspond pas.
  const keepFor = (p: BudgetItem) => {
    const searching = !!search.trim() && !lineMatches(p, search)
    if (!priorityFilter && !searching && !guestOnly) return undefined
    return (l: BudgetItem) => byPriority(l) && (!guestOnly || l.guestDependent) && (!searching || lineMatches(l, search))
  }
  // Séquences d'un poste qui ont au moins une ligne retenue par le filtre de priorité.
  const seqsOf = (p: BudgetItem) => [...new Set(model.leaves(p).filter((l) => { const keep = keepFor(p); return !keep || keep(l) })
    .map((l) => (model.children(p.id).length ? l.sequenceId : p.sequenceId)))]
  const seqIds = [...new Set(postes.flatMap(seqsOf))]
    .filter((id) => !seqFilter || id === seqFilter)
    .sort((a, b) => (a === null ? Infinity : order.get(a) ?? Infinity) - (b === null ? Infinity : order.get(b) ?? Infinity))

  const totals = postes.map((p) => model.poste(p, undefined, keepFor(p)))
  const sumOf = (k: "estimated" | "paid") => totals.reduce((t, f) => t + f[k], 0)
  const realSum = totals.reduce((t, f) => t + (f.real ?? 0), 0)
  const cols = 5 + visibleCols.size

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-4 py-3">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex items-center gap-3 text-left transition-opacity hover:opacity-70">
          <span className={`text-xs text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{postes.length} poste{postes.length > 1 ? "s" : ""}</span>
        </button>
        <div className="flex items-center gap-5 text-xs tabular-nums">
          <span className="text-muted-foreground">Estimé <b className="text-foreground">{fmt(sumOf("estimated"))}</b></span>
          <span className="text-muted-foreground">Réel <b className={realSum > sumOf("estimated") && sumOf("estimated") > 0 ? "text-destructive" : "text-foreground"}>{fmt(realSum)}</b></span>
          <span className="text-muted-foreground">Payé <b className="text-foreground">{fmt(sumOf("paid"))}</b></span>
        </div>
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground">
                <th className="w-[240px] px-4 py-2 text-left font-medium">Poste</th>
                {visibleCols.has("qty") && <th className="w-16 px-3 py-2 text-right font-medium">Qté</th>}
                {visibleCols.has("pu") && <th className="w-24 px-3 py-2 text-right font-medium">P.U.</th>}
                <th className="w-28 px-3 py-2 text-right font-medium">Estimé</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Réel</th>
                <th className="w-36 px-3 py-2 text-left font-medium">Paiement</th>
                <th className="w-32 px-3 py-2 text-left font-medium">Enseigne</th>
                {visibleCols.has("account") && <th className="w-28 px-3 py-2 text-left font-medium">Compte</th>}
                {visibleCols.has("origin") && <th className="w-28 px-3 py-2 text-left font-medium">Origine</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {seqIds.map((seqId) => {
                const inSeq = postes
                  .filter((p) => seqsOf(p).includes(seqId))
                  .sort((a, b) => a.label.localeCompare(b.label, "fr"))
                const figs = inSeq.map((p) => model.poste(p, model.children(p.id).length ? seqId : undefined, keepFor(p)))
                const seq = seqId ? sequences.find((s) => s.id === seqId) : undefined
                return [
                  <tr key={`seq-${seqId}`} className="bg-muted/40">
                    <td colSpan={cols} className="px-4 py-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold">
                          {seq ? <SequenceName sequence={seq} /> : <span className="text-muted-foreground">Sans séquence</span>}
                          <span className="ml-2 font-normal text-muted-foreground">{inSeq.length} poste{inSeq.length > 1 ? "s" : ""}</span>
                        </span>
                        <span className="flex items-center gap-4 tabular-nums text-muted-foreground">
                          <span>Estimé <b className="text-foreground">{fmt(figs.reduce((t, f) => t + f.estimated, 0))}</b></span>
                          <span>Réel <b className="text-foreground">{fmt(figs.reduce((t, f) => t + (f.real ?? 0), 0))}</b></span>
                          <button type="button" onClick={() => onAdd(seqId)} title="Ajouter un poste dans cette séquence"
                            className="rounded p-0.5 hover:bg-muted hover:text-foreground"><Plus className="size-3.5" /></button>
                        </span>
                      </div>
                    </td>
                  </tr>,
                  ...inSeq.flatMap((p, i) => {
                    const keep = keepFor(p)
                    const kids = model.children(p.id).filter((k) => k.sequenceId === seqId && (!keep || keep(k)))
                    const key = `${p.id}:${seqId}`
                    // En recherche, les sous-postes trouvés sont dépliés d'office.
                    const isOpen = expanded.has(key) || (!!search.trim() && kids.length > 0)
                    const f = figs[i]
                    const devis = model.retained.get(p.id)?.devis
                    const vendors = [...new Set((kids.length ? kids : [p]).map((l) => model.retained.get(l.id)?.devis.vendor ?? l.vendor).filter(Boolean))]
                    const rows = [
                      <tr key={key} className="group cursor-pointer transition-colors hover:bg-muted/20" onClick={() => onOpen(p)}>
                        <td className="px-4 py-2.5 font-medium">
                          <div className="flex items-center gap-1.5">
                            {kids.length > 0 ? (
                              <button type="button" aria-label={isOpen ? "Replier" : "Déplier"} onClick={(e) => {
                                e.stopPropagation()
                                setExpanded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
                              }} className="shrink-0 text-muted-foreground hover:text-foreground">
                                <ChevronRight className={`size-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                              </button>
                            ) : <span className="w-3.5 shrink-0" />}
                            <span className="truncate" title={p.label}>{p.label}</span>
                            <PriorityBadges priorities={(kids.length ? kids : [p]).map((l) => effectivePriority(model, l))} />
                            <LineMarkers model={model} lines={kids.length ? kids : [p]} />
                            {kids.length > 0 && <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{kids.length} sous-poste{kids.length > 1 ? "s" : ""}</span>}
                            {model.sequencesOf(p).length > 1 && <span className="shrink-0 rounded bg-muted px-1 text-[10px] font-normal text-muted-foreground" title="Ce poste a des sous-postes sur d'autres séquences">+ autres séq.</span>}
                          </div>
                        </td>
                        {visibleCols.has("qty") && <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{kids.length ? "" : p.quantity ?? "—"}</td>}
                        {visibleCols.has("pu") && <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{kids.length ? "" : fmt(p.unitPrice)}</td>}
                        <td className="px-3 py-2.5 text-right tabular-nums"><EstimateCell model={model} lines={kids.length ? kids : [p]} estimated={f.estimated} /></td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{f.real == null ? "—" : fmt(f.real)}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={paymentStatus(f)} paid={f.paid} /></td>
                        <td className="truncate px-3 py-2.5 text-muted-foreground" title={vendors.join(", ")}>
                          {vendors.join(", ") || "—"}{devis && <span className="ml-1 text-[10px]">(devis)</span>}
                        </td>
                        {visibleCols.has("account") && <td className="truncate px-3 py-2.5 text-muted-foreground">{p.account ?? "—"}</td>}
                        {visibleCols.has("origin") && <td className="truncate px-3 py-2.5 text-muted-foreground">{p.origin ?? "—"}</td>}
                      </tr>,
                    ]
                    if (isOpen) {
                      for (const k of kids) {
                        const kf = model.line(k)
                        rows.push(
                          <tr key={`${key}:${k.id}`} className="cursor-pointer bg-muted/10 text-[13px] hover:bg-muted/20" onClick={() => onOpen(p)}>
                            <td className="px-4 py-2 pl-12 text-muted-foreground"><span className="mr-1 text-muted-foreground/40">└</span>{k.label} <PriorityBadges priorities={[effectivePriority(model, k)]} /> <LineMarkers model={model} lines={[k]} /></td>
                            {visibleCols.has("qty") && <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{k.quantity ?? "—"}</td>}
                            {visibleCols.has("pu") && <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(k.unitPrice)}</td>}
                            <td className="px-3 py-2 text-right tabular-nums"><EstimateCell model={model} lines={[k]} estimated={kf.estimated} /></td>
                            <td className="px-3 py-2 text-right tabular-nums">{kf.real == null ? "—" : fmt(kf.real)}</td>
                            <td className="px-3 py-2"><StatusBadge status={paymentStatus({ ...kf, depositRequired: k.depositRequired })} paid={kf.paid} /></td>
                            <td className="truncate px-3 py-2 text-muted-foreground">{model.retained.get(k.id)?.devis.vendor ?? k.vendor ?? "—"}</td>
                            {visibleCols.has("account") && <td className="truncate px-3 py-2 text-muted-foreground">{k.account ?? "—"}</td>}
                            {visibleCols.has("origin") && <td className="truncate px-3 py-2 text-muted-foreground">{k.origin ?? "—"}</td>}
                          </tr>,
                        )
                      }
                    }
                    return rows
                  }),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Montant estimé d'un poste ou d'une ligne : « à estimer » / « inclus » quand il n'y a pas de montant,
 * sinon le montant, suivi de « + N à estimer » si certaines lignes ne sont pas encore estimées.
 */
function EstimateCell({ model, lines, estimated }: { model: BudgetModel; lines: BudgetItem[]; estimated: number }) {
  const toEstimate = lines.filter((l) => l.amountStatus === "to_estimate").length
  const included = lines.filter((l) => l.amountStatus === "included")
  if (lines.length === 1 && included.length === 1) {
    return <span className="text-[11px] text-muted-foreground" title={`Inclus dans ${model.fullLabel(included[0].includedInId)}`}>inclus</span>
  }
  if (toEstimate === lines.length) return <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">à estimer</span>
  return (
    <span className="inline-flex flex-col items-end">
      {fmt(estimated)}
      {toEstimate > 0 && <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">+ {toEstimate} à estimer</span>}
    </span>
  )
}

/** Repères d'une ligne : « % invités » (dépend du nombre d'invités), « inclus dans … », « inclut … ». */
function LineMarkers({ model, lines }: { model: BudgetModel; lines: BudgetItem[] }) {
  const guest = lines.some((l) => l.guestDependent)
  const diy = lines.some((l) => l.diyPossible)
  const included = lines.length === 1 && lines[0].amountStatus === "included" ? lines[0] : null
  const includes = lines.flatMap((l) => model.includedIn(l.id))
  return (
    <>
      {guest && <span className="shrink-0 rounded bg-sky-500/10 px-1 text-[10px] font-semibold text-sky-700 dark:text-sky-400" title="Le montant dépend du nombre d'invités">% invités</span>}
      {diy && <span className="shrink-0 rounded bg-amber-500/15 px-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400" title="On pourrait le faire nous-mêmes">DIY</span>}
      {included && (
        <span className="shrink-0 truncate text-[11px] font-normal text-muted-foreground" title={`Inclus dans ${model.fullLabel(included.includedInId)}`}>
          · inclus dans {model.fullLabel(included.includedInId)}
        </span>
      )}
      {includes.length > 0 && (
        <span className="shrink-0 truncate text-[11px] font-normal text-muted-foreground" title={includes.map((i) => model.fullLabel(i.id)).join(", ")}>
          · inclut : {includes.map((i) => i.label).join(", ")}
        </span>
      )}
    </>
  )
}

/** Pastilles MoSCoW (une par priorité présente). */
function PriorityBadges({ priorities }: { priorities: (keyof typeof PRIORITY_LABELS | null)[] }) {
  const set = [...new Set(priorities.filter((p): p is keyof typeof PRIORITY_LABELS => !!p))]
  return (
    <>
      {set.map((p) => (
        <span key={p} title={PRIORITY_LABELS[p]} className="shrink-0 rounded px-1 text-[10px] font-semibold"
          style={{ color: PRIORITY_COLORS[p], background: `color-mix(in srgb, ${PRIORITY_COLORS[p]} 12%, transparent)` }}>
          {PRIORITY_SHORT[p]}
        </span>
      ))}
    </>
  )
}

function StatusBadge({ status, paid }: { status: PaymentStatus; paid: number }) {
  if (status === "none") return <span className="text-muted-foreground">—</span>
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[status]}`}
      title={paid > 0 ? `Payé : ${fmt(paid)}` : undefined}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  )
}
