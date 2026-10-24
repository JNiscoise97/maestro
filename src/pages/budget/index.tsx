import { useMemo, useRef, useState } from "react"
import { FileUp, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import {
  useBudgetDevis, useBudgetDevisLines, useBudgetItems, useBudgetPayments, useImportBudgetItems,
} from "@/hooks/queries/use-budget"
import { usePoles } from "@/hooks/queries/use-poles"
import { BudgetModel, fmt, fmtCompact } from "@/lib/budget-calc"
import { poleIdForCategory } from "@/lib/budget-poles"
import type { BudgetItem } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"
import { SequenceName } from "@/components/shared/SequenceName"
import { DevisTab } from "./DevisTab"
import { PoleTable, type OptionalCol } from "./PoleTable"
import { PosteSheet } from "./PosteSheet"

const NONE = "__none__"

const COL_LABELS: Record<OptionalCol, string> = { qty: "Qté", pu: "P.U.", account: "Compte", origin: "Origine" }

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseFrNumber(s: string): number | null {
  if (!s || s.trim() === "" || s.trim() === "0") {
    const n = parseFloat(s.replace(",", "."))
    return isNaN(n) ? null : n === 0 ? null : n
  }
  const cleaned = s.trim().replace(/\s/g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function parseFrDate(s: string): string | null {
  if (!s?.trim()) return null
  const parts = s.trim().split("/")
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let inQuote = false
  let current = ""
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === "," && !inQuote) {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

type ParsedRow = Omit<BudgetItem, "id" | "sortOrder">

// ── Format "Inventaire fiançailles" ──────────────────────────────────────────
// Colonnes : Item | Argent reçu | Argent à débourser | Déjà versé | Reste à payer | Provenance

type FRaw = {
  label: string
  received: number | null
  toSpend: number | null
  paid: number | null
  remaining: number | null
  provenance: string | null
}

function parseCsvFiancailles(lines: string[]): ParsedRow[] {
  const nonNull: FRaw[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const label = cols[0]?.trim() ?? ""
    if (!label) continue
    nonNull.push({
      label,
      received:   parseFrNumber(cols[1] ?? ""),
      toSpend:    parseFrNumber(cols[2] ?? ""),
      paid:       parseFrNumber(cols[3] ?? ""),
      remaining:  parseFrNumber(cols[4] ?? ""),
      provenance: cols[5]?.trim() || null,
    })
  }

  // Candidate category header: all amount cols empty, short, no digits, no parens
  const isCandidate = (r: FRaw) =>
    r.received == null && r.toSpend == null && r.paid == null &&
    r.remaining == null && !r.provenance &&
    r.label.length <= 25 && !/\d/.test(r.label) && !r.label.includes("(")

  // Two-pass: candidate is a real section header only if
  // at least one row with amounts follows before the next candidate
  const catIdx = new Set<number>()
  for (let i = 0; i < nonNull.length; i++) {
    if (!isCandidate(nonNull[i])) continue
    let hasAmounts = false
    for (let j = i + 1; j < nonNull.length; j++) {
      const nx = nonNull[j]
      if (isCandidate(nx)) break
      if (nx.toSpend != null || nx.paid != null || nx.remaining != null) { hasAmounts = true; break }
    }
    if (hasAmounts) catIdx.add(i)
  }

  let currentCategory = ""
  const result: ParsedRow[] = []
  for (let i = 0; i < nonNull.length; i++) {
    const r = nonNull[i]
    if (catIdx.has(i)) { currentCategory = r.label; continue }
    if (r.label.toUpperCase().startsWith("TOTAL")) continue
    // Pure income rows (only "Argent reçu" filled, nothing to pay)
    if (r.received != null && r.toSpend == null && r.paid == null && r.remaining == null) continue

    // Compute estimated total when "Argent à débourser" is absent but paid+remaining are known
    let estimatedTotal = r.toSpend
    if (estimatedTotal == null && r.paid != null && r.remaining != null) {
      estimatedTotal = r.paid + r.remaining
    } else if (estimatedTotal == null && r.remaining != null && r.remaining > 0) {
      estimatedTotal = (r.paid ?? 0) + r.remaining
    }

    result.push({
      parentId:       null,
      sequenceId:     null,
      category:       currentCategory,
      poleId:         null,
      depositRequired: false,
      label:          r.label,
      quantity:       null,
      unitPrice:      null,
      estimatedTotal,
      actualTotal:    r.paid,
      vendor:         null,
      paidDate:       null,
      account:        r.provenance,
      origin:         null,
      itemType:       null,
      notes:          null,
    })
  }
  return result
}

// ── Format générique (Produit / Catégorie / Unité / Prix unitaire / …) ────────

function parseCsvGeneric(lines: string[]): ParsedRow[] {
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n))
      if (i >= 0) return i
    }
    return -1
  }
  const iLabel   = idx(["produit"])
  const iCat     = idx(["cat"])
  const iQty     = idx(["unit"])
  const iPU      = idx(["prix unitaire", "prix"])
  const iTotal   = idx(["total"])
  const iEstim   = idx(["tarif", "estim"])
  const iVendor  = idx(["enseigne"])
  const iDate    = idx(["date"])
  const iAccount = idx(["compte"])
  const iOrigin  = idx(["origine"])
  const iType    = idx(["type"])
  const iNotes   = idx(["notes"])

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const label = iLabel >= 0 ? cols[iLabel]?.trim() : ""
    if (!label) continue
    rows.push({
      parentId:       null,
      sequenceId:     null,
      category:       (iCat >= 0 ? cols[iCat]?.trim() : "") || "",
      poleId:         null,
      depositRequired: false,
      label,
      quantity:       iQty    >= 0 ? parseFrNumber(cols[iQty]    ?? "") : null,
      unitPrice:      iPU     >= 0 ? parseFrNumber(cols[iPU]     ?? "") : null,
      estimatedTotal: iEstim  >= 0 ? parseFrNumber(cols[iEstim]  ?? "") : null,
      actualTotal:    iTotal  >= 0 ? parseFrNumber(cols[iTotal]  ?? "") : null,
      vendor:         iVendor  >= 0 ? cols[iVendor]?.trim()  || null : null,
      paidDate:       iDate    >= 0 ? parseFrDate(cols[iDate] ?? "")  : null,
      account:        iAccount >= 0 ? cols[iAccount]?.trim() || null : null,
      origin:         iOrigin  >= 0 ? cols[iOrigin]?.trim()  || null : null,
      itemType:       iType    >= 0 ? cols[iType]?.trim()    || null : null,
      notes:          iNotes   >= 0 ? cols[iNotes]?.trim()   || null : null,
    })
  }
  return rows
}

