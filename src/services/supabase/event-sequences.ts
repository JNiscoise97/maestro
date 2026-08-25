import type { EventSequence } from "@/types/domain"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

type SeqRow = {
  id: string
  name: string
  event_date: string | null
  start_time: string | null
  end_date: string | null
  end_time: string | null
  description: string | null
  sort_order: number
  created_at: string
}

function toSeq(r: SeqRow): EventSequence {
  return {
    id: r.id,
    name: r.name,
    eventDate: r.event_date,
    startTime: r.start_time,
    endDate: r.end_date,
    endTime: r.end_time,
    description: r.description,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

export const eventSequencesService = {
  async list(): Promise<EventSequence[]> {
    const { data, error } = await db
      .from(tbl("event_sequences") as any)
      .select("*")
      .order("sort_order", { ascending: true })
    if (error) throw error
    return ((data ?? []) as SeqRow[]).map(toSeq)
  },

  async create(payload: {
    name: string
    eventDate?: string | null
    startTime?: string | null
    endDate?: string | null
    endTime?: string | null
    description?: string | null
    sortOrder: number
  }): Promise<EventSequence> {
    const { data, error } = await db
      .from(tbl("event_sequences") as any)
      .insert({
        name: payload.name,
        event_date: payload.eventDate ?? null,
        start_time: payload.startTime ?? null,
        end_date: payload.endDate ?? null,
        end_time: payload.endTime ?? null,
        description: payload.description ?? null,
        sort_order: payload.sortOrder,
      })
      .select("*")
      .single()
    if (error) throw error
    return toSeq(data as SeqRow)
  },

  async update(id: string, patch: Partial<{
    name: string
    eventDate: string | null
    startTime: string | null
    endDate: string | null
    endTime: string | null
    description: string | null
    sortOrder: number
  }>): Promise<EventSequence> {
    const row: Partial<Record<string, unknown>> = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.eventDate !== undefined) row.event_date = patch.eventDate
    if (patch.startTime !== undefined) row.start_time = patch.startTime
    if (patch.endDate !== undefined) row.end_date = patch.endDate
    if (patch.endTime !== undefined) row.end_time = patch.endTime
    if (patch.description !== undefined) row.description = patch.description
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    const { data, error } = await db
      .from(tbl("event_sequences") as any)
      .update(row)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toSeq(data as SeqRow)
  },

  async delete(id: string): Promise<void> {
    const { error } = await db.from(tbl("event_sequences") as any).delete().eq("id", id)
    if (error) throw error
  },
}
