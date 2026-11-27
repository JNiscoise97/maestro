import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { sprintsService, type SprintTask, type TaskPatch } from "@/services/supabase/sprints"

const SPRINTS_KEY = ["sprints"] as const
const TASKS_KEY = ["sprint-tasks"] as const

export function useSprints() {
  return useQuery({ queryKey: SPRINTS_KEY, queryFn: () => sprintsService.listSprints() })
}

export function useSprintTasks() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: () => sprintsService.listTasks() })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: SPRINTS_KEY }), qc.invalidateQueries({ queryKey: TASKS_KEY })])
}

export function useCreateTasks() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: sprintsService.createTasks, onSuccess: invalidate })
}

/** Mise à jour d'une ou plusieurs tâches, affichée tout de suite (annulée en cas d'erreur). */
export function useUpdateTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (changes: { id: string; patch: TaskPatch }[]) =>
      changes.length === 1 ? sprintsService.updateTask(changes[0].id, changes[0].patch) : sprintsService.updateTasks(changes),
    onMutate: async (changes) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY })
      const previous = qc.getQueryData<SprintTask[]>(TASKS_KEY)
      const byId = new Map(changes.map((c) => [c.id, c.patch]))
      qc.setQueryData<SprintTask[]>(TASKS_KEY, (list) => list?.map((t) => (byId.has(t.id) ? { ...t, ...byId.get(t.id) } : t)))
      return { previous }
    },
    onError: (_e, _c, ctx) => { if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous) },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: sprintsService.deleteTask, onSuccess: invalidate })
}

/** Point hebdo : lancement de la semaine suivante (tout ou rien). Recharge aussi en cas d'échec (fait ailleurs ?). */
export function useLaunchSprint() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: sprintsService.launchSprint, onSettled: invalidate })
}

export function useUpdateSprint() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof sprintsService.updateSprint>[1] }) => sprintsService.updateSprint(id, patch),
    onSuccess: invalidate,
  })
}
