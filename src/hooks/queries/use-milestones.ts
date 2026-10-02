import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { milestonesService } from "@/services/supabase/milestones"
import type { Milestone } from "@/types/domain"

const KEY = ["milestones"] as const

export function useMilestones() {
  return useQuery({ queryKey: KEY, queryFn: () => milestonesService.list() })
}

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Milestone, "id">) => milestonesService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Milestone, "id">> }) =>
      milestonesService.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const previous = qc.getQueryData<Milestone[]>(KEY)
      qc.setQueryData<Milestone[]>(KEY, (cur) => (cur ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)))
      return { previous }
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(KEY, ctx.previous) },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => milestonesService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      // Les items rattachés perdent leur jalon.
      qc.invalidateQueries({ queryKey: ["checklist-items"] })
    },
  })
}

/** Renumérote les jalons (J1, J2…) selon l'ordre donné. */
export function useReorderMilestones() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ordered: Milestone[]) =>
      Promise.all(ordered.map((m, i) => milestonesService.update(m.id, { sortOrder: i + 1 }))),
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: KEY })
      const previous = qc.getQueryData<Milestone[]>(KEY)
      qc.setQueryData<Milestone[]>(KEY, ordered.map((m, i) => ({ ...m, sortOrder: i + 1 })))
      return { previous }
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(KEY, ctx.previous) },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
