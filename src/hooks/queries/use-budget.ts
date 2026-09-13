import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { budgetService, type BudgetItem } from "@/services/supabase/budget"

const QK = ["budget_items"] as const

export function useBudgetItems() {
  return useQuery({ queryKey: QK, queryFn: () => budgetService.listItems() })
}

export function useCreateBudgetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: Omit<BudgetItem, "id" | "sortOrder">) => budgetService.createItem(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateBudgetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<BudgetItem, "id">> }) =>
      budgetService.updateItem(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteBudgetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetService.deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useImportBudgetItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: Omit<BudgetItem, "id" | "sortOrder">[]) => budgetService.importItems(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
