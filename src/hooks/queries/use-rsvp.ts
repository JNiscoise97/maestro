import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { rsvpService, type PartyMember } from "@/services/rsvp.service"

export function useRsvpResponses() {
  return useQuery({
    queryKey: ["rsvp-responses"],
    queryFn: () => rsvpService.list(),
  })
}

export function useMarkRsvpProcessed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, processed }: { id: string; processed: boolean }) =>
      rsvpService.markProcessed(id, processed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rsvp-responses"] }),
  })
}

/** Rattache (guestId) ou détache (null) une personne d'une réponse à un invité de la liste. */
export function useLinkPartyMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ responseId, party, index, guestId }: { responseId: string; party: PartyMember[]; index: number; guestId: string | null }) =>
      rsvpService.updateParty(responseId, party.map((m, i) => (i === index ? { ...m, guestId } : m))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rsvp-responses"] }),
  })
}

export function useResetRsvp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rsvpService.reset(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rsvp-responses"] }),
  })
}
