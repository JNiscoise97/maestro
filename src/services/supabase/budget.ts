import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export type BudgetItem = {
  id: string
  sequenceId: string | null
  category: string
  label: string
  quantity: number | null
  unitPrice: number | null
  estimatedTotal: number | null
  actualTotal: number | null
  vendor: string | null
  paidDate: string | null
  account: string | null
  origin: string | null
  itemType: string | null
  notes: string | null
  sortOrder: number
}

function fromRow(r: any): BudgetItem {
  return {
    id:             r.id,
    sequenceId:     r.sequence_id,
    category:       r.category ?? "",
    label:          r.label,
    quantity:       r.quantity,
    unitPrice:      r.unit_price,
    estimatedTotal: r.estimated_total,
    actualTotal:    r.actual_total,
    vendor:         r.vendor,
    paidDate:       r.paid_date,
    account:        r.account,
    origin:         r.origin,
    itemType:       r.item_type,
    notes:          r.notes,
    sortOrder:      r.sort_order ?? 0,
  }
}

export const budgetService = {

  async listItems(): Promise<BudgetItem[]> {
    const { data, error } = await db
      .from(tbl("budget_items"))
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromRow)
  },

  async createItem(item: Omit<BudgetItem, "id" | "sortOrder">): Promise<BudgetItem> {
    const { data, error } = await db
      .from(tbl("budget_items"))
      .insert({
        sequence_id:     item.sequenceId,
        category:        item.category,
        label:           item.label,
        quantity:        item.quantity,
        unit_price:      item.unitPrice,
        estimated_total: item.estimatedTotal,
        actual_total:    item.actualTotal,
        vendor:          item.vendor,
        paid_date:       item.paidDate,
        account:         item.account,
        origin:          item.origin,
        item_type:       item.itemType,
        notes:           item.notes,
      })
      .select()
      .single()
    if (error) throw error
    return fromRow(data)
  },

  async updateItem(id: string, patch: Partial<Omit<BudgetItem, "id">>): Promise<void> {
    const row: Record<string, unknown> = {}
    if (patch.sequenceId     !== undefined) row.sequence_id     = patch.sequenceId
    if (patch.category       !== undefined) row.category        = patch.category
    if (patch.label          !== undefined) row.label           = patch.label
    if (patch.quantity       !== undefined) row.quantity        = patch.quantity
    if (patch.unitPrice      !== undefined) row.unit_price      = patch.unitPrice
    if (patch.estimatedTotal !== undefined) row.estimated_total = patch.estimatedTotal
    if (patch.actualTotal    !== undefined) row.actual_total    = patch.actualTotal
    if (patch.vendor         !== undefined) row.vendor          = patch.vendor
    if (patch.paidDate       !== undefined) row.paid_date       = patch.paidDate
    if (patch.account        !== undefined) row.account         = patch.account
    if (patch.origin         !== undefined) row.origin          = patch.origin
    if (patch.itemType       !== undefined) row.item_type       = patch.itemType
    if (patch.notes          !== undefined) row.notes           = patch.notes
    if (patch.sortOrder      !== undefined) row.sort_order      = patch.sortOrder
    if (Object.keys(row).length === 0) return
    const { error } = await db.from(tbl("budget_items")).update(row).eq("id", id)
    if (error) throw error
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await db.from(tbl("budget_items")).delete().eq("id", id)
    if (error) throw error
  },

  async importItems(items: Omit<BudgetItem, "id" | "sortOrder">[]): Promise<void> {
    const rows = items.map((item, i) => ({
      sequence_id:     item.sequenceId,
      category:        item.category,
      label:           item.label,
      quantity:        item.quantity,
      unit_price:      item.unitPrice,
      estimated_total: item.estimatedTotal,
      actual_total:    item.actualTotal,
      vendor:          item.vendor,
      paid_date:       item.paidDate,
      account:         item.account,
      origin:          item.origin,
      item_type:       item.itemType,
      notes:           item.notes,
      sort_order:      i,
    }))
    const { error } = await db.from(tbl("budget_items")).insert(rows)
    if (error) throw error
  },
}
