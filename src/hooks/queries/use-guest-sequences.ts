import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { guestSequencesService } from "@/services/supabase/guest-sequences"

const KEY = ["guest-sequences"]

export function useGuestSequences() {
  return useQuery({ queryKey: KEY, queryFn: () => guestSequencesService.listByGuest() })
}

export function useAssignGuestToSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceId }: { guestId: string; sequenceId: string }) =>
      guestSequencesService.assign(guestId, sequenceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUnassignGuestFromSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceId }: { guestId: string; sequenceId: string }) =>
      guestSequencesService.unassign(guestId, sequenceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSetGuestSequences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceIds }: { guestId: string; sequenceIds: string[] }) =>
      guestSequencesService.setForGuest(guestId, sequenceIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
