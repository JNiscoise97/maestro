import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { eventSequencesService } from "@/services/supabase/event-sequences"
import type { EventSequence } from "@/types/domain"

const KEY = ["event-sequences"]

export function useEventSequences() {
  return useQuery({ queryKey: KEY, queryFn: () => eventSequencesService.list() })
}

export function useCreateEventSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof eventSequencesService.create>[0]) =>
      eventSequencesService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateEventSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof eventSequencesService.update>[1] }) =>
      eventSequencesService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteEventSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventSequencesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReorderEventSequences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ordered: EventSequence[]) => {
      await Promise.all(
        ordered.map((s, i) => eventSequencesService.update(s.id, { sortOrder: i }))
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
