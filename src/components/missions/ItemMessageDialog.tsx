import { useEffect, useState } from "react"
import { EarOff, Mail, Mic, Plus, Send, User, Users } from "lucide-react"
import { toast } from "sonner"

import type { ChecklistItem, RosDelivererType, RosDeliveryMode, RosMessage, RosRecipientType } from "@/types/domain"
import { useRunOfShow } from "@/hooks/queries/use-run-of-show"
import { useRosMessages, useCreateRosMessage } from "@/hooks/queries/use-ros-messages"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { useUpdateChecklistItem } from "@/hooks/queries/use-checklists"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const NONE = "__none__"

// ── Helpers ───────────────────────────────────────────────────────────────────

const RECIPIENT_TYPES: { value: RosRecipientType; label: string }[] = [
  { value: "all_guests", label: "Tous les invités" },
  { value: "guest", label: "Invité spécifique" },
  { value: "fiance", label: "Un des fiancés" },
  { value: "both_fiances", label: "Les deux fiancés" },
  { value: "other", label: "Autre (traiteur, DJ…)" },
]

function msgPreview(msg: RosMessage) {
  return msg.subject ?? msg.content.slice(0, 60) + (msg.content.length > 60 ? "…" : "")
}

// ── Carte message dans la liste de sélection ──────────────────────────────────

