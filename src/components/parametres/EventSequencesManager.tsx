import { useState } from "react"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { EventSequence } from "@/types/domain"
import {
  useEventSequences,
  useCreateEventSequence,
  useUpdateEventSequence,
  useDeleteEventSequence,
  useReorderEventSequences,
} from "@/hooks/queries/use-event-sequences"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// ── Ligne tri ──────────────────────────────────────────────────────────────────

interface RowProps {
  seq: EventSequence
  onDelete: (id: string) => void
  onPatch: (id: string, patch: Partial<Pick<EventSequence, "name" | "eventDate" | "startTime" | "endDate" | "endTime" | "description">>) => void
}

function SequenceRow({ seq, onDelete, onPatch }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: seq.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-xl border border-border bg-card p-3"
    >
      <button type="button" {...attributes} {...listeners} className="mt-1 cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
        <GripVertical className="size-4" />
      </button>

      <div className="flex-1 space-y-2">
        {/* Ligne 1 : Nom */}
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
          defaultValue={seq.name}
          placeholder="Nom de la séquence"
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== seq.name) onPatch(seq.id, { name: v })
          }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
        />
        {/* Ligne 2 : Date début · Heure début → Date fin · Heure fin */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground px-0.5">Date début</p>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={seq.eventDate ?? ""}
              onBlur={(e) => onPatch(seq.id, { eventDate: e.target.value || null })}
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground px-0.5">Heure début</p>
            <input
              type="time"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={seq.startTime ?? ""}
              onBlur={(e) => onPatch(seq.id, { startTime: e.target.value || null })}
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground px-0.5">Date fin</p>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={seq.endDate ?? ""}
              onBlur={(e) => onPatch(seq.id, { endDate: e.target.value || null })}
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground px-0.5">Heure fin</p>
            <input
              type="time"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={seq.endTime ?? ""}
              onBlur={(e) => onPatch(seq.id, { endTime: e.target.value || null })}
            />
          </div>
        </div>
        {/* Description */}
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring text-muted-foreground"
          defaultValue={seq.description ?? ""}
          placeholder="Description (optionnel)"
          onBlur={(e) => onPatch(seq.id, { description: e.target.value.trim() || null })}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
        />
      </div>

      <button
        type="button"
        onClick={() => onDelete(seq.id)}
        className="mt-1 text-muted-foreground/50 hover:text-destructive transition-colors"
        title="Supprimer"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

// ── Manager principal ──────────────────────────────────────────────────────────

export function EventSequencesManager() {
  const { data: sequences = [], isLoading } = useEventSequences()
  const create = useCreateEventSequence()
  const update = useUpdateEventSequence()
  const del = useDeleteEventSequence()
  const reorder = useReorderEventSequences()

  const [items, setItems] = useState<EventSequence[]>([])
  const sorted = items.length > 0 ? items : [...sequences].sort((a, b) => a.sortOrder - b.sortOrder)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sorted.findIndex((s) => s.id === active.id)
    const newIdx = sorted.findIndex((s) => s.id === over.id)
    const next = arrayMove(sorted, oldIdx, newIdx)
    setItems(next)
    reorder.mutate(next)
  }

  function handlePatch(id: string, patch: Partial<Pick<EventSequence, "name" | "eventDate" | "startTime" | "endDate" | "endTime" | "description">>) {
    update.mutate({ id, patch })
  }

  function handleDelete(id: string) {
    del.mutate(id)
    setItems((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleAdd() {
    await create.mutateAsync({
      name: "Nouvelle séquence",
      sortOrder: sorted.length,
    })
    setItems([])
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Définissez les moments de votre événement. Les invités pourront être assignés à chaque séquence, et le pointage / plan de table sera scopé.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map((seq) => (
              <SequenceRow key={seq.id} seq={seq} onDelete={handleDelete} onPatch={handlePatch} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sorted.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucune séquence définie.</p>
      )}

      <Button variant="outline" size="sm" onClick={handleAdd} disabled={create.isPending}>
        <Plus className="size-4" /> Ajouter une séquence
      </Button>
    </div>
  )
}
