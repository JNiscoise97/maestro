import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { giftsService, type GiftInput, type GiftPatch } from "@/services/gifts.service"

const KEY = ["gifts"] as const

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: KEY })
}

export function useGifts() {
  return useQuery({ queryKey: KEY, queryFn: () => giftsService.list() })
}

export function useCreateGift() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: GiftInput) => giftsService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateGift() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GiftPatch }) =>
      giftsService.update(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteGift() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => giftsService.remove(id),
    onSuccess: invalidate,
  })
}
