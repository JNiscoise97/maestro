import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

import type { Sprint, SprintTask, TaskPoints, TaskStatus } from "@/services/supabase/sprints"
import type { Person } from "@/types/domain"

/** Statuts, dans l'ordre des colonnes du tableau. */
export const STATUSES: { id: TaskStatus; label: string; dot: string; tint: string }[] = [
  { id: "todo", label: "À faire", dot: "bg-slate-400", tint: "bg-slate-500/5" },
  { id: "in_progress", label: "En cours", dot: "bg-sky-500", tint: "bg-sky-500/5" },
  { id: "discuss", label: "À discuter", dot: "bg-violet-500", tint: "bg-violet-500/5" },
  { id: "review", label: "À valider", dot: "bg-amber-500", tint: "bg-amber-500/5" },
  { id: "done", label: "Terminée", dot: "bg-emerald-500", tint: "bg-emerald-500/5" },
  { id: "blocked", label: "Bloquée", dot: "bg-rose-500", tint: "bg-rose-500/5" },
]
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label])) as Record<TaskStatus, string>

/** Points Fibonacci ; au-delà de 8, la tâche est à découper. */
export const POINTS: TaskPoints[] = [1, 2, 3, 5, 8, 13]
export const MAX_POINTS = 8
export const pointsLabel = (p: TaskPoints | null) => (p == null ? "?" : p > MAX_POINTS ? "13+" : String(p))
export const tooBig = (t: Pick<SprintTask, "points">) => (t.points ?? 0) > MAX_POINTS
/** Pourquoi une tâche ne peut pas entrer dans la semaine (estimée, 8 points au plus, un porteur), ou null. */
export function sprintBlock(t: Pick<SprintTask, "points" | "owner">): string | null {
  if (t.points == null) return "Estime d'abord la tâche."
  if (t.points > MAX_POINTS) return "Plus de 8 points : découpe-la d'abord."
  if (!t.owner) return "Choisis qui la porte : elle doit compter dans une jauge."
  return null
}
export const sprintable = (t: Pick<SprintTask, "points" | "owner">) => sprintBlock(t) === null

/** Limite de tâches « En cours » par personne (finir avant de commencer). */
export const WIP_LIMIT = 2

export type Fiance = { id: string; name: string }

/** Les fiancés (comptes administrateurs actifs), avec leur prénom. */
export function fiancesOf(people: Person[]): Fiance[] {
  return people
    .filter((p) => p.role === "admin" && p.isActive)
    .map((p) => ({ id: p.id, name: p.nickname?.trim() || p.fullName.split(" ")[0] }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

export function ownerLabel(owner: string | null, fiances: Fiance[]): string {
  if (owner === "both") return "À deux"
  return fiances.find((f) => f.id === owner)?.name ?? "Personne"
}
export function ownerInitials(owner: string | null, fiances: Fiance[]): string {
  if (owner === "both") return fiances.map((f) => f.name[0]).join("+") || "2"
  return fiances.find((f) => f.id === owner)?.name[0] ?? "?"
}

/** Points d'une tâche portés par une personne (une tâche « à deux » compte pour chacun). */
export const carries = (t: SprintTask, personId: string) => t.owner === personId || t.owner === "both"
export const loadOf = (tasks: SprintTask[], personId: string) =>
  tasks.filter((t) => carries(t, personId)).reduce((n, t) => n + (t.points ?? 0), 0)

/** Moyenne des points terminés par la personne sur ses 3 derniers sprints clôturés (null sans historique). */
export function velocity(personId: string, sprints: Sprint[], tasks: SprintTask[]): number | null {
  const closed = sprints.filter((s) => s.closedAt).slice(-3)
  if (!closed.length) return null
  const total = closed.reduce((n, s) => n + loadOf(tasks.filter((t) => t.sprintId === s.id && t.status === "done"), personId), 0)
  return Math.round(total / closed.length)
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export const iso = (d: Date) => format(d, "yyyy-MM-dd")
export const today = () => iso(new Date())
/** Jeudi de la semaine de travail contenant ce jour (les semaines vont du jeudi au mercredi). */
export function thursdayOnOrBefore(day: string): string {
  const d = parseISO(day)
  return iso(addDays(d, -((d.getDay() - 4 + 7) % 7)))
}
/** Mercredi qui clôt la semaine commencée ce jour (le jour même si c'est un mercredi). */
export function wednesdayOnOrAfter(day: string): string {
  const d = parseISO(day)
  return iso(addDays(d, (3 - d.getDay() + 7) % 7))
}
/** Début proposé pour le premier sprint : jeudi prochain (aujourd'hui si c'est jeudi). */
export function nextThursday(day: string): string {
  const d = parseISO(day)
  return iso(addDays(d, (4 - d.getDay() + 7) % 7))
}
/** Sprint suivant : le lendemain de la fin, ou le jeudi de cette semaine si des semaines ont été sautées. */
export function nextSprintDates(current: Sprint | null, day: string): { startDate: string; endDate: string } {
  const afterEnd = current ? iso(addDays(parseISO(current.endDate), 1)) : nextThursday(day)
  const thisWeek = thursdayOnOrBefore(day)
  const startDate = current && afterEnd < thisWeek ? thisWeek : afterEnd
  return { startDate, endDate: wednesdayOnOrAfter(iso(addDays(parseISO(startDate), 1))) }
}

export const dayLabel = (day: string) => format(parseISO(day), "EEEE d MMMM", { locale: fr })
export const shortDay = (day: string) => format(parseISO(day), "EEE d MMM", { locale: fr })
export const rangeLabel = (s: { startDate: string; endDate: string }) => `du ${dayLabel(s.startDate)} au ${dayLabel(s.endDate)}`
export const daysUntil = (day: string, from = today()) => differenceInCalendarDays(parseISO(day), parseISO(from))

/** Échéance : dépassée, proche (14 jours) ou lointaine. */
export function deadlineState(t: Pick<SprintTask, "deadline" | "status">): "late" | "soon" | "later" | null {
  if (!t.deadline || t.status === "done") return null
  const d = daysUntil(t.deadline)
  return d < 0 ? "late" : d <= 14 ? "soon" : "later"
}
