import { useMemo, useState } from "react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowRight, GripVertical, Scissors, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useUpdateTasks } from "@/hooks/queries/use-sprints"
import { cn } from "@/lib/utils"
import type { Sprint, SprintTask } from "@/services/supabase/sprints"
import type { Pole } from "@/types/domain"
import { overflowWarning } from "./actions"
import { TaskLine, selectClass } from "./components"
import { carries, daysUntil, deadlineState, loadOf, sprintBlock, sprintable, tooBig, type Fiance } from "./lib"

/**
 * Backlog : toutes les tâches hors sprint, dans l'ordre choisi (glisser pour réordonner).
 * En haut : ce qui reste à faire comparé aux semaines restantes avant le mariage.
 */
export function Backlog({ backlog, openSprintTasks, sprint, fiances, poles, weddingDay, onOpen, onSplit }: {
  backlog: SprintTask[]; openSprintTasks: SprintTask[]; sprint: Sprint | null; fiances: Fiance[]; poles: Pole[]
  weddingDay: string; onOpen: (t: SprintTask) => void; onSplit: (t: SprintTask) => void
}) {
  const update = useUpdateTasks()
  const [pole, setPole] = useState("all")
  const [owner, setOwner] = useState("all")
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const sorted = useMemo(() => [...backlog].sort((a, b) => a.sortOrder - b.sortOrder), [backlog])
  const filtered = sorted.filter((t) =>
    (pole === "all" || (pole === "none" ? !t.poleId : t.poleId === pole)) &&
    (owner === "all" || (owner === "none" ? !t.owner : carries(t, owner))))
  const filtering = pole !== "all" || owner !== "all"

  // Bilan jusqu'au mariage.
  // Par personne : une tâche « à deux » compte pour chacun, comme dans les jauges (même mesure que la capacité).
  const open = [...backlog, ...openSprintTasks]
  const remaining = open.reduce((n, t) => n + (t.points ?? 0), 0)
  const unestimated = backlog.filter((t) => t.points == null).length
  const unowned = open.filter((t) => !t.owner).reduce((n, t) => n + (t.points ?? 0), 0)
  const toSplit = backlog.filter(tooBig).length
  const weeks = Math.max(1, Math.ceil(daysUntil(weddingDay) / 7))
  const pace = fiances.map((f) => {
    const perWeek = Math.ceil(loadOf(open, f.id) / weeks)
    const cap = sprint?.capacity[f.id]
    return { f, perWeek, cap, over: cap != null && perWeek > cap }
  })
  const urgent = backlog.filter((t) => deadlineState(t) === "late" || deadlineState(t) === "soon")

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const from = sorted.findIndex((t) => t.id === e.active.id)
    const to = sorted.findIndex((t) => t.id === e.over!.id)
    const moved = arrayMove(sorted, from, to)
    const changes = moved.filter((t, i) => t.sortOrder !== i).map((t) => ({ id: t.id, patch: { sortOrder: moved.indexOf(t) } }))
    update.mutate(changes)
  }

  function toSprint(t: SprintTask) {
    if (!sprint) return
    const block = sprintBlock(t)
    if (block) return toast.error(block)
    const over = overflowWarning(t, openSprintTasks, sprint.capacity, fiances)
    update.mutate([{ id: t.id, patch: { sprintId: sprint.id, status: "todo" } }], {
      onSuccess: () => (over ? toast.warning(`Ajoutée à la semaine. Attention : ${over}.`) : toast.success("Ajoutée à la semaine")),
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Points restants" value={String(remaining)} sub={`backlog + semaine en cours${unestimated ? ` · ${unestimated} tâche${unestimated > 1 ? "s" : ""} sans points` : ""}`} />
        <Stat label="Semaines avant le mariage" value={String(weeks)} />
        <Stat label="Rythme nécessaire par semaine" value={pace.map((p) => `${p.f.name} ${p.perWeek}`).join(" · ")}
          sub={[
            sprint ? `capacité actuelle : ${pace.map((p) => `${p.f.name} ${p.cap ?? 0}`).join(" · ")}` : null,
            unowned ? `+ ${unowned} pts sans porteur` : null,
          ].filter(Boolean).join(" · ") || undefined}
          tone={pace.some((p) => p.over) || unowned > 0 ? "warn" : undefined} />
      </div>

      {(urgent.length > 0 || toSplit > 0) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {urgent.length > 0 && <span>{urgent.length} tâche{urgent.length > 1 ? "s" : ""} avec une date limite proche ou dépassée</span>}
          {toSplit > 0 && <span>{toSplit} tâche{toSplit > 1 ? "s" : ""} à découper</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={pole} onChange={(e) => setPole(e.target.value)} className={cn(selectClass, "w-auto")} aria-label="Pôle">
          <option value="all">Tous les pôles</option>
          {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="none">Sans pôle</option>
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={cn(selectClass, "w-auto")} aria-label="Porteur">
          <option value="all">Tout le monde</option>
          {fiances.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          <option value="none">Sans porteur</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          {backlog.length ? "Aucune tâche pour ce filtre." : "Le backlog est vide. Ajoute ce qui te passe par la tête avec « Tâche »."}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ol className="divide-y overflow-hidden rounded-xl border bg-card">
              {filtered.map((t) => (
                <Row key={t.id} task={t} draggable={!filtering} onOpen={() => onOpen(t)}>
                  <TaskLine task={t} fiances={fiances} poles={poles} />
                  <div className="flex shrink-0 items-center gap-1">
                    {tooBig(t) && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onSplit(t) }}>
                        <Scissors className="size-3.5" />Découper
                      </Button>
                    )}
                    {sprint && sprintable(t) && (
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" title="Ajouter à la semaine en cours"
                        onClick={(e) => { e.stopPropagation(); toSprint(t) }}>
                        Semaine<ArrowRight className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </Row>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {filtering && filtered.length > 0 && <p className="text-xs text-muted-foreground">Retire les filtres pour réordonner le backlog.</p>}
    </div>
  )
}

function Row({ task, draggable, onOpen, children }: { task: SprintTask; draggable: boolean; onOpen: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: !draggable })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 bg-card px-2 py-2.5 sm:px-3", isDragging && "relative z-10 shadow-lg")}>
      {draggable && (
        <button type="button" {...attributes} {...listeners} aria-label="Déplacer" className="cursor-grab touch-none p-1 text-muted-foreground active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
      )}
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen() }}
        className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center justify-between gap-2">
        {children}
      </div>
    </li>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", tone === "warn" && "border-amber-400")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "warn" && "text-amber-700 dark:text-amber-400")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