// ── Auto-détection du format ──────────────────────────────────────────────────

function parseCsv(text: string): ParsedRow[] {
  // Try both UTF-8 and latin-1 (garbled chars when opened as wrong encoding)
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const firstHeader = parseCsvLine(lines[0])[0]?.trim().toLowerCase() ?? ""
  // "Item" ou "item" en première colonne → format inventaire fiançailles
  if (firstHeader === "item" || firstHeader.startsWith("item")) {
    return parseCsvFiancailles(lines)
  }
  return parseCsvGeneric(lines)
}

// ── Import CSV Dialog ─────────────────────────────────────────────────────────

function ImportCsvDialog({
  open,
  sequences,
  poles,
  onClose,
}: {
  open: boolean
  sequences: { id: string; name: string; color?: string | null; sortOrder?: number }[]
  poles: Pole[]
  onClose: () => void
}) {
  const importItems = useImportBudgetItems()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [seqId,  setSeqId]  = useState<string>(NONE)
  const [error,  setError]  = useState<string | null>(null)
  const [isDrag, setIsDrag] = useState(false)

  function reset() { setParsed(null); setError(null); setSeqId(NONE) }

  function handleFile(file: File) {
    const tryParse = (text: string) => {
      const rows = parseCsv(text)
      if (rows.length === 0) { setError("Aucune ligne valide trouvée dans le fichier."); return }
      setParsed(rows)
      setError(null)
    }
    // Try UTF-8 first; fall back to windows-1252 if the result looks garbled
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        // Heuristic: garbled UTF-8 read as latin-1 produces sequences like "Ã©", "Ã ", "Ã§"
        if (text.includes("Ã©") || text.includes("Ã ") || text.includes("Ã§") || text.includes("dÃ")) {
          const r2 = new FileReader()
          r2.onload = (e2) => { try { tryParse(e2.target?.result as string) } catch { setError("Erreur lors de la lecture du fichier.") } }
          r2.readAsText(file, "windows-1252")
        } else {
          tryParse(text)
        }
      } catch {
        setError("Erreur lors de la lecture du fichier.")
      }
    }
    reader.readAsText(file, "UTF-8")
  }

  async function handleConfirm() {
    if (!parsed) return
    const items = parsed.map((r) => ({ ...r, sequenceId: seqId === NONE ? null : seqId, poleId: poleIdForCategory(r.category, poles) }))
    try {
      await importItems.mutateAsync(items)
      toast.success(`${items.length} ligne${items.length > 1 ? "s" : ""} importée${items.length > 1 ? "s" : ""}.`)
      onClose()
      reset()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'import.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset() } }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importer un CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {!parsed ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDrag(true) }}
              onDragLeave={() => setIsDrag(false)}
              onDrop={(e) => { e.preventDefault(); setIsDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors ${isDrag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"}`}
            >
              <FileUp className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Glisse ton CSV ici ou clique pour choisir</p>
              <p className="text-xs text-muted-foreground mt-1">Colonnes attendues : Produit, Catégorie, Unité, Prix unitaire, Total, Tarif estimé, Enseigne, Date, Compte, Origine, Type, Notes</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {parsed.length} ligne{parsed.length > 1 ? "s" : ""} détectée{parsed.length > 1 ? "s" : ""}
                </p>
                <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
                  <X className="size-3.5 inline" /> Changer de fichier
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">Assigner à la séquence :</label>
                <Select value={seqId} onValueChange={setSeqId}>
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue placeholder="Aucune (global)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Aucune (global) —</SelectItem>
                    {sequences.map((s) => <SelectItem key={s.id} value={s.id}><SequenceName sequence={s} /></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Poste","Catégorie → pôle","Estimé","Payé","Compte"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {parsed.slice(0, 30).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5 font-medium max-w-[200px] truncate" title={row.label}>{row.label}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {row.category || "—"} → {poles.find((p) => p.id === poleIdForCategory(row.category, poles))?.name ?? "Sans pôle"}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{row.estimatedTotal != null ? fmt(row.estimatedTotal) : "—"}</td>
                        <td className="px-3 py-1.5 tabular-nums">{row.actualTotal   != null ? fmt(row.actualTotal)   : "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.account ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 30 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    … et {parsed.length - 30} ligne{parsed.length - 30 > 1 ? "s" : ""} supplémentaire{parsed.length - 30 > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { onClose(); reset() }}>Annuler</Button>
          {parsed && (
            <Button onClick={handleConfirm} disabled={importItems.isPending}>
              {importItems.isPending ? "Import en cours…" : `Importer ${parsed.length} ligne${parsed.length > 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Résumé ────────────────────────────────────────────────────────────────────

function BudgetSummary({ postes, model }: { postes: BudgetItem[]; model: BudgetModel }) {
  const figs = postes.map((p) => model.poste(p))
  const estimated = figs.reduce((t, f) => t + f.estimated, 0)
  const real = figs.reduce((t, f) => t + (f.real ?? 0), 0)
  const paid = figs.reduce((t, f) => t + f.paid, 0)
  // Reste à payer : sur le réel quand il est connu, sinon sur l'estimé.
  const due = figs.reduce((t, f) => t + (f.real ?? f.estimated), 0)

  // Payé par compte : versements payés des devis retenus et des lignes.
  const byAccount = new Map<string, number>()
  const add = (account: string | null, amount: number | null) => {
    if (!amount) return
    const key = account || "Non renseigné"
    byAccount.set(key, (byAccount.get(key) ?? 0) + amount)
  }
  for (const list of model.paymentsByItem.values()) for (const p of list) if (p.paid) add(p.account, p.amount)
  for (const [devisId, list] of model.paymentsByDevis) {
    if (model.devisById.get(devisId)?.status !== "retenu") continue
    for (const p of list) if (p.paid) add(p.account, p.amount)
  }

  const card = (label: string, value: string, sub?: string, accent?: string) => (
    <div className="space-y-1 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent ?? ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {card("Budget estimé", fmt(estimated), `${postes.length} poste${postes.length > 1 ? "s" : ""}`)}
        {card("Engagé (réel)", fmt(real), "devis retenus et montants réels")}
        {card("Payé", fmt(paid))}
        {card("Reste à payer", fmt(Math.max(0, due - paid)), estimated - real >= 0 ? `marge ${fmt(estimated - real)} sur l'estimé` : "réel au-dessus de l'estimé",
          due - paid > 0 ? "" : "text-emerald-600 dark:text-emerald-400")}
      </div>
      {byAccount.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Payé par compte :</span>
          {[...byAccount.entries()].sort((a, b) => b[1] - a[1]).map(([acc, total]) => (
            <span key={acc} className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium">
              {acc} · <span className="tabular-nums">{fmtCompact(total)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

type Tab = "postes" | "devis"

export function BudgetPage() {
  const { data: items = [], isLoading: lItems } = useBudgetItems()
  const { data: devis = [] } = useBudgetDevis()
  const { data: devisLines = [] } = useBudgetDevisLines()
  const { data: payments = [] } = useBudgetPayments()
  const { data: sequences = [], isLoading: lSeq } = useEventSequences()
  const { data: poles = [] } = usePoles()

  const sortedSeq = useMemo(() => [...sequences].sort((a, b) => a.sortOrder - b.sortOrder), [sequences])
  const sortedPoles = useMemo(() => [...poles].sort((a, b) => a.sortOrder - b.sortOrder), [poles])
  const model = useMemo(() => new BudgetModel(items, devis, devisLines, payments), [items, devis, devisLines, payments])

  const [tab, setTab] = useState<Tab>("postes")
  const [seqFilter, setSeqFilter] = useState<string | null>(null)
  const [poleFilter, setPoleFilter] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ poste: BudgetItem | "new"; poleId?: string | null; sequenceId?: string | null } | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [visibleCols, setVisibleCols] = useState<Set<OptionalCol>>(new Set())

  const NO_POLE = "__sans_pole__"
  const postes = useMemo(() => items.filter((i) => !i.parentId), [items])

  // Postes filtrés : par pôle, et par séquence (un poste concerne une séquence via lui-même ou ses sous-postes).
  const filtered = postes.filter((p) =>
    (!poleFilter || (p.poleId ?? NO_POLE) === poleFilter)
    && (!seqFilter || model.sequencesOf(p).includes(seqFilter)))

  const usedPoles = [
    ...sortedPoles.filter((p) => postes.some((x) => x.poleId === p.id)).map((p) => ({ id: p.id, name: p.name })),
    ...(postes.some((x) => !x.poleId) ? [{ id: NO_POLE, name: "Sans pôle" }] : []),
  ]

  const order = new Map(sortedPoles.map((p, i) => [p.id, i]))
  const grouped = [...new Set(filtered.map((p) => p.poleId ?? NO_POLE))]
    .sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity))
    .map((id) => ({
      poleId: id === NO_POLE ? null : id,
      title: id === NO_POLE ? "Sans pôle" : sortedPoles.find((p) => p.id === id)?.name ?? "Pôle inconnu",
      postes: filtered.filter((p) => (p.poleId ?? NO_POLE) === id),
    }))

  if (lItems || lSeq) {
    return (
      <div className="mx-auto max-w-7xl space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    )
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30"}`

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Budget"
        description="Postes de dépense par pôle et par séquence, devis et échéanciers"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp className="mr-1.5 size-4" /> Importer CSV
            </Button>
            <Button size="sm" onClick={() => setSheet({ poste: "new", poleId: poleFilter && poleFilter !== NO_POLE ? poleFilter : null })}>
              <Plus className="mr-1.5 size-4" /> Nouveau poste
            </Button>
          </div>
        }
      />

      <BudgetSummary postes={postes} model={model} />

      <div className="flex gap-1.5" role="tablist">
        {([["postes", "Postes"], ["devis", `Devis (${devis.length})`]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`rounded-full border px-3.5 py-1 text-sm font-medium transition-colors ${tab === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "devis" ? (
        <DevisTab devis={devis} model={model} items={items} poles={sortedPoles} />
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Séquence :</span>
              <button className={chip(seqFilter == null)} onClick={() => setSeqFilter(null)}>Toutes</button>
              {sortedSeq.map((s) => (
                <button key={s.id} className={chip(seqFilter === s.id)} onClick={() => setSeqFilter(seqFilter === s.id ? null : s.id)}>{s.name}</button>
              ))}
            </div>
            {usedPoles.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Pôle :</span>
                <button className={chip(poleFilter == null)} onClick={() => setPoleFilter(null)}>Tous</button>
                {usedPoles.map((p) => (
                  <button key={p.id} className={chip(poleFilter === p.id)} onClick={() => setPoleFilter(poleFilter === p.id ? null : p.id)}>{p.name}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Colonnes :</span>
              {(Object.keys(COL_LABELS) as OptionalCol[]).map((key) => (
                <button key={key} className={chip(visibleCols.has(key))} onClick={() => setVisibleCols((prev) => {
                  const next = new Set(prev)
                  if (next.has(key)) next.delete(key); else next.add(key)
                  return next
                })}>{COL_LABELS[key]}</button>
              ))}
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="space-y-2 rounded-xl border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">Aucun poste de dépense.</p>
              <p className="text-xs text-muted-foreground">Crée un poste avec « Nouveau poste » ou importe un CSV.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map((g) => (
                <PoleTable key={g.poleId ?? "sans-pole"} title={g.title} postes={g.postes} model={model} sequences={sortedSeq}
                  seqFilter={seqFilter} visibleCols={visibleCols}
                  onOpen={(poste) => setSheet({ poste })}
                  onAdd={(sequenceId) => setSheet({ poste: "new", poleId: g.poleId, sequenceId })} />
              ))}
            </div>
          )}
        </>
      )}

      {sheet && (
        <PosteSheet
          key={sheet.poste === "new" ? `new-${sheet.poleId}-${sheet.sequenceId}` : sheet.poste.id}
          poste={sheet.poste === "new" ? "new" : model.itemsById.get(sheet.poste.id) ?? sheet.poste}
          defaultPoleId={sheet.poleId}
          defaultSequenceId={sheet.sequenceId}
          poles={sortedPoles}
          sequences={sortedSeq}
          model={model}
          items={items}
          onClose={() => setSheet(null)}
        />
      )}

      <ImportCsvDialog open={importOpen} sequences={sortedSeq} poles={sortedPoles} onClose={() => setImportOpen(false)} />
    </div>
  )
}
