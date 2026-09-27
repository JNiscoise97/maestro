import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export type BudgetItem = {
  id: string
  parentId: string | null
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

export type BudgetQuote = {
  id: string
  itemId: string
  vendorName: string | null
  price: number | null
  notes: string | null
  url: string | null
  validUntil: string | null
  isSelected: boolean
  createdAt: string
}

function fromRow(r: any): BudgetItem {
  return {
    id:             r.id,
    parentId:       r.parent_id ?? null,
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

function fromQuoteRow(r: any): BudgetQuote {
  return {
    id:          r.id,
    itemId:      r.item_id,
    vendorName:  r.vendor_name,
    price:       r.price,
    notes:       r.notes,
    url:         r.url,
    validUntil:  r.valid_until,
    isSelected:  r.is_selected,
    createdAt:   r.created_at,
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
        parent_id:       item.parentId,
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
    if (patch.parentId       !== undefined) row.parent_id       = patch.parentId
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

  async listQuotesByItem(itemId: string): Promise<BudgetQuote[]> {
    const { data, error } = await db
      .from(tbl("budget_quotes"))
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromQuoteRow)
  },

  async createQuote(itemId: string, q: Pick<BudgetQuote, "vendorName" | "price" | "notes" | "url" | "validUntil">): Promise<BudgetQuote> {
    const { data, error } = await db
      .from(tbl("budget_quotes"))
      .insert({ item_id: itemId, vendor_name: q.vendorName, price: q.price, notes: q.notes, url: q.url, valid_until: q.validUntil })
      .select()
      .single()
    if (error) throw error
    return fromQuoteRow(data)
  },

  async updateQuote(id: string, q: Partial<Pick<BudgetQuote, "vendorName" | "price" | "notes" | "url" | "validUntil">>): Promise<void> {
    const row: Record<string, unknown> = {}
    if (q.vendorName !== undefined) row.vendor_name = q.vendorName
    if (q.price      !== undefined) row.price       = q.price
    if (q.notes      !== undefined) row.notes       = q.notes
    if (q.url        !== undefined) row.url         = q.url
    if (q.validUntil !== undefined) row.valid_until = q.validUntil
    if (Object.keys(row).length === 0) return
    const { error } = await db.from(tbl("budget_quotes")).update(row).eq("id", id)
    if (error) throw error
  },

  async deleteQuote(id: string): Promise<void> {
    const { error } = await db.from(tbl("budget_quotes")).delete().eq("id", id)
    if (error) throw error
  },

  async selectQuote(quoteId: string, itemId: string, price: number | null, vendorName: string | null): Promise<void> {
    await db.from(tbl("budget_quotes")).update({ is_selected: false }).eq("item_id", itemId)
    await db.from(tbl("budget_quotes")).update({ is_selected: true }).eq("id", quoteId)
    await db.from(tbl("budget_items")).update({ estimated_total: price, vendor: vendorName }).eq("id", itemId)
  },

  async listQuoteStatus(): Promise<Record<string, boolean>> {
    const { data, error } = await db
      .from(tbl("budget_quotes"))
      .select("item_id, is_selected")
    if (error) throw error
    const result: Record<string, boolean> = {}
    for (const row of (data ?? [])) {
      result[row.item_id] = result[row.item_id] === true || row.is_selected === true
    }
    return result
  },

  async deselectQuotes(itemId: string): Promise<void> {
    await db.from(tbl("budget_quotes")).update({ is_selected: false }).eq("item_id", itemId)
  },

  async duplicateItem(itemId: string): Promise<void> {
    const { data: orig, error: e1 } = await db.from(tbl("budget_items")).select("*").eq("id", itemId).single()
    if (e1) throw e1
    const { data: copy, error: e2 } = await db.from(tbl("budget_items")).insert({
      parent_id:       orig.parent_id,
      sequence_id:     orig.sequence_id,
      category:        orig.category,
      label:           `Copie de ${orig.label}`,
      quantity:        orig.quantity,
      unit_price:      orig.unit_price,
      estimated_total: orig.estimated_total,
      actual_total:    null,
      vendor:          orig.vendor,
      paid_date:       null,
      account:         orig.account,
      origin:          orig.origin,
      item_type:       orig.item_type,
      notes:           orig.notes,
      sort_order:      (orig.sort_order ?? 0) + 1,
    }).select().single()
    if (e2) throw e2
    const { data: kids, error: e3 } = await db.from(tbl("budget_items")).select("*").eq("parent_id", itemId)
    if (e3) throw e3
    if (kids && kids.length > 0) {
      const { error: e4 } = await db.from(tbl("budget_items")).insert(
        kids.map((c: any) => ({
          parent_id:       copy.id,
          sequence_id:     c.sequence_id,
          category:        c.category,
          label:           c.label,
          quantity:        c.quantity,
          unit_price:      c.unit_price,
          estimated_total: c.estimated_total,
          actual_total:    null,
          vendor:          c.vendor,
          paid_date:       null,
          account:         c.account,
          origin:          c.origin,
          item_type:       c.item_type,
          notes:           c.notes,
          sort_order:      c.sort_order,
        }))
      )
      if (e4) throw e4
    }
  },

  async swapSortOrder(idA: string, sortOrderA: number, idB: string, sortOrderB: number): Promise<void> {
    await db.from(tbl("budget_items")).update({ sort_order: sortOrderB }).eq("id", idA)
    await db.from(tbl("budget_items")).update({ sort_order: sortOrderA }).eq("id", idB)
  },


  async renameCategory(oldName: string, newName: string): Promise<void> {
    const { error } = await db
      .from(tbl("budget_items"))
      .update({ category: newName })
      .eq("category", oldName)
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
