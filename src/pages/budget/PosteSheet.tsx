import { useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, FileText, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SequenceName } from "@/components/shared/SequenceName"
import { useDeletePoste, useSavePoste } from "@/hooks/queries/use-budget"
import {
  ACCOUNT_SUGGESTIONS, ORIGIN_SUGGESTIONS, PAYMENT_STATUS_LABELS, amountInput, fmt, parseAmount, paymentStatus,
  type BudgetModel,
} from "@/lib/budget-calc"
import type { BudgetDevis, BudgetItem, LineDraft, PaymentDraft } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"
import { DevisSheet } from "./DevisSheet"
import { PaymentsEditor } from "./PaymentsEditor"

type Seq = { id: string; name: string; color?: string | null; sortOrder?: number }
const NONE = "__none__"

let keySeq = 0
const newKey = () => `new-${++keySeq}`

function toPayments(model: BudgetModel, itemId: string): PaymentDraft[] {
  return (model.paymentsByItem.get(itemId) ?? []).map(({ kind, label, amount, dueDate, paid, paidDate, account }) =>
    ({ kind, label, amount, dueDate, paid, paidDate, account }))
}

function toDraft(model: BudgetModel, item: BudgetItem): LineDraft {
  return {
    id: item.id, key: item.id, label: item.label, sequenceId: item.sequenceId,
    quantity: item.quantity, unitPrice: item.unitPrice, estimatedTotal: item.estimatedTotal, actualTotal: item.actualTotal,
    vendor: item.vendor, account: item.account, origin: item.origin, notes: item.notes,
    depositRequired: item.depositRequired, payments: toPayments(model, item.id),
  }
}

function emptyLine(label = "", sequenceId: string | null = null): LineDraft {
  return {
    key: newKey(), label, sequenceId, quantity: null, unitPrice: null, estimatedTotal: null, actualTotal: null,
    vendor: null, account: null, origin: null, notes: null, depositRequired: false, payments: [],
  }
}

/**
 * Fenêtre complète d'un poste de dépense — identique en création et en modification :
 * le poste (nom, pôle, notes, acompte), ses montants s'il n'a pas de sous-poste, ses sous-postes
 * (chacun sur une séquence, avec tous ses champs et son échéancier), son échéancier commun,
 * et les devis qui le couvrent.
 */
