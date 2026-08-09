import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Euro, Gift as GiftIcon, Link2, Mail, Pencil, Search, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import type { Gift, GiftInput, GiftPatch } from "@/services/gifts.service"
import type { Guest } from "@/types/domain"
import { buildGuestTree, type GuestTreeNode } from "@/components/invites/GuestTreeView"
import { useCreateGift, useDeleteGift, useGifts, useUpdateGift } from "@/hooks/queries/use-gifts"
import { useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// ── Helpers ────────────────────────────────────────────────────────────────────

function isUnder18(g: Guest): boolean {
  if (g.isChild) return true
  const match = g.ageRange?.match(/(\d+)\s*-\s*(\d+)/)
  return match ? Number(match[2]) < 18 : false
}

function amountLabel(n: number) {
  return n % 1 === 0 ? `${n.toFixed(0)} €` : `${n.toFixed(2)} €`
}

function flattenTreeGuests(nodes: GuestTreeNode[]): Guest[] {
  const result: Guest[] = []
  for (const node of nodes) {
    result.push(node.primary)
    if (node.partner) result.push(node.partner)
    result.push(...flattenTreeGuests(node.children))
  }
  return result
}

// ── Constantes — type de cadeau ───────────────────────────────────────────────

const GIFT_TYPES = [
  { value: "enveloppe",       label: "Enveloppe" },
  { value: "carte_cadeaux",   label: "Carte cadeaux" },
  { value: "virement",        label: "Virement" },
  { value: "cadeau_physique", label: "Cadeau physique" },
  { value: "don_prestation",  label: "Don sur prestation" },
  { value: "autre",           label: "Autre" },
]
const GIFT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  GIFT_TYPES.map((t) => [t.value, t.label])
)

// ── Sélecteur de mode donateur ────────────────────────────────────────────────

type GiverMode = "guests" | "external" | "unknown"

const GIVER_MODES: { value: GiverMode; label: string }[] = [
  { value: "guests",   label: "Invité(s)" },
  { value: "external", label: "Hors liste" },
  { value: "unknown",  label: "Inconnu" },
]

