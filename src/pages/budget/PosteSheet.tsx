import { useMemo, useState } from "react"
import { Check, ExternalLink, FileText, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useDeletePoste, useSavePoste } from "@/hooks/queries/use-budget"
import {
  ACCOUNT_SUGGESTIONS, ORIGIN_SUGGESTIONS, PAYMENT_STATUS_LABELS, PRIORITIES, PRIORITY_COLORS, PRIORITY_HINTS,
  PRIORITY_LABELS, amountInput, fmt, parseAmount, paymentStatus, type BudgetModel,
} from "@/lib/budget-calc"
import { cn } from "@/lib/utils"
import type { AmountStatus, BudgetDevis, BudgetItem, DevisPlan, DevisStatus, LineDraft, PaymentDraft, Priority } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"
import { DevisSheet } from "./DevisSheet"
import { PaymentsEditor } from "./PaymentsEditor"

type Seq = { id: string; name: string; color?: string | null; sortOrder?: number }
type Purchase = "undecided" | "direct" | "devis"
type DevisLink = { devisRef: string; amount: string }
type Line = LineDraft & { purchase: Purchase; links: DevisLink[] }
type NewDevis = { ref: string; vendor: string; title: string; totalAmount: string; status: DevisStatus }

const STEPS = [
  { id: 1, title: "Quoi ?", hint: "Le nom du poste, son pôle et sa priorité." },
  { id: 2, title: "Pour quelles séquences ?", hint: "Une seule séquence, ou plusieurs éléments répartis sur des séquences." },
  { id: 3, title: "Combien ?", hint: "L'estimation de chaque élément." },
  { id: 4, title: "Comment c'est acheté ?", hint: "Pas encore décidé, achat direct ou via un devis." },
] as const
type Step = 1 | 2 | 3 | 4 | 5

const NONE = "__none__"
let keySeq = 0
const newKey = (p = "new") => `${p}-${++keySeq}`

function toPayments(model: BudgetModel, itemId: string): PaymentDraft[] {
  return (model.paymentsByItem.get(itemId) ?? []).map(({ kind, label, amount, dueDate, paid, paidDate, account }) =>
    ({ kind, label, amount, dueDate, paid, paidDate, account }))
}

function fromItem(model: BudgetModel, item: BudgetItem): Line {
  const links = (model.linesByItem.get(item.id) ?? []).map((l) => ({ devisRef: l.devisId, amount: amountInput(l.amount) }))
  const payments = toPayments(model, item.id)
  const direct = !links.length && (payments.length > 0 || item.actualTotal != null || !!item.vendor)
  return {
    id: item.id, key: item.id, label: item.label, sequenceId: item.sequenceId,
    quantity: item.quantity, unitPrice: item.unitPrice, estimatedTotal: item.estimatedTotal, actualTotal: item.actualTotal,
    vendor: item.vendor, account: item.account, origin: item.origin, notes: item.notes,
    depositRequired: item.depositRequired, priority: item.priority, payments,
    amountStatus: item.amountStatus, includedInId: item.includedInId, guestDependent: item.guestDependent,
    purchase: links.length ? "devis" : direct ? "direct" : "undecided", links,
  }
}

function emptyLine(sequenceId: string | null = null, label = ""): Line {
  return {
    key: newKey(), label, sequenceId, quantity: null, unitPrice: null, estimatedTotal: null, actualTotal: null,
    vendor: null, account: null, origin: null, notes: null, depositRequired: false, priority: null, payments: [],
    amountStatus: "estimated", includedInId: null, guestDependent: false,
    purchase: "undecided", links: [],
  }
}

const estimateOf = (l: Line) => l.amountStatus !== "estimated"
  ? null
  : l.estimatedTotal ?? (l.quantity != null && l.unitPrice != null ? l.quantity * l.unitPrice : null)

type Target = { id: string; label: string; group: string }

