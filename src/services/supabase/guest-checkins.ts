import type { GuestCheckin } from "@/types/domain"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

type CheckinRow = {
  id: string
  guest_id: string
  sequence_id: string
  checked_in_at: string
}

function toCheckin(r: CheckinRow): GuestCheckin {
  return {
    id: r.id,
    guestId: r.guest_id,
    sequenceId: r.sequence_id,
    checkedInAt: r.checked_in_at,
  }
}

export const guestCheckinsService = {
  async listBySequence(sequenceId: string): Promise<GuestCheckin[]> {
    const { data, error } = await db
      .from(tbl("guest_checkins") as any)
      .select("*")
      .eq("sequence_id", sequenceId)
    if (error) throw error
    return ((data ?? []) as CheckinRow[]).map(toCheckin)
  },

  async checkIn(guestId: string, sequenceId: string): Promise<GuestCheckin> {
    const { data, error } = await db
      .from(tbl("guest_checkins") as any)
      .upsert({ guest_id: guestId, sequence_id: sequenceId, checked_in_at: new Date().toISOString() })
      .select("*")
      .single()
    if (error) throw error
    return toCheckin(data as CheckinRow)
  },

  async undo(guestId: string, sequenceId: string): Promise<void> {
    const { error } = await db
      .from(tbl("guest_checkins") as any)
      .delete()
      .eq("guest_id", guestId)
      .eq("sequence_id", sequenceId)
    if (error) throw error
  },
}
