import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CortegeConfig } from "@/services/supabase/cortege"
import { cortegeService } from "@/services/supabase/cortege"

const configKey  = (seqId: string) => ["cortege_config",      seqId]
const groupsKey  = (seqId: string) => ["cortege_groups",      seqId]
const assignKey  = (seqId: string) => ["cortege_assignments", seqId]

// ── Config ──

export function useCortegeConfig(sequenceId: string | null) {
  return useQuery({
    queryKey: configKey(sequenceId ?? ""),
    queryFn:  () => cortegeService.getConfig(sequenceId!),
    enabled:  !!sequenceId,
  })
}

export function useSaveCortegeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sequenceId, config }: { sequenceId: string; config: CortegeConfig }) =>
      cortegeService.saveConfig(sequenceId, config),
    onSuccess: (_, { sequenceId }) => qc.invalidateQueries({ queryKey: configKey(sequenceId) }),
  })
}

// ── Groupes ──

export function useCortegeGroups(sequenceId: string | null) {
  return useQuery({
    queryKey: groupsKey(sequenceId ?? ""),
    queryFn:  () => cortegeService.listGroups(sequenceId!),
    enabled:  !!sequenceId,
  })
}

export function useCreateCortegeGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sequenceId, label, sortOrder }: { sequenceId: string; label: string; sortOrder: number }) =>
      cortegeService.createGroup(sequenceId, label, sortOrder),
    onSuccess: (_, { sequenceId }) => qc.invalidateQueries({ queryKey: groupsKey(sequenceId) }),
  })
}

export function useUpdateCortegeGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id, sequenceId, patch,
    }: { id: string; sequenceId: string; patch: Parameters<typeof cortegeService.updateGroup>[1] }) =>
      cortegeService.updateGroup(id, patch),
    onSuccess: (_, { sequenceId }) => qc.invalidateQueries({ queryKey: groupsKey(sequenceId) }),
  })
}

export function useDeleteCortegeGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; sequenceId: string }) => cortegeService.deleteGroup(id),
    onSuccess: (_, { sequenceId }) => qc.invalidateQueries({ queryKey: groupsKey(sequenceId) }),
  })
}

export function useCortegeConfiguredSequenceIds() {
  return useQuery({
    queryKey: ["cortege_configured_sequences"],
    queryFn:  () => cortegeService.listConfiguredSequenceIds(),
  })
}

export function useDuplicateCortegeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      cortegeService.duplicateFrom(sourceId, targetId),
    onSuccess: (_, { targetId }) => {
      qc.invalidateQueries({ queryKey: configKey(targetId) })
      qc.invalidateQueries({ queryKey: groupsKey(targetId) })
    },
  })
}

export function useReorderCortegeGroups() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      groups, sequenceId,
    }: { groups: { id: string; sortOrder: number }[]; sequenceId: string }) =>
      cortegeService.reorderGroups(groups),
    onSuccess: (_, { sequenceId }) => qc.invalidateQueries({ queryKey: groupsKey(sequenceId) }),
  })
}

// ── Assignations ──

export function useCortegeAssignments(sequenceId: string | null) {
  return useQuery({
    queryKey: assignKey(sequenceId ?? ""),
    queryFn:  () => cortegeService.listAssignments(sequenceId!),
    enabled:  !!sequenceId,
  })
}

export function useAssignCortegeGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sequenceId, roleKey, guestId }: { sequenceId: string; roleKey: string; guestId: string }) =>
      cortegeService.assignGuest(sequenceId, roleKey, guestId),
    onSuccess: (_, { sequenceId }) => qc.invalidateQueries({ queryKey: assignKey(sequenceId) }),
  })
}

export function useUnassignCortegeGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sequenceId, roleKey }: { sequenceId: string; roleKey: string }) =>
      cortegeService.unassignGuest(sequenceId, roleKey),
    onSuccess: (_, { sequenceId }) => qc.invalidateQueries({ queryKey: assignKey(sequenceId) }),
  })
}