/**
 * Poste de dépense. Création : assistant en 4 étapes (Quoi ? → Séquences → Combien ? → Achat) puis
 * récapitulatif. Modification : la même fenêtre, les 4 étapes en onglets libres.
 * Paiements à deux endroits seulement : le devis retenu, ou la ligne en achat direct.
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
  const creating = !existing

  const initial = useMemo(() => {
    if (existing) {
      const kids = model.children(existing.id)
      return {
        name: existing.label, poleId: existing.poleId, notes: existing.notes ?? "",
        multiple: kids.length > 0,
        main: fromItem(model, existing),
        subs: kids.map((k) => fromItem(model, k)),
      }
    }
    return {
      name: "", poleId: defaultPoleId ?? null, notes: "", multiple: false,
      main: emptyLine(defaultSequenceId ?? null), subs: [] as Line[],
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- brouillon figé à l'ouverture

  const [name, setName] = useState(initial.name)
  const [poleId, setPoleId] = useState<string | null>(initial.poleId)
  const [notes, setNotes] = useState(initial.notes)
  const [multiple, setMultiple] = useState(initial.multiple)
  const [main, setMain] = useState<Line>(initial.main)
  const [subs, setSubs] = useState<Line[]>(initial.subs)
  const [removed, setRemoved] = useState<string[]>([])
  const [newDevis, setNewDevis] = useState<NewDevis[]>([])
  const [step, setStep] = useState<Step>(1)
  const [openDevis, setOpenDevis] = useState<BudgetDevis | null>(null)

  const lines: Line[] = multiple ? subs : [main]
  const setLine = (key: string, patch: Partial<Line>) => {
    if (!multiple || key === main.key) setMain((m) => ({ ...m, ...patch }))
    else setSubs((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }

  const snapshot = JSON.stringify({ name, poleId, notes, multiple, main, subs, newDevis })
  const [initialSnapshot] = useState(snapshot)
  const dirty = snapshot !== initialSnapshot

  function requestClose() {
    if (dirty && !confirm("Fermer sans enregistrer ? Les modifications seront perdues.")) return
    onClose()
  }

  // ── Validation par étape ──
  function stepError(s: Step): string | null {
    if (s === 1 && !name.trim()) return "Donnez un nom au poste (ex. Fleurs)."
    if (s === 2 && multiple && subs.length === 0) return "Ajoutez au moins un élément, ou choisissez « Une seule séquence »."
    if (s === 2 && multiple && subs.some((x) => !x.label.trim())) return "Chaque élément doit avoir un nom."
    if (s === 3) {
      const orphan = lines.find((l) => l.amountStatus === "included" && !l.includedInId)
      if (orphan) return `« ${orphan.label || name} » : choisissez la ligne qui l'inclut.`
    }
    if (s === 4) {
      const orphan = lines.find((l) => l.purchase === "devis" && l.links.length === 0)
      if (orphan) return `« ${orphan.label || name} » : rattachez un devis, ou choisissez un autre mode d'achat.`
    }
    return null
  }

  function goNext() {
    const err = stepError(step)
    if (err) { toast.error(err); return }
    setStep((step + 1) as Step)
  }

  async function handleSave() {
    for (const s of [1, 2, 3, 4] as Step[]) {
      const err = stepError(s)
      if (err) { toast.error(err); if (!creating) setStep(s); return }
    }
    // Rattachements : nouveaux devis référencés seulement.
    const usedNew = new Set(lines.flatMap((l) => l.purchase === "devis" ? l.links.map((x) => x.devisRef) : []))
    const plan: DevisPlan = {
      newDevis: newDevis.filter((d) => usedNew.has(d.ref)).map((d) => ({
        ref: d.ref, vendor: d.vendor.trim() || null, title: d.title.trim() || null,
        totalAmount: parseAmount(d.totalAmount), status: d.status,
      })),
      links: lines.flatMap((l) => l.purchase === "devis" && l.amountStatus !== "included"
        ? l.links.map((x) => ({ lineKey: l.key, devisRef: x.devisRef, amount: parseAmount(x.amount) }))
        : []),
    }
    // Une ligne sous devis n'a pas de versements propres ; « pas encore décidé » n'en a pas non plus.
    const clean = (l: Line): LineDraft => {
      const direct = l.purchase === "direct" && l.amountStatus !== "included"
      return { ...l, payments: direct ? l.payments : [], actualTotal: direct ? l.actualTotal : null }
    }
    try {
      await save.mutateAsync({
        draft: {
          poste: multiple
            ? { ...clean(main), label: name.trim(), notes: notes || null, poleId, sequenceId: null,
                quantity: null, unitPrice: null, estimatedTotal: null, actualTotal: null, payments: [] }
            : { ...clean(main), label: name.trim(), notes: notes || null, poleId },
          subs: multiple ? subs.map(clean) : [],
          removedSubIds: multiple ? removed : [...removed, ...initial.subs.map((s) => s.id!).filter(Boolean)],
        },
        plan: multiple ? plan : { ...plan, links: plan.links.filter((l) => l.lineKey === main.key) },
      })
      toast.success(existing ? "Poste mis à jour." : "Poste créé.")
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'enregistrement : rien n'a été perdu de votre saisie, réessayez.")
    }
  }

  const figures = existing ? model.poste(existing) : null
  const targets: Target[] = useMemo(() => items
    .filter((i) => i.id !== existing?.id && i.amountStatus !== "included")
    .map((i) => {
      const top = i.parentId ? model.itemsById.get(i.parentId) : i
      return { id: i.id, label: model.fullLabel(i.id), group: poles.find((p) => p.id === top?.poleId)?.name ?? "Sans pôle" }
    })
    .sort((a, b) => a.group.localeCompare(b.group, "fr") || a.label.localeCompare(b.label, "fr")), [items, model, poles, existing])
  const devisOptions = [...model.devisById.values()].sort((a, b) => (a.vendor ?? "").localeCompare(b.vendor ?? "", "fr"))
  const devisLabel = (ref: string) => {
    const nd = newDevis.find((d) => d.ref === ref)
    if (nd) return `${nd.vendor || "Nouveau devis"}${nd.title ? ` · ${nd.title}` : ""} (à créer)`
    const d = model.devisById.get(ref)
    return d ? `${d.vendor ?? "Fournisseur ?"}${d.title ? ` · ${d.title}` : ""}` : "Devis inconnu"
  }

  const stepContent = (s: Step) => {
    switch (s) {
      case 1: return (
        <div className="space-y-4">
          <Field label="Nom du poste *">
            <Input autoFocus value={name} placeholder="Ex : Fleurs, Photographe, Traiteur…" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Pôle" hint="Le même que dans les missions. « Sans pôle » reste possible, mais rare.">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={poleId ?? NONE}
              onChange={(e) => setPoleId(e.target.value === NONE ? null : e.target.value)}>
              <option value={NONE}>— Sans pôle —</option>
              {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Priorité</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" aria-pressed={main.priority === p} onClick={() => setMain({ ...main, priority: p })}
                  className={cn("rounded-lg border p-2 text-left transition-colors", main.priority === p ? "ring-1" : "border-border hover:border-foreground/30")}
                  style={main.priority === p ? { borderColor: PRIORITY_COLORS[p], boxShadow: `0 0 0 1px ${PRIORITY_COLORS[p]}`, background: `color-mix(in srgb, ${PRIORITY_COLORS[p]} 8%, transparent)` } : undefined}>
                  <span className="block text-sm font-semibold" style={{ color: PRIORITY_COLORS[p] }}>{PRIORITY_LABELS[p]}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{PRIORITY_HINTS[p]}</span>
                </button>
              ))}
              <button type="button" aria-pressed={main.priority === null} onClick={() => setMain({ ...main, priority: null })}
                className={cn("rounded-lg border p-2 text-left text-sm transition-colors", main.priority === null ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30")}>
                <span className="block font-semibold">Pas encore priorisé</span>
              </button>
            </div>
            {multiple && <span className="block text-[11px] text-muted-foreground">Chaque élément hérite de cette priorité, sauf si vous lui en donnez une autre à l'étape 3.</span>}
          </div>
          <Field label="Notes (facultatif)">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Idées, contraintes, contacts…" />
          </Field>
        </div>
      )
      case 2: return (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice active={!multiple} onClick={() => {
              if (multiple && subs.some((x) => x.id) && !confirm("Revenir à une seule séquence supprimera les éléments déjà enregistrés. Continuer ?")) return
              if (multiple) { setRemoved([...removed, ...subs.filter((x) => x.id).map((x) => x.id!)]); setSubs([]) }
              setMultiple(false)
            }} title="Une seule séquence" text="Ex. « Photographe » uniquement pour la réception." />
            <Choice active={multiple} onClick={() => {
              if (!multiple && subs.length === 0) {
                // Premier élément : il reprend ce qui était saisi sur le poste.
                setSubs([{ ...main, key: newKey(), id: undefined, label: "", links: main.links, priority: null }])
              }
              setMultiple(true)
            }} title="Plusieurs éléments" text="Ex. « Fleurs » : bouquet de mariée (église), bouquets de table (réception)…" />
          </div>
          {!multiple ? (
            <Field label="Séquence">
              <SeqSelect value={main.sequenceId} sequences={sequences} onChange={(v) => setMain({ ...main, sequenceId: v })} />
            </Field>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Un élément = un sous-poste, sur une seule séquence, avec ses propres montants et sa propre priorité
                (ex. fleurs du jour 1 en Must have, fleurs du jour 2 en Could have).
              </p>
              {subs.map((x, i) => (
                <div key={x.key} className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  <Input className="min-w-0 flex-1" value={x.label} placeholder="Ex : Bouquet de mariée" autoFocus={!x.label && i === subs.length - 1}
                    onChange={(e) => setLine(x.key, { label: e.target.value })} />
                  <div className="w-44"><SeqSelect value={x.sequenceId} sequences={sequences} onChange={(v) => setLine(x.key, { sequenceId: v })} /></div>
                  <PrioritySelect value={x.priority} inherited={main.priority} onChange={(v) => setLine(x.key, { priority: v })} />
                  <button type="button" aria-label="Retirer l'élément" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => {
                    if (x.id) setRemoved([...removed, x.id])
                    setSubs(subs.filter((y) => y.key !== x.key))
                  }}><Trash2 className="size-4" /></button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setSubs([...subs, emptyLine(subs.at(-1)?.sequenceId ?? null)])}>
                <Plus className="size-3.5" /> Ajouter un élément
              </Button>
            </div>
          )}
        </div>
      )
      case 3: return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Quantité × prix unitaire calcule l'estimation ; vous pouvez aussi saisir directement un montant. Si vous ne pouvez pas encore
            l'estimer, choisissez « Pas encore estimable » ; s'il est compris dans une autre dépense (ex. sonorisation incluse dans le lieu),
            choisissez « Inclus dans… ».
          </p>
          {lines.map((l) => (
            <div key={l.key} className="space-y-1.5">
              <EstimateRow line={l} label={multiple ? l.label : name} sequences={sequences} targets={targets.filter((t) => t.id !== l.id)}
                onChange={(p) => setLine(l.key, p)} />
              {multiple && (
                <label className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
                  Priorité
                  <PrioritySelect value={l.priority} inherited={main.priority} onChange={(v) => setLine(l.key, { priority: v })} />
                </label>
              )}
            </div>
          ))}
          <p className="text-right text-sm tabular-nums">Total estimé <b>{fmt(lines.reduce((t, l) => t + (estimateOf(l) ?? 0), 0))}</b></p>
        </div>
      )
      case 4: return (
        <div className="space-y-3">
          {lines.map((l) => (
            l.amountStatus === "included" ? (
              <div key={l.key} className="rounded-xl border border-dashed border-border p-3 text-sm">
                <b>{multiple ? l.label : name}</b>
                <span className="text-muted-foreground"> · inclus dans {model.fullLabel(l.includedInId)} : rien à acheter ni à payer.</span>
              </div>
            ) : <PurchaseCard key={l.key} line={l} label={multiple ? l.label : name} sequences={sequences}
              devisOptions={devisOptions} newDevis={newDevis} devisLabel={devisLabel}
              onChange={(p) => setLine(l.key, p)}
              onCreateDevis={(d) => setNewDevis([...newDevis, d])}
              onOpenDevis={(id) => { const d = model.devisById.get(id); if (d) setOpenDevis(d) }} />
          ))}
          <p className="text-xs text-muted-foreground">
            Une facture commune à plusieurs éléments (un seul fournisseur) = un devis rattaché à chacun d'eux, avec la part de chacun.
            L'acompte et le solde d'un devis se saisissent dans le devis.
          </p>
        </div>
      )
      default: return <Recap name={name} pole={poles.find((p) => p.id === poleId)?.name ?? "Sans pôle"} lines={lines} multiple={multiple} sequences={sequences} devisLabel={devisLabel} postePriority={main.priority} />
    }
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) requestClose() }}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:w-[75vw] data-[side=right]:sm:max-w-none">
        <SheetHeader className="shrink-0 space-y-3 border-b px-6 pb-4 pt-6">
          <SheetTitle>{existing ? existing.label : "Nouveau poste de dépense"}</SheetTitle>
          {figures && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
              <span>Estimé <b className="text-foreground">{fmt(figures.estimated)}</b></span>
              <span>Réel <b className="text-foreground">{figures.real == null ? "—" : fmt(figures.real)}</b></span>
              <span>Payé <b className="text-foreground">{fmt(figures.paid)}</b></span>
              <span className="font-medium text-foreground">{PAYMENT_STATUS_LABELS[paymentStatus(figures)]}</span>
            </div>
          )}
          {/* Création : étapes numérotées ; modification : onglets libres. */}
          <nav className="flex flex-wrap gap-1.5" aria-label="Étapes">
            {[...STEPS, ...(creating ? [{ id: 5, title: "Récapitulatif", hint: "" }] : [])].map((s) => {
              const active = step === s.id
              const done = creating && s.id < step
              return (
                <button key={s.id} type="button" disabled={creating && s.id > step}
                  onClick={() => setStep(s.id as Step)}
                  className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/30")}>
                  <span className={cn("flex size-4 items-center justify-center rounded-full text-[10px]", active ? "bg-primary-foreground/20" : "bg-muted")}>
                    {done ? <Check className="size-3" /> : s.id}
                  </span>
                  {s.title}
                </button>
              )
            })}
          </nav>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {step <= 4 && <p className="text-sm text-muted-foreground">{STEPS[step - 1].hint}</p>}
          {stepContent(step)}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t px-6 py-3">
          {existing && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
              if (!confirm(`Supprimer « ${existing.label} » et ses éléments ? Ses rattachements aux devis seront retirés.`)) return
              await remove.mutateAsync(existing.id)
              toast.success("Poste supprimé.")
              onClose()
            }}>
              <Trash2 className="size-3.5" /> Supprimer
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={requestClose}>Annuler</Button>
            {creating && step > 1 && <Button variant="outline" onClick={() => setStep((step - 1) as Step)}>Précédent</Button>}
            {creating && step < 5
              ? <Button onClick={goNext}>Suivant</Button>
              : <Button onClick={() => void handleSave()} disabled={save.isPending}>{existing ? "Enregistrer" : "Créer le poste"}</Button>}
          </div>
        </div>

        {openDevis && (
          <DevisSheet devis={openDevis} model={model} items={items} poles={poles} onClose={() => setOpenDevis(null)} />
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Éléments ────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  )
}

