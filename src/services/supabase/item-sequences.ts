import type { ItemSequenceStatus, ItemSequenceStatusValue } from "@/types/domain"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type Row = { item_id: string; sequence_id: string; status: ItemSequenceStatusValue }

const toDomain = (r: Row): ItemSequenceStatus => ({ itemId: r.item_id, sequenceId: r.sequence_id, status: r.status })

export const itemSequencesService = {
  async listAll(): Promise<ItemSequenceStatus[]> {
    if (!db) return []
    const all: ItemSequenceStatus[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from(tbl("checklist_item_sequences"))
        .select("item_id,sequence_id,status")
        .range(from, from + PAGE - 1)
      if (error) throw error
      all.push(...((data ?? []) as Row[]).map(toDomain))
      if ((data?.length ?? 0) < PAGE) break
    }
    return all
  },

  async upsertMany(rows: ItemSequenceStatus[]): Promise<void> {
    if (!db || rows.length === 0) return
    const { error } = await db
      .from(tbl("checklist_item_sequences"))
      .upsert(rows.map((r) => ({
        item_id: r.itemId,
        sequence_id: r.sequenceId,
        status: r.status,
        updated_at: new Date().toISOString(),
      })))
    if (error) throw error
  },
}
