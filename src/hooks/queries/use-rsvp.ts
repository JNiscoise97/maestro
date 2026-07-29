import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { rsvpService } from "@/services/rsvp.service"

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

export function useResetRsvp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rsvpService.reset(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rsvp-responses"] }),
  })
}
