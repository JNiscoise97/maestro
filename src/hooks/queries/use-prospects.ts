import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { prospectsService, type ProspectStatus } from "@/services/supabase/prospects"

const KEY = ["prospects"] as const

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: KEY })
}

export function useProspects() {
  return useQuery({ queryKey: KEY, queryFn: () => prospectsService.list() })
}

export function useCreateProspect() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (fields: { fullName: string; groupName?: string | null; notes?: string | null; addedByName?: string | null }) =>
      prospectsService.create(fields),
    onSuccess: invalidate,
  })
}

export function useUpdateProspect() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { fullName?: string; groupName?: string | null; notes?: string | null; status?: ProspectStatus } }) =>
      prospectsService.update(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteProspect() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => prospectsService.remove(id),
    onSuccess: invalidate,
  })
}
