import { useEffect, useState } from "react"
import { EarOff, MessageSquare, Mic, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import type { Guest, Person, RosDelivererType, RosDeliveryMode, RosMessage, RosRecipientType, RunOfShowStep } from "@/types/domain"
import type { RosMessageInput, RosMessagePatch } from "@/services/ros-messages.service"
import { useCreateRosMessage, useDeleteRosMessage, useRosMessages, useUpdateRosMessage } from "@/hooks/queries/use-ros-messages"
import { useRunOfShow } from "@/hooks/queries/use-run-of-show"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { splitRunOfShowSteps } from "@/lib/run-of-show"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"

// ── Types & helpers ────────────────────────────────────────────────────────────

const RECIPIENT_TYPES: { value: RosRecipientType; label: string }[] = [
  { value: "all_guests",   label: "Tous les invités" },
  { value: "guest",        label: "Invité spécifique" },
  { value: "fiance",       label: "Un des fiancés" },
  { value: "both_fiances", label: "Les deux fiancés" },
  { value: "other",        label: "Autre (traiteur, DJ…)" },
]
const OTHER_PRESETS = ["Traiteur", "DJ", "Photographe", "Vidéaste", "Coordinateur"]

interface FormState {
  stepId: string; subject: string; content: string; scheduledTime: string
  deliveryMode: RosDeliveryMode | ""; delivererType: RosDelivererType | ""
  delivererGuestId: string; delivererPersonId: string
  recipientType: RosRecipientType | ""; recipientGuestId: string
  recipientPersonId: string; recipientLabel: string
}

function emptyForm(): FormState {
  return {
    stepId: "", subject: "", content: "", scheduledTime: "",
    deliveryMode: "", delivererType: "", delivererGuestId: "", delivererPersonId: "",
    recipientType: "", recipientGuestId: "", recipientPersonId: "", recipientLabel: "",
  }
}

function msgToForm(msg: RosMessage): FormState {
  return {
    stepId: msg.stepId,
    subject: msg.subject ?? "",
    content: msg.content,
    scheduledTime: msg.scheduledTime ?? "",
    deliveryMode: msg.deliveryMode ?? "",
    delivererType: msg.delivererType ?? (msg.delivererGuestId ? "guest" : ""),
    delivererGuestId: msg.delivererGuestId ?? "",
    delivererPersonId: msg.delivererPersonId ?? "",
    recipientType: msg.recipientType ?? "",
    recipientGuestId: msg.recipientGuestId ?? "",
    recipientPersonId: msg.recipientPersonId ?? "",
    recipientLabel: msg.recipientLabel ?? "",
  }
}

function recipientSummary(msg: RosMessage, guests: Guest[], people: Person[]): string {
  switch (msg.recipientType) {
    case "guest":        return guests.find((x) => x.id === msg.recipientGuestId)?.fullName ?? "Invité"
    case "fiance":       return people.find((x) => x.id === msg.recipientPersonId)?.fullName ?? "Fiancé(e)"
    case "both_fiances": return "Les deux fiancés"
    case "all_guests":   return "Tous les invités"
    case "other":        return msg.recipientLabel ?? "Autre"
    default:             return ""
  }
}

// ── Panneau gauche — liste ─────────────────────────────────────────────────────

function MessageListItem({
  msg, guests, people, selected, onClick,
}: {
  msg: RosMessage; guests: Guest[]; people: Person[]
  selected: boolean; onClick: () => void
}) {
  const recipient = recipientSummary(msg, guests, people)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
        selected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/50 border border-transparent"
      )}
    >
      {msg.subject && (
        <p className="text-sm font-medium truncate">{msg.subject}</p>
      )}
      <p className={cn("text-sm truncate", msg.subject ? "text-muted-foreground" : "font-medium")}>
        {msg.content}
      </p>
      {recipient && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">→ {recipient}</p>
      )}
    </button>
  )
}

// ── Panneau droit — formulaire ─────────────────────────────────────────────────

