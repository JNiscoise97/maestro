import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { itemSequencesService } from "@/services/supabase/item-sequences"
import type { ItemSequenceStatus } from "@/types/domain"

const KEY = ["item-sequences", "all"] as const

export function useItemSequenceStatuses() {
  return useQuery({ queryKey: KEY, queryFn: () => itemSequencesService.listAll() })
}

/** Enregistre un ou plusieurs statuts item × séquence, avec mise à jour optimiste du cache. */
export function useSetItemSequenceStatuses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: ItemSequenceStatus[]) => itemSequencesService.upsertMany(rows),
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: KEY })
      const previous = qc.getQueryData<ItemSequenceStatus[]>(KEY)
      const k = (r: ItemSequenceStatus) => `${r.itemId}:${r.sequenceId}`
      const byKey = new Map(rows.map((r) => [k(r), r]))
      qc.setQueryData<ItemSequenceStatus[]>(KEY, (cur) => {
        const kept = (cur ?? []).filter((r) => !byKey.has(k(r)))
        return [...kept, ...rows]
      })
      return { previous }
    },
    onError: (_err, _rows, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
