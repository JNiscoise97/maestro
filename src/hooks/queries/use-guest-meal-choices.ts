import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { guestMealChoicesService } from "@/services/supabase/guest-meal-choices"
import type { MealChoice } from "@/types/domain"

const baseKey = (sequenceId: string) => ["guest-meal-choices", sequenceId]

export function useGuestMealChoices(sequenceId: string | null) {
  return useQuery({
    queryKey: sequenceId ? baseKey(sequenceId) : ["guest-meal-choices", "__none__"],
    queryFn: () => guestMealChoicesService.listBySequence(sequenceId!),
    enabled: !!sequenceId,
  })
}

export function useSetGuestMealChoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      guestId,
      sequenceId,
      mealChoice,
    }: {
      guestId: string
      sequenceId: string
      mealChoice: MealChoice | null
    }) => guestMealChoicesService.set(guestId, sequenceId, mealChoice),
    onSuccess: (_data, { sequenceId }) =>
      qc.invalidateQueries({ queryKey: baseKey(sequenceId) }),
  })
}
