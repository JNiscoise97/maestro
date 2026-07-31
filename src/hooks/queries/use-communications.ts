import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { communicationsService } from "@/services/supabase/communications"

const COMM_KEY = ["communications"] as const

function sendsKey(commId: string) {
  return ["communication-sends", commId] as const
}

function useInvalidateComms() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: COMM_KEY })
}

export function useCommunications() {
  return useQuery({ queryKey: COMM_KEY, queryFn: () => communicationsService.list() })
}

export function useCreateCommunication() {
  const invalidate = useInvalidateComms()
  return useMutation({
    mutationFn: ({ name, description, targetRsvpStatuses }: { name: string; description: string | null; targetRsvpStatuses?: string[] | null }) =>
      communicationsService.create(name, description, targetRsvpStatuses),
    onSuccess: invalidate,
  })
}

export function useUpdateCommunication() {
  const invalidate = useInvalidateComms()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; description?: string | null; targetRsvpStatuses?: string[] | null } }) =>
      communicationsService.update(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteCommunication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => communicationsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMM_KEY }),
  })
}

export function useCommunicationSends(commId: string | null) {
  return useQuery({
    queryKey: sendsKey(commId ?? ""),
    queryFn: () => communicationsService.listSends(commId!),
    enabled: !!commId,
  })
}

export function useMarkCommunicationSent(commId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (guestId: string) => communicationsService.markSent(commId, guestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: sendsKey(commId) }),
  })
}

export function useUnmarkCommunicationSent(commId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sendId: string) => communicationsService.unmarkSent(sendId),
    onSuccess: () => qc.invalidateQueries({ queryKey: sendsKey(commId) }),
  })
}
