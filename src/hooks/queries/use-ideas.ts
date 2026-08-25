import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Idea, IdeaSource, IdeaStatus } from "@/types/domain"
import { ideasService } from "@/services/supabase/ideas"

const KEY = ["ideas"]

export function useIdeas() {
  return useQuery({ queryKey: KEY, queryFn: () => ideasService.list() })
}

export function useCreateIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      title: string
      description?: string | null
      source: IdeaSource
      sourceDetail?: string | null
      category?: string | null
      status?: IdeaStatus
      notes?: string | null
    }) => ideasService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: {
      id: string
      patch: Partial<{
        title: string
        description: string | null
        source: IdeaSource
        sourceDetail: string | null
        category: string | null
        status: IdeaStatus
        notes: string | null
      }>
    }) => ideasService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ideasService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
