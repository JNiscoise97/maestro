import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { guestCheckinsService } from "@/services/supabase/guest-checkins"

const baseKey = (sequenceId: string) => ["guest-checkins", sequenceId]

export function useGuestCheckins(sequenceId: string | null) {
  return useQuery({
    queryKey: sequenceId ? baseKey(sequenceId) : ["guest-checkins", "__none__"],
    queryFn: () => guestCheckinsService.listBySequence(sequenceId!),
    enabled: !!sequenceId,
  })
}

export function useCheckInForSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceId }: { guestId: string; sequenceId: string }) =>
      guestCheckinsService.checkIn(guestId, sequenceId),
    onSuccess: (_data, { sequenceId }) =>
      qc.invalidateQueries({ queryKey: baseKey(sequenceId) }),
  })
}

export function useUndoCheckinForSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceId }: { guestId: string; sequenceId: string }) =>
      guestCheckinsService.undo(guestId, sequenceId),
    onSuccess: (_data, { sequenceId }) =>
      qc.invalidateQueries({ queryKey: baseKey(sequenceId) }),
  })
}
