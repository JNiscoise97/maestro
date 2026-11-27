import { toast } from "sonner"

import { useUpdateTasks } from "@/hooks/queries/use-sprints"
import type { SprintTask, TaskPatch, TaskStatus } from "@/services/supabase/sprints"
import { WIP_LIMIT, carries, loadOf, type Fiance } from "./lib"

/** Statut suivant proposé par le bouton rapide (téléphone), ou null. */
export const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: "in_progress", in_progress: "review", discuss: "in_progress", blocked: "in_progress", review: "done",
}

/**
 * Changement de statut et ses règles :
 *   · « Terminée » seulement depuis « À valider », et par l'autre fiancé que celui qui l'a soumise
 *     (il faut être connecté avec son propre compte pour valider) ;
 *   · au plus WIP_LIMIT tâches « En cours » par personne : finir avant de commencer.
 * `sprintTasks` : les tâches de la semaine (pour la limite).
 */
export function useTaskStatus(me: string | null, fiances: Fiance[], sprintTasks: SprintTask[]) {
  const update = useUpdateTasks()

  /** Message si le passage est refusé, sinon null. */
  function refusal(t: SprintTask, to: TaskStatus): string | null {
    if (to === t.status) return null
    if (to === "done") {
      if (t.status !== "review") return "Passe d'abord la tâche en « À valider » : l'autre la validera."
      if (!me) return "Connecte-toi avec ton propre compte pour valider."
      if (t.submittedBy === me) {
        const other = fiances.find((f) => f.id !== me)?.name ?? "l'autre"
        return `C'est à ${other} de valider cette tâche.`
      }
    }
    if (to === "in_progress") {
      const people = t.owner === "both" ? fiances.map((f) => f.id) : t.owner ? [t.owner] : []
      const busy = people.filter((id) => sprintTasks.filter((x) => x.id !== t.id && x.status === "in_progress" && carries(x, id)).length >= WIP_LIMIT)
      if (busy.length) {
        const names = busy.map((id) => fiances.find((f) => f.id === id)?.name ?? "").join(" et ")
        return `${names} a déjà ${WIP_LIMIT} tâches en cours : termine ou mets-en une en pause d'abord.`
      }
    }
    return null
  }

  function patchFor(t: SprintTask, to: TaskStatus, blockedReason?: string | null): TaskPatch {
    const patch: TaskPatch = { status: to }
    if (to === "review") patch.submittedBy = me
    if (to === "done") { patch.doneAt = new Date().toISOString(); patch.validatedBy = me }
    if (t.status === "done" && to !== "done") { patch.doneAt = null; patch.validatedBy = null }
    if (to === "blocked") patch.blockedReason = blockedReason ?? t.blockedReason
    else if (t.status === "blocked") patch.blockedReason = null
    return patch
  }

  function setStatus(t: SprintTask, to: TaskStatus, blockedReason?: string | null): boolean {
    if (t.status === to && blockedReason === undefined) return true
    const no = refusal(t, to)
    if (no) { toast.error(no); return false }
    update.mutate([{ id: t.id, patch: patchFor(t, to, blockedReason) }], {
      onError: () => toast.error("Enregistrement impossible. Réessaie dans un instant."),
    })
    return true
  }

  return { setStatus, refusal, patchFor }
}

/**
 * Avertissement si ajouter cette tâche à la semaine fait dépasser la capacité de quelqu'un
 * (« Sarah passe à 18 / 15 pts »), sinon null. Ne bloque pas : c'est un choix conscient.
 */
export function overflowWarning(task: Pick<SprintTask, "id" | "points" | "owner">, sprintTasks: SprintTask[],
  capacity: Record<string, number>, fiances: Fiance[]): string | null {
  const others = sprintTasks.filter((t) => t.id !== task.id)
  const over = fiances
    .filter((f) => carries(task as SprintTask, f.id))
    .map((f) => ({ f, after: loadOf(others, f.id) + (task.points ?? 0), cap: capacity[f.id] ?? 0 }))
    .filter((x) => x.after > x.cap)
  if (!over.length) return null
  return over.map((x) => `${x.f.name} passe à ${x.after} / ${x.cap} pts`).join(" · ")
}
