import { useState } from "react"
import { CalendarClock, Plus, Scissors, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreateTasks, useDeleteTask, useUpdateTasks } from "@/hooks/queries/use-sprints"
import { cn } from "@/lib/utils"
import type { Sprint, SprintTask, TaskPatch, TaskPoints, TaskStatus } from "@/services/supabase/sprints"
import type { Pole } from "@/types/domain"
import { overflowWarning, useTaskStatus } from "./actions"
import {
  MAX_POINTS, POINTS, STATUSES, deadlineState, ownerInitials, ownerLabel, pointsLabel, shortDay, sprintBlock as blockOf, sprintable, tooBig,
  type Fiance,
} from "./lib"

export const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm"

// ── Petites pastilles ─────────────────────────────────────────────────────────

export function PointsChip({ points, className }: { points: TaskPoints | null; className?: string }) {
  return (
    <span title={points == null ? "Pas encore estimée" : points > MAX_POINTS ? "Trop grosse : à découper" : `${points} point${points > 1 ? "s" : ""}`}
      className={cn("inline-flex h-5 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        points == null ? "border border-dashed text-muted-foreground"
          : points > MAX_POINTS ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            : "bg-primary/10 text-primary", className)}>
      {pointsLabel(points)}
    </span>
  )
}

export function OwnerChip({ owner, fiances }: { owner: string | null; fiances: Fiance[] }) {
  if (!owner) return null
  return (
    <span title={ownerLabel(owner, fiances)}
      className="inline-flex h-5 shrink-0 items-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
      {ownerInitials(owner, fiances)}
    </span>
  )
}

export function DeadlineChip({ task }: { task: Pick<SprintTask, "deadline" | "status"> }) {
  const state = deadlineState(task)
  if (!state || !task.deadline) return null
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 text-[11px]",
      state === "late" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        : state === "soon" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "text-muted-foreground")}>
      <CalendarClock className="size-3" aria-hidden />{shortDay(task.deadline)}
    </span>
  )
}

/** Jauge « points engagés / capacité » d'une personne. */
export function Gauge({ name, used, capacity }: { name: string; used: number; capacity: number }) {
  const ratio = capacity > 0 ? used / capacity : used > 0 ? 2 : 0
  const tone = ratio > 1 ? "bg-rose-500" : ratio > 0.85 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{name}</span>
        <span className={cn("tabular-nums", ratio > 1 && "font-semibold text-rose-600")}>{used} / {capacity} pts</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
    </div>
  )
}

/** Contenu d'une carte de tâche (tableau, listes). */
export function TaskLine({ task, fiances, poles }: { task: SprintTask; fiances: Fiance[]; poles: Pole[] }) {
  const pole = poles.find((p) => p.id === task.poleId)
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-sm leading-snug">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1">
        <PointsChip points={task.points} />
        <OwnerChip owner={task.owner} fiances={fiances} />
        {pole && <span className="truncate text-[11px] text-muted-foreground">{pole.name}</span>}
        <DeadlineChip task={task} />
        {task.carryCount > 0 && (
          <span title="Nombre de reports d'une semaine à l'autre" className="text-[11px] text-amber-700 dark:text-amber-400">
            reportée {task.carryCount}×
          </span>
        )}
      </div>
      {task.status === "blocked" && task.blockedReason && (
        <p className="text-xs text-rose-700 dark:text-rose-300">Bloquée : {task.blockedReason}</p>
      )}
    </div>
  )
}

// ── Création / modification d'une tâche ──────────────────────────────────────

type Draft = {
  title: string; notes: string; points: TaskPoints | null; owner: string | null; poleId: string | null; deadline: string
  destination: "sprint" | "backlog"; status: TaskStatus; blockedReason: string
}

/**
 * Fiche d'une tâche. Sans `task` : création (destination : cette semaine ou backlog).
 * Une tâche de la semaine doit être estimée et ne pas dépasser 8 points.
 */
