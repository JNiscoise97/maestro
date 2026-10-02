import { useMemo, useState } from "react"
import { GripVertical, Plus, Trash2, TriangleAlert } from "lucide-react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { Milestone } from "@/types/domain"
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useReorderMilestones,
} from "@/hooks/queries/use-milestones"
import { useAllChecklistItems } from "@/hooks/queries/use-checklists"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toIso } from "@/lib/retroplanning"

type MilestonePatch = Partial<Pick<Milestone, "name" | "description" | "targetDate">>

// ── Ligne ─────────────────────────────────────────────────────────────────────

function MilestoneRow({ milestone, number, itemCount, outOfOrder, onPatch, onDelete }: {
  milestone: Milestone
  /** Numéro affiché (J1, J2…) = position dans la liste. */
  number: number
  itemCount: number
  /** Date antérieure à celle du jalon précédent. */
  outOfOrder: boolean
  onPatch: (id: string, patch: MilestonePatch) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const [confirming, setConfirming] = useState(false)

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
      <button type="button" {...attributes} {...listeners}
        className="mt-1.5 cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
        aria-label="Déplacer le jalon"
      >
        <GripVertical className="size-4" />
      </button>

      <span className="mt-1 w-9 shrink-0 font-heading text-lg font-semibold tabular-nums text-dore">J{number}</span>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            defaultValue={milestone.name}
            placeholder="Nom du jalon"
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== milestone.name) onPatch(milestone.id, { name: v })
            }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground">Échéance</span>
            <input
              type="date"
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={milestone.targetDate}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== milestone.targetDate) onPatch(milestone.id, { targetDate: e.target.value })
              }}
            />
          </div>
        </div>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          defaultValue={milestone.description ?? ""}
          placeholder="Description : ce qui doit être acquis à cette date (optionnel)"
          onBlur={(e) => {
            const v = e.target.value.trim() || null
            if (v !== (milestone.description ?? null)) onPatch(milestone.id, { description: v })
          }}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{itemCount} item{itemCount > 1 ? "s" : ""} rattaché{itemCount > 1 ? "s" : ""}</span>
          {outOfOrder && (
            <span className="inline-flex items-center gap-1 text-corail">
              <TriangleAlert className="size-3" /> Échéance antérieure à celle du jalon précédent
            </span>
          )}
        </div>
      </div>

      {confirming ? (
        <div className="flex flex-col items-end gap-1">
          {itemCount > 0 && (
            <p className="max-w-40 text-right text-[10px] text-muted-foreground">
              {itemCount} item{itemCount > 1 ? "s perdront" : " perdra"} ce jalon (dates conservées).
            </p>
          )}
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>Annuler</Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => { onDelete(milestone.id); setConfirming(false) }}>
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-1.5 text-muted-foreground/50 hover:text-destructive transition-colors"
          title="Supprimer le jalon"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  )
}

// ── Manager ───────────────────────────────────────────────────────────────────

export function MilestonesManager() {
  const { data: milestones = [], isLoading, isError } = useMilestones()
  const { data: items = [] } = useAllChecklistItems()
  const create = useCreateMilestone()
  const update = useUpdateMilestone()
  const del = useDeleteMilestone()
  const reorder = useReorderMilestones()

  const sorted = useMemo(() => [...milestones].sort((a, b) => a.sortOrder - b.sortOrder), [milestones])
  const countById = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) if (i.milestoneId) map.set(i.milestoneId, (map.get(i.milestoneId) ?? 0) + 1)
    return map
  }, [items])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sorted.findIndex((m) => m.id === active.id)
    const newIdx = sorted.findIndex((m) => m.id === over.id)
    reorder.mutate(arrayMove(sorted, oldIdx, newIdx))
  }

  function handleAdd() {
    const last = sorted[sorted.length - 1]
    create.mutate({
      name: "Nouveau jalon",
      description: null,
      targetDate: last?.targetDate ?? toIso(new Date()),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Les jalons ne sont pas disponibles pour cet événement (table des jalons absente).
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Les jalons structurent le rétroplanning : chaque item de préparation y est rattaché, avec ses dates
        (début idéal, cible, limite). Le numéro (J1, J2…) suit l'ordre de la liste : glissez un jalon pour le déplacer.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map((m, i) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                number={i + 1}
                itemCount={countById.get(m.id) ?? 0}
                outOfOrder={i > 0 && m.targetDate < sorted[i - 1].targetDate}
                onPatch={(id, patch) => update.mutate({ id, patch })}
                onDelete={(id) => del.mutate(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sorted.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun jalon défini.</p>
      )}

      <Button variant="outline" size="sm" onClick={handleAdd} disabled={create.isPending}>
        <Plus className="size-4" /> Ajouter un jalon
      </Button>
    </div>
  )
}