function ModeToggle({ mode, onChange }: { mode: GiverMode; onChange: (m: GiverMode) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {GIVER_MODES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "flex-1 text-xs py-1.5 rounded-md transition-colors text-center",
            mode === value
              ? "bg-background shadow-sm font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Sélecteur invités ─────────────────────────────────────────────────────────

function GuestPicker({
  selected,
  onToggleGuest,
  onToggleGroup,
  groupedAdults,
}: {
  selected: Set<string>
  onToggleGuest: (id: string) => void
  onToggleGroup: (groupId: string) => void
  groupedAdults: { grp: { id: string; familyName: string }; members: Guest[] }[]
}) {
  return (
    <div className="space-y-4">
      {groupedAdults.map(({ grp, members }) => {
        const memberIds = members.map((g) => g.id)
        const allChecked = memberIds.every((id) => selected.has(id))
        const someChecked = memberIds.some((id) => selected.has(id))
        return (
          <div key={grp.id}>
            <button
              type="button"
              onClick={() => onToggleGroup(grp.id)}
              className="flex items-center gap-2.5 w-full text-left mb-1.5"
            >
              <Checkbox
                checked={allChecked}
                data-state={someChecked && !allChecked ? "indeterminate" : undefined}
                className="pointer-events-none"
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {grp.familyName}
              </span>
            </button>
            <div className="space-y-0.5 pl-1">
              {members
                .slice()
                .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
                .map((guest) => (
                  <button
                    key={guest.id}
                    type="button"
                    onClick={() => onToggleGuest(guest.id)}
                    className="flex items-center gap-3 w-full rounded-lg px-2 py-2 hover:bg-muted/60 transition-colors text-left"
                  >
                    <Checkbox checked={selected.has(guest.id)} className="pointer-events-none" />
                    <span className="text-sm">{guest.fullName}</span>
                  </button>
                ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Champs type + carte (réutilisés dans Add et Edit) ────────────────────────

function GiftTypeFields({
  giftType,
  hasCard,
  onTypeChange,
  onCardChange,
}: {
  giftType: string
  hasCard: boolean
  onTypeChange: (v: string) => void
  onCardChange: (v: boolean) => void
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Type de cadeau</Label>
        <Select value={giftType || "__none__"} onValueChange={(v) => onTypeChange(v === "__none__" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Non précisé" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Non précisé</SelectItem>
            {GIFT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={hasCard}
          onClick={() => onCardChange(!hasCard)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            hasCard ? "bg-primary" : "bg-muted"
          )}
        >
          <span className={cn(
            "inline-block size-4 rounded-full bg-white shadow transition-transform",
            hasCard ? "translate-x-6" : "translate-x-1"
          )} />
        </button>
        <Label className="cursor-pointer" onClick={() => onCardChange(!hasCard)}>
          Une carte de voeux est jointe
        </Label>
      </div>
    </>
  )
}

// ── Dialog "Ajouter un cadeau" ────────────────────────────────────────────────

interface WhatForm {
  description: string
  amount: string
  notes: string
  giftType: string
  hasCard: boolean
}

function AddGiftDialog({
  open,
  onClose,
  confirmedAdults,
  sortedGroups,
}: {
  open: boolean
  onClose: () => void
  confirmedAdults: Guest[]
  sortedGroups: { id: string; familyName: string; sortOrder: number }[]
}) {
  const [step, setStep]             = useState<1 | 2>(1)
  const [what, setWhat]             = useState<WhatForm>({ description: "", amount: "", notes: "", giftType: "", hasCard: false })
  const [giverMode, setGiverMode]   = useState<GiverMode>("guests")
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [externalGiver, setExternalGiver] = useState("")
  const create = useCreateGift()

  useEffect(() => {
    if (!open) {
      setStep(1)
      setWhat({ description: "", amount: "", notes: "", giftType: "", hasCard: false })
      setGiverMode("guests")
      setSelected(new Set())
      setExternalGiver("")
    }
  }, [open])

  function setW<K extends keyof WhatForm>(k: K, v: WhatForm[K]) {
    setWhat((prev) => ({ ...prev, [k]: v }))
  }

  function toggleGuest(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGroup(groupId: string) {
    const members = confirmedAdults.filter((g) => g.groupId === groupId).map((g) => g.id)
    const allSelected = members.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      members.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }

  async function handleSave() {
    const input: GiftInput = {
      guestIds: giverMode === "guests" ? [...selected] : [],
      externalGiverName: giverMode === "external" ? externalGiver.trim() || null : null,
      description: what.description.trim(),
      amount: what.amount.trim() !== "" ? parseFloat(what.amount) : null,
      notes: what.notes.trim() || null,
      giftType: what.giftType || null,
      hasCard: what.hasCard,
    }
    await create.mutateAsync(input)
    toast.success("Cadeau enregistré.")
    onClose()
  }

  const canNext = what.description.trim() !== ""
  const canSave =
    !create.isPending && (
      (giverMode === "guests" && selected.size > 0) ||
      (giverMode === "external" && externalGiver.trim() !== "") ||
      giverMode === "unknown"
    )

  const groupedAdults = useMemo(() => {
    return sortedGroups
      .map((grp) => ({
        grp,
        members: confirmedAdults.filter((g) => g.groupId === grp.id),
      }))
      .filter(({ members }) => members.length > 0)
  }, [confirmedAdults, sortedGroups])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex flex-col max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <DialogTitle>
              {step === 1 ? "De quoi s'agit-il ?" : "Qui l'a offert ?"}
            </DialogTitle>
          </div>
          <div className="flex gap-1.5 mt-2">
            {([1, 2] as const).map((s) => (
              <div
                key={s}
                className={cn("h-1 flex-1 rounded-full transition-colors", step >= s ? "bg-primary" : "bg-muted")}
              />
            ))}
          </div>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex flex-col flex-1 gap-5 px-6 py-5 overflow-y-auto">
            <div className="space-y-1.5">
              <Label htmlFor="add-desc">Description *</Label>
              <Textarea
                id="add-desc"
                value={what.description}
                onChange={(e) => setW("description", e.target.value)}
                placeholder="Vase en cristal, chèque 200€, service de table…"
                rows={3}
                autoFocus
              />
            </div>

            <GiftTypeFields
              giftType={what.giftType}
              hasCard={what.hasCard}
              onTypeChange={(v) => setW("giftType", v)}
              onCardChange={(v) => setW("hasCard", v)}
            />

            <div className="space-y-1.5">
              <Label htmlFor="add-amount">Valeur estimée (€)</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="add-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={what.amount}
                  onChange={(e) => setW("amount", e.target.value)}
                  placeholder="0"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-notes">Notes</Label>
              <Textarea
                id="add-notes"
                value={what.notes}
                onChange={(e) => setW("notes", e.target.value)}
                placeholder="Apporté à la fête, à récupérer chez eux…"
                rows={2}
              />
            </div>

            <div className="mt-auto pb-2">
              <Button className="w-full" disabled={!canNext} onClick={() => setStep(2)}>
                Suivant — qui l'a offert ?
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden px-6 py-5 gap-4">
            <div className="rounded-xl bg-muted/50 px-3 py-2 shrink-0">
              <p className="text-sm font-medium">{what.description}</p>
              {what.giftType && <p className="text-xs text-muted-foreground">{GIFT_TYPE_LABEL[what.giftType]}</p>}
              {what.amount && <p className="text-xs text-muted-foreground">{what.amount} €</p>}
            </div>

            <div className="shrink-0">
              <ModeToggle mode={giverMode} onChange={setGiverMode} />
            </div>

            {giverMode === "guests" && (
              <div className="flex-1 overflow-y-auto">
                <GuestPicker
                  selected={selected}
                  onToggleGuest={toggleGuest}
                  onToggleGroup={toggleGroup}
                  groupedAdults={groupedAdults}
                />
              </div>
            )}

            {giverMode === "external" && (
              <div className="space-y-1.5">
                <Label htmlFor="external-giver">Nom du donateur</Label>
                <Input
                  id="external-giver"
                  value={externalGiver}
                  onChange={(e) => setExternalGiver(e.target.value)}
                  placeholder="Tante Marie, virement reçu le 25/07…"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Personne qui n'était pas dans la liste des invités.</p>
              </div>
            )}

            {giverMode === "unknown" && (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Le cadeau sera enregistré sans attribution.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Vous pourrez l'attribuer plus tard depuis la liste.</p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t shrink-0">
              <Button className="w-full" disabled={!canSave} onClick={handleSave}>
                Enregistrer
                {giverMode === "guests" && selected.size > 0 && (
                  <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs font-bold">{selected.size} pers.</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog "Modifier un cadeau" ───────────────────────────────────────────────

function EditGiftDialog({
  gift,
  onClose,
  confirmedAdults,
  sortedGroups,
}: {
  gift: Gift | null
  onClose: () => void
  confirmedAdults: Guest[]
  sortedGroups: { id: string; familyName: string; sortOrder: number }[]
}) {
  const [form, setForm]             = useState({ description: "", amount: "", notes: "", thankyouSent: false, giftType: "", hasCard: false })
  const [giverMode, setGiverMode]   = useState<GiverMode>("guests")
  const [externalGiver, setExternalGiver] = useState("")
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const update = useUpdateGift()
  const remove = useDeleteGift()

  useEffect(() => {
    if (gift) {
      setForm({
        description: gift.description,
        amount: gift.amount != null ? String(gift.amount) : "",
        notes: gift.notes ?? "",
        thankyouSent: gift.thankyouSent,
        giftType: gift.giftType ?? "",
        hasCard: gift.hasCard,
      })
      if (gift.externalGiverName) {
        setGiverMode("external")
        setExternalGiver(gift.externalGiverName)
        setSelectedGuests(new Set())
      } else if (gift.guestIds.length > 0) {
        setGiverMode("guests")
        setSelectedGuests(new Set(gift.guestIds))
        setExternalGiver("")
      } else {
        setGiverMode("unknown")
        setSelectedGuests(new Set())
        setExternalGiver("")
      }
    }
    setConfirmDelete(false)
  }, [gift])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleModeChange(m: GiverMode) {
    setGiverMode(m)
    if (m !== "guests") setSelectedGuests(new Set())
    if (m !== "external") setExternalGiver("")
  }

  function toggleGuest(id: string) {
    setSelectedGuests((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGroup(groupId: string) {
    const members = confirmedAdults.filter((g) => g.groupId === groupId).map((g) => g.id)
    const allSelected = members.every((id) => selectedGuests.has(id))
    setSelectedGuests((prev) => {
      const next = new Set(prev)
      members.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }

  const groupedAdults = useMemo(() => {
    return sortedGroups
      .map((grp) => ({
        grp,
        members: confirmedAdults.filter((g) => g.groupId === grp.id),
      }))
      .filter(({ members }) => members.length > 0)
  }, [confirmedAdults, sortedGroups])

  const isPending = update.isPending || remove.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gift) return
    const patch: GiftPatch = {
      description: form.description.trim(),
      amount: form.amount.trim() !== "" ? parseFloat(form.amount) : null,
      notes: form.notes.trim() || null,
      thankyouSent: form.thankyouSent,
      giftType: form.giftType || null,
      hasCard: form.hasCard,
      guestIds: giverMode === "guests" ? [...selectedGuests] : [],
      externalGiverName: giverMode === "external" ? externalGiver.trim() || null : null,
    }
    await update.mutateAsync({ id: gift.id, patch })
    toast.success("Cadeau mis à jour.")
    onClose()
  }

  async function handleDelete() {
    if (!gift) return
    await remove.mutateAsync(gift.id)
    toast.success("Cadeau supprimé.")
    onClose()
  }

  return (
    <Dialog open={gift !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex flex-col max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Modifier le cadeau</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5 px-6 py-5 overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description *</Label>
            <Textarea id="edit-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} required />
          </div>

          <GiftTypeFields
            giftType={form.giftType}
            hasCard={form.hasCard}
            onTypeChange={(v) => set("giftType", v)}
            onCardChange={(v) => set("hasCard", v)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">Valeur estimée (€)</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input id="edit-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} className="pl-8" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Qui l'a offert ?</Label>
            <ModeToggle mode={giverMode} onChange={handleModeChange} />

            {giverMode === "external" && (
              <div className="mt-2 space-y-1.5">
                <Label htmlFor="edit-external-giver">Nom du donateur</Label>
                <Input id="edit-external-giver" value={externalGiver} onChange={(e) => setExternalGiver(e.target.value)} placeholder="Tante Marie, virement…" />
              </div>
            )}

            {giverMode === "guests" && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                <GuestPicker
                  selected={selectedGuests}
                  onToggleGuest={toggleGuest}
                  onToggleGroup={toggleGroup}
                  groupedAdults={groupedAdults}
                />
              </div>
            )}

            {giverMode === "unknown" && (
              <p className="text-xs text-muted-foreground mt-1">À attribuer ultérieurement.</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.thankyouSent}
              onClick={() => set("thankyouSent", !form.thankyouSent)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                form.thankyouSent ? "bg-green-500" : "bg-muted"
              )}
            >
              <span className={cn("inline-block size-4 rounded-full bg-white shadow transition-transform", form.thankyouSent ? "translate-x-6" : "translate-x-1")} />
            </button>
            <Label className="cursor-pointer" onClick={() => set("thankyouSent", !form.thankyouSent)}>
              Remerciement envoyé
            </Label>
          </div>

          <div className="mt-auto space-y-2 pb-2">
            <Button type="submit" disabled={isPending || !form.description.trim()} className="w-full">Enregistrer</Button>
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">Supprimer définitivement ?</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete} disabled={isPending}>Confirmer</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4 mr-2" />Supprimer
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Badges de cadeau (type + carte) ──────────────────────────────────────────

function GiftBadges({ gift }: { gift: Gift }) {
  return (
    <>
      {gift.giftType && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
          {GIFT_TYPE_LABEL[gift.giftType] ?? gift.giftType}
        </span>
      )}
      {gift.hasCard && (
        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/60 shrink-0">
          <Mail className="size-2.5" />carte
        </span>
      )}
    </>
  )
}

// ── Ligne cadeau extérieur ────────────────────────────────────────────────────

function ExternalGiftRow({ gift, onEdit, onToggle }: { gift: Gift; onEdit: (g: Gift) => void; onToggle: (g: Gift) => void }) {
  const update = useUpdateGift()
  return (
    <div className="py-2.5 pr-2" id={`gift-external-${gift.id}`}>
      <span className="text-sm font-medium">{gift.externalGiverName}</span>
      <div className="mt-1.5 pl-3 border-l-2 border-border/50">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">{gift.description}</span>
              {gift.amount != null && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                  <Euro className="size-2.5" />{amountLabel(gift.amount)}
                </span>
              )}
              <GiftBadges gift={gift} />
            </div>
            {gift.notes && <p className="text-xs text-muted-foreground/60 mt-0.5">{gift.notes}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={gift.thankyouSent ? "outline" : "default"}
              size="sm"
              className={cn("h-7 text-xs px-2.5", gift.thankyouSent && "text-green-600 border-green-300 hover:text-green-700")}
              onClick={() => onToggle(gift)}
              disabled={update.isPending}
            >
              {gift.thankyouSent ? "✓" : "Remercier"}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(gift)}>
              <Pencil className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Ligne cadeau non attribué ─────────────────────────────────────────────────

function UnattributedGiftRow({ gift, onEdit }: { gift: Gift; onEdit: (g: Gift) => void }) {
  return (
    <div className="py-2.5 pr-2 flex items-start gap-2" id={`gift-unattributed-${gift.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{gift.description}</span>
          {gift.amount != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
              <Euro className="size-2.5" />{amountLabel(gift.amount)}
            </span>
          )}
          <GiftBadges gift={gift} />
        </div>
        {gift.notes && <p className="text-xs text-muted-foreground/60 mt-0.5">{gift.notes}</p>}
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 shrink-0" onClick={() => onEdit(gift)}>
        Attribuer
      </Button>
    </div>
  )
}

// ── Ligne invité ──────────────────────────────────────────────────────────────

function GuestGiftRow({ guest, gifts, onEdit, onToggle }: { guest: Guest; gifts: Gift[]; onEdit: (g: Gift) => void; onToggle: (g: Gift) => void }) {
  const update = useUpdateGift()
  return (
    <div className="py-2.5 pr-2" id={`gift-guest-${guest.id}`}>
      <span className="text-sm font-medium">{guest.fullName}</span>
      {gifts.length > 0 ? (
        <div className="mt-1.5 space-y-1.5">
          {gifts.map((gift) => (
            <div key={gift.id} className="flex items-start gap-2 pl-3 border-l-2 border-border/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{gift.description}</span>
                  {gift.amount != null && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                      <Euro className="size-2.5" />{amountLabel(gift.amount)}
                    </span>
                  )}
                  {gift.guestIds.length > 1 && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/60 shrink-0">
                      <Users className="size-2.5" />{gift.guestIds.length} pers.
                    </span>
                  )}
                  <GiftBadges gift={gift} />
                </div>
                {gift.notes && <p className="text-xs text-muted-foreground/60 mt-0.5">{gift.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant={gift.thankyouSent ? "outline" : "default"}
                  size="sm"
                  className={cn("h-7 text-xs px-2.5", gift.thankyouSent && "text-green-600 border-green-300 hover:text-green-700")}
                  onClick={() => onToggle(gift)}
                  disabled={update.isPending}
                >
                  {gift.thankyouSent ? "✓" : "Remercier"}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(gift)}>
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/40 italic mt-0.5">Pas de cadeau</p>
      )}
    </div>
  )
}

// ── Arbre de nœuds invités ────────────────────────────────────────────────────

function GiftTreeNodes({ nodes, giftsByGuestId, onEdit, onToggle, depth = 0 }: {
  nodes: GuestTreeNode[]
  giftsByGuestId: Map<string, Gift[]>
  onEdit: (g: Gift) => void
  onToggle: (g: Gift) => void
  depth?: number
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.primary.id} className={cn(depth > 0 && "ml-2 border-l border-border/60 pl-3")}>
          <div className="border-b border-border/30">
            <GuestGiftRow guest={node.primary} gifts={giftsByGuestId.get(node.primary.id) ?? []} onEdit={onEdit} onToggle={onToggle} />
          </div>
          {node.partner && (
            <div className="flex items-start gap-1.5 border-b border-border/30">
              <Link2 className="size-3 mt-3.5 ml-0.5 text-muted-foreground/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <GuestGiftRow guest={node.partner} gifts={giftsByGuestId.get(node.partner.id) ?? []} onEdit={onEdit} onToggle={onToggle} />
              </div>
            </div>
          )}
          {node.children.length > 0 && (
            <GiftTreeNodes nodes={node.children} giftsByGuestId={giftsByGuestId} onEdit={onEdit} onToggle={onToggle} depth={depth + 1} />
          )}
        </div>
      ))}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Filter = "all" | "pending" | "done"

export function CadeauxPage() {
  const [filter, setFilter]       = useState<Filter>("all")
  const [addOpen, setAddOpen]     = useState(false)
  const [editGift, setEditGift]   = useState<Gift | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const { data: gifts = [], isLoading: giftsLoading }   = useGifts()
  const { data: guests = [], isLoading: guestsLoading } = useGuests()
  const { data: groups = [], isLoading: groupsLoading } = useGuestGroups()
  const update = useUpdateGift()

  const isLoading = giftsLoading || guestsLoading || groupsLoading

  const giftsByGuestId = useMemo(() => {
    const map = new Map<string, Gift[]>()
    for (const gift of gifts) {
      for (const guestId of gift.guestIds) {
        const list = map.get(guestId) ?? []
        list.push(gift)
        map.set(guestId, list)
      }
    }
    return map
  }, [gifts])

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.sortOrder - b.sortOrder), [groups])

  const confirmedGuests = useMemo(() => guests.filter((g) => g.rsvpStatus === "confirmed"), [guests])
  const confirmedAdults = useMemo(() => confirmedGuests.filter((g) => !isUnder18(g)), [confirmedGuests])

  const unattributedGifts = useMemo(
    () => gifts.filter((g) => g.guestIds.length === 0 && !g.externalGiverName),
    [gifts]
  )
  const externalGifts = useMemo(() => gifts.filter((g) => g.externalGiverName != null), [gifts])

  const filteredExternalGifts = useMemo(() => {
    if (filter === "pending") return externalGifts.filter((g) => !g.thankyouSent)
    if (filter === "done")    return externalGifts.filter((g) => g.thankyouSent)
    return externalGifts
  }, [externalGifts, filter])

  const totalGifts  = gifts.length
  const totalAmount = gifts.reduce((s, g) => s + (g.amount ?? 0), 0)

  const guestIdsPending = useMemo(() => new Set(
    [...giftsByGuestId.entries()].filter(([, gs]) => gs.some((g) => !g.thankyouSent)).map(([id]) => id)
  ), [giftsByGuestId])

  const guestIdsAllThanked = useMemo(() => new Set(
    [...giftsByGuestId.entries()].filter(([, gs]) => gs.length > 0 && gs.every((g) => g.thankyouSent)).map(([id]) => id)
  ), [giftsByGuestId])

  const externalPending = externalGifts.filter((g) => !g.thankyouSent).length
  const externalDone    = externalGifts.filter((g) => g.thankyouSent).length
  const aRemercier = guestIdsPending.size + externalPending
  const remercies  = guestIdsAllThanked.size + externalDone

  const filteredGuestIds = useMemo(() => {
    if (filter === "all") return null
    return filter === "pending" ? guestIdsPending : guestIdsAllThanked
  }, [filter, guestIdsPending, guestIdsAllThanked])

  const treeByGroupId = useMemo(() => {
    const map = new Map<string, GuestTreeNode[]>()
    for (const grp of sortedGroups) {
      map.set(grp.id, buildGuestTree(confirmedGuests.filter((g) => g.groupId === grp.id)))
    }
    return map
  }, [confirmedGuests, sortedGroups])

  const groupedForDisplay = useMemo(() => {
    if (filter === "all") {
      return sortedGroups
        .map((grp) => {
          const tree = treeByGroupId.get(grp.id) ?? []
          if (tree.length === 0) return null
          return { grp, tree, members: null as Guest[] | null }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    }
    return sortedGroups
      .map((grp) => {
        let members = confirmedAdults
          .filter((g) => g.groupId === grp.id)
          .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
        if (filteredGuestIds !== null) members = members.filter((g) => filteredGuestIds.has(g.id))
        if (members.length === 0) return null
        return { grp, tree: null as GuestTreeNode[] | null, members }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [filter, sortedGroups, treeByGroupId, confirmedAdults, filteredGuestIds])

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) return
    const lq = q.trim().toLowerCase()

    const candidates: { id: string; text: string }[] = []

    if (filter === "all") {
      for (const g of unattributedGifts) {
        candidates.push({ id: `gift-unattributed-${g.id}`, text: g.description.toLowerCase() })
      }
    }

    for (const g of filteredExternalGifts) {
      if (g.externalGiverName) {
        candidates.push({ id: `gift-external-${g.id}`, text: g.externalGiverName.toLowerCase() })
      }
    }

    for (const { grp, tree, members } of groupedForDisplay) {
      candidates.push({ id: `gift-group-${grp.id}`, text: grp.familyName.toLowerCase() })
      if (tree) {
        flattenTreeGuests(tree).forEach((g) =>
          candidates.push({ id: `gift-guest-${g.id}`, text: g.fullName.toLowerCase() })
        )
      } else if (members) {
        members.forEach((g) =>
          candidates.push({ id: `gift-guest-${g.id}`, text: g.fullName.toLowerCase() })
        )
      }
    }

    const match = candidates.find((c) => c.text.includes(lq))
    if (match) {
      document.getElementById(match.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }

  function handleToggle(gift: Gift) {
    update.mutate(
      { id: gift.id, patch: { thankyouSent: !gift.thankyouSent } },
      { onSuccess: () => toast.success(gift.thankyouSent ? "Remerciement annulé." : "Remercié ✓") }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cadeaux" description="Suivez les cadeaux reçus et les remerciements à envoyer." />
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadeaux"
        description="Suivez les cadeaux reçus et les remerciements à envoyer."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <GiftIcon className="size-4 mr-1.5" />
            Ajouter un cadeau
          </Button>
        }
      />

      {totalGifts > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Cadeaux notés", value: totalGifts },
            { label: "À remercier",   value: aRemercier, accent: aRemercier > 0 },
            { label: "Valeur totale", value: totalAmount > 0 ? `${totalAmount.toFixed(0)} €` : "—" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-2xl border bg-card px-4 py-3 text-center">
              <p className={cn("text-2xl font-bold tabular-nums", accent && "text-primary")}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">Tous les invités</TabsTrigger>
          <TabsTrigger value="pending">
            À remercier
            {aRemercier > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums">
                {aRemercier}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="done">Remerciés ({remercies})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Recherche par nom — scroll vers la personne, sans filtrer */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher un nom…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Cadeaux non attribués */}
      {filter === "all" && unattributedGifts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-amber-200 dark:border-amber-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              À attribuer ({unattributedGifts.length})
            </span>
          </div>
          <div className="px-3 divide-y divide-amber-100 dark:divide-amber-900/50">
            {unattributedGifts.map((gift) => (
              <UnattributedGiftRow key={gift.id} gift={gift} onEdit={setEditGift} />
            ))}
          </div>
        </div>
      )}

      {/* Cadeaux hors liste invités */}
      {filteredExternalGifts.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="bg-muted/40 px-4 py-2.5 border-b">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hors liste invités
            </span>
          </div>
          <div className="px-3 divide-y divide-border/40">
            {filteredExternalGifts.map((gift) => (
              <ExternalGiftRow key={gift.id} gift={gift} onEdit={setEditGift} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      )}

      {/* Groupes d'invités confirmés */}
      {groupedForDisplay.length === 0 && filteredExternalGifts.length === 0 ? (
        filter === "all" ? (
          <EmptyState
            icon={GiftIcon}
            title="Aucun invité confirmé"
            description="Les invités confirmés apparaîtront ici."
            action={<Button size="sm" onClick={() => setAddOpen(true)}>Ajouter un cadeau</Button>}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-10">
            {filter === "pending" ? "Tous les remerciements sont envoyés ✓" : "Aucun remerciement enregistré"}
          </p>
        )
      ) : (
        <div className="space-y-4">
          {groupedForDisplay.map(({ grp, tree, members }) => (
            <div key={grp.id} id={`gift-group-${grp.id}`} className="rounded-2xl border bg-card overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {grp.familyName}
                </span>
              </div>
              <div className="px-3">
                {tree ? (
                  <GiftTreeNodes nodes={tree} giftsByGuestId={giftsByGuestId} onEdit={setEditGift} onToggle={handleToggle} />
                ) : (
                  <div className="divide-y divide-border/40">
                    {members!.map((guest) => (
                      <GuestGiftRow key={guest.id} guest={guest} gifts={giftsByGuestId.get(guest.id) ?? []} onEdit={setEditGift} onToggle={handleToggle} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddGiftDialog open={addOpen} onClose={() => setAddOpen(false)} confirmedAdults={confirmedAdults} sortedGroups={sortedGroups} />
      <EditGiftDialog gift={editGift} onClose={() => setEditGift(null)} confirmedAdults={confirmedAdults} sortedGroups={sortedGroups} />
    </div>
  )
}
