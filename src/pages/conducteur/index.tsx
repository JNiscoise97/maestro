import { useState } from "react"
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import {
  useSequenceSteps,
  useCreateSequenceStep,
  useUpdateSequenceStep,
  useDeleteSequenceStep,
} from "@/hooks/queries/use-sequence-steps"
import { usePeople } from "@/hooks/queries/use-people"
import type { EventSequence, SequenceStep } from "@/types/domain"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/shared/PageHeader"
import { SequenceName } from "@/components/shared/SequenceName"

const NONE = "__none__"

function formatTime(t: string | null | undefined) {
  if (!t) return null
  return t.slice(0, 5)
}

function StepForm({
  sequenceId,
  step,
  maxOrder,
  onClose,
}: {
  sequenceId: string
  step?: SequenceStep
  maxOrder: number
  onClose: () => void
}) {
  const [title, setTitle] = useState(step?.title ?? "")
  const [description, setDescription] = useState(step?.description ?? "")
  const [startDate, setStartDate] = useState(step?.startDate ?? "")
  const [startTime, setStartTime] = useState(step?.startTime ?? "")
  const [endDate, setEndDate] = useState(step?.endDate ?? "")
  const [endTime, setEndTime] = useState(step?.endTime ?? "")
  const [responsibleId, setResponsibleId] = useState(step?.responsiblePersonId ?? NONE)

  const { data: people } = usePeople()
  const create = useCreateSequenceStep()
  const update = useUpdateSequenceStep()

  async function handleSubmit() {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      startDate: startDate || null,
      startTime: startTime || null,
      endDate: endDate || null,
      endTime: endTime || null,
      responsiblePersonId: responsibleId === NONE ? null : responsibleId,
    }
    if (step) {
      await update.mutateAsync({ id: step.id, sequenceId, patch: payload })
      toast.success("Étape mise à jour.")
    } else {
      await create.mutateAsync({ sequenceId, sortOrder: maxOrder + 1, ...payload })
      toast.success("Étape ajoutée.")
    }
    onClose()
  }

  const isPending = create.isPending || update.isPending

  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="step-title">Titre</FieldLabel>
          <Input
            id="step-title"
            placeholder="Ex. Discours des parents"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="step-desc">Description</FieldLabel>
          <Textarea
            id="step-desc"
            rows={3}
            placeholder="Détails, notes de régie…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="step-start-date">Début — date</FieldLabel>
            <Input id="step-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="step-start-time">Début — heure</FieldLabel>
            <Input id="step-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="step-end-date">Fin — date</FieldLabel>
            <Input id="step-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="step-end-time">Fin — heure</FieldLabel>
            <Input id="step-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
        <Field>
          <FieldLabel>Responsable</FieldLabel>
          <Select value={responsibleId} onValueChange={setResponsibleId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Non assigné" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Non assigné</SelectItem>
              {(people ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
          {step ? "Enregistrer" : "Ajouter"}
        </Button>
      </DialogFooter>
    </>
  )
}

function StepRow({
  step,
  sequenceId,
  isFirst,
  isLast,
  allSteps,
}: {
  step: SequenceStep
  sequenceId: string
  isFirst: boolean
  isLast: boolean
  allSteps: SequenceStep[]
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const { data: people } = usePeople()
  const del = useDeleteSequenceStep()
  const update = useUpdateSequenceStep()

  const responsible = people?.find((p) => p.id === step.responsiblePersonId)

  async function move(dir: -1 | 1) {
    const idx = allSteps.findIndex((s) => s.id === step.id)
    const sibling = allSteps[idx + dir]
    if (!sibling) return
    await Promise.all([
      update.mutateAsync({ id: step.id, sequenceId, patch: { sortOrder: sibling.sortOrder } }),
      update.mutateAsync({ id: sibling.id, sequenceId, patch: { sortOrder: step.sortOrder } }),
    ])
  }

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex min-w-[64px] flex-col items-end gap-0.5 pt-0.5 text-right">
          {formatTime(step.startTime) && (
            <span className="text-xs font-mono font-semibold text-foreground">
              {formatTime(step.startTime)}
            </span>
          )}
          {formatTime(step.endTime) && (
            <span className="text-xs font-mono text-muted-foreground">
              → {formatTime(step.endTime)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{step.title}</p>
          {step.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
          )}
          {responsible && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{responsible.fullName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Monter"
            disabled={isFirst}
            onClick={() => move(-1)}
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Descendre"
            disabled={isLast}
            onClick={() => move(1)}
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Modifier" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
          </Button>
          {confirming ? (
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon-xs" onClick={() => setConfirming(false)}>
                <X className="size-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await del.mutateAsync({ id: step.id, sequenceId })
                  toast.success("Étape supprimée.")
                  setConfirming(false)
                }}
              >
                Confirmer
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon-xs" aria-label="Supprimer" onClick={() => setConfirming(true)}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Modifier l'étape</DialogTitle>
          </DialogHeader>
          <StepForm
            sequenceId={sequenceId}
            step={step}
            maxOrder={Math.max(...allSteps.map((s) => s.sortOrder))}
            onClose={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function SequencePane({ sequence }: { sequence: EventSequence }) {
  const [adding, setAdding] = useState(false)
  const { data: steps, isLoading } = useSequenceSteps(sequence.id)
  const sorted = [...(steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const maxOrder = sorted.length > 0 ? Math.max(...sorted.map((s) => s.sortOrder)) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            <SequenceName sequence={sequence} dotClassName="size-2.5" />
          </h2>
          {sequence.eventDate && (
            <p className="text-xs text-muted-foreground">
              {new Date(sequence.eventDate).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {sequence.startTime && ` · ${formatTime(sequence.startTime)}`}
              {sequence.endTime && ` → ${formatTime(sequence.endTime)}`}
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Ajouter une étape
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune étape. Ajoutez la première pour construire le conducteur.
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              sequenceId={sequence.id}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              allSteps={sorted}
            />
          ))}
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Nouvelle étape</DialogTitle>
          </DialogHeader>
          <StepForm sequenceId={sequence.id} maxOrder={maxOrder} onClose={() => setAdding(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ConducteurPage() {
  const { data: sequences, isLoading } = useEventSequences()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sorted = [...(sequences ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const active = activeId ? sorted.find((s) => s.id === activeId) : sorted[0]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conducteur" subtitle="Déroulé détaillé par séquence" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conducteur" subtitle="Déroulé détaillé par séquence" />
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucune séquence. Créez des séquences dans le Déroulé pour construire le conducteur.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Conducteur" subtitle="Déroulé détaillé par séquence" />

      <div className="flex flex-wrap gap-2">
        {sorted.map((seq) => (
          <button
            key={seq.id}
            type="button"
            onClick={() => setActiveId(seq.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active?.id === seq.id
                ? "border-bordeaux bg-bordeaux text-white"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            <SequenceName sequence={seq} />
          </button>
        ))}
      </div>

      {active && <SequencePane sequence={active} />}
    </div>
  )
}
