import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sequenceStepsService } from "@/services/supabase/sequence-steps"
import type { SequenceStep } from "@/types/domain"

function key(sequenceId: string) {
  return ["sequence-steps", sequenceId]
}

export function useSequenceSteps(sequenceId: string, enabled = true) {
  return useQuery({
    queryKey: key(sequenceId),
    queryFn: () => sequenceStepsService.list(sequenceId),
    enabled: enabled && !!sequenceId,
  })
}

export function useCreateSequenceStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof sequenceStepsService.create>[0]) =>
      sequenceStepsService.create(payload),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: key(vars.sequenceId) }),
  })
}

export function useUpdateSequenceStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sequenceId, patch }: { id: string; sequenceId: string; patch: Parameters<typeof sequenceStepsService.update>[1] }) =>
      sequenceStepsService.update(id, patch),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: key(vars.sequenceId) }),
  })
}

export function useDeleteSequenceStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sequenceId }: { id: string; sequenceId: string }) =>
      sequenceStepsService.delete(id),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: key(vars.sequenceId) }),
  })
}

export function useReorderSequenceSteps() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sequenceId, steps }: { sequenceId: string; steps: SequenceStep[] }) =>
      sequenceStepsService.reorder(steps.map((s) => ({ id: s.id, sortOrder: s.sortOrder }))),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: key(vars.sequenceId) }),
  })
}
