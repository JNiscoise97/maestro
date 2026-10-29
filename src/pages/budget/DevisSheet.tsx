import { useMemo, useState } from "react"
import { CircleAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useDeleteDevis, useSaveDevis } from "@/hooks/queries/use-budget"
import { amountInput, budgetItemComparator, fmt, parseAmount, type BudgetModel } from "@/lib/budget-calc"
import type { BudgetDevis, BudgetItem, DevisStatus, PaymentDraft } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { PaymentsEditor } from "./PaymentsEditor"

const STATUS_LABELS: Record<DevisStatus, string> = { en_cours: "En cours", retenu: "Retenu", refuse: "Refusé" }

/**
 * Devis fournisseur : en-tête, lignes couvertes (postes ou sous-postes, dans n'importe quel pôle)
 * avec la part de chacune, statut et — une fois retenu — échéancier (acomptes, solde).
 */
export function DevisSheet({ devis, presetItemIds = [], model, items, poles, onClose }: {
  /** Devis existant, ou null pour en créer un. */
  devis: BudgetDevis | null
  /** Lignes pré-cochées à la création (depuis la fenêtre d'un poste). */
  presetItemIds?: string[]
  model: BudgetModel
  items: BudgetItem[]
  poles: Pole[]
  onClose: () => void
}) {
  const save = useSaveDevis()
  const remove = useDeleteDevis()
  const [head, setHead] = useState(() => ({
    vendor: devis?.vendor ?? "", title: devis?.title ?? "", quoteDate: devis?.quoteDate ?? "",
    validUntil: devis?.validUntil ?? "", url: devis?.url ?? "", notes: devis?.notes ?? "",
    totalAmount: amountInput(devis?.totalAmount), status: devis?.status ?? ("en_cours" as DevisStatus),
  }))
  const [lines, setLines] = useState<{ itemId: string; amount: string }[]>(() =>
    devis
      ? (model.linesByDevis.get(devis.id) ?? []).map((l) => ({ itemId: l.itemId, amount: amountInput(l.amount) }))
      : presetItemIds.map((id) => ({ itemId: id, amount: "" })))
  const [payments, setPayments] = useState<PaymentDraft[]>(() =>
    devis ? (model.paymentsByDevis.get(devis.id) ?? []).map(({ kind, label, amount, dueDate, paid, paidDate, account }) =>
      ({ kind, label, amount, dueDate, paid, paidDate, account })) : [])

  // Lignes pouvant être couvertes : postes sans sous-poste et sous-postes (jamais un poste à sous-postes).
  const pickable = useMemo(() => {
    const poleName = (id: string | null) => poles.find((p) => p.id === id)?.name ?? "Sans pôle"
    return items
      .filter((i) => i.parentId ? true : model.children(i.id).length === 0)
      .sort(budgetItemComparator(model, poles))
      .map((i) => {
        const parent = i.parentId ? model.itemsById.get(i.parentId) : undefined
        const top = parent ?? i
        return { id: i.id, group: poleName(top.poleId), label: parent ? `${parent.label} › ${i.label}` : i.label }
      })
  }, [items, model, poles])
  const labelOf = (id: string) => pickable.find((p) => p.id === id)
  const chosen = new Set(lines.map((l) => l.itemId))

  const total = parseAmount(head.totalAmount)
  const linesSum = lines.reduce((t, l) => t + (parseAmount(l.amount) ?? 0), 0)
  const gap = total != null && lines.length > 0 ? total - linesSum : 0

  // Une ligne ne peut avoir qu'un devis retenu.
  const conflicts = head.status === "retenu"
    ? lines.filter((l) => { const r = model.retained.get(l.itemId); return r && r.devis.id !== devis?.id })
    : []

  async function handleSave() {
    if (!head.vendor.trim() && !head.title.trim()) { toast.error("Indiquez au moins le fournisseur ou l'intitulé."); return }
    if (conflicts.length) { toast.error("Certaines lignes ont déjà un devis retenu."); return }
    try {
      await save.mutateAsync({
        id: devis?.id,
        vendor: head.vendor.trim() || null, title: head.title.trim() || null,
        quoteDate: head.quoteDate || null, validUntil: head.validUntil || null,
        url: head.url.trim() || null, notes: head.notes.trim() || null,
        totalAmount: total, status: head.status,
        lines: lines.map((l) => ({ itemId: l.itemId, amount: parseAmount(l.amount) })),
        payments,
      })
      toast.success(devis ? "Devis mis à jour." : "Devis créé.")
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'enregistrement du devis.")
    }
  }

  const field = (label: string, node: React.ReactNode) => (
    <label className="space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {node}
    </label>
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-6">
          <SheetTitle>{devis ? "Devis" : "Nouveau devis"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <section className="grid grid-cols-2 gap-3">
            {field("Fournisseur", <Input value={head.vendor} onChange={(e) => setHead({ ...head, vendor: e.target.value })} placeholder="Ex : Atelier Déco Prestige" />)}
            {field("Intitulé", <Input value={head.title} onChange={(e) => setHead({ ...head, title: e.target.value })} placeholder="Ex : Décoration réception" />)}
            {field("Montant total €", <Input className="font-mono" inputMode="decimal" value={head.totalAmount} onChange={(e) => setHead({ ...head, totalAmount: e.target.value })} />)}
            {field("Statut",
              <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={head.status}
                onChange={(e) => setHead({ ...head, status: e.target.value as DevisStatus })}>
                {(Object.keys(STATUS_LABELS) as DevisStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>)}
            {field("Date du devis", <Input type="date" value={head.quoteDate} onChange={(e) => setHead({ ...head, quoteDate: e.target.value })} />)}
            {field("Valable jusqu'au", <Input type="date" value={head.validUntil} onChange={(e) => setHead({ ...head, validUntil: e.target.value })} />)}
            <div className="col-span-2">{field("Lien", <Input value={head.url} onChange={(e) => setHead({ ...head, url: e.target.value })} placeholder="https://…" />)}</div>
            <div className="col-span-2">{field("Notes", <Textarea rows={2} value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} />)}</div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lignes couvertes</p>
            {lines.length === 0 && <p className="text-xs text-muted-foreground">Aucune ligne : ajoutez les postes ou sous-postes concernés.</p>}
            {lines.map((l, i) => {
              const info = labelOf(l.itemId)
              const conflict = conflicts.some((c) => c.itemId === l.itemId)
              return (
                <div key={l.itemId} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{info?.label ?? "Ligne supprimée"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {info?.group}
                      {conflict && <span className="ml-1 text-destructive">· déjà retenue dans « {model.retained.get(l.itemId)?.devis.vendor ?? model.retained.get(l.itemId)?.devis.title} »</span>}
                    </p>
                  </div>
                  <Input className="h-8 w-28 font-mono" placeholder="Part €" inputMode="decimal" value={l.amount}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                  <button type="button" aria-label="Retirer la ligne" onClick={() => setLines(lines.filter((_, j) => j !== i))}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )
            })}
            {/* Choisir une ligne l'ajoute directement. */}
            <SearchableSelect value={null} clearable={false} className="h-9 text-sm" ariaLabel="Ajouter une ligne couverte"
              placeholder="+ Ajouter une ligne couverte (poste ou sous-poste)…" searchPlaceholder="Rechercher un poste, un sous-poste, un pôle…"
              empty="Aucune ligne ne correspond."
              options={pickable.filter((p) => !chosen.has(p.id)).map((p) => ({ value: p.id, label: p.label, group: p.group }))}
              onChange={(id) => { if (id) setLines([...lines, { itemId: id, amount: "" }]) }} />
            {lines.length > 0 && (
              <p className={`flex items-center gap-1 text-xs tabular-nums ${Math.abs(gap) > 0.005 ? "text-amber-600" : "text-muted-foreground"}`}>
                {Math.abs(gap) > 0.005 && <CircleAlert className="size-3.5" />}
                Somme des lignes {fmt(linesSum)}{total != null && ` · total du devis ${fmt(total)}`}
                {Math.abs(gap) > 0.005 && ` · écart ${fmt(gap)}`}
              </p>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Échéancier</p>
            {head.status !== "retenu" && (
              <p className="text-xs text-muted-foreground">Les versements comptent dans le budget une fois le devis « Retenu ».</p>
            )}
            <PaymentsEditor value={payments} onChange={setPayments} due={total ?? linesSum} idPrefix={`devis-${devis?.id ?? "new"}`} />
          </section>
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t px-6 py-3">
          {devis && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
              if (!confirm("Supprimer ce devis et son échéancier ?")) return
              await remove.mutateAsync(devis.id)
              toast.success("Devis supprimé.")
              onClose()
            }}>
              <Trash2 className="size-3.5" /> Supprimer
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => void handleSave()} disabled={save.isPending}>{devis ? "Enregistrer" : "Créer le devis"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
