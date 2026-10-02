import { useEffect, useMemo, useState } from "react"
import { Calendar, GripVertical, Pencil, RefreshCw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  useAllChecklists,
  useAllChecklistItems,
  useDeleteChecklist,
  useDeleteChecklistItem,
  useReorderChecklistItems,
} from "@/hooks/queries/use-checklists"
import { useUpdateMission, useDeleteMission } from "@/hooks/queries/use-missions"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { SequenceName } from "@/components/shared/SequenceName"
import { useMissionSequences, useSetMissionSequences } from "@/hooks/queries/use-mission-sequences"
import type { Checklist, ChecklistItem, Mission, MissionSchedulingType, ProgressStatus } from "@/types/domain"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { ChecklistDialog } from "@/components/parametres/ChecklistDialog"
import { ChecklistItemDialog } from "@/components/parametres/ChecklistItemDialog"

const STATUS_OPTIONS: { value: ProgressStatus; label: string }[] = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminée" },
  { value: "blocked", label: "Bloquée" },
]

/** Bouton suppression à deux temps : clic → révèle "Confirmer" + Annuler sans ouvrir de dialog imbriqué. */
function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Annuler"
          onClick={() => setConfirming(false)}
        >
          <X className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => {
            onConfirm()
            setConfirming(false)
          }}
        >
          Confirmer
        </Button>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function SortableChecklistItem({
  item,
  checklistId,
  onDelete,
}: {
  item: ChecklistItem
  checklistId: string
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="Déplacer l'item"
      >
        <GripVertical className="size-3.5" />
      </button>
      <p className="flex-1 text-xs text-foreground">{item.label}</p>
      <StatusBadge status={item.status} />
      <PriorityBadge priority={item.priority} />
      <ChecklistItemDialog item={item} checklistId={checklistId} />
      <DeleteButton label="Supprimer l'item" onConfirm={onDelete} />
    </div>
  )
}

