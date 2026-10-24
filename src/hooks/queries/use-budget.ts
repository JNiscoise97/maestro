import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { budgetService, type BudgetItem, type DevisDraft, type PosteDraft } from "@/services/supabase/budget"

const QK        = ["budget_items"]        as const
const QK_QUOTE  = (id: string) => ["budget_quotes", id] as const
const QK_STATUS = ["budget_quote_status"] as const

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

export function useDuplicateBudgetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetService.duplicateItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useSwapBudgetSortOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idA, sortOrderA, idB, sortOrderB }: { idA: string; sortOrderA: number; idB: string; sortOrderB: number }) =>
      budgetService.swapSortOrder(idA, sortOrderA, idB, sortOrderB),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useRenameBudgetCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      budgetService.renameCategory(oldName, newName),
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

// ── Devis (quotes) ────────────────────────────────────────────────────────────

export function useBudgetQuoteStatus() {
  return useQuery({
    queryKey: QK_STATUS,
    queryFn:  () => budgetService.listQuoteStatus(),
    staleTime: 0,
  })
}

export function useBudgetQuotes(itemId: string | null) {
  return useQuery({
    queryKey: itemId ? QK_QUOTE(itemId) : ["budget_quotes_disabled"],
    queryFn:  () => budgetService.listQuotesByItem(itemId!),
    enabled:  !!itemId,
    staleTime: 60_000,
  })
}

export function useCreateBudgetQuote(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (q: Parameters<typeof budgetService.createQuote>[1]) =>
      budgetService.createQuote(itemId, q),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_QUOTE(itemId) })
      qc.invalidateQueries({ queryKey: QK_STATUS })
    },
  })
}

export function useUpdateBudgetQuote(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof budgetService.updateQuote>[1] }) =>
      budgetService.updateQuote(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_QUOTE(itemId) }),
  })
}

export function useDeleteBudgetQuote(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetService.deleteQuote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_QUOTE(itemId) })
      qc.invalidateQueries({ queryKey: QK_STATUS })
    },
  })
}

export function useSelectBudgetQuote(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ quoteId, price, vendorName }: { quoteId: string; price: number | null; vendorName: string | null }) =>
      budgetService.selectQuote(quoteId, itemId, price, vendorName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_QUOTE(itemId) })
      qc.invalidateQueries({ queryKey: QK_STATUS })
      qc.invalidateQueries({ queryKey: QK })
    },
  })
}

export function useDeselectBudgetQuotes(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => budgetService.deselectQuotes(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_QUOTE(itemId) })
      qc.invalidateQueries({ queryKey: QK_STATUS })
    },
  })
}

// ── Devis groupés, lignes couvertes, échéanciers ─────────────────────────────

const QK_DEVIS    = ["budget_devis"] as const
const QK_LINES    = ["budget_devis_lines"] as const
const QK_PAYMENTS = ["budget_payments"] as const

export function useBudgetDevis() {
  return useQuery({ queryKey: QK_DEVIS, queryFn: () => budgetService.listDevis() })
}

export function useBudgetDevisLines() {
  return useQuery({ queryKey: QK_LINES, queryFn: () => budgetService.listDevisLines() })
}

export function useBudgetPayments() {
  return useQuery({ queryKey: QK_PAYMENTS, queryFn: () => budgetService.listPayments() })
}

function useInvalidateBudget() {
  const qc = useQueryClient()
  return () => Promise.all([QK, QK_DEVIS, QK_LINES, QK_PAYMENTS, QK_STATUS].map((k) => qc.invalidateQueries({ queryKey: k })))
}

export function useSaveDevis() {
  const invalidate = useInvalidateBudget()
  return useMutation({ mutationFn: (d: DevisDraft) => budgetService.saveDevis(d), onSettled: invalidate })
}

export function useDeleteDevis() {
  const invalidate = useInvalidateBudget()
  return useMutation({ mutationFn: (id: string) => budgetService.deleteDevis(id), onSettled: invalidate })
}

export function useSavePoste() {
  const invalidate = useInvalidateBudget()
  return useMutation({ mutationFn: (d: PosteDraft) => budgetService.savePoste(d), onSettled: invalidate })
}

export function useDeletePoste() {
  const invalidate = useInvalidateBudget()
  return useMutation({ mutationFn: (id: string) => budgetService.deletePoste(id), onSettled: invalidate })
}
