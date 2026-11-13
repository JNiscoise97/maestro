import { useMemo, useState } from "react"
import { Check, CircleAlert, Gift as GiftIcon, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SearchableSelect, type SearchableOption } from "@/components/shared/SearchableSelect"
import { useDeleteAnticipatedGift, useSaveAnticipatedGift } from "@/hooks/queries/use-budget"
import { useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import { useGifts } from "@/hooks/queries/use-gifts"
import { amountInput, budgetItemComparator, fmt, parseAmount, sequenceLabel, type BudgetModel } from "@/lib/budget-calc"
import type { Gift } from "@/services/gifts.service"
import type { BudgetItem } from "@/services/supabase/budget"
import type { Guest, Pole } from "@/types/domain"
import { cn } from "@/lib/utils"
import { giftDonors, parseTarget, targetKey, targetLabel } from "@/lib/budget-gifts"

type Seq = { id: string; name: string }

/**
 * Onglet « Cadeaux anticipés » : argent offert par des proches pour financer des dépenses précises.
 * Chaque cadeau est aussi un cadeau de la page Cadeaux (suivi des remerciements). Il compte dans
 * « Offert » une fois reçu ; il est affecté à des lignes, des postes entiers ou des devis.
 */
export function GiftsTab({ gifts, model, items, poles, sequences }: {
  gifts: Gift[]
  model: BudgetModel
  items: BudgetItem[]
  poles: Pole[]
  sequences: Seq[]
}) {
  const { data: guests = [] } = useGuests()
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const [editing, setEditing] = useState<Gift | "new" | null>(null)

  // Cadeaux anticipés, et tout cadeau de la page Cadeaux qu'on aurait affecté au budget.
  const allocatedIds = new Set(model.allocations.map((a) => a.giftId))
  const list = gifts.filter((g) => g.anticipated || allocatedIds.has(g.id))
    .sort((a, b) => (b.receivedOn ?? b.createdAt).localeCompare(a.receivedOn ?? a.createdAt))
  const allocatedOf = (g: Gift) => model.allocations.filter((a) => a.giftId === g.id).reduce((t, a) => t + a.amount, 0)

  const received = list.filter((g) => !g.promised)
  const promised = list.filter((g) => g.promised)
  const receivedTotal = received.reduce((t, g) => t + (g.amount ?? 0), 0)
  const promisedTotal = promised.reduce((t, g) => t + (g.amount ?? 0), 0)
  const allocatedReceived = received.reduce((t, g) => t + allocatedOf(g), 0)

  const metric = (label: string, value: string, sub: string, tone?: string) => (
    <div className="space-y-1 rounded-lg border border-border p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums", tone)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          L'argent offert par vos proches pour financer des dépenses précises. Il réduit le <b className="text-foreground">reste à votre charge</b> une
          fois reçu, sans changer l'état des paiements : une ligne offerte reste « à payer » tant que le fournisseur n'est pas payé.
          Chaque cadeau apparaît aussi dans la page Cadeaux pour les remerciements.
        </p>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="mr-1.5 size-4" /> Nouveau cadeau anticipé</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metric("Reçus", fmt(receivedTotal), `${received.length} cadeau${received.length > 1 ? "x" : ""}`)}
        {metric("Affectés au budget", fmt(allocatedReceived), "comptent dans « Offert »")}
        {metric("Non affectés", fmt(Math.max(0, receivedTotal - allocatedReceived)), "reçus mais pas encore répartis",
          receivedTotal - allocatedReceived > 0.005 ? "text-amber-600" : undefined)}
        {metric("Promis", fmt(promisedTotal), `${promised.length} pas encore versé${promised.length > 1 ? "s" : ""} · ne comptent pas encore`)}
      </div>

      {list.length === 0 ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border py-14 text-center">
          <GiftIcon className="mx-auto size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun cadeau anticipé pour l'instant.</p>
          <p className="text-xs text-muted-foreground">Ex. : les parents qui financent le traiteur, un virement pour la robe.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((g) => {
            const allocs = model.allocations.filter((a) => a.giftId === g.id)
            const allocated = allocatedOf(g)
            const left = (g.amount ?? 0) - allocated
            return (
              <li key={g.id}>
                <button type="button" onClick={() => setEditing(g)}
                  className="group w-full space-y-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{giftDonors(g, guestsById)}</span>
                    <span className="text-sm text-muted-foreground">{g.description}</span>
                    {g.promised
                      ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">Promis</span>
                      : <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          Reçu{g.receivedOn && ` le ${new Date(g.receivedOn).toLocaleDateString("fr-FR")}`}{g.account && ` · ${g.account}`}
                        </span>}
                    {g.thankyouSent && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Remercié</span>}
                    <span className="ml-auto text-lg font-bold tabular-nums">{fmt(g.amount)}</span>
                    <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  {allocs.length > 0 ? (
                    <ul className="space-y-0.5 text-sm">
                      {allocs.map((a) => (
                        <li key={a.id} className="flex gap-2">
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">→ {targetLabel(model, a)}</span>
                          <span className="tabular-nums">{fmt(a.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-muted-foreground">Pas encore affecté au budget.</p>}
                  {Math.abs(left) > 0.005 && allocs.length > 0 && (
                    <p className={cn("flex items-center gap-1 text-xs", left < 0 ? "text-destructive" : "text-amber-600")}>
                      <CircleAlert className="size-3.5" />
                      {left > 0 ? `${fmt(left)} non affectés` : `Affectations supérieures au cadeau de ${fmt(-left)}`}
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <GiftSheet key={editing === "new" ? "new" : editing.id} gift={editing === "new" ? null : editing}
          model={model} items={items} poles={poles} sequences={sequences} guests={guests} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

type AllocRow = { key: string; target: string; amount: string }

function GiftSheet({ gift, model, items, poles, sequences, guests, onClose }: {
  gift: Gift | null
  model: BudgetModel
  items: BudgetItem[]
  poles: Pole[]
  sequences: Seq[]
  guests: Guest[]
  onClose: () => void
}) {
  const save = useSaveAnticipatedGift()
  const remove = useDeleteAnticipatedGift()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState(() => ({
    guestIds: gift?.guestIds ?? [],
    externalGiverName: gift?.externalGiverName ?? "",
    description: gift?.description ?? "Cadeau anticipé",
    amount: amountInput(gift?.amount),
    giftType: gift?.giftType ?? "virement",
    promised: gift?.promised ?? false,
    receivedOn: gift?.receivedOn ?? (gift ? "" : today),
    account: gift?.account ?? "",
    notes: gift?.notes ?? "",
    thankyouSent: gift?.thankyouSent ?? false,
  }))
  const [rows, setRows] = useState<AllocRow[]>(() =>
    (gift ? model.allocations.filter((a) => a.giftId === gift.id) : [])
      .map((a) => ({ key: a.id, target: targetKey(a), amount: amountInput(a.amount) })))
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  // Budget sans ce cadeau : ce qu'il reste à couvrir sur chaque cible.
  const others = useMemo(() => model.withoutGift(gift?.id ?? null), [model, gift])

  // Cibles : postes (entiers s'ils ont des sous-postes), sous-postes, et devis.
  const options = useMemo<SearchableOption[]>(() => {
    const poleName = (id: string | null) => poles.find((p) => p.id === id)?.name ?? "Sans pôle"
    const lines = [...items].sort(budgetItemComparator(model, poles)).map((i) => {
      const parent = i.parentId ? model.itemsById.get(i.parentId) : undefined
      const hasKids = model.children(i.id).length > 0
      return {
        value: `i:${i.id}`,
        label: parent ? `${parent.label} › ${i.label}` : hasKids ? `${i.label} (tout le poste)` : i.label,
        group: poleName((parent ?? i).poleId),
        hint: hasKids ? `${model.children(i.id).length} sous-postes` : sequenceLabel(model, i, sequences),
      }
    })
    const devis = [...model.devisById.values()].map((d) => ({
      value: `d:${d.id}`,
      label: `${d.vendor ?? d.title ?? "Devis"}${d.status === "retenu" ? " (retenu)" : d.status === "refuse" ? " (refusé)" : ""}`,
      group: "Devis",
      hint: (model.linesByDevis.get(d.id) ?? []).map((l) => model.fullLabel(l.itemId)).join(", ") || undefined,
    }))
    return [...devis, ...lines]
  }, [items, model, poles, sequences])

  const amount = parseAmount(form.amount)
  const allocated = rows.reduce((t, r) => t + (parseAmount(r.amount) ?? 0), 0)
  const left = (amount ?? 0) - allocated
  const accounts = [...new Set([...model.paymentsByItem.values(), ...model.paymentsByDevis.values()].flat().map((p) => p.account).filter(Boolean))] as string[]

  function cover(i: number) {
    const r = rows[i]
    if (!r.target) return
    const need = others.remainingFor(parseTarget(r.target))
    // Sans dépasser ce qu'il reste du cadeau une fois les autres affectations comptées.
    const otherRows = rows.reduce((t, x, j) => (j === i ? t : t + (parseAmount(x.amount) ?? 0)), 0)
    const cap = amount != null ? Math.max(0, amount - otherRows) : need
    const value = Math.round(Math.min(need, cap) * 100) / 100
    setRows(rows.map((x, j) => (j === i ? { ...x, amount: amountInput(value) } : x)))
    if (need > cap + 0.005) toast.info(`Il reste ${fmt(need)} à couvrir : le cadeau n'en couvre que ${fmt(value)}.`)
  }

  async function handleSave() {
    if (!form.guestIds.length && !form.externalGiverName.trim()) { toast.error("Choisissez au moins un donateur."); return }
    if (amount == null || amount <= 0) { toast.error("Indiquez le montant du cadeau."); return }
    const allocations = rows
      .map((r) => ({ ...parseTarget(r.target), amount: parseAmount(r.amount) ?? 0 }))
      .filter((a) => (a.itemId || a.devisId) && a.amount > 0)
    if (rows.some((r) => !r.target || !(parseAmount(r.amount) ?? 0))) { toast.error("Chaque affectation a besoin d'une cible et d'un montant."); return }
    try {
      await save.mutateAsync({
        id: gift?.id ?? null,
        gift: {
          guestIds: form.guestIds,
          externalGiverName: form.guestIds.length ? null : form.externalGiverName.trim() || null,
          description: form.description.trim() || "Cadeau anticipé",
          amount,
          giftType: form.giftType || null,
          anticipated: true,
          promised: form.promised,
          receivedOn: form.promised ? null : form.receivedOn || null,
          account: form.account.trim() || null,
          notes: form.notes.trim() || null,
          thankyouSent: form.thankyouSent,
        },
        allocations,
      })
      toast.success(gift ? "Cadeau mis à jour." : "Cadeau anticipé ajouté (visible aussi dans Cadeaux).")
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'enregistrement du cadeau.")
    }
  }

  const field = (label: string, node: React.ReactNode, className?: string) => (
    <label className={cn("space-y-1", className)}>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {node}
    </label>
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-6">
          <SheetTitle>{gift ? "Cadeau anticipé" : "Nouveau cadeau anticipé"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Offert par</p>
            <GuestMultiPicker guests={guests} value={form.guestIds} onChange={(ids) => set("guestIds", ids)} />
            {form.guestIds.length === 0 && (
              <Input value={form.externalGiverName} onChange={(e) => set("externalGiverName", e.target.value)}
                placeholder="Ou un donateur hors liste des invités" />
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            {field("Montant €", <Input className="font-mono" inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} />)}
            {field("Forme",
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.giftType}
                onChange={(e) => set("giftType", e.target.value)}>
                <option value="virement">Virement</option>
                <option value="enveloppe">Enveloppe</option>
                <option value="don_prestation">Don sur prestation</option>
                <option value="autre">Autre</option>
              </select>)}
            {field("Description", <Input value={form.description} onChange={(e) => set("description", e.target.value)} />, "col-span-2")}
            <div className="col-span-2 flex gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="État du cadeau">
              {([[false, "Reçu"], [true, "Promis, pas encore versé"]] as const).map(([v, label]) => (
                <button key={label} type="button" role="radio" aria-checked={form.promised === v} onClick={() => set("promised", v)}
                  className={cn("flex-1 rounded-md py-1.5 text-xs transition-colors",
                    form.promised === v ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>
            {form.promised ? (
              <p className="col-span-2 text-xs text-muted-foreground">Un cadeau promis ne compte dans « Offert » qu'une fois marqué reçu.</p>
            ) : (
              <>
                {field("Reçu le", <Input type="date" value={form.receivedOn} onChange={(e) => set("receivedOn", e.target.value)} />)}
                {field("Sur le compte",
                  <>
                    <Input list="gift-accounts" value={form.account} onChange={(e) => set("account", e.target.value)} placeholder="Ex : Commun" />
                    <datalist id="gift-accounts">{accounts.map((a) => <option key={a} value={a} />)}</datalist>
                  </>)}
              </>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ce que finance ce cadeau</p>
            <p className="text-xs text-muted-foreground">
              Une ligne, un poste entier (réparti sur ses sous-postes) ou un devis (réparti sur ses lignes).
              « Couvrir » met ce qu'il reste à votre charge sur la cible.
            </p>
            {rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <SearchableSelect value={r.target || null} clearable={false} className="h-9 min-w-0 flex-1 text-sm" ariaLabel="Cible de l'affectation"
                  placeholder="Choisir une ligne, un poste ou un devis…" searchPlaceholder="Rechercher un poste, un sous-poste, un devis…"
                  options={options} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, target: v ?? "" } : x)))} />
                <Input className="h-9 w-28 font-mono" placeholder="Montant €" inputMode="decimal" value={r.amount}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                <Button type="button" variant="outline" size="sm" disabled={!r.target} onClick={() => cover(i)}
                  title="Mettre ce qu'il reste à votre charge sur cette cible">Couvrir</Button>
                <button type="button" aria-label="Retirer l'affectation" onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows([...rows, { key: crypto.randomUUID(), target: "", amount: "" }])}>
              <Plus className="size-3.5" /> Ajouter une affectation
            </Button>
            {amount != null && (
              <p className={cn("flex items-center gap-1 text-xs tabular-nums",
                left < -0.005 ? "text-destructive" : left > 0.005 && rows.length ? "text-amber-600" : "text-muted-foreground")}>
                {Math.abs(left) > 0.005 && rows.length > 0 && <CircleAlert className="size-3.5" />}
                Affecté {fmt(allocated)} sur {fmt(amount)}
                {left > 0.005 && ` · ${fmt(left)} non affectés`}
                {left < -0.005 && ` · ${fmt(-left)} de trop`}
              </p>
            )}
          </section>

          <section className="space-y-3">
            {field("Notes", <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />)}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.thankyouSent} onCheckedChange={(v) => set("thankyouSent", v === true)} />
              Remerciement envoyé
            </label>
          </section>
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t px-6 py-3">
          {gift && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
              if (!confirm("Supprimer ce cadeau ? Il disparaît aussi de la page Cadeaux, avec ses affectations.")) return
              await remove.mutateAsync(gift.id)
              toast.success("Cadeau supprimé.")
              onClose()
            }}>
              <Trash2 className="size-3.5" /> Supprimer
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => void handleSave()} disabled={save.isPending}>{gift ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Choix de plusieurs invités (recherche sans accents, groupés par famille), affichés en pastilles. */
function GuestMultiPicker({ guests, value, onChange }: { guests: Guest[]; value: string[]; onChange: (ids: string[]) => void }) {
  const { data: groups = [] } = useGuestGroups()
  const [open, setOpen] = useState(false)
  const byId = new Map(guests.map((g) => [g.id, g]))
  const familyOf = (g: Guest) => groups.find((x) => x.id === g.groupId)?.familyName ?? "Sans famille"
  const families = [...new Set(guests.map(familyOf))].sort((a, b) => a.localeCompare(b, "fr"))
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 py-0.5 pl-2.5 pr-1 text-xs font-medium">
              {byId.get(id)?.fullName ?? "Invité supprimé"}
              <button type="button" aria-label="Retirer" onClick={() => toggle(id)} className="rounded-full p-0.5 text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm"><UserPlus className="size-3.5" /> {value.length ? "Ajouter un invité" : "Choisir dans la liste des invités"}</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un invité…" />
            <CommandList>
              <CommandEmpty>Aucun invité ne correspond.</CommandEmpty>
              {families.map((fam) => (
                <CommandGroup key={fam} heading={fam}>
                  {guests.filter((g) => familyOf(g) === fam).sort((a, b) => a.fullName.localeCompare(b.fullName, "fr")).map((g) => (
                    <CommandItem key={g.id} value={`${g.fullName} ${fam} ${g.id}`} onSelect={() => toggle(g.id)}>
                      <Check className={cn("size-3.5", value.includes(g.id) ? "opacity-100" : "opacity-0")} />
                      {g.fullName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/**
 * « Financé par » dans la fenêtre d'un poste : cadeaux affectés au poste, à ses sous-postes ou aux
 * devis qui les couvrent (promis compris, signalés comme tels).
 */
export function FundingNote({ model, poste }: { model: BudgetModel; poste: BudgetItem }) {
  const { data: gifts = [] } = useGifts()
  const { data: guests = [] } = useGuests()
  const lineIds = new Set([poste.id, ...model.children(poste.id).map((k) => k.id)])
  const devisIds = new Set([...lineIds].flatMap((id) => (model.linesByItem.get(id) ?? []).map((l) => l.devisId)))
  const allocs = model.allocations.filter((a) => (a.itemId && lineIds.has(a.itemId)) || (a.devisId && devisIds.has(a.devisId)))
  if (!allocs.length) return null
  const guestsById = new Map(guests.map((g) => [g.id, g]))
  const giftsById = new Map(gifts.map((g) => [g.id, g]))
  return (
    <p className="text-xs text-muted-foreground">
      <GiftIcon className="mr-1 inline size-3.5 align-[-2px] text-emerald-600" />
      Financé par{" "}
      {allocs.map((a, i) => {
        const g = giftsById.get(a.giftId)
        return (
          <span key={a.id}>
            {i > 0 && " · "}
            <b className="text-foreground">{g ? giftDonors(g, guestsById) : "?"}</b> {fmt(a.amount)}
            {a.devisId && <span> (via le devis {targetLabel(model, a).replace(/^Devis /, "")})</span>}
            {g?.promised && <span className="text-amber-700 dark:text-amber-400"> (promis)</span>}
          </span>
        )
      })}
    </p>
  )
}
