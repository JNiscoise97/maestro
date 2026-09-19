import { useMemo, useRef, useState } from "react"
import { FileUp, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import {
  useBudgetItems, useCreateBudgetItem, useUpdateBudgetItem,
  useDeleteBudgetItem, useImportBudgetItems,
} from "@/hooks/queries/use-budget"
import type { BudgetItem } from "@/services/supabase/budget"

// ── Helpers ───────────────────────────────────────────────────────────────────

const NONE = "__none__"

function fmt(n: number | null | undefined): string {
  if (n == null) return "—"
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
}

function fmtCompact(n: number): string {
  if (n >= 1000) return (n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "k€"
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €"
}

// Suggestions pré-remplies
const ACCOUNT_SUGGESTIONS = ["Jordan CA", "Jordan N26", "Sarah", "Commun", "Parents Jordan", "Parents Sarah"]
const ORIGIN_SUGGESTIONS  = ["Jordan", "Sarah", "Parents Jordan", "Parents Sarah", "Commun"]
const TYPE_SUGGESTIONS    = ["sortie", "acompte", "solde", "remboursement"]

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
      sequenceId:     null,
      category:       currentCategory,
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
      sequenceId:     null,
      category:       (iCat >= 0 ? cols[iCat]?.trim() : "") || "",
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

// ── Formulaire d'édition ──────────────────────────────────────────────────────

const EMPTY_FORM: Omit<BudgetItem, "id" | "sortOrder"> = {
  sequenceId:     null,
  category:       "",
  label:          "",
  quantity:       null,
  unitPrice:      null,
  estimatedTotal: null,
  actualTotal:    null,
  vendor:         null,
  paidDate:       null,
  account:        null,
  origin:         null,
  itemType:       null,
  notes:          null,
}

function toFormStr(n: number | null): string {
  return n != null ? String(n).replace(".", ",") : ""
}

function fromFormStr(s: string): number | null {
  if (!s.trim()) return null
  const n = parseFloat(s.trim().replace(",", "."))
  return isNaN(n) ? null : n
}

function ItemEditSheet({
  item,
  defaultCategory = "",
  sequences,
  onClose,
}: {
  item: BudgetItem | "new" | null
  defaultCategory?: string
  sequences: { id: string; name: string }[]
  onClose: () => void
}) {
  const create = useCreateBudgetItem()
  const update = useUpdateBudgetItem()

  const [form, setForm] = useState<Omit<BudgetItem, "id" | "sortOrder">>(
    item && item !== "new"
      ? {
          sequenceId:     item.sequenceId,
          category:       item.category,
          label:          item.label,
          quantity:       item.quantity,
          unitPrice:      item.unitPrice,
          estimatedTotal: item.estimatedTotal,
          actualTotal:    item.actualTotal,
          vendor:         item.vendor,
          paidDate:       item.paidDate,
          account:        item.account,
          origin:         item.origin,
          itemType:       item.itemType,
          notes:          item.notes,
        }
      : { ...EMPTY_FORM, category: defaultCategory }
  )

  const [qty,   setQty]   = useState(toFormStr(form.quantity))
  const [pu,    setPu]    = useState(toFormStr(form.unitPrice))
  const [estim, setEstim] = useState(toFormStr(form.estimatedTotal))
  const [reel,  setReel]  = useState(toFormStr(form.actualTotal))

  async function handleSave() {
    const data: Omit<BudgetItem, "id" | "sortOrder"> = {
      ...form,
      quantity:       fromFormStr(qty),
      unitPrice:      fromFormStr(pu),
      estimatedTotal: fromFormStr(estim),
      actualTotal:    fromFormStr(reel),
    }
    try {
      if (item === "new") {
        await create.mutateAsync(data)
        toast.success("Ligne ajoutée.")
      } else if (item) {
        await update.mutateAsync({ id: item.id, patch: data })
        toast.success("Ligne mise à jour.")
      }
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de la sauvegarde.")
    }
  }

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {node}
    </div>
  )

  return (
    <Sheet open={item !== null} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{item === "new" ? "Nouvelle ligne" : "Modifier la ligne"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Poste */}
          {field("Poste *",
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          )}

          {/* Catégorie + Séquence */}
          <div className="grid grid-cols-2 gap-3">
            {field("Catégorie",
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            )}
            {field("Séquence",
              <Select value={form.sequenceId ?? NONE} onValueChange={(v) => setForm((f) => ({ ...f, sequenceId: v === NONE ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Aucune —</SelectItem>
                  {sequences.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Montants */}
          <div className="grid grid-cols-2 gap-3">
            {field("Qté", <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />)}
            {field("Prix unitaire €", <Input value={pu} onChange={(e) => setPu(e.target.value)} placeholder="0,00" />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Estimé €", <Input value={estim} onChange={(e) => setEstim(e.target.value)} placeholder="0,00" />)}
            {field("Réel €", <Input value={reel} onChange={(e) => setReel(e.target.value)} placeholder="0,00" />)}
          </div>

          {/* Enseigne + Date */}
          <div className="grid grid-cols-2 gap-3">
            {field("Enseigne", <Input value={form.vendor ?? ""} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value || null }))} />)}
            {field("Date", <Input type="date" value={form.paidDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value || null }))} />)}
          </div>

          {/* Compte */}
          {field("Compte",
            <div className="space-y-2">
              <Input value={form.account ?? ""} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value || null }))} />
              <div className="flex flex-wrap gap-1">
                {ACCOUNT_SUGGESTIONS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setForm((f) => ({ ...f, account: s }))}
                    className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${form.account === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Origine */}
          {field("Origine",
            <div className="space-y-2">
              <Input value={form.origin ?? ""} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value || null }))} />
              <div className="flex flex-wrap gap-1">
                {ORIGIN_SUGGESTIONS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setForm((f) => ({ ...f, origin: s }))}
                    className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${form.origin === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          {field("Type",
            <div className="space-y-2">
              <Input value={form.itemType ?? ""} onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value || null }))} />
              <div className="flex flex-wrap gap-1">
                {TYPE_SUGGESTIONS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setForm((f) => ({ ...f, itemType: s }))}
                    className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${form.itemType === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {field("Notes",
            <textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!form.label.trim() || create.isPending || update.isPending}>
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Import CSV Dialog ─────────────────────────────────────────────────────────

function ImportCsvDialog({
  open,
  sequences,
  onClose,
}: {
  open: boolean
  sequences: { id: string; name: string }[]
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
    const items = parsed.map((r) => ({ ...r, sequenceId: seqId === NONE ? null : seqId }))
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
                    {sequences.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Poste","Catégorie","Estimé","Payé","Compte"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {parsed.slice(0, 30).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5 font-medium max-w-[200px] truncate" title={row.label}>{row.label}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.category || "—"}</td>
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

function BudgetSummary({ items }: { items: BudgetItem[] }) {
  const totalEstim  = items.reduce((s, i) => s + (i.estimatedTotal ?? 0), 0)
  const totalReel   = items.reduce((s, i) => s + (i.actualTotal   ?? 0), 0)
  const ecart       = totalEstim - totalReel

  // Dépensé par compte
  const byAccount = new Map<string, number>()
  for (const item of items) {
    if (item.actualTotal == null || item.actualTotal === 0) continue
    const acc = item.account ?? "Non renseigné"
    byAccount.set(acc, (byAccount.get(acc) ?? 0) + item.actualTotal)
  }
  const accountEntries = [...byAccount.entries()].sort((a, b) => b[1] - a[1])

  const card = (label: string, value: string, sub?: string, accent?: string) => (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent ?? ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {card("Budget estimé",  fmt(totalEstim))}
        {card("Dépensé",        fmt(totalReel), `sur ${fmt(totalEstim)} estimés`)}
        {card("Écart restant",  fmt(ecart),     ecart >= 0 ? "à engager" : "dépassement", ecart < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}
        {card("Lignes",         String(items.length), items.filter((i) => i.actualTotal != null && i.actualTotal > 0).length + " payées")}
      </div>

      {accountEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Par compte :</span>
          {accountEntries.map(([acc, total]) => (
            <span key={acc} className="rounded-full bg-muted/60 border border-border px-3 py-1 text-xs font-medium">
              {acc} · <span className="tabular-nums">{fmtCompact(total)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tableau par catégorie ─────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  sequences,
  onEdit,
  onDelete,
  onAddInCategory,
}: {
  category: string
  items: BudgetItem[]
  sequences: { id: string; name: string }[]
  onEdit: (item: BudgetItem) => void
  onDelete: (id: string) => void
  onAddInCategory: (category: string) => void
}) {
  const [open, setOpen] = useState(true)
  const totalEstim = items.reduce((s, i) => s + (i.estimatedTotal ?? 0), 0)
  const totalReel  = items.reduce((s, i) => s + (i.actualTotal   ?? 0), 0)
  const seqById    = useMemo(() => new Map(sequences.map((s) => [s.id, s.name])), [sequences])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* En-tête catégorie */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`transition-transform ${open ? "rotate-90" : ""} text-muted-foreground text-xs`}>▶</span>
          <span className="font-semibold text-sm">{category || "Sans catégorie"}</span>
          <span className="text-xs text-muted-foreground">{items.length} ligne{items.length > 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-6 text-xs tabular-nums">
          <span className="text-muted-foreground">Estimé <span className="font-semibold text-foreground">{fmt(totalEstim)}</span></span>
          <span className="text-muted-foreground">Réel <span className={`font-semibold ${totalReel > totalEstim && totalEstim > 0 ? "text-destructive" : "text-foreground"}`}>{fmt(totalReel)}</span></span>
        </div>
      </button>

      {open && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium w-[220px]">Poste</th>
                  <th className="px-3 py-2 text-right font-medium w-16">Qté</th>
                  <th className="px-3 py-2 text-right font-medium w-24">P.U.</th>
                  <th className="px-3 py-2 text-right font-medium w-28">Estimé</th>
                  <th className="px-3 py-2 text-right font-medium w-28">Réel</th>
                  <th className="px-3 py-2 text-left font-medium w-28">Enseigne</th>
                  <th className="px-3 py-2 text-left font-medium w-24">Date</th>
                  <th className="px-3 py-2 text-left font-medium w-28">Compte</th>
                  <th className="px-3 py-2 text-left font-medium w-28">Origine</th>
                  <th className="px-3 py-2 text-left font-medium w-24">Type</th>
                  <th className="px-3 py-2 text-left font-medium w-24">Séquence</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 group transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground max-w-[220px]">
                      <div className="truncate" title={item.label}>{item.label}</div>
                      {item.notes && <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{item.quantity ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{item.unitPrice != null ? fmt(item.unitPrice) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{item.estimatedTotal != null ? fmt(item.estimatedTotal) : "—"}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${item.actualTotal != null && item.estimatedTotal != null && item.actualTotal > item.estimatedTotal ? "text-destructive" : item.actualTotal != null ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {item.actualTotal != null ? fmt(item.actualTotal) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[112px] truncate">{item.vendor ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {item.paidDate ? new Date(item.paidDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                    </td>
                    <td className="px-3 py-2.5 max-w-[112px] truncate">
                      {item.account ? <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs">{item.account}</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[112px] truncate">{item.origin ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {item.itemType ? <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{item.itemType}</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.sequenceId ? <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs truncate max-w-[80px] block">{seqById.get(item.sequenceId) ?? "—"}</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => onEdit(item)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => onDelete(item.id)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border/30 px-4 py-2">
            <button
              type="button"
              onClick={() => onAddInCategory(category)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" /> Ajouter dans "{category || "Sans catégorie"}"
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function BudgetPage() {
  const { data: items     = [], isLoading: lItems }  = useBudgetItems()
  const { data: sequences = [], isLoading: lSeq }    = useEventSequences()
  const deleteItem = useDeleteBudgetItem()

  const sortedSeq = useMemo(() => [...sequences].sort((a, b) => a.sortOrder - b.sortOrder), [sequences])

  const [seqFilter,  setSeqFilter]  = useState<string | null>(null)
  const [catFilter,  setCatFilter]  = useState<string | null>(null)
  const [editItem,   setEditItem]   = useState<BudgetItem | "new" | null>(null)
  const [newCategory, setNewCategory] = useState<string>("")
  const [importOpen, setImportOpen] = useState(false)

  // Catégories disponibles
  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category || "Sans catégorie"))].sort(),
    [items]
  )

  // Filtre
  const filtered = useMemo(() => {
    let list = items
    if (seqFilter) list = list.filter((i) => i.sequenceId === seqFilter)
    if (catFilter) list = list.filter((i) => (i.category || "Sans catégorie") === catFilter)
    return list
  }, [items, seqFilter, catFilter])

  // Groupement par catégorie
  const grouped = useMemo(() => {
    const map = new Map<string, BudgetItem[]>()
    for (const item of filtered) {
      const cat = item.category || "Sans catégorie"
      const list = map.get(cat) ?? []
      list.push(item)
      map.set(cat, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"))
  }, [filtered])

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette ligne ?")) return
    try {
      await deleteItem.mutateAsync(id)
      toast.success("Ligne supprimée.")
    } catch {
      toast.error("Erreur lors de la suppression.")
    }
  }

  function handleAddInCategory(cat: string) {
    setNewCategory(cat)
    setEditItem("new")
  }

  if (lItems || lSeq) {
    return (
      <div className="space-y-3 max-w-7xl mx-auto">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Budget"
        description="Suivi des dépenses estimées et réelles"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp className="size-4 mr-1.5" /> Importer CSV
            </Button>
            <Button size="sm" onClick={() => { setNewCategory(""); setEditItem("new") }}>
              <Plus className="size-4 mr-1.5" /> Ajouter
            </Button>
          </div>
        }
      />

      {/* Résumé global */}
      <BudgetSummary items={filtered} />

      {/* Filtres */}
      <div className="flex gap-4 flex-wrap">
        {/* Séquences */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Séquence :</span>
          {[null, ...sortedSeq.map((s) => s.id)].map((id) => {
            const label = id == null ? "Toutes" : (sortedSeq.find((s) => s.id === id)?.name ?? "")
            const active = seqFilter === id
            return (
              <button key={id ?? "all"} onClick={() => setSeqFilter(id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Catégories */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Catégorie :</span>
            <button onClick={() => setCatFilter(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${catFilter == null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
              Toutes
            </button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCatFilter(cat === catFilter ? null : cat)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${catFilter === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tableau */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Aucune ligne de budget.</p>
          <p className="text-xs text-muted-foreground">Importe un CSV ou ajoute des lignes manuellement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([cat, catItems]) => (
            <CategorySection
              key={cat}
              category={cat}
              items={catItems}
              sequences={sortedSeq}
              onEdit={setEditItem}
              onDelete={handleDelete}
              onAddInCategory={handleAddInCategory}
            />
          ))}
        </div>
      )}

      {/* Sheet édition */}
      <ItemEditSheet
        key={editItem === null ? "closed" : editItem === "new" ? `new-${newCategory}` : editItem.id}
        item={editItem}
        defaultCategory={newCategory}
        sequences={sortedSeq}
        onClose={() => setEditItem(null)}
      />

      {/* Dialog import CSV */}
      <ImportCsvDialog
        open={importOpen}
        sequences={sortedSeq}
        onClose={() => setImportOpen(false)}
      />
    </div>
  )
}
