import { useState } from "react"
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"

import { cn } from "@/lib/utils"
import type { Sprint, SprintTask, TaskStatus } from "@/services/supabase/sprints"
import type { Pole } from "@/types/domain"
import { NEXT_STATUS, useTaskStatus } from "./actions"
import { Gauge, TaskLine } from "./components"
import { STATUSES, STATUS_LABEL, WIP_LIMIT, loadOf, type Fiance } from "./lib"

/**
 * Tableau de la semaine. Ordinateur : six colonnes, glisser une carte change son statut.
 * Téléphone : une liste par statut (seules les colonnes non vides), toucher une carte l'ouvre.
 */
export function SprintBoard({ sprint, tasks, fiances, poles, me, onOpen }: {
  sprint: Sprint; tasks: SprintTask[]; fiances: Fiance[]; poles: Pole[]; me: string | null
  onOpen: (t: SprintTask) => void
}) {
  const status = useTaskStatus(me, fiances, tasks)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [showDone, setShowDone] = useState(true)
  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s).sort((a, b) => a.sortOrder - b.sortOrder)
  const done = tasks.filter((t) => t.status === "done")
  const total = tasks.reduce((n, t) => n + (t.points ?? 0), 0)
  const donePts = done.reduce((n, t) => n + (t.points ?? 0), 0)

  function onDragEnd(e: DragEndEvent) {
    const t = tasks.find((x) => x.id === e.active.id)
    const to = e.over?.id as TaskStatus | undefined
    if (t && to && to !== t.status) {
      if (to === "blocked") { status.setStatus(t, "blocked"); onOpen({ ...t, status: "blocked" }) }
      else status.setStatus(t, to)
    }
  }

  return (
    <div className="space-y-5">
      {/* Capacité de chacun et avancement de la semaine */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          {fiances.map((f) => (
            <Gauge key={f.id} name={f.name} used={loadOf(tasks, f.id)} capacity={sprint.capacity[f.id] ?? 0} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {donePts} / {total} points terminés · {done.length} / {tasks.length} tâches. Une tâche « à deux » compte pour chacun.
          Au plus {WIP_LIMIT} tâches en cours par personne : finir avant de commencer.
        </p>
      </div>

      {tasks.length === 0 && (
        <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Rien dans cette semaine. Ajoute une tâche ou passe par le point hebdo.</p>
      )}

      {/* Téléphone : listes par statut */}
      <div className="space-y-4 md:hidden">
        {STATUSES.filter((s) => byStatus(s.id).length > 0).map((s) => (
          <section key={s.id} className="space-y-2">
            <button type="button" onClick={() => s.id === "done" && setShowDone((v) => !v)}
              className="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={cn("size-2 rounded-full", s.dot)} />{s.label} ({byStatus(s.id).length})
              {s.id === "done" && <span className="ml-auto font-normal normal-case">{showDone ? "Masquer" : "Afficher"}</span>}
            </button>
            {(s.id !== "done" || showDone) && (
              <div className="space-y-2">
                {byStatus(s.id).map((t) => {
                  const nextStatus = NEXT_STATUS[t.status]
                  return (
                    <div key={t.id} className={cn("flex items-center gap-2 rounded-lg border bg-card p-3", s.id === "done" && "opacity-60")}>
                      <button type="button" onClick={() => onOpen(t)} className="min-w-0 flex-1 text-left">
                        <TaskLine task={t} fiances={fiances} poles={poles} />
                      </button>
                      {/* Un toucher pour avancer : À faire → En cours → À valider → Terminée. */}
                      {nextStatus && (
                        <button type="button" onClick={() => status.setStatus(t, nextStatus)}
                          className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium hover:border-primary">
                          {STATUS_LABEL[nextStatus]} →
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Ordinateur : colonnes avec glisser-déposer */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">
          {STATUSES.map((s) => (
            <Column key={s.id} id={s.id} label={s.label} dot={s.dot} tint={s.tint} count={byStatus(s.id).length}>
              {byStatus(s.id).map((t) => (
                <Card key={t.id} task={t} onOpen={() => onOpen(t)} faded={s.id === "done"}>
                  <TaskLine task={t} fiances={fiances} poles={poles} />
                </Card>
              ))}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  )
}

function Column({ id, label, dot, tint, count, children }: {
  id: TaskStatus; label: string; dot: string; tint: string; count: number; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn("flex min-h-40 flex-col gap-2 rounded-xl border p-2 transition-colors", tint, isOver && "ring-2 ring-primary/40")}>
      <p className="flex items-center gap-2 px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className={cn("size-2 rounded-full", dot)} />{label}<span className="ml-auto font-normal tabular-nums">{count}</span>
      </p>
      {children}
    </div>
  )
}

function Card({ task, onOpen, faded, children }: { task: SprintTask; onOpen: () => void; faded?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} onClick={onOpen}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("cursor-grab touch-none rounded-lg border bg-card p-2.5 shadow-xs active:cursor-grabbing",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/40", faded && !isDragging && "opacity-60")}>
      {children}
    </div>
  )
}
