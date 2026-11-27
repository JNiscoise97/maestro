import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = () => supabase! as any

/** Statuts d'une tâche pendant le sprint. */
export type TaskStatus = "todo" | "in_progress" | "discuss" | "review" | "done" | "blocked"
/** Points Fibonacci ; 13 = trop gros, à découper. */
export type TaskPoints = 1 | 2 | 3 | 5 | 8 | 13

export interface Sprint {
  id: string
  startDate: string
  endDate: string
  /** Capacité par fiancé (id de la personne → points). */
  capacity: Record<string, number>
  closedAt: string | null
  createdAt: string
}

export interface SprintTask {
  id: string
  title: string
  notes: string | null
  points: TaskPoints | null
  /** Id d'un fiancé, ou "both" (à deux). */
  owner: string | null
  poleId: string | null
  deadline: string | null
  status: TaskStatus
  sortOrder: number
  /** null = backlog. */
  sprintId: string | null
  blockedReason: string | null
  carryCount: number
  parentTitle: string | null
  submittedBy: string | null
  validatedBy: string | null
  doneAt: string | null
  createdAt: string
}

type SprintRow = { id: string; start_date: string; end_date: string; capacity: Record<string, number> | null; closed_at: string | null; created_at: string }
type TaskRow = {
  id: string; title: string; notes: string | null; points: TaskPoints | null; owner: string | null; pole_id: string | null
  deadline: string | null; status: TaskStatus; sort_order: number; sprint_id: string | null; blocked_reason: string | null
  carry_count: number; parent_title: string | null; submitted_by: string | null; validated_by: string | null
  done_at: string | null; created_at: string
}

const toSprint = (r: SprintRow): Sprint => ({
  id: r.id, startDate: r.start_date, endDate: r.end_date, capacity: r.capacity ?? {}, closedAt: r.closed_at, createdAt: r.created_at,
})
const toTask = (r: TaskRow): SprintTask => ({
  id: r.id, title: r.title, notes: r.notes, points: r.points, owner: r.owner, poleId: r.pole_id, deadline: r.deadline,
  status: r.status, sortOrder: r.sort_order, sprintId: r.sprint_id, blockedReason: r.blocked_reason, carryCount: r.carry_count,
  parentTitle: r.parent_title, submittedBy: r.submitted_by, validatedBy: r.validated_by, doneAt: r.done_at, createdAt: r.created_at,
})

const TASK_COLUMNS: Record<keyof Omit<SprintTask, "id" | "createdAt">, string> = {
  title: "title", notes: "notes", points: "points", owner: "owner", poleId: "pole_id", deadline: "deadline", status: "status",
  sortOrder: "sort_order", sprintId: "sprint_id", blockedReason: "blocked_reason", carryCount: "carry_count",
  parentTitle: "parent_title", submittedBy: "submitted_by", validatedBy: "validated_by", doneAt: "done_at",
}
export type TaskPatch = Partial<Omit<SprintTask, "id" | "createdAt">>

function toRow(patch: TaskPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) row[TASK_COLUMNS[k as keyof typeof TASK_COLUMNS]] = v
  return row
}

export const sprintsService = {
  async listSprints(): Promise<Sprint[]> {
    const { data, error } = await db().from(tbl("sprints")).select("*").order("start_date")
    if (error) throw error
    return ((data ?? []) as SprintRow[]).map(toSprint)
  },

  async createSprint(s: { startDate: string; endDate: string; capacity: Record<string, number> }): Promise<Sprint> {
    const { data, error } = await db().from(tbl("sprints"))
      .insert({ start_date: s.startDate, end_date: s.endDate, capacity: s.capacity }).select("*").single()
    if (error) throw error
    return toSprint(data as SprintRow)
  },

  async updateSprint(id: string, patch: Partial<{ startDate: string; endDate: string; capacity: Record<string, number>; closedAt: string | null }>): Promise<void> {
    const row: Record<string, unknown> = {}
    if (patch.startDate !== undefined) row.start_date = patch.startDate
    if (patch.endDate !== undefined) row.end_date = patch.endDate
    if (patch.capacity !== undefined) row.capacity = patch.capacity
    if (patch.closedAt !== undefined) row.closed_at = patch.closedAt
    const { error } = await db().from(tbl("sprints")).update(row).eq("id", id)
    if (error) throw error
  },

  /**
   * Point hebdo : clôture la semaine en cours, crée la suivante et déplace les tâches, en une seule opération
   * (fonction 0188, tout ou rien). Erreur « sprint_already_closed » / « sprint_already_open » si le point hebdo
   * vient d'être fait ailleurs.
   */
  async launchSprint(a: {
    currentId: string | null; startDate: string; endDate: string; capacity: Record<string, number>
    carry: string[]; toBacklog: string[]; picked: string[]
  }): Promise<string> {
    const { data, error } = await db().rpc(tbl("sprint_launch"), {
      p_current: a.currentId, p_start: a.startDate, p_end: a.endDate, p_capacity: a.capacity,
      p_carry: a.carry, p_to_backlog: a.toBacklog, p_picked: a.picked,
    })
    if (error) throw error
    return data as string
  },

  async listTasks(): Promise<SprintTask[]> {
    const { data, error } = await db().from(tbl("sprint_tasks")).select("*").order("sort_order").range(0, 4999)
    if (error) throw error
    return ((data ?? []) as TaskRow[]).map(toTask)
  },

  async createTasks(tasks: (TaskPatch & { title: string })[]): Promise<void> {
    if (!tasks.length) return
    const { error } = await db().from(tbl("sprint_tasks")).insert(tasks.map(toRow))
    if (error) throw error
  },

  async updateTask(id: string, patch: TaskPatch): Promise<void> {
    const { error } = await db().from(tbl("sprint_tasks")).update({ ...toRow(patch), updated_at: new Date().toISOString() }).eq("id", id)
    if (error) throw error
  },

  /** Plusieurs mises à jour (report de fin de sprint, réordonnancement…). */
  async updateTasks(changes: { id: string; patch: TaskPatch }[]): Promise<void> {
    const results = await Promise.all(changes.map(({ id, patch }) =>
      db().from(tbl("sprint_tasks")).update({ ...toRow(patch), updated_at: new Date().toISOString() }).eq("id", id)))
    const failed = results.find((r: { error: unknown }) => r.error)
    if (failed) throw failed.error
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await db().from(tbl("sprint_tasks")).delete().eq("id", id)
    if (error) throw error
  },
}
