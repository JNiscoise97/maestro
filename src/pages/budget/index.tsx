import React, { useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Check, ChevronRight, Copy, ExternalLink, FileUp, Pencil, Plus, Trash2, X } from "lucide-react"
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
  useBudgetQuotes, useCreateBudgetQuote, useUpdateBudgetQuote,
  useDeleteBudgetQuote, useSelectBudgetQuote, useDeselectBudgetQuotes,
  useDuplicateBudgetItem, useSwapBudgetSortOrder, useBudgetQuoteStatus,
} from "@/hooks/queries/use-budget"
import type { BudgetQuote } from "@/services/supabase/budget"
import type { BudgetItem } from "@/services/supabase/budget"
import { sequenceColor, withAlpha } from "@/lib/sequence-colors"
import { SequenceName } from "@/components/shared/SequenceName"
import { usePoles } from "@/hooks/queries/use-poles"
import { poleIdForCategory } from "@/lib/budget-poles"
import type { Pole } from "@/types/domain"

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

// Colonnes optionnelles masquées par défaut
type ColKey = "qty" | "pu" | "date" | "account" | "origin" | "type"
const COL_LABELS: Record<ColKey, string> = {
  qty:     "Qté",
  pu:      "P.U.",
  date:    "Date",
  account: "Compte",
  origin:  "Origine",
  type:    "Type",
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
      parentId:       null,
      sequenceId:     null,
      category:       currentCategory,
      poleId:         null,
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

// ── Devis ─────────────────────────────────────────────────────────────────────

const EMPTY_QUOTE = { vendorName: "", price: "", notes: "", url: "", validUntil: "" }

function DevisSection({
  itemId,
  onRetenu,
}: {
  itemId: string
  onRetenu: (vendorName: string | null, price: number | null) => void
}) {
  const { data: quotes = [] } = useBudgetQuotes(itemId)
  const createQ   = useCreateBudgetQuote(itemId)
  const updateQ   = useUpdateBudgetQuote(itemId)
  const deleteQ   = useDeleteBudgetQuote(itemId)
  const selectQ   = useSelectBudgetQuote(itemId)
  const deselectQ = useDeselectBudgetQuotes(itemId)

  const [showAdd,    setShowAdd]    = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [draft,      setDraft]      = useState(EMPTY_QUOTE)

  function startEdit(q: BudgetQuote) {
    setEditingId(q.id)
    setDraft({
      vendorName: q.vendorName ?? "",
      price:      q.price != null ? String(q.price).replace(".", ",") : "",
      notes:      q.notes ?? "",
      url:        q.url ?? "",
      validUntil: q.validUntil ?? "",
    })
  }

  async function handleSaveAdd() {
    const vendorName = draft.vendorName.trim() || null
    const price      = fromFormStr(draft.price)
    if (!vendorName && price == null) return
    await createQ.mutateAsync({ vendorName, price, notes: draft.notes.trim() || null, url: draft.url.trim() || null, validUntil: draft.validUntil || null })
    setDraft(EMPTY_QUOTE)
    setShowAdd(false)
  }

  async function handleSaveEdit() {
    if (!editingId) return
    await updateQ.mutateAsync({ id: editingId, patch: {
      vendorName: draft.vendorName.trim() || null,
      price:      fromFormStr(draft.price),
      notes:      draft.notes.trim() || null,
      url:        draft.url.trim() || null,
      validUntil: draft.validUntil || null,
    }})
    setEditingId(null)
  }

  async function handleSelect(q: BudgetQuote) {
    const price      = q.price
    const vendorName = q.vendorName
    await selectQ.mutateAsync({ quoteId: q.id, price, vendorName })
    onRetenu(vendorName, price)
  }

  async function handleDeselect() {
    await deselectQ.mutateAsync()
    onRetenu(null, null)
  }

  const QuoteForm = ({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) => (
    <div className="rounded-lg border border-dashed border-border p-3 space-y-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Prestataire</label>
          <Input placeholder="Ex : Costume Paris" value={draft.vendorName} onChange={(e) => setDraft((d) => ({ ...d, vendorName: e.target.value }))} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Prix €</label>
          <Input placeholder="0,00" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} className="h-8 text-xs font-mono" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">URL</label>
          <Input placeholder="https://…" value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Valide jusqu'au</label>
          <Input type="date" value={draft.validUntil} onChange={(e) => setDraft((d) => ({ ...d, validUntil: e.target.value }))} className="h-8 text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Notes</label>
        <Input placeholder="Inclut veste + pantalon, essayage le…" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} className="h-8 text-xs" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">Annuler</Button>
        <Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs">Enregistrer</Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Devis comparatifs</p>
        {!showAdd && (
          <button type="button" onClick={() => { setShowAdd(true); setDraft(EMPTY_QUOTE) }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="size-3" /> Ajouter
          </button>
        )}
      </div>

      {quotes.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground italic">Aucun devis enregistré.</p>
      )}

      {quotes.map((q) => (
        <div key={q.id}>
          {editingId === q.id ? (
            <QuoteForm onSave={handleSaveEdit} onCancel={() => setEditingId(null)} saving={updateQ.isPending} />
          ) : (
            <div className={`rounded-lg border p-3 transition-colors ${q.isSelected ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30" : "border-border"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {q.isSelected && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                    <span className="font-medium text-sm truncate">{q.vendorName ?? "—"}</span>
                    {q.isSelected && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full shrink-0">Retenu</span>}
                  </div>
                  {q.price != null && (
                    <p className="text-base font-bold tabular-nums mt-0.5">{fmt(q.price)}</p>
                  )}
                  {q.notes && <p className="text-xs text-muted-foreground mt-1">{q.notes}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {q.url && (
                      <a href={q.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="size-3" /> Voir le site
                      </a>
                    )}
                    {q.validUntil && (
                      <span className="text-xs text-muted-foreground">
                        Valide jusqu'au {new Date(q.validUntil).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {q.isSelected ? (
                    <button type="button" onClick={handleDeselect} title="Retirer la sélection"
                      className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 hover:bg-muted transition-colors">
                      Retirer
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleSelect(q)} title="Retenir ce devis"
                      className="text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
                      Retenir
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(q)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="size-3" />
                  </button>
                  <button type="button" onClick={() => deleteQ.mutate(q.id)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAdd && (
        <QuoteForm onSave={handleSaveAdd} onCancel={() => setShowAdd(false)} saving={createQ.isPending} />
      )}
    </div>
  )
}

// ── Formulaire d'édition ──────────────────────────────────────────────────────

const EMPTY_FORM: Omit<BudgetItem, "id" | "sortOrder"> = {
  parentId:       null,
  sequenceId:     null,
  poleId:         null,
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
  defaultPoleId = null,
  defaultParentId = null,
  poles,
  sequences,
  onClose,
}: {
  item: BudgetItem | "new" | null
  defaultPoleId?: string | null
  defaultParentId?: string | null
  poles: Pole[]
  sequences: { id: string; name: string; color?: string | null; sortOrder?: number }[]
  onClose: () => void
}) {
  const create  = useCreateBudgetItem()
  const update  = useUpdateBudgetItem()

  const { data: allItems = [] } = useBudgetItems()
  const children = useMemo(
    () => item && item !== "new" ? allItems.filter((i) => i.parentId === item.id) : [],
    [allItems, item],
  )
  const hasChildren = children.length > 0
  const isExisting  = item !== null && item !== "new"
  const isTopLevel  = !defaultParentId && (item === "new" || (isExisting && !(item as BudgetItem).parentId))
  const showSubItems = isExisting && isTopLevel
  const showDevis    = isExisting && !hasChildren

  const [addingChild, setAddingChild]     = useState(false)
  const [childLabel,  setChildLabel]      = useState("")
  const [childEstim,  setChildEstim]      = useState("")
  const createChild       = useCreateBudgetItem()
  const deleteChildMutation = useDeleteBudgetItem()

  async function handleAddChild() {
    if (!isExisting || !childLabel.trim()) return
    await createChild.mutateAsync({
      parentId:   (item as BudgetItem).id,
      sequenceId: null,
      poleId:     form.poleId,
      category:   form.category,
      label:      childLabel.trim(),
      quantity:   null,
      unitPrice:  null,
      estimatedTotal: fromFormStr(childEstim),
      actualTotal:    null,
      vendor: null, paidDate: null, account: null, origin: null, itemType: null, notes: null,
    })
    setChildLabel("")
    setChildEstim("")
    setAddingChild(false)
  }

  const [form, setForm] = useState<Omit<BudgetItem, "id" | "sortOrder">>(
    item && item !== "new"
      ? {
          parentId:       (item as BudgetItem).parentId,
          sequenceId:     item.sequenceId,
          poleId:         item.poleId,
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
      : { ...EMPTY_FORM, poleId: defaultPoleId, parentId: defaultParentId }
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
      <SheetContent className="w-full sm:max-w-2xl flex flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{item === "new" ? "Nouvelle ligne" : "Modifier la ligne"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-6 py-5 overflow-y-auto flex-1">

          {/* ── Identification ── */}
          <div className="flex flex-col gap-3">
            {field("Poste *",
              <Input
                autoFocus
                placeholder="Ex : Traiteur – acompte"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              {field("Pôle",
                <Select value={form.poleId ?? NONE} onValueChange={(v) => setForm((f) => ({ ...f, poleId: v === NONE ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Sans pôle —</SelectItem>
                    {poles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {field("Séquence",
                <Select value={form.sequenceId ?? NONE} onValueChange={(v) => setForm((f) => ({ ...f, sequenceId: v === NONE ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {sequences.map((s) => <SelectItem key={s.id} value={s.id}><SequenceName sequence={s} /></SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* ── Montants ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Montants</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Estimé €",
                <Input value={estim} onChange={(e) => setEstim(e.target.value)} placeholder="0,00" className="font-mono" />
              )}
              {field("Réel €",
                <Input value={reel} onChange={(e) => setReel(e.target.value)} placeholder="0,00" className="font-mono" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("Qté",     <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" className="font-mono" />)}
              {field("Prix unit. €", <Input value={pu} onChange={(e) => setPu(e.target.value)} placeholder="0,00" className="font-mono" />)}
            </div>
          </div>

          {/* ── Paiement ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paiement</p>

            {field("Compte",
              <div className="flex flex-col gap-1.5">
                <Input value={form.account ?? ""} placeholder="Ex : Jordan N26" onChange={(e) => setForm((f) => ({ ...f, account: e.target.value || null }))} />
                <div className="flex flex-wrap gap-1">
                  {ACCOUNT_SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, account: s }))}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${form.account === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {field("Enseigne", <Input value={form.vendor ?? ""} placeholder="Ex : Traiteur Dupont" onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value || null }))} />)}
              {field("Date paiement", <Input type="date" value={form.paidDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value || null }))} />)}
            </div>
          </div>

          {/* ── Détails ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Détails</p>

            {field("Origine",
              <div className="flex flex-col gap-1.5">
                <Input value={form.origin ?? ""} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value || null }))} />
                <div className="flex flex-wrap gap-1">
                  {ORIGIN_SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, origin: s }))}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${form.origin === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {field("Type",
              <div className="flex flex-wrap gap-1 pt-0.5">
                {TYPE_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, itemType: form.itemType === s ? null : s }))}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${form.itemType === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >{s}</button>
                ))}
              </div>
            )}

            {field("Notes",
              <textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            )}
          </div>

          {/* ── Sous-dépenses (top-level uniquement) ── */}
          {showSubItems && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sous-dépenses</p>

              {children.length === 0 && !addingChild && (
                <p className="text-xs text-muted-foreground italic">Aucune sous-dépense. Ajoutes-en pour ventiler le budget.</p>
              )}

              {children.map((child) => (
                <div key={child.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 gap-2">
                  <span className="text-sm font-medium truncate flex-1">{child.label}</span>
                  <span className="text-sm tabular-nums text-muted-foreground shrink-0">{fmt(child.estimatedTotal)}</span>
                  <button type="button" onClick={async () => { if (confirm(`Supprimer "${child.label}" ?`)) { await deleteChildMutation.mutateAsync(child.id) } }}
                    className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}

              {addingChild ? (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Libellé</label>
                    <Input autoFocus placeholder="Ex : Costume" value={childLabel} onChange={(e) => setChildLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddChild(); if (e.key === "Escape") setAddingChild(false) }} className="h-8 text-sm" />
                  </div>
                  <div className="w-28 space-y-1">
                    <label className="text-xs text-muted-foreground">Estimé €</label>
                    <Input placeholder="0,00" value={childEstim} onChange={(e) => setChildEstim(e.target.value)} className="h-8 text-sm font-mono" />
                  </div>
                  <Button size="sm" onClick={handleAddChild} disabled={!childLabel.trim() || createChild.isPending} className="h-8">
                    <Check className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingChild(false)} className="h-8">
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingChild(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="size-3.5" /> Ajouter une sous-dépense
                </button>
              )}
            </div>
          )}

          {/* ── Devis ── */}
          {showDevis && (
            <DevisSection
              itemId={(item as BudgetItem).id}
              onRetenu={(vendorName, price) => {
                setForm((f) => ({
                  ...f,
                  vendor: vendorName ?? f.vendor,
                  estimatedTotal: price ?? f.estimatedTotal,
                }))
                if (price != null) setEstim(String(price).replace(".", ","))
              }}
            />
          )}
        </div>

        <div className="shrink-0 px-6 py-4 flex gap-2 border-t bg-background">
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

function BudgetSummary({ items, childrenMap }: { items: BudgetItem[]; childrenMap: Map<string, BudgetItem[]> }) {
  function rollupEstim(item: BudgetItem) {
    const kids = childrenMap.get(item.id) ?? []
    return kids.length > 0 ? kids.reduce((s, c) => s + (c.estimatedTotal ?? 0), 0) : (item.estimatedTotal ?? 0)
  }
  function rollupReel(item: BudgetItem) {
    const kids = childrenMap.get(item.id) ?? []
    return kids.length > 0 ? kids.reduce((s, c) => s + (c.actualTotal ?? 0), 0) : (item.actualTotal ?? 0)
  }

  const totalEstim  = items.reduce((s, i) => s + rollupEstim(i), 0)
  const totalReel   = items.reduce((s, i) => s + rollupReel(i), 0)
  const ecart       = totalEstim - totalReel

  // Dépensé par compte (inclut les enfants)
  const byAccount = new Map<string, number>()
  const allLeafs = items.flatMap((i) => {
    const kids = childrenMap.get(i.id) ?? []
    return kids.length > 0 ? kids : [i]
  })
  for (const item of allLeafs) {
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

// ── Tableau par pôle (sous-regroupé par séquence) ───────────────────────────────

function PoleSection({
  title,
  poleId,
  items,
  childrenMap,
  sequences,
  quoteStatus,
  visibleCols,
  onEdit,
  onDelete,
  onAddSubItem,
  onAddInPole,
}: {
  title: string
  poleId: string | null
  items: BudgetItem[]
  childrenMap: Map<string, BudgetItem[]>
  sequences: { id: string; name: string; color?: string | null; sortOrder?: number }[]
  quoteStatus: Record<string, boolean>
  visibleCols: Set<ColKey>
  onEdit: (item: BudgetItem) => void
  onDelete: (id: string) => void
  onAddSubItem: (parentId: string, poleId: string | null) => void
  onAddInPole: (poleId: string | null) => void
}) {
  const [open,         setOpen]         = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const swapOrder  = useSwapBudgetSortOrder()
  const duplicateM = useDuplicateBudgetItem()

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Index de tri par séquence (basé sur l'ordre des sequences déjà triées)
  const seqIndex = useMemo(() => {
    const map = new Map<string | null, number>()
    sequences.forEach((s, i) => map.set(s.id, i))
    return map
  }, [sequences])

  // Items triés : d'abord par séquence, puis par sort_order
  const sortedItems = useMemo(() =>
    [...items].sort((a, b) => {
      const si = (id: string | null) => id != null ? (seqIndex.get(id) ?? sequences.length) : sequences.length
      const d = si(a.sequenceId) - si(b.sequenceId)
      if (d !== 0) return d
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    }),
    [items, seqIndex, sequences.length]
  )

  function canMove(item: BudgetItem, dir: "up" | "down", isChild: boolean): boolean {
    if (isChild) {
      const siblings = (childrenMap.get(item.parentId!) ?? [])
        .slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      const idx = siblings.findIndex((i) => i.id === item.id)
      if (idx === -1) return false
      return dir === "up" ? idx > 0 : idx < siblings.length - 1
    }
    const idx = sortedItems.findIndex((i) => i.id === item.id)
    if (idx === -1) return false
    const adj = dir === "up" ? sortedItems[idx - 1] : sortedItems[idx + 1]
    return adj != null && adj.sequenceId === item.sequenceId
  }

  function handleMove(item: BudgetItem, dir: "up" | "down", isChild: boolean) {
    if (isChild) {
      const siblings = (childrenMap.get(item.parentId!) ?? [])
        .slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      const idx = siblings.findIndex((i) => i.id === item.id)
      if (idx === -1) return
      const adj = dir === "up" ? siblings[idx - 1] : siblings[idx + 1]
      if (!adj) return
      swapOrder.mutate({ idA: item.id, sortOrderA: item.sortOrder, idB: adj.id, sortOrderB: adj.sortOrder })
      return
    }
    const idx = sortedItems.findIndex((i) => i.id === item.id)
    if (idx === -1) return
    const adj = dir === "up" ? sortedItems[idx - 1] : sortedItems[idx + 1]
    if (!adj || adj.sequenceId !== item.sequenceId) return
    swapOrder.mutate({ idA: item.id, sortOrderA: item.sortOrder, idB: adj.id, sortOrderB: adj.sortOrder })
  }

  function rollupEstim(item: BudgetItem): number {
    const children = childrenMap.get(item.id) ?? []
    if (children.length > 0) return children.reduce((s, c) => s + (c.estimatedTotal ?? 0), 0)
    return item.estimatedTotal ?? 0
  }

  function rollupReel(item: BudgetItem): number {
    const children = childrenMap.get(item.id) ?? []
    if (children.length > 0) return children.reduce((s, c) => s + (c.actualTotal ?? 0), 0)
    return item.actualTotal ?? 0
  }

  const totalEstim  = items.reduce((s, i) => s + rollupEstim(i), 0)
  const totalReel   = items.reduce((s, i) => s + rollupReel(i), 0)
  const seqById     = useMemo(() => new Map(sequences.map((s) => [s.id, s])), [sequences])
  const parentIds   = useMemo(() => sortedItems.filter((i) => (childrenMap.get(i.id)?.length ?? 0) > 0).map((i) => i.id), [sortedItems, childrenMap])
  const hasKidsInCat = parentIds.length > 0

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* En-tête du pôle */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
        >
          <span className={`transition-transform ${open ? "rotate-90" : ""} text-muted-foreground text-xs`}>▶</span>
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">{sortedItems.length} ligne{sortedItems.length > 1 ? "s" : ""}</span>
        </button>
        <div className="flex items-center gap-4">
          {hasKidsInCat && open && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setExpandedRows(new Set(parentIds))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Tout déplier
              </button>
              <span className="text-border text-xs">·</span>
              <button type="button" onClick={() => setExpandedRows(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Tout replier
              </button>
            </div>
          )}
          <div className="flex items-center gap-6 text-xs tabular-nums">
            <span className="text-muted-foreground">Estimé <span className="font-semibold text-foreground">{fmt(totalEstim)}</span></span>
            <span className="text-muted-foreground">Réel <span className={`font-semibold ${totalReel > totalEstim && totalEstim > 0 ? "text-destructive" : "text-foreground"}`}>{fmt(totalReel)}</span></span>
          </div>
        </div>
      </div>

      {open && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium w-[220px]">Poste</th>
                  {visibleCols.has("qty")     && <th className="px-3 py-2 text-right font-medium w-16">Qté</th>}
                  {visibleCols.has("pu")      && <th className="px-3 py-2 text-right font-medium w-24">P.U.</th>}
                  <th className="px-3 py-2 text-right font-medium w-28">Estimé</th>
                  <th className="px-3 py-2 text-right font-medium w-28">Réel</th>
                  <th className="px-3 py-2 text-left font-medium w-28">Enseigne</th>
                  {visibleCols.has("date")    && <th className="px-3 py-2 text-left font-medium w-24">Date</th>}
                  {visibleCols.has("account") && <th className="px-3 py-2 text-left font-medium w-28">Compte</th>}
                  {visibleCols.has("origin")  && <th className="px-3 py-2 text-left font-medium w-28">Origine</th>}
                  {visibleCols.has("type")    && <th className="px-3 py-2 text-left font-medium w-24">Type</th>}
                  <th className="px-3 py-2 text-left font-medium w-36">Séquence</th>
                  <th className="px-3 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sortedItems.map((item, index) => {
                  const kids     = (childrenMap.get(item.id) ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  const hasKids  = kids.length > 0
                  const expanded = expandedRows.has(item.id)

                  function renderRow(it: BudgetItem, isChild: boolean) {
                    const itEstim = isChild ? it.estimatedTotal : (hasKids ? rollupEstim(item) : item.estimatedTotal)
                    const itReel  = isChild ? it.actualTotal    : (hasKids ? rollupReel(item)  : item.actualTotal)
                    return (
                      <tr key={it.id} className="hover:bg-muted/20 group transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground max-w-[220px]">
                          <div className={`flex items-center gap-1.5 ${isChild ? "pl-5" : ""}`}>
                            {!isChild && hasKids && (
                              <button type="button" onClick={() => toggleRow(it.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                                <ChevronRight className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
                              </button>
                            )}
                            {isChild && <span className="text-muted-foreground/40 text-xs shrink-0">└</span>}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate" title={it.label}>{it.label}</span>
                                {it.id in quoteStatus && (
                                  <span
                                    className={`inline-block shrink-0 w-1.5 h-1.5 rounded-full ${quoteStatus[it.id] ? "bg-emerald-500" : "bg-amber-400"}`}
                                    title={quoteStatus[it.id] ? "Devis retenu" : "Devis disponibles"}
                                  />
                                )}
                              </div>
                              {it.notes && <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{it.notes}</div>}
                            </div>
                            {!isChild && hasKids && (
                              <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5 shrink-0">{kids.length}</span>
                            )}
                          </div>
                        </td>
                        {visibleCols.has("qty") && <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{it.quantity ?? "—"}</td>}
                        {visibleCols.has("pu")  && <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{it.unitPrice != null ? fmt(it.unitPrice) : "—"}</td>}
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{itEstim != null ? fmt(itEstim) : "—"}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${itReel != null && itEstim != null && itReel > itEstim ? "text-destructive" : itReel != null ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                          {itReel != null ? fmt(itReel) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground max-w-[112px] truncate">{it.vendor ?? "—"}</td>
                        {visibleCols.has("date") && (
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {it.paidDate ? new Date(it.paidDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                          </td>
                        )}
                        {visibleCols.has("account") && (
                          <td className="px-3 py-2.5 max-w-[112px] truncate">
                            {it.account ? <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs">{it.account}</span> : "—"}
                          </td>
                        )}
                        {visibleCols.has("origin") && <td className="px-3 py-2.5 text-muted-foreground max-w-[112px] truncate">{it.origin ?? "—"}</td>}
                        {visibleCols.has("type") && (
                          <td className="px-3 py-2.5">
                            {it.itemType ? <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{it.itemType}</span> : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          {it.sequenceId && seqById.get(it.sequenceId) ? (
                            <span className="rounded-full px-2 py-0.5 text-xs whitespace-nowrap text-foreground"
                              style={{ backgroundColor: withAlpha(sequenceColor(seqById.get(it.sequenceId)!), 0.14) }}>
                              <SequenceName sequence={seqById.get(it.sequenceId)!} />
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <>
                              <button type="button" title="Monter" onClick={() => handleMove(it, "up", isChild)}
                                disabled={!canMove(it, "up", isChild) || swapOrder.isPending}
                                className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed">
                                <ArrowUp className="size-3" />
                              </button>
                              <button type="button" title="Descendre" onClick={() => handleMove(it, "down", isChild)}
                                disabled={!canMove(it, "down", isChild) || swapOrder.isPending}
                                className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed">
                                <ArrowDown className="size-3" />
                              </button>
                            </>
                            {!isChild && (
                              <>
                                <button type="button" title="Dupliquer" onClick={() => duplicateM.mutate(it.id)}
                                  disabled={duplicateM.isPending}
                                  className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                                  <Copy className="size-3.5" />
                                </button>
                                <button type="button" title="Ajouter une sous-dépense" onClick={() => onAddSubItem(it.id, it.poleId)}
                                  className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                                  <Plus className="size-3.5" />
                                </button>
                              </>
                            )}
                            <button type="button" onClick={() => onEdit(it)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                              <Pencil className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => onDelete(it.id)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  // Nouvelle séquence : intertitre avec ses sous-totaux.
                  const newSequence = index === 0 || sortedItems[index - 1].sequenceId !== item.sequenceId
                  const seqItems = newSequence ? sortedItems.filter((i) => i.sequenceId === item.sequenceId) : []
                  const seq = item.sequenceId ? seqById.get(item.sequenceId) : undefined
                  return (
                    <React.Fragment key={item.id}>
                      {newSequence && (
                        <tr className="bg-muted/40">
                          <td colSpan={6 + visibleCols.size} className="px-4 py-1.5">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-semibold">
                                {seq ? <SequenceName sequence={seq} /> : <span className="text-muted-foreground">Sans séquence</span>}
                                <span className="ml-2 font-normal text-muted-foreground">{seqItems.length} poste{seqItems.length > 1 ? "s" : ""}</span>
                              </span>
                              <span className="flex gap-4 tabular-nums text-muted-foreground">
                                <span>Estimé <b className="text-foreground">{fmt(seqItems.reduce((t, i) => t + rollupEstim(i), 0))}</b></span>
                                <span>Réel <b className="text-foreground">{fmt(seqItems.reduce((t, i) => t + rollupReel(i), 0))}</b></span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {renderRow(item, false)}
                      {hasKids && expanded && kids.map((child) => renderRow(child, true))}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border/30 px-4 py-2">
            <button
              type="button"
              onClick={() => onAddInPole(poleId)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" /> Ajouter dans "{title}"
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function BudgetPage() {
  const { data: items       = [], isLoading: lItems } = useBudgetItems()
  const { data: sequences   = [], isLoading: lSeq }  = useEventSequences()
  const { data: quoteStatus = {} }                   = useBudgetQuoteStatus()
  const { data: poles       = [] }                   = usePoles()
  const deleteItem = useDeleteBudgetItem()
  const sortedPoles = useMemo(() => [...poles].sort((a, b) => a.sortOrder - b.sortOrder), [poles])

  const sortedSeq = useMemo(() => [...sequences].sort((a, b) => a.sortOrder - b.sortOrder), [sequences])

  const [seqFilter,   setSeqFilter]   = useState<string | null>(null)
  const [poleFilter,  setPoleFilter]  = useState<string | null>(null)
  const [editItem,    setEditItem]    = useState<BudgetItem | "new" | null>(null)
  const [newPoleId,   setNewPoleId]   = useState<string | null>(null)
  const [newParentId, setNewParentId] = useState<string | null>(null)
  const [importOpen,  setImportOpen]  = useState(false)
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set())

  function toggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Enfants par parent
  const childrenMap = useMemo(() => {
    const map = new Map<string, BudgetItem[]>()
    for (const item of items) {
      if (!item.parentId) continue
      const list = map.get(item.parentId) ?? []
      list.push(item)
      map.set(item.parentId, list)
    }
    return map
  }, [items])

  // Pôles ayant au moins une ligne (filtre), dans l'ordre des missions ; « Sans pôle » en dernier.
  const NO_POLE = "__sans_pole__"
  const usedPoles = useMemo(() => {
    const used = new Set(items.filter((i) => !i.parentId).map((i) => i.poleId ?? NO_POLE))
    return [
      ...sortedPoles.filter((p) => used.has(p.id)).map((p) => ({ id: p.id, name: p.name })),
      ...(used.has(NO_POLE) ? [{ id: NO_POLE, name: "Sans pôle" }] : []),
    ]
  }, [items, sortedPoles])

  // Filtre (top-level seulement)
  const filtered = useMemo(() => {
    let list = items.filter((i) => !i.parentId)
    if (seqFilter) list = list.filter((i) => i.sequenceId === seqFilter)
    if (poleFilter) list = list.filter((i) => (i.poleId ?? NO_POLE) === poleFilter)
    return list
  }, [items, seqFilter, poleFilter])

  // Groupement par pôle, dans l'ordre des pôles des missions ; « Sans pôle » en dernier.
  const grouped = useMemo(() => {
    const map = new Map<string, BudgetItem[]>()
    for (const item of filtered) {
      const key = item.poleId ?? NO_POLE
      map.set(key, [...(map.get(key) ?? []), item])
    }
    const order = new Map(sortedPoles.map((p, i) => [p.id, i]))
    return [...map.entries()]
      .sort(([a], [b]) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity))
      .map(([id, list]) => ({
        poleId: id === NO_POLE ? null : id,
        title: id === NO_POLE ? "Sans pôle" : sortedPoles.find((p) => p.id === id)?.name ?? "Pôle inconnu",
        items: list,
      }))
  }, [filtered, sortedPoles])

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette ligne ?")) return
    try {
      await deleteItem.mutateAsync(id)
      toast.success("Ligne supprimée.")
    } catch {
      toast.error("Erreur lors de la suppression.")
    }
  }

  function handleAddInPole(poleId: string | null) {
    setNewParentId(null)
    setNewPoleId(poleId)
    setEditItem("new")
  }

  function handleAddSubItem(parentId: string, poleId: string | null) {
    setNewParentId(parentId)
    setNewPoleId(poleId)
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
            <Button size="sm" onClick={() => { setNewPoleId(null); setEditItem("new") }}>
              <Plus className="size-4 mr-1.5" /> Ajouter
            </Button>
          </div>
        }
      />

      {/* Résumé global */}
      <BudgetSummary items={filtered} childrenMap={childrenMap} />

      {/* Colonnes optionnelles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Colonnes :</span>
        {(Object.keys(COL_LABELS) as ColKey[]).map((key) => {
          const active = visibleCols.has(key)
          return (
            <button key={key} onClick={() => toggleCol(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
              {COL_LABELS[key]}
            </button>
          )
        })}
      </div>

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

        {/* Pôles */}
        {usedPoles.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Pôle :</span>
            <button onClick={() => setPoleFilter(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${poleFilter == null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
              Tous
            </button>
            {usedPoles.map((p) => (
              <button key={p.id} onClick={() => setPoleFilter(p.id === poleFilter ? null : p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${poleFilter === p.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                {p.name}
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
          {grouped.map((g) => (
            <PoleSection
              key={g.poleId ?? "sans-pole"}
              title={g.title}
              poleId={g.poleId}
              items={g.items}
              childrenMap={childrenMap}
              sequences={sortedSeq}
              quoteStatus={quoteStatus}
              visibleCols={visibleCols}
              onEdit={setEditItem}
              onDelete={handleDelete}
              onAddSubItem={handleAddSubItem}
              onAddInPole={handleAddInPole}
            />
          ))}
        </div>
      )}

      {/* Sheet édition */}
      <ItemEditSheet
        key={editItem === null ? "closed" : editItem === "new" ? `new-${newParentId}-${newPoleId}` : editItem.id}
        item={editItem}
        defaultPoleId={newPoleId}
        defaultParentId={newParentId}
        poles={sortedPoles}
        sequences={sortedSeq}
        onClose={() => { setEditItem(null); setNewParentId(null) }}
      />

      {/* Dialog import CSV */}
      <ImportCsvDialog
        open={importOpen}
        sequences={sortedSeq}
        poles={sortedPoles}
        onClose={() => setImportOpen(false)}
      />
    </div>
  )
}