function MessageForm({
  editing,
  steps,
  guests,
  people,
  allMessages,
  onSaved,
  onDeleted,
}: {
  editing: RosMessage | null
  steps: RunOfShowStep[]
  guests: Guest[]
  people: Person[]
  allMessages: RosMessage[]
  onSaved: (msg: RosMessage) => void
  onDeleted: () => void
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const create = useCreateRosMessage()
  const update = useUpdateRosMessage()
  const remove = useDeleteRosMessage()

  useEffect(() => {
    setForm(editing ? msgToForm(editing) : emptyForm())
    setConfirmDelete(false)
  }, [editing])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }
  function changeDelivererType(v: string) {
    setForm((prev) => ({ ...prev, delivererType: v as RosDelivererType | "", delivererGuestId: "", delivererPersonId: "" }))
  }
  function changeRecipientType(v: string) {
    setForm((prev) => ({ ...prev, recipientType: v as RosRecipientType, recipientGuestId: "", recipientPersonId: "", recipientLabel: "" }))
  }

  const { prep, program } = splitRunOfShowSteps(steps)
  const sortedSteps = [...prep, ...program]
  const assignableGuests = guests.filter((g) => g.assignable)
  const canSubmit = form.content.trim().length > 0 && form.stepId !== ""
  const isPending = create.isPending || update.isPending || remove.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const patch: RosMessagePatch = {
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
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch })
      toast.success("Message mis à jour.")
      onSaved({ ...editing, ...patch } as RosMessage)
    } else {
      const input: RosMessageInput = {
        stepId: form.stepId,
        sortOrder: allMessages.filter((m) => m.stepId === form.stepId).length,
        subject: patch.subject,
        content: form.content.trim(),
        scheduledTime: patch.scheduledTime,
        deliveryMode: patch.deliveryMode,
        delivererType: patch.delivererType,
        delivererGuestId: patch.delivererGuestId,
        delivererPersonId: patch.delivererPersonId,
        recipientType: patch.recipientType,
        recipientGuestId: patch.recipientGuestId,
        recipientPersonId: patch.recipientPersonId,
        recipientLabel: patch.recipientLabel,
      }
      const created = await create.mutateAsync(input)
      toast.success("Message créé.")
      onSaved(created)
    }
  }

  async function handleDelete() {
    if (!editing) return
    await remove.mutateAsync(editing.id)
    toast.success("Message supprimé.")
    onDeleted()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <h3 className="font-semibold text-base">
          {editing ? (editing.subject ?? "Modifier le message") : "Nouveau message"}
        </h3>
        {editing && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Supprimer ?</span>
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>Confirmer</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
            </Button>
          )
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel>Étape du déroulé *</FieldLabel>
            <Select
              value={form.stepId || "__none__"}
              onValueChange={(v) => set("stepId", v === "__none__" ? "" : v)}
              disabled={!!editing}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Associer à une étape…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Choisir une étape</SelectItem>
                {sortedSteps.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.timeLabel} · {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="msg-subject">Objet</FieldLabel>
            <Input id="msg-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Ex. Rappel DJ" />
          </Field>

          <Field>
            <FieldLabel htmlFor="msg-time">Heure prévue</FieldLabel>
            <Input id="msg-time" type="time" value={form.scheduledTime} onChange={(e) => set("scheduledTime", e.target.value)} className="w-36" />
          </Field>

          <Field>
            <FieldLabel>Mode de transmission</FieldLabel>
            <div className="flex gap-2">
              {([
                { value: "", label: "Non précisé" },
                { value: "micro", label: "Au micro", Icon: Mic },
                { value: "discret", label: "Discrètement", Icon: EarOff },
              ] as const).map((opt) => {
                const Icon = "Icon" in opt ? opt.Icon : null
                const active = form.deliveryMode === opt.value
                return (
                  <button key={opt.value} type="button"
                    onClick={() => set("deliveryMode", opt.value as RosDeliveryMode | "")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary font-medium"
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
            <FieldLabel htmlFor="msg-content">Contenu *</FieldLabel>
            <textarea
              id="msg-content"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={4}
              required
              placeholder="Texte du message à transmettre…"
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </Field>

          <Field>
            <FieldLabel>Qui délivre</FieldLabel>
            <Select value={form.delivererType || "__none__"} onValueChange={(v) => changeDelivererType(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Non assigné</SelectItem>
                <SelectItem value="both_fiances">Les deux fiancés</SelectItem>
                <SelectItem value="fiance">Un des fiancés</SelectItem>
                <SelectItem value="guest">Invité assignable</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.delivererType === "fiance" && (
            <Field>
              <FieldLabel>Fiancé(e)</FieldLabel>
              <Select value={form.delivererPersonId || "__none__"} onValueChange={(v) => set("delivererPersonId", v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.delivererType === "guest" && (
            <Field>
              <FieldLabel>Invité</FieldLabel>
              <Select value={form.delivererGuestId || "__none__"} onValueChange={(v) => set("delivererGuestId", v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner un bénévole…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {assignableGuests.map((g) => <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field>
            <FieldLabel>Destinataire</FieldLabel>
            <Select value={form.recipientType || "__none__"} onValueChange={(v) => changeRecipientType(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Qui doit recevoir le message ?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Non précisé</SelectItem>
                {RECIPIENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {form.recipientType === "guest" && (
            <Field>
              <FieldLabel>Invité destinataire</FieldLabel>
              <Select value={form.recipientGuestId || "__none__"} onValueChange={(v) => set("recipientGuestId", v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un invité…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Non précisé</SelectItem>
                  {guests.map((g) => <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.recipientType === "fiance" && (
            <Field>
              <FieldLabel>Fiancé(e) destinataire</FieldLabel>
              <Select value={form.recipientPersonId || "__none__"} onValueChange={(v) => set("recipientPersonId", v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Non précisé</SelectItem>
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.recipientType === "other" && (
            <Field>
              <FieldLabel htmlFor="msg-recipient-label">Préciser</FieldLabel>
              <div className="space-y-2">
                <Input id="msg-recipient-label" value={form.recipientLabel}
                  onChange={(e) => set("recipientLabel", e.target.value)}
                  placeholder="Ex. Traiteur, DJ, Photographe…" />
                <div className="flex flex-wrap gap-1.5">
                  {OTHER_PRESETS.map((p) => (
                    <button key={p} type="button" onClick={() => set("recipientLabel", p)}
                      className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                        form.recipientLabel === p
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          )}
        </FieldGroup>
      </div>

      <div className="px-6 py-4 border-t shrink-0">
        <Button type="submit" disabled={isPending || !canSubmit} className="w-full">
          {editing ? "Enregistrer les modifications" : "Créer le message"}
        </Button>
      </div>
    </form>
  )
}

// ── Page principale (split-panel) ──────────────────────────────────────────────

type Selection = { kind: "new" } | { kind: "edit"; msg: RosMessage }

export function RosMessagesTab() {
  const [selection, setSelection] = useState<Selection | null>(null)

  const { data: messages = [], isLoading: msgLoading } = useRosMessages()
  const { data: steps = [], isLoading: stepsLoading } = useRunOfShow()
  const { data: guests = [], isLoading: guestsLoading } = useGuests()
  const { data: people = [], isLoading: peopleLoading } = usePeople()

  const isLoading = msgLoading || stepsLoading || guestsLoading || peopleLoading

  const stepsById = new Map(steps.map((s) => [s.id, s]))

  // Grouper les messages par étape, dans l'ordre chrono
  const { prep, program } = splitRunOfShowSteps(steps)
  const sortedSteps = [...prep, ...program]
  const messagesByStep = sortedSteps
    .map((step) => ({
      step,
      messages: messages
        .filter((m) => m.stepId === step.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((g) => g.messages.length > 0)

  // Messages sans étape connue
  const orphans = messages.filter((m) => !stepsById.has(m.stepId))

  const editingMsg = selection?.kind === "edit" ? selection.msg : null
  const selectedId = editingMsg?.id ?? null

  function handleSaved(msg: RosMessage) {
    setSelection({ kind: "edit", msg })
  }

  function handleDeleted() {
    setSelection(null)
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] gap-0">
        <div className="w-72 border-r space-y-2 p-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-2xl overflow-hidden">
      {/* ── Panneau gauche ── */}
      <div className="w-72 shrink-0 border-r flex flex-col">
        <div className="p-3 border-b shrink-0">
          <Button size="sm" className="w-full" onClick={() => setSelection({ kind: "new" })}>
            <Plus className="size-4 mr-1.5" />
            Nouveau message
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {messagesByStep.length === 0 && orphans.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucun message</p>
          ) : (
            <>
              {messagesByStep.map(({ step, messages: msgs }) => (
                <div key={step.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                    {step.timeLabel} · {step.label}
                  </p>
                  <div className="space-y-0.5">
                    {msgs.map((msg) => (
                      <MessageListItem
                        key={msg.id}
                        msg={msg}
                        guests={guests}
                        people={people}
                        selected={msg.id === selectedId}
                        onClick={() => setSelection({ kind: "edit", msg })}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {orphans.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                    Sans étape
                  </p>
                  <div className="space-y-0.5">
                    {orphans.map((msg) => (
                      <MessageListItem
                        key={msg.id}
                        msg={msg}
                        guests={guests}
                        people={people}
                        selected={msg.id === selectedId}
                        onClick={() => setSelection({ kind: "edit", msg })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="flex-1 overflow-hidden">
        {selection ? (
          <MessageForm
            key={selection.kind === "edit" ? selection.msg.id : "new"}
            editing={editingMsg}
            steps={steps}
            guests={guests}
            people={people}
            allMessages={messages}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={MessageSquare}
              title="Sélectionnez un message"
              description="Choisissez un message dans la liste ou créez-en un nouveau."
            />
          </div>
        )}
      </div>
    </div>
  )
}