export function PosteSheet({ poste, defaultPoleId, defaultSequenceId, poles, sequences, model, items, onClose }: {
  poste: BudgetItem | "new"
  defaultPoleId?: string | null
  defaultSequenceId?: string | null
  poles: Pole[]
  sequences: Seq[]
  model: BudgetModel
  items: BudgetItem[]
  onClose: () => void
}) {
  const save = useSavePoste()
  const remove = useDeletePoste()
  const existing = poste !== "new" ? poste : null

  const [main, setMain] = useState<LineDraft & { poleId: string | null }>(() => existing
    ? { ...toDraft(model, existing), poleId: existing.poleId }
    : { ...emptyLine("", defaultSequenceId ?? null), poleId: defaultPoleId ?? null })
  const [subs, setSubs] = useState<LineDraft[]>(() => existing ? model.children(existing.id).map((c) => toDraft(model, c)) : [])
  const [removed, setRemoved] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [devisSheet, setDevisSheet] = useState<{ devis: BudgetDevis | null; preset: string[] } | null>(null)

  const hasSubs = subs.length > 0

  function addSub() {
    // Premier sous-poste : il reprend la séquence et les montants déjà saisis sur le poste.
    const first = !hasSubs
    const sub = first
      ? { ...emptyLine("", main.sequenceId), quantity: main.quantity, unitPrice: main.unitPrice,
          estimatedTotal: main.estimatedTotal, actualTotal: main.actualTotal, vendor: main.vendor, account: main.account, origin: main.origin }
      : emptyLine()
    setSubs([...subs, sub])
    setOpen(sub.key)
  }

  async function handleSave() {
    if (!main.label.trim()) { toast.error("Donnez un nom au poste."); return }
    if (subs.some((s) => !s.label.trim())) { toast.error("Chaque sous-poste doit avoir un nom."); return }
    try {
      await save.mutateAsync({
        poste: hasSubs
          // Poste à sous-postes : ses montants sont ceux de ses sous-postes.
          ? { ...main, sequenceId: null, quantity: null, unitPrice: null, estimatedTotal: null, actualTotal: null }
          : main,
        subs,
        removedSubIds: removed,
      })
      toast.success(existing ? "Poste mis à jour." : "Poste créé.")
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'enregistrement du poste.")
    }
  }

  // Devis couvrant ce poste ou ses sous-postes (poste existant uniquement).
  const coveredIds = existing ? [existing.id, ...model.children(existing.id).map((c) => c.id)] : []
  const devisList = [...new Set(coveredIds.flatMap((id) => (model.linesByItem.get(id) ?? []).map((l) => l.devisId)))]
    .map((id) => model.devisById.get(id))
    .filter((d): d is BudgetDevis => !!d)

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-6">
          <SheetTitle>{existing ? existing.label : "Nouveau poste de dépense"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <datalist id="budget-accounts">{ACCOUNT_SUGGESTIONS.map((a) => <option key={a} value={a} />)}</datalist>
          <datalist id="budget-origins">{ORIGIN_SUGGESTIONS.map((a) => <option key={a} value={a} />)}</datalist>

          {/* ── Poste ── */}
          <section className="grid grid-cols-2 gap-3">
            <Field label="Nom du poste *" className="col-span-2">
              <Input autoFocus={!existing} value={main.label} placeholder="Ex : Fleurs" onChange={(e) => setMain({ ...main, label: e.target.value })} />
            </Field>
            <Field label="Pôle">
              <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={main.poleId ?? NONE}
                onChange={(e) => setMain({ ...main, poleId: e.target.value === NONE ? null : e.target.value })}>
                <option value={NONE}>— Sans pôle —</option>
                {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <label className="flex items-end gap-2 pb-1.5 text-sm">
              <input type="checkbox" checked={main.depositRequired} onChange={(e) => setMain({ ...main, depositRequired: e.target.checked })} />
              Acompte requis
            </label>
            <Field label="Notes" className="col-span-2">
              <Textarea rows={2} value={main.notes ?? ""} onChange={(e) => setMain({ ...main, notes: e.target.value || null })} />
            </Field>
          </section>

          {/* ── Montants du poste simple ── */}
          {!hasSubs && (
            <section className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Montants</p>
              <LineFields line={main} onChange={(l) => setMain({ ...main, ...l })} sequences={sequences} model={model} />
            </section>
          )}

          {/* ── Sous-postes ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sous-postes {hasSubs && `(${subs.length})`}
              </p>
              <Button size="sm" variant="outline" onClick={addSub}><Plus className="size-3.5" /> Ajouter un sous-poste</Button>
            </div>
            {!hasSubs && (
              <p className="text-xs text-muted-foreground">
                Ex. pour « Fleurs » : bouquet de mariée (église), boutonnières (église), bouquets de table (réception).
                Chaque sous-poste a sa séquence et ses montants ; le poste les additionne.
              </p>
            )}
            {subs.map((s, i) => {
              const isOpen = open === s.key
              const figures = s.id ? model.line(model.itemsById.get(s.id)!) : null
              const seq = sequences.find((q) => q.id === s.sequenceId)
              return (
                <div key={s.key} className="rounded-xl border border-border">
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.key)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
                    {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label || <span className="text-muted-foreground">Nouveau sous-poste</span>}</span>
                    <span className="hidden text-xs sm:inline">{seq ? <SequenceName sequence={seq} /> : <span className="text-muted-foreground">Sans séquence</span>}</span>
                    <span className="w-24 text-right text-xs tabular-nums">{fmt(s.estimatedTotal ?? (s.quantity != null && s.unitPrice != null ? s.quantity * s.unitPrice : null))}</span>
                    {figures && <span className="hidden w-28 text-right text-[11px] text-muted-foreground sm:inline">{PAYMENT_STATUS_LABELS[paymentStatus({ ...figures, depositRequired: s.depositRequired })]}</span>}
                  </button>
                  {isOpen && (
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      <div className="flex items-end gap-2">
                        <Field label="Nom du sous-poste *" className="flex-1">
                          <Input value={s.label} placeholder="Ex : Bouquet de mariée" onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                        </Field>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                          if (s.id) setRemoved([...removed, s.id])
                          setSubs(subs.filter((_, j) => j !== i))
                        }}>
                          <Trash2 className="size-3.5" /> Retirer
                        </Button>
                      </div>
                      <LineFields line={s} onChange={(l) => setSubs(subs.map((x, j) => (j === i ? { ...x, ...l } : x)))} sequences={sequences} model={model} withNotes withDeposit />
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          {/* ── Échéancier commun (poste à sous-postes) ── */}
          {hasSubs && (
            <section className="space-y-2 rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Échéancier commun au poste</p>
              <p className="text-xs text-muted-foreground">Pour une facture unique couvrant plusieurs sous-postes (ex. un seul fleuriste).</p>
              <PaymentsEditor value={main.payments} onChange={(payments) => setMain({ ...main, payments })} idPrefix="poste-common" />
            </section>
          )}

          {/* ── Devis ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Devis</p>
              {existing && (
                <Button size="sm" variant="outline" onClick={() => setDevisSheet({
                  devis: null,
                  preset: model.children(existing.id).length ? model.children(existing.id).map((c) => c.id) : [existing.id],
                })}>
                  <FileText className="size-3.5" /> Nouveau devis
                </Button>
              )}
            </div>
            {!existing && <p className="text-xs text-muted-foreground">Enregistrez le poste pour y rattacher un devis.</p>}
            {existing && devisList.length === 0 && <p className="text-xs text-muted-foreground">Aucun devis. Un devis groupé (ex. décoratrice) se crée aussi depuis l'onglet Devis.</p>}
            {devisList.map((d) => (
              <button key={d.id} type="button" onClick={() => setDevisSheet({ devis: d, preset: [] })}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/40">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${d.status === "retenu" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : d.status === "refuse" ? "bg-muted text-muted-foreground line-through" : "bg-amber-400/15 text-amber-700 dark:text-amber-400"}`}>
                  {d.status === "retenu" ? "Retenu" : d.status === "refuse" ? "Refusé" : "En cours"}
                </span>
                <span className="min-w-0 flex-1 truncate">{d.vendor ?? "Fournisseur ?"}{d.title && <span className="text-muted-foreground"> · {d.title}</span>}</span>
                <span className="tabular-nums">{fmt(d.totalAmount)}</span>
                {(model.linesByDevis.get(d.id)?.length ?? 0) > 1 && <span className="text-[11px] text-muted-foreground">groupé</span>}
                {d.url && <ExternalLink className="size-3.5 text-muted-foreground" />}
              </button>
            ))}
          </section>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t px-6 py-3">
          {existing && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
              if (!confirm(`Supprimer « ${existing.label} » et ses sous-postes ?`)) return
              await remove.mutateAsync(existing.id)
              toast.success("Poste supprimé.")
              onClose()
            }}>
              <Trash2 className="size-3.5" /> Supprimer
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => void handleSave()} disabled={save.isPending}>{existing ? "Enregistrer" : "Créer le poste"}</Button>
          </div>
        </div>

        {devisSheet && (
          <DevisSheet devis={devisSheet.devis} presetItemIds={devisSheet.preset} model={model} items={items} poles={poles}
            onClose={() => setDevisSheet(null)} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

/** Champs d'une ligne (poste simple ou sous-poste) : séquence, montants, enseigne, compte, origine, échéancier. */
function LineFields({ line, onChange, sequences, model, withNotes = false, withDeposit = false }: {
  line: LineDraft
  onChange: (patch: Partial<LineDraft>) => void
  sequences: Seq[]
  model: BudgetModel
  withNotes?: boolean
  withDeposit?: boolean
}) {
  const [qty, setQty] = useState(amountInput(line.quantity))
  const [pu, setPu] = useState(amountInput(line.unitPrice))
  const [estim, setEstim] = useState(amountInput(line.estimatedTotal))
  const [real, setReal] = useState(amountInput(line.actualTotal))
  const retained = line.id ? model.retained.get(line.id) : undefined

  // Quantité × prix unitaire préremplit l'estimé tant qu'il n'a pas été saisi à la main.
  function setQtyPu(nextQty: string, nextPu: string) {
    setQty(nextQty)
    setPu(nextPu)
    const q = parseAmount(nextQty)
    const p = parseAmount(nextPu)
    const patch: Partial<LineDraft> = { quantity: q, unitPrice: p }
    if (q != null && p != null && (!estim || parseAmount(estim) === (line.quantity ?? 0) * (line.unitPrice ?? 0))) {
      setEstim(amountInput(q * p))
      patch.estimatedTotal = q * p
    }
    onChange(patch)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Séquence" className="col-span-2">
          <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={line.sequenceId ?? NONE}
            onChange={(e) => onChange({ sequenceId: e.target.value === NONE ? null : e.target.value })}>
            <option value={NONE}>— Sans séquence —</option>
            {sequences.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Quantité"><Input className="font-mono" inputMode="decimal" value={qty} onChange={(e) => setQtyPu(e.target.value, pu)} /></Field>
        <Field label="Prix unitaire €"><Input className="font-mono" inputMode="decimal" value={pu} onChange={(e) => setQtyPu(qty, e.target.value)} /></Field>
        <Field label="Estimé €" className="col-span-2 sm:col-span-1">
          <Input className="font-mono" inputMode="decimal" value={estim} onChange={(e) => { setEstim(e.target.value); onChange({ estimatedTotal: parseAmount(e.target.value) }) }} />
        </Field>
        <Field label="Réel €" className="col-span-2 sm:col-span-1">
          {retained
            ? <p className="flex h-8 items-center text-sm tabular-nums" title="Part dans le devis retenu">{fmt(retained.amount)} <span className="ml-1 text-[11px] text-muted-foreground">(devis)</span></p>
            : <Input className="font-mono" inputMode="decimal" value={real} onChange={(e) => { setReal(e.target.value); onChange({ actualTotal: parseAmount(e.target.value) }) }} />}
        </Field>
        <Field label="Enseigne" className="col-span-2">
          <Input value={line.vendor ?? ""} onChange={(e) => onChange({ vendor: e.target.value || null })} />
        </Field>
        <Field label="Compte"><Input list="budget-accounts" value={line.account ?? ""} onChange={(e) => onChange({ account: e.target.value || null })} /></Field>
        <Field label="Origine"><Input list="budget-origins" value={line.origin ?? ""} onChange={(e) => onChange({ origin: e.target.value || null })} /></Field>
      </div>
      {withDeposit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={line.depositRequired} onChange={(e) => onChange({ depositRequired: e.target.checked })} />
          Acompte requis
        </label>
      )}
      {withNotes && (
        <Field label="Notes"><Textarea rows={2} value={line.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value || null })} /></Field>
      )}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Échéancier</p>
        {retained ? (
          <p className="text-xs text-muted-foreground">
            Paiements gérés par le devis retenu « {retained.devis.vendor ?? retained.devis.title} » (acomptes et solde y sont saisis).
          </p>
        ) : (
          <PaymentsEditor value={line.payments} onChange={(payments) => onChange({ payments })}
            due={parseAmount(real) ?? parseAmount(estim)} idPrefix={`line-${line.key}`} />
        )}
      </div>
    </div>
  )
}