function ChecklistSection({
  checklists,
  itemsByChecklistId,
  missionId,
  onDeleteChecklist,
  onDeleteItem,
  onReorderItems,
}: {
  checklists: Checklist[]
  itemsByChecklistId: Map<string, ChecklistItem[]>
  missionId: string
  onDeleteChecklist: (id: string) => void
  onDeleteItem: (id: string) => void
  onReorderItems: (items: ChecklistItem[]) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Checklists</h3>
        <ChecklistDialog ownerType="mission" ownerId={missionId} />
      </div>

      {checklists.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Aucune checklist. Cliquez sur + pour en ajouter une.
        </p>
      ) : (
        <div className="space-y-3">
          {checklists.map((checklist) => {
            const checklistItems = itemsByChecklistId.get(checklist.id) ?? []

            function handleDragEnd(event: DragEndEvent) {
              const { active, over } = event
              if (!over || active.id === over.id) return
              const oldIdx = checklistItems.findIndex((i) => i.id === active.id)
              const newIdx = checklistItems.findIndex((i) => i.id === over.id)
              const reordered = arrayMove(checklistItems, oldIdx, newIdx).map((item, idx) => ({
                ...item,
                sortOrder: idx,
              }))
              onReorderItems(reordered)
            }

            return (
              <div key={checklist.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1.5">
                  <p className="flex-1 text-sm font-medium text-foreground">
                    {checklist.title ?? (
                      <span className="italic text-muted-foreground">Sans titre</span>
                    )}
                  </p>
                  <ChecklistItemDialog checklistId={checklist.id} />
                  <ChecklistDialog checklist={checklist} />
                  <DeleteButton
                    label="Supprimer la checklist"
                    onConfirm={() => onDeleteChecklist(checklist.id)}
                  />
                </div>

                {checklistItems.length > 0 ? (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={checklistItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
                        {checklistItems.map((item) => (
                          <SortableChecklistItem
                            key={item.id}
                            item={item}
                            checklistId={checklist.id}
                            onDelete={() => onDeleteItem(item.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucun item. Cliquez sur + pour en ajouter.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SCHEDULING_OPTIONS: { value: MissionSchedulingType; label: string; description: string }[] = [
  { value: "planifiee", label: "Planifiée", description: "Apparaît dans le timing à un moment précis" },
  { value: "en_continu", label: "En continu", description: "Se déroule tout au long de l'événement" },
]

export function MissionEditDialog({ mission }: { mission: Mission }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(mission.title)
  const [description, setDescription] = useState(mission.description ?? "")
  const [prerequisites, setPrerequisites] = useState(mission.prerequisites ?? "")
  const [status, setStatus] = useState<ProgressStatus>(mission.status)
  const [schedulingType, setSchedulingType] = useState<MissionSchedulingType | null>(mission.schedulingType ?? null)
  const [scheduledStartDate, setScheduledStartDate] = useState(mission.scheduledStartDate ?? "")
  const [scheduledStartTime, setScheduledStartTime] = useState(mission.scheduledStartTime ?? "")
  const [scheduledEndDate, setScheduledEndDate] = useState(mission.scheduledEndDate ?? "")
  const [scheduledEndTime, setScheduledEndTime] = useState(mission.scheduledEndTime ?? "")

  const [selectedSequenceIds, setSelectedSequenceIds] = useState<string[]>([])

  const { data: allChecklists } = useAllChecklists()
  const { data: allItems } = useAllChecklistItems()
  const { data: availableSequences } = useEventSequences()
  const { data: currentSequenceIds } = useMissionSequences(mission.id, open)
  const updateMission = useUpdateMission()
  const deleteMission = useDeleteMission()
  const deleteChecklist = useDeleteChecklist()
  const deleteItem = useDeleteChecklistItem()
  const reorderItems = useReorderChecklistItems()
  const setMissionSequences = useSetMissionSequences()

  useEffect(() => {
    if (!open) return
    setTitle(mission.title)
    setDescription(mission.description ?? "")
    setPrerequisites(mission.prerequisites ?? "")
    setStatus(mission.status)
    setSchedulingType(mission.schedulingType ?? null)
    setScheduledStartDate(mission.scheduledStartDate ?? "")
    setScheduledStartTime(mission.scheduledStartTime ?? "")
    setScheduledEndDate(mission.scheduledEndDate ?? "")
    setScheduledEndTime(mission.scheduledEndTime ?? "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setSelectedSequenceIds(currentSequenceIds ?? [])
  }, [currentSequenceIds])

  const missionChecklists = useMemo(
    () =>
      (allChecklists ?? []).filter(
        (c) => c.ownerType === "mission" && c.ownerId === mission.id
      ),
    [allChecklists, mission.id]
  )

  const itemsByChecklistId = useMemo(() => {
    const ids = new Set(missionChecklists.map((c) => c.id))
    const map = new Map<string, ChecklistItem[]>()
    for (const item of allItems ?? []) {
      if (!ids.has(item.checklistId)) continue
      const list = map.get(item.checklistId) ?? []
      list.push(item)
      map.set(item.checklistId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder)
    return map
  }, [allItems, missionChecklists])

  async function handleSave() {
    if (!title.trim()) return
    await updateMission.mutateAsync({
      id: mission.id,
      patch: {
        title: title.trim(),
        description: description.trim() || null,
        prerequisites: prerequisites.trim() || null,
        status,
        schedulingType: schedulingType ?? null,
        scheduledStartDate: schedulingType === "planifiee" ? (scheduledStartDate || null) : null,
        scheduledStartTime: schedulingType === "planifiee" ? (scheduledStartTime || null) : null,
        scheduledEndDate:   schedulingType === "planifiee" ? (scheduledEndDate || null) : null,
        scheduledEndTime:   schedulingType === "planifiee" ? (scheduledEndTime || null) : null,
      },
    })
    await setMissionSequences.mutateAsync({ missionId: mission.id, sequenceIds: selectedSequenceIds }).catch(() => {})
    toast.success("Mission mise à jour.")
  }

  function toggleSequence(id: string) {
    setSelectedSequenceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  async function handleDeleteMission() {
    await deleteMission.mutateAsync(mission.id)
    toast.success("Mission supprimée.")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Modifier la mission">
              <Pencil className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Modifier la mission</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{mission.title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
          {/* Champs mission */}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="med-title">Titre</FieldLabel>
              <Input
                id="med-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="med-description">Description</FieldLabel>
              <Textarea
                id="med-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="med-prerequisites">Prérequis</FieldLabel>
              <Textarea
                id="med-prerequisites"
                rows={3}
                placeholder="Ex. Avoir le permis, être disponible la veille…"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Statut</FieldLabel>
              <Select value={status} onValueChange={(v: ProgressStatus) => setStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Planification dans le timing</FieldLabel>
              <div className="flex gap-2">
                {SCHEDULING_OPTIONS.map((opt) => {
                  const active = schedulingType === opt.value
                  const Icon = opt.value === "planifiee" ? Calendar : RefreshCw
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setSchedulingType(active ? null : opt.value)}
                      className={cn(
                        "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors text-left",
                        active
                          ? "border-bordeaux/40 bg-bordeaux/10 text-bordeaux font-medium"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}>
                      <Icon className="size-3.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold">{opt.label}</p>
                        <p className="text-[10px] opacity-70">{opt.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Field>

            {schedulingType === "planifiee" && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 space-y-3 dark:border-indigo-800 dark:bg-indigo-950/30">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Période planifiée
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="med-start-date">Début — date</FieldLabel>
                    <Input
                      id="med-start-date"
                      type="date"
                      value={scheduledStartDate}
                      onChange={(e) => setScheduledStartDate(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="med-start-time">Début — heure</FieldLabel>
                    <Input
                      id="med-start-time"
                      type="time"
                      value={scheduledStartTime}
                      onChange={(e) => setScheduledStartTime(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="med-end-date">Fin — date</FieldLabel>
                    <Input
                      id="med-end-date"
                      type="date"
                      value={scheduledEndDate}
                      onChange={(e) => setScheduledEndDate(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="med-end-time">Fin — heure</FieldLabel>
                    <Input
                      id="med-end-time"
                      type="time"
                      value={scheduledEndTime}
                      onChange={(e) => setScheduledEndTime(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}
          </FieldGroup>

          {(availableSequences ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Séquences</p>
              <div className="space-y-1.5">
                {(availableSequences ?? []).map((seq) => (
                  <label
                    key={seq.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={selectedSequenceIds.includes(seq.id)}
                      onCheckedChange={() => toggleSequence(seq.id)}
                    />
                    <SequenceName sequence={seq} />
                    {seq.eventDate && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(seq.eventDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              onClick={handleSave}
              disabled={!title.trim() || updateMission.isPending}
            >
              Enregistrer la mission
            </Button>
            <DeleteButton label="Supprimer la mission" onConfirm={handleDeleteMission} />
          </div>

          <div className="border-t border-border" />

          <ChecklistSection
            checklists={missionChecklists}
            itemsByChecklistId={itemsByChecklistId}
            missionId={mission.id}
            onDeleteChecklist={(id) => {
              deleteChecklist.mutate(id)
              toast.success("Checklist supprimée.")
            }}
            onDeleteItem={(id) => {
              deleteItem.mutate(id)
              toast.success("Item supprimé.")
            }}
            onReorderItems={(items) => reorderItems.mutate(items)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