export function TaskDialog({ task, open, onClose, fiances, poles, sprint, sprintTasks, me, nextOrder, defaultDestination = "backlog", onSplit }: {
  task: SprintTask | null; open: boolean; onClose: () => void; fiances: Fiance[]; poles: Pole[]
  sprint: Sprint | null; sprintTasks: SprintTask[]; me: string | null; nextOrder: number; defaultDestination?: "sprint" | "backlog"
  onSplit?: (t: SprintTask) => void
}) {
  const create = useCreateTasks()
  const update = useUpdateTasks()
  const remove = useDeleteTask()
  const status = useTaskStatus(me, fiances, sprintTasks)
  const [d, setD] = useState<Draft>(() => ({
    title: task?.title ?? "", notes: task?.notes ?? "", points: task?.points ?? null, owner: task?.owner ?? me,
    poleId: task?.poleId ?? null, deadline: task?.deadline ?? "",
    destination: task ? (task.sprintId ? "sprint" : "backlog") : sprint ? defaultDestination : "backlog",
    status: task?.status ?? "todo", blockedReason: task?.blockedReason ?? "",
  }))
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const inSprint = d.destination === "sprint"
  const sprintBlock = inSprint ? blockOf(d) : null
  // Ajout ou changement dans la semaine qui fait dépasser la capacité de quelqu'un : prévenir (sans bloquer).
  const overflow = inSprint && sprint && !sprintBlock
    ? overflowWarning({ id: task?.id ?? "", points: d.points, owner: d.owner }, sprintTasks, sprint.capacity, fiances) : null

  function save() {
    const title = d.title.trim()
    if (!title) return toast.error("Donne un titre à la tâche.")
    if (sprintBlock) return toast.error(sprintBlock)
    const base: TaskPatch = {
      title, notes: d.notes.trim() || null, points: d.points, owner: d.owner, poleId: d.poleId, deadline: d.deadline || null,
      sprintId: inSprint && sprint ? sprint.id : null,
    }
    if (!task) {
      create.mutate([{ ...base, title, status: "todo", sortOrder: nextOrder }], {
        onSuccess: () => { toast.success(inSprint ? "Ajoutée à la semaine" : "Ajoutée au backlog"); onClose() },
        onError: () => toast.error("Création impossible (migration 0187 exécutée ?)"),
      })
      return
    }
    // Changement de statut (règle de validation), puis le reste.
    let patch: TaskPatch = base
    const movingOut = task.sprintId && !inSprint
    if (movingOut) patch = { ...patch, status: "todo", blockedReason: null, submittedBy: null }
    else if (d.status !== task.status || (d.status === "blocked" && d.blockedReason !== (task.blockedReason ?? ""))) {
      const no = status.refusal(task, d.status)
      if (no) return toast.error(no)
      patch = { ...patch, ...status.patchFor(task, d.status, d.blockedReason.trim() || null) }
    }
    update.mutate([{ id: task.id, patch }], {
      onSuccess: onClose,
      onError: () => toast.error("Enregistrement impossible. Réessaie dans un instant."),
    })
  }

  function destroy() {
    if (!task || !confirm(`Supprimer « ${task.title} » ?`)) return
    remove.mutate(task.id, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{task ? "Tâche" : "Nouvelle tâche"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input autoFocus={!task} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex. Réserver le traiteur"
            aria-label="Titre" onKeyDown={(e) => { if (e.key === "Enter") save() }} />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Points</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Points">
              {POINTS.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={d.points === p} onClick={() => set({ points: d.points === p ? null : p })}
                  className={cn("h-8 min-w-10 rounded-full border px-2.5 text-sm tabular-nums transition-colors",
                    d.points === p ? (p > MAX_POINTS ? "border-rose-500 bg-rose-500 text-white" : "border-primary bg-primary text-primary-foreground")
                      : "hover:border-foreground/30")}>
                  {pointsLabel(p)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">1 ≈ une petite heure · 8 ≈ une grosse demi-journée · 13+ : trop gros, à découper.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">Porteur
              <select value={d.owner ?? ""} onChange={(e) => set({ owner: e.target.value || null })} className={selectClass}>
                <option value="">Personne</option>
                {fiances.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                <option value="both">À deux</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">Pôle
              <select value={d.poleId ?? ""} onChange={(e) => set({ poleId: e.target.value || null })} className={selectClass}>
                <option value="">Aucun</option>
                {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">Date limite
              <div className="flex gap-1">
                <Input type="date" value={d.deadline} onChange={(e) => set({ deadline: e.target.value })} className="h-9" />
                {d.deadline && <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => set({ deadline: "" })} aria-label="Retirer la date"><X className="size-4" /></Button>}
              </div>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">Où
              <select value={d.destination} onChange={(e) => set({ destination: e.target.value as Draft["destination"] })} className={selectClass}
                disabled={!sprint}>
                <option value="sprint">Cette semaine</option>
                <option value="backlog">Backlog (un prochain point hebdo)</option>
              </select>
            </label>
          </div>
          {sprintBlock && <p className="text-xs text-rose-600">{sprintBlock}</p>}
          {overflow && <p className="text-xs text-amber-700 dark:text-amber-400">Attention : {overflow}. Il faudra sans doute retirer autre chose.</p>}

          {task && inSprint && task.sprintId && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Statut</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button key={s.id} type="button" onClick={() => set({ status: s.id })} aria-pressed={d.status === s.id}
                    className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
                      d.status === s.id ? "border-foreground bg-foreground text-background" : "hover:border-foreground/30")}>
                    <span className={cn("size-2 rounded-full", s.dot)} />{s.label}
                  </button>
                ))}
              </div>
              {d.status === "blocked" && (
                <Input value={d.blockedReason} onChange={(e) => set({ blockedReason: e.target.value })} placeholder="Qu'est-ce qui bloque ?" />
              )}
              {d.status !== task.status && status.refusal(task, d.status) && (
                <p className="text-xs text-rose-600">{status.refusal(task, d.status)}</p>
              )}
            </div>
          )}

          <Textarea value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Notes (facultatif)" rows={3} />
          {task?.parentTitle && <p className="text-xs text-muted-foreground">Découpée depuis « {task.parentTitle} »</p>}
        </div>
        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between">
          {task ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={destroy} className="text-destructive"><Trash2 className="size-4" />Supprimer</Button>
              {onSplit && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { onClose(); onSplit(task) }}><Scissors className="size-4" />Découper</Button>
              )}
            </div>
          ) : <span />}
          <Button type="button" onClick={save} disabled={create.isPending || update.isPending}>{task ? "Enregistrer" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Découpage ─────────────────────────────────────────────────────────────────

/**
 * Découpe une tâche en plusieurs plus petites ; l'originale est supprimée. Une tâche de la semaine peut garder
 * ses sous-tâches dans la semaine (celles qui sont estimées), les autres vont dans le backlog.
 */
export function SplitDialog({ task, onClose }: { task: SprintTask; onClose: () => void }) {
  const create = useCreateTasks()
  const remove = useDeleteTask()
  const [keep, setKeep] = useState(!!task.sprintId)
  const [parts, setParts] = useState<{ title: string; points: TaskPoints | null }[]>([{ title: "", points: null }, { title: "", points: null }])
  const setPart = (i: number, patch: Partial<(typeof parts)[number]>) => setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const filled = parts.filter((p) => p.title.trim())

  function save() {
    if (filled.length < 2) return toast.error("Indique au moins deux sous-tâches.")
    if (filled.some((p) => tooBig(p))) return toast.error("Une sous-tâche dépasse encore 8 points.")
    create.mutate(filled.map((p, i) => ({
      title: p.title.trim(), points: p.points, owner: task.owner, poleId: task.poleId, deadline: task.deadline, notes: task.notes,
      sprintId: keep && sprintable({ points: p.points, owner: task.owner }) ? task.sprintId : null,
      status: "todo" as const, sortOrder: task.sortOrder + i / 100, parentTitle: task.title,
    })), {
      onSuccess: () => remove.mutate(task.id, { onSuccess: () => { toast.success(`Découpée en ${filled.length} tâches`); onClose() } }),
      onError: () => toast.error("Découpage impossible. Réessaie dans un instant."),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Découper « {task.title} »</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Les sous-tâches gardent le même porteur, pôle et date limite.</p>
        {task.sprintId && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            Garder dans la semaine (celles qui sont estimées ; les autres vont dans le backlog)
          </label>
        )}
        <div className="space-y-3">
          {parts.map((p, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border p-2.5">
              <Input value={p.title} onChange={(e) => setPart(i, { title: e.target.value })} placeholder={`Sous-tâche ${i + 1}`} autoFocus={i === 0} />
              <div className="flex flex-wrap gap-1">
                {POINTS.filter((x) => x <= MAX_POINTS).map((x) => (
                  <button key={x} type="button" onClick={() => setPart(i, { points: p.points === x ? null : x })} aria-pressed={p.points === x}
                    className={cn("h-7 min-w-9 rounded-full border px-2 text-xs tabular-nums",
                      p.points === x ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground/30")}>{x}</button>
                ))}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setParts((ps) => [...ps, { title: "", points: null }])}>
            <Plus className="size-4" />Une sous-tâche de plus
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" onClick={save} disabled={create.isPending || remove.isPending}>Découper</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
