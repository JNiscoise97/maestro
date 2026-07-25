import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { messageSendsService } from "@/services/supabase/message-sends"

function sendsKey(messageId: string) {
  return ["message-sends", messageId] as const
}

export function useMessageSends(messageId: string | null) {
  return useQuery({
    queryKey: sendsKey(messageId ?? ""),
    queryFn: () => messageSendsService.listForMessage(messageId!),
    enabled: !!messageId,
  })
}

export function useMarkMessageSent(messageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, personId }: { guestId?: string; personId?: string }) =>
      messageSendsService.mark(messageId, guestId, personId),
    onSuccess: () => qc.invalidateQueries({ queryKey: sendsKey(messageId) }),
  })
}

export function useUnmarkMessageSent(messageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => messageSendsService.unmark(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: sendsKey(messageId) }),
  })
}