function MessageSelectCard({
  msg,
  selected,
  onClick,
  guests,
  people,
}: {
  msg: RosMessage
  selected: boolean
  onClick: () => void
  guests: ReturnType<typeof useGuests>["data"]
  people: ReturnType<typeof usePeople>["data"]
}) {
  const allGuests  = guests  ?? []
  const allPeople  = people  ?? []
  const deliverer  = msg.delivererGuestId
    ? allGuests.find((g) => g.id === msg.delivererGuestId)?.fullName
    : msg.delivererPersonId
    ? allPeople.find((p) => p.id === msg.delivererPersonId)?.fullName
    : msg.delivererType === "both_fiances"
    ? "Les deux fiancés"
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
        selected
          ? "border-bordeaux/40 bg-bordeaux/8 text-foreground"
          : "border-border bg-card text-foreground hover:border-foreground/30"
      )}
    >
      <p className="font-medium leading-snug">{msgPreview(msg)}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {msg.scheduledTime && <span>{msg.scheduledTime.slice(0, 5)}</span>}
        {msg.deliveryMode === "micro" && (
          <span className="flex items-center gap-0.5"><Mic className="size-3" />Micro</span>
        )}
        {msg.deliveryMode === "discret" && (
          <span className="flex items-center gap-0.5"><EarOff className="size-3" />Discret</span>
        )}
        {deliverer && (
          <span className="flex items-center gap-0.5">
            <Send className="size-3" />{deliverer}
          </span>
        )}
        {msg.recipientType === "all_guests" && (
          <span className="flex items-center gap-0.5"><Users className="size-3" />Tous les invités</span>
        )}
        {msg.recipientType === "guest" && msg.recipientGuestId && (
          <span className="flex items-center gap-0.5">
            <User className="size-3" />{allGuests.find((g) => g.id === msg.recipientGuestId)?.fullName}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Mode "Sélectionner" ───────────────────────────────────────────────────────

function SelectMode({
  item,
  onDone,
}: {
  item: ChecklistItem
  onDone: () => void
}) {
  const { data: steps   = [] } = useRunOfShow()
  const { data: messages = [] } = useRosMessages()
  const { data: guests }        = useGuests()
  const { data: people }        = usePeople()
  const updateItem              = useUpdateChecklistItem()

  const [selected, setSelected] = useState<string>(item.rosMessageId ?? "")

  const grouped = steps
    .map((step) => ({
      step,
      msgs: messages.filter((m) => m.stepId === step.id),
    }))
    .filter((g) => g.msgs.length > 0)

  async function handleConfirm() {
    await updateItem.mutateAsync({ id: item.id, patch: { rosMessageId: selected || null } })
    toast.success(selected ? "Message lié." : "Lien retiré.")
    onDone()
  }

  if (messages.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Aucun message dans le Run of Show.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
        {grouped.map(({ step, msgs }) => (
          <div key={step.id} className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {step.timeLabel} · {step.label}
            </p>
            {msgs.map((msg) => (
              <MessageSelectCard
                key={msg.id}
                msg={msg}
                selected={selected === msg.id}
                onClick={() => setSelected((v) => (v === msg.id ? "" : msg.id))}
                guests={guests}
                people={people}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone}>Annuler</Button>
        <Button type="button" onClick={handleConfirm} disabled={updateItem.isPending}>
          {selected ? "Lier" : "Retirer le lien"}
        </Button>
      </div>
    </div>
  )
}

// ── Mode "Créer" ──────────────────────────────────────────────────────────────

interface FormState {
  stepId: string
  subject: string
  content: string
  scheduledTime: string
  deliveryMode: RosDeliveryMode | ""
  delivererType: RosDelivererType | ""
  delivererGuestId: string
  delivererPersonId: string
  recipientType: RosRecipientType | ""
  recipientGuestId: string
  recipientPersonId: string
  recipientLabel: string
}

function emptyForm(item: ChecklistItem): FormState {
  return {
    stepId: "",
    subject: "",
    content: "",
    scheduledTime: item.estimatedStartTime?.slice(0, 5) ?? "",
    deliveryMode: "",
    delivererType: "",
    delivererGuestId: "",
    delivererPersonId: "",
    recipientType: "",
    recipientGuestId: "",
    recipientPersonId: "",
    recipientLabel: "",
  }
}

function CreateMode({
  item,
  onDone,
}: {
  item: ChecklistItem
  onDone: () => void
}) {
  const { data: steps = [] } = useRunOfShow()
  const { data: guests = [] } = useGuests()
  const { data: people = [] } = usePeople()
  const create     = useCreateRosMessage()
  const updateItem = useUpdateChecklistItem()

  const [form, setForm] = useState<FormState>(() => emptyForm(item))

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const assignableGuests = guests.filter((g) => g.assignable)
  const canSubmit = form.stepId !== "" && form.content.trim().length > 0
  const isPending = create.isPending || updateItem.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = await create.mutateAsync({
      stepId: form.stepId,
      sortOrder: 0,
      subject: form.subject.trim() || null,
      content: form.content.trim(),
      scheduledTime: form.scheduledTime || null,
      deliveryMode: (form.deliveryMode as RosDeliveryMode) || null,
      delivererType: (form.delivererType as RosDelivererType) || null,
      delivererGuestId: form.delivererType === "guest" ? (form.delivererGuestId || null) : null,
      delivererPersonId: form.delivererType === "fiance" ? (form.delivererPersonId || null) : null,
      recipientType: (form.recipientType as RosRecipientType) || null,
      recipientGuestId: form.recipientType === "guest" ? (form.recipientGuestId || null) : null,
      recipientPersonId: form.recipientType === "fiance" ? (form.recipientPersonId || null) : null,
      recipientLabel: form.recipientType === "other" ? (form.recipientLabel || null) : null,
    })
    await updateItem.mutateAsync({ id: item.id, patch: { rosMessageId: msg.id } })
    toast.success("Message créé et lié.")
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 gap-4">
      <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
        <FieldGroup>
          <Field>
            <FieldLabel>Étape du RoS *</FieldLabel>
            <Select value={form.stepId || NONE} onValueChange={(v) => set("stepId", v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Choisir une étape…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Choisir une étape</SelectItem>
                {steps.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.timeLabel} · {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="im-subject">Objet</FieldLabel>
            <Input id="im-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Ex. Rappel DJ" />
          </Field>

          <Field>
            <FieldLabel htmlFor="im-time">Heure (optionnel)</FieldLabel>
            <Input id="im-time" type="time" value={form.scheduledTime} onChange={(e) => set("scheduledTime", e.target.value)} className="w-36" />
          </Field>

          <Field>
            <FieldLabel>Mode de transmission</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: "", label: "Non précisé" },
                { value: "micro", label: "Au micro", icon: Mic },
                { value: "discret", label: "Discrètement", icon: EarOff },
              ] as const).map((opt) => {
                const Icon = "icon" in opt ? opt.icon : null
                const active = form.deliveryMode === opt.value
                return (
                  <button key={opt.value} type="button"
                    onClick={() => set("deliveryMode", opt.value as RosDeliveryMode | "")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                      active
                        ? "border-bordeaux/40 bg-bordeaux/10 text-bordeaux font-medium"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    )}>
                    {Icon && <Icon className="size-3.5" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="im-content">Contenu *</FieldLabel>
            <textarea
              id="im-content"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={3}
              required
              placeholder="Texte du message à transmettre…"
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </Field>

          <Field>
            <FieldLabel>Qui délivre</FieldLabel>
            <Select value={form.delivererType || NONE} onValueChange={(v) => {
              set("delivererType", v === NONE ? "" : v as RosDelivererType)
              set("delivererGuestId", "")
              set("delivererPersonId", "")
            }}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Non assigné</SelectItem>
                <SelectItem value="both_fiances">Les deux fiancés</SelectItem>
                <SelectItem value="fiance">Un des fiancés</SelectItem>
                <SelectItem value="guest">Invité assignable</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.delivererType === "fiance" && (
            <Field>
              <FieldLabel>Fiancé(e)</FieldLabel>
              <Select value={form.delivererPersonId || NONE} onValueChange={(v) => set("delivererPersonId", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.delivererType === "guest" && (
            <Field>
              <FieldLabel>Invité</FieldLabel>
              <Select value={form.delivererGuestId || NONE} onValueChange={(v) => set("delivererGuestId", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un bénévole…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {assignableGuests.map((g) => <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field>
            <FieldLabel>Destinataire</FieldLabel>
            <Select value={form.recipientType || NONE} onValueChange={(v) => {
              set("recipientType", v === NONE ? "" : v as RosRecipientType)
              set("recipientGuestId", "")
              set("recipientPersonId", "")
              set("recipientLabel", "")
            }}>
              <SelectTrigger><SelectValue placeholder="Qui doit recevoir le message ?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Non précisé</SelectItem>
                {RECIPIENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {form.recipientType === "guest" && (
            <Field>
              <FieldLabel>Invité destinataire</FieldLabel>
              <Select value={form.recipientGuestId || NONE} onValueChange={(v) => set("recipientGuestId", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Choisir un invité…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Non précisé</SelectItem>
                  {assignableGuests.map((g) => <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.recipientType === "fiance" && (
            <Field>
              <FieldLabel>Fiancé(e) destinataire</FieldLabel>
              <Select value={form.recipientPersonId || NONE} onValueChange={(v) => set("recipientPersonId", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Non précisé</SelectItem>
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.recipientType === "other" && (
            <Field>
              <FieldLabel htmlFor="im-recipient-label">Préciser</FieldLabel>
              <Input id="im-recipient-label" value={form.recipientLabel}
                onChange={(e) => set("recipientLabel", e.target.value)}
                placeholder="Ex. Traiteur, DJ, Photographe…" />
            </Field>
          )}
        </FieldGroup>
      </div>

      <div className="flex justify-end gap-2 pt-1 shrink-0">
        <Button type="button" variant="outline" onClick={onDone}>Annuler</Button>
        <Button type="submit" disabled={isPending || !canSubmit}>Créer et lier</Button>
      </div>
    </form>
  )
}

// ── Dialog principal ──────────────────────────────────────────────────────────

interface Props {
  item: ChecklistItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Mode = "select" | "create"

export function ItemMessageDialog({ item, open, onOpenChange }: Props) {
  const [mode, setMode] = useState<Mode>("select")

  useEffect(() => {
    if (open) setMode("select")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-heading leading-snug">
              {mode === "select" ? "Lier un message" : "Nouveau message"} · {item.label}
            </DialogTitle>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "select" ? "create" : "select"))}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              {mode === "select"
                ? <><Plus className="size-3" />Nouveau</>
                : <><Mail className="size-3" />Existant</>}
            </button>
          </div>
        </DialogHeader>

        {mode === "select"
          ? <SelectMode item={item} onDone={() => onOpenChange(false)} />
          : <CreateMode item={item} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

// ── Trigger ───────────────────────────────────────────────────────────────────

export function ItemMessageTrigger({ item }: { item: ChecklistItem }) {
  const [open, setOpen] = useState(false)
  const linked = !!item.rosMessageId

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        title={linked ? "Message lié — modifier" : "Lier un message RoS"}
        className={cn(
          "shrink-0 rounded p-0.5 transition-colors",
          linked
            ? "text-bordeaux hover:text-bordeaux/70"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      >
        <Mail className="size-3.5" />
      </button>
      {open && <ItemMessageDialog item={item} open={open} onOpenChange={setOpen} />}
    </>
  )
}
