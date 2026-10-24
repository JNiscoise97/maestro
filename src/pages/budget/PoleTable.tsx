import { useState } from "react"
import { ChevronRight, Plus } from "lucide-react"

import { SequenceName } from "@/components/shared/SequenceName"
import { PAYMENT_STATUS_LABELS, fmt, paymentStatus, type BudgetModel, type PaymentStatus } from "@/lib/budget-calc"
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
export function PoleTable({ title, postes, model, sequences, seqFilter, visibleCols, onOpen, onAdd }: {
  title: string
  postes: BudgetItem[]
  model: BudgetModel
  sequences: Seq[]
  seqFilter: string | null
  visibleCols: Set<OptionalCol>
  onOpen: (poste: BudgetItem) => void
  onAdd: (sequenceId: string | null) => void
}) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Séquences présentes dans ce pôle (ordre des séquences, « Sans séquence » en dernier).
  const order = new Map(sequences.map((s, i) => [s.id, i]))
  const seqIds = [...new Set(postes.flatMap((p) => model.sequencesOf(p)))]
    .filter((id) => !seqFilter || id === seqFilter)
    .sort((a, b) => (a === null ? Infinity : order.get(a) ?? Infinity) - (b === null ? Infinity : order.get(b) ?? Infinity))

  const totals = postes.map((p) => model.poste(p))
  const sumOf = (k: "estimated" | "paid") => totals.reduce((t, f) => t + f[k], 0)
  const realSum = totals.reduce((t, f) => t + (f.real ?? 0), 0)
  const cols = 5 + visibleCols.size

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 text-left transition-opacity hover:opacity-70">
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
                  .filter((p) => model.sequencesOf(p).includes(seqId))
                  .sort((a, b) => a.label.localeCompare(b.label, "fr"))
                const figs = inSeq.map((p) => model.poste(p, model.children(p.id).length ? seqId : undefined))
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
                    const kids = model.children(p.id).filter((k) => k.sequenceId === seqId)
                    const key = `${p.id}:${seqId}`
                    const isOpen = expanded.has(key)
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
                            {kids.length > 0 && <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{kids.length} sous-poste{kids.length > 1 ? "s" : ""}</span>}
                            {model.sequencesOf(p).length > 1 && <span className="shrink-0 rounded bg-muted px-1 text-[10px] font-normal text-muted-foreground" title="Ce poste a des sous-postes sur d'autres séquences">+ autres séq.</span>}
                          </div>
                        </td>
                        {visibleCols.has("qty") && <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{kids.length ? "" : p.quantity ?? "—"}</td>}
                        {visibleCols.has("pu") && <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{kids.length ? "" : fmt(p.unitPrice)}</td>}
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(f.estimated)}</td>
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
                            <td className="px-4 py-2 pl-12 text-muted-foreground"><span className="mr-1 text-muted-foreground/40">└</span>{k.label}</td>
                            {visibleCols.has("qty") && <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{k.quantity ?? "—"}</td>}
                            {visibleCols.has("pu") && <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(k.unitPrice)}</td>}
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(kf.estimated)}</td>
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

function StatusBadge({ status, paid }: { status: PaymentStatus; paid: number }) {
  if (status === "none") return <span className="text-muted-foreground">—</span>
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[status]}`}
      title={paid > 0 ? `Payé : ${fmt(paid)}` : undefined}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  )
}
