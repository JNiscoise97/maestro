import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { communicationsService, type CommunicationPrep } from "@/services/supabase/communications"

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
    mutationFn: ({ name, description, targetRsvpStatuses, targetProspectStatuses }: { name: string; description: string | null; targetRsvpStatuses?: string[] | null; targetProspectStatuses?: string[] | null }) =>
      communicationsService.create(name, description, targetRsvpStatuses, targetProspectStatuses),
    onSuccess: invalidate,
  })
}

export function useUpdateCommunication() {
  const invalidate = useInvalidateComms()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; description?: string | null; targetRsvpStatuses?: string[] | null; targetProspectStatuses?: string[] | null } }) =>
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

function prepKey(commId: string) {
  return ["communication-prep", commId] as const
}

/** Préparation de l'envoi (prête, qui envoie) pour une communication. */
export function useCommunicationPrep(commId: string | null) {
  return useQuery({
    queryKey: prepKey(commId ?? ""),
    queryFn: () => communicationsService.listPrep(commId!),
    enabled: !!commId,
  })
}

/** Enregistre la préparation (mise à jour immédiate de l'écran, annulée en cas d'erreur). */
export function useSaveCommunicationPrep(commId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: CommunicationPrep[]) => communicationsService.savePrep(commId, rows),
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: prepKey(commId) })
      const previous = qc.getQueryData<CommunicationPrep[]>(prepKey(commId))
      const byId = new Map((previous ?? []).map((r) => [r.guestId, r]))
      for (const r of rows) byId.set(r.guestId, r)
      qc.setQueryData(prepKey(commId), [...byId.values()])
      return { previous }
    },
    onError: (_e, _rows, ctx) => { if (ctx?.previous) qc.setQueryData(prepKey(commId), ctx.previous) },
    onSettled: () => qc.invalidateQueries({ queryKey: prepKey(commId) }),
  })
}

export function useReorderCommunications() {
  const invalidate = useInvalidateComms()
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => communicationsService.reorder(items),
    onSuccess: invalidate,
  })
}