function Choice({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("rounded-xl border p-3 text-left transition-colors", active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-foreground/30")}>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-xs text-muted-foreground">{text}</span>
    </button>
  )
}

/** Priorité d'un élément : la sienne, ou « comme le poste ». */
function PrioritySelect({ value, inherited, onChange }: { value: Priority | null; inherited: Priority | null; onChange: (v: Priority | null) => void }) {
  return (
    <select className="h-9 w-36 rounded-md border border-input bg-background px-1.5 text-xs" value={value ?? ""}
      aria-label="Priorité de l'élément" title="Priorité de l'élément"
      style={value ? { color: PRIORITY_COLORS[value], fontWeight: 600 } : undefined}
      onChange={(e) => onChange((e.target.value || null) as Priority | null)}>
      <option value="">Comme le poste{inherited ? ` (${PRIORITY_LABELS[inherited]})` : ""}</option>
      {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
    </select>
  )
}

function SeqSelect({ value, sequences, onChange }: { value: string | null; sequences: Seq[]; onChange: (v: string | null) => void }) {
  return (
    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={value ?? NONE}
      onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}>
      <option value={NONE}>— Sans séquence —</option>
      {sequences.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  )
}

const STATUS_OPTIONS: { value: AmountStatus; label: string }[] = [
  { value: "estimated", label: "Estimé" },
  { value: "to_estimate", label: "Pas encore estimable" },
  { value: "included", label: "Inclus dans…" },
]

function EstimateRow({ line, label, sequences, targets, onChange }: {
  line: Line
  label: string
  sequences: Seq[]
  targets: Target[]
  onChange: (p: Partial<Line>) => void
}) {
  const [qty, setQty] = useState(amountInput(line.quantity))
  const [pu, setPu] = useState(amountInput(line.unitPrice))
  const [estim, setEstim] = useState(amountInput(line.estimatedTotal))
  const seq = sequences.find((s) => s.id === line.sequenceId)
  const estimated = line.amountStatus === "estimated"

  function update(nextQty: string, nextPu: string) {
    setQty(nextQty)
    setPu(nextPu)
    const q = parseAmount(nextQty)
    const p = parseAmount(nextPu)
    const patch: Partial<Line> = { quantity: q, unitPrice: p }
    if (q != null && p != null) { setEstim(amountInput(q * p)); patch.estimatedTotal = q * p }
    onChange(patch)
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-2">
      <div className="grid grid-cols-3 items-center gap-2 sm:grid-cols-[1fr_6rem_7rem_8rem]">
        <div className="col-span-3 min-w-0 sm:col-span-1">
          <p className="truncate text-sm font-medium">{label || "Sans nom"}</p>
          <p className="text-[11px] text-muted-foreground">{seq?.name ?? "Sans séquence"}</p>
        </div>
        <Input className="font-mono" inputMode="decimal" placeholder="Qté" value={qty} disabled={!estimated} onChange={(e) => update(e.target.value, pu)} aria-label="Quantité" />
        <Input className="font-mono" inputMode="decimal" placeholder="P.U." value={pu} disabled={!estimated} onChange={(e) => update(qty, e.target.value)} aria-label="Prix unitaire" />
        <Input className="font-mono" inputMode="decimal" aria-label="Estimé"
          placeholder={line.amountStatus === "to_estimate" ? "à estimer" : line.amountStatus === "included" ? "0 € (inclus)" : "Montant"}
          value={estimated ? estim : ""} disabled={!estimated}
          onChange={(e) => { setEstim(e.target.value); onChange({ estimatedTotal: parseAmount(e.target.value) }) }} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-border text-xs" role="radiogroup" aria-label="État du montant">
          {STATUS_OPTIONS.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={line.amountStatus === o.value}
              onClick={() => onChange({ amountStatus: o.value, ...(o.value !== "included" ? { includedInId: null } : {}) })}
              className={cn("px-2 py-1", line.amountStatus === o.value ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>
              {o.label}
            </button>
          ))}
        </div>
        {line.amountStatus === "included" && (
          <select className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-1.5 text-xs" value={line.includedInId ?? ""}
            onChange={(e) => onChange({ includedInId: e.target.value || null })} aria-label="Ligne qui l'inclut">
            <option value="">Choisir la ligne qui l'inclut (ex. Domaine Ostara)…</option>
            {[...new Set(targets.map((t) => t.group))].map((g) => (
              <optgroup key={g} label={g}>
                {targets.filter((t) => t.group === g).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
            ))}
          </select>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground" title="Le montant changera si le nombre d'invités change (traiteur, boissons…)">
          <input type="checkbox" checked={line.guestDependent} onChange={(e) => onChange({ guestDependent: e.target.checked })} />
          Dépend du nombre d'invités <span className="shrink-0 rounded bg-sky-500/10 px-1 text-[10px] font-semibold text-sky-700 dark:text-sky-400">% invités</span>
        </label>
      </div>
      {line.amountStatus === "to_estimate" && (
        <p className="text-[11px] text-muted-foreground">Compte pour 0 € dans les totaux, et apparaît dans les lignes « à estimer » des statistiques.</p>
      )}
    </div>
  )
}

function PurchaseCard({ line, label, sequences, devisOptions, newDevis, devisLabel, onChange, onCreateDevis, onOpenDevis }: {
  line: Line
  label: string
  sequences: Seq[]
  devisOptions: BudgetDevis[]
  newDevis: NewDevis[]
  devisLabel: (ref: string) => string
  onChange: (p: Partial<Line>) => void
  onCreateDevis: (d: NewDevis) => void
  onOpenDevis: (id: string) => void
}) {
  const [picker, setPicker] = useState("")
  const [creating, setCreating] = useState<NewDevis | null>(null)
  const seq = sequences.find((s) => s.id === line.sequenceId)
  const estimate = estimateOf(line)

  function setPurchase(p: Purchase) {
    if (p === line.purchase) return
    const hasDirectData = line.payments.length > 0 || line.actualTotal != null
    if (line.purchase === "direct" && hasDirectData && !confirm("Les versements et le montant réel saisis pour cet achat direct seront retirés. Continuer ?")) return
    onChange({ purchase: p })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">{label || "Sans nom"} <span className="font-normal text-muted-foreground">· {seq?.name ?? "Sans séquence"}</span></p>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">estimé {fmt(estimate)}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {([["undecided", "Pas encore décidé"], ["direct", "Achat direct"], ["devis", "Via un devis"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setPurchase(v)} aria-pressed={line.purchase === v}
            className={cn("rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              line.purchase === v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/30")}>
            {t}
          </button>
        ))}
      </div>

      {line.purchase === "direct" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Enseigne"><Input value={line.vendor ?? ""} onChange={(e) => onChange({ vendor: e.target.value || null })} /></Field>
            <Field label="Montant réel €"><Input className="font-mono" inputMode="decimal" defaultValue={amountInput(line.actualTotal)} onChange={(e) => onChange({ actualTotal: parseAmount(e.target.value) })} /></Field>
            <Field label="Compte"><Input list="budget-accounts-p" value={line.account ?? ""} onChange={(e) => onChange({ account: e.target.value || null })} /></Field>
            <Field label="Origine (qui paie)"><Input list="budget-origins-p" value={line.origin ?? ""} onChange={(e) => onChange({ origin: e.target.value || null })} /></Field>
          </div>
          <datalist id="budget-accounts-p">{ACCOUNT_SUGGESTIONS.map((a) => <option key={a} value={a} />)}</datalist>
          <datalist id="budget-origins-p">{ORIGIN_SUGGESTIONS.map((a) => <option key={a} value={a} />)}</datalist>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={line.depositRequired} onChange={(e) => onChange({ depositRequired: e.target.checked })} /> Acompte requis
          </label>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Versements</p>
            <PaymentsEditor value={line.payments} onChange={(payments) => onChange({ payments })} due={line.actualTotal ?? estimate} idPrefix={`p-${line.key}`} />
          </div>
        </div>
      )}

      {line.purchase === "devis" && (
        <div className="space-y-2">
          {line.links.length === 0 && <p className="text-xs text-muted-foreground">Rattachez un devis existant ou créez-en un.</p>}
          {line.links.map((l, i) => {
            const existing = devisOptions.find((d) => d.id === l.devisRef)
            return (
              <div key={l.devisRef} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{devisLabel(l.devisRef)}</span>
                {existing && (
                  <span className={cn("rounded-full px-1.5 text-[10px] font-medium",
                    existing.status === "retenu" ? "bg-emerald-500/15 text-emerald-700" : existing.status === "refuse" ? "bg-muted text-muted-foreground" : "bg-amber-400/15 text-amber-700")}>
                    {existing.status === "retenu" ? "Retenu" : existing.status === "refuse" ? "Refusé" : "En cours"}
                  </span>
                )}
                <Input className="h-7 w-24 font-mono" inputMode="decimal" placeholder="Part €" value={l.amount} aria-label="Part de ce devis"
                  onChange={(e) => onChange({ links: line.links.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)) })} />
                {existing && (
                  <button type="button" title="Ouvrir le devis (échéancier, acompte…)" onClick={() => onOpenDevis(existing.id)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="size-3.5" />
                  </button>
                )}
                <button type="button" aria-label="Détacher le devis" onClick={() => onChange({ links: line.links.filter((_, j) => j !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive">
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" value={picker} onChange={(e) => setPicker(e.target.value)}>
              <option value="">Rattacher un devis…</option>
              {newDevis.length > 0 && (
                <optgroup label="Créés dans ce poste">
                  {newDevis.filter((d) => !line.links.some((l) => l.devisRef === d.ref)).map((d) => <option key={d.ref} value={d.ref}>{devisLabel(d.ref)}</option>)}
                </optgroup>
              )}
              <optgroup label="Devis existants">
                {devisOptions.filter((d) => !line.links.some((l) => l.devisRef === d.id)).map((d) => <option key={d.id} value={d.id}>{devisLabel(d.id)}</option>)}
              </optgroup>
            </select>
            <Button size="sm" variant="outline" disabled={!picker} onClick={() => {
              onChange({ links: [...line.links, { devisRef: picker, amount: amountInput(estimate) }] })
              setPicker("")
            }}>Rattacher</Button>
            <Button size="sm" variant="outline" onClick={() => setCreating({ ref: newKey("devis"), vendor: "", title: "", totalAmount: amountInput(estimate), status: "en_cours" })}>
              <Plus className="size-3.5" /> Nouveau devis
            </Button>
          </div>
          {creating && (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fournisseur"><Input autoFocus value={creating.vendor} onChange={(e) => setCreating({ ...creating, vendor: e.target.value })} /></Field>
                <Field label="Intitulé"><Input value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value })} /></Field>
                <Field label="Montant total du devis €"><Input className="font-mono" inputMode="decimal" value={creating.totalAmount} onChange={(e) => setCreating({ ...creating, totalAmount: e.target.value })} /></Field>
                <Field label="Statut">
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={creating.status} onChange={(e) => setCreating({ ...creating, status: e.target.value as DevisStatus })}>
                    <option value="en_cours">En cours</option><option value="retenu">Retenu</option><option value="refuse">Refusé</option>
                  </select>
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setCreating(null)}>Annuler</Button>
                <Button size="sm" disabled={!creating.vendor.trim() && !creating.title.trim()} onClick={() => {
                  onCreateDevis(creating)
                  onChange({ links: [...line.links, { devisRef: creating.ref, amount: amountInput(estimate) }] })
                  setCreating(null)
                }}>Créer et rattacher</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Le devis est créé à l'enregistrement du poste ; son acompte et son échéancier se saisissent ensuite dans le devis (onglet Devis).</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Recap({ name, pole, lines, multiple, sequences, devisLabel, postePriority }: {
  postePriority: Priority | null
  name: string
  pole: string
  lines: Line[]
  multiple: boolean
  sequences: Seq[]
  devisLabel: (ref: string) => string
}) {
  const total = lines.reduce((t, l) => t + (estimateOf(l) ?? 0), 0)
  const mode = (l: Line) => l.amountStatus === "included" ? "Inclus dans une autre ligne"
    : l.purchase === "direct" ? `Achat direct${l.vendor ? ` · ${l.vendor}` : ""}`
    : l.purchase === "devis" ? `Devis : ${l.links.map((x) => devisLabel(x.devisRef)).join(", ")}` : "Achat pas encore décidé"
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/40 p-3">
        <p className="text-base font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{pole} · estimé {fmt(total)} · {postePriority ? PRIORITY_LABELS[postePriority] : "non priorisé"}</p>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {lines.map((l) => (
          <li key={l.key} className="space-y-0.5 px-3 py-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{multiple ? l.label : name}</span>
              <span className="tabular-nums">
                {l.amountStatus === "to_estimate" ? "à estimer" : l.amountStatus === "included" ? "inclus" : fmt(estimateOf(l))}
                {l.guestDependent && <span className="ml-1 rounded bg-sky-500/10 px-1 text-[10px] font-semibold text-sky-700 dark:text-sky-400">% invités</span>}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {sequences.find((s) => s.id === l.sequenceId)?.name ?? "Sans séquence"} · {mode(l)}
              {multiple && l.priority && ` · ${PRIORITY_LABELS[l.priority]}`}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Tout reste modifiable ensuite en cliquant sur le poste.</p>
    </div>
  )
}
