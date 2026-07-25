import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useIdentity } from "@/context/IdentityContext"
import { assigneeHistorySupabaseService, type CreateAssigneeHistoryInput } from "@/services/supabase/assignee-history"

const KEY = ["assignee-history"] as const

export function useAssigneeHistory() {
  return useQuery({ queryKey: KEY, queryFn: () => assigneeHistorySupabaseService.list() })
}

/** Retourne une fonction fire-and-forget qui logue un changement d'assigné. */
export function useLogAssigneeChange() {
  const { person } = useIdentity()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: CreateAssigneeHistoryInput) => assigneeHistorySupabaseService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })

  return (input: Omit<CreateAssigneeHistoryInput, "actorId" | "actorName">) => {
    mutation.mutate({
      ...input,
      actorId:   person?.id   ?? null,
      actorName: person?.fullName ?? "Inconnu",
    })
  }
}
