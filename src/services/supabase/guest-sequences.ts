import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export const guestSequencesService = {
  /** Retourne les sequenceId assignés à chaque invité : { guestId → sequenceId[] } */
  async listByGuest(): Promise<Record<string, string[]>> {
    const { data, error } = await db
      .from(tbl("guest_sequences") as any)
      .select("guest_id, sequence_id")
    if (error) throw error
    const map: Record<string, string[]> = {}
    for (const row of data ?? []) {
      ;(map[row.guest_id] ??= []).push(row.sequence_id)
    }
    return map
  },

  /** Retourne les guestId assignés à une séquence donnée. */
  async listBySequence(sequenceId: string): Promise<string[]> {
    const { data, error } = await db
      .from(tbl("guest_sequences") as any)
      .select("guest_id")
      .eq("sequence_id", sequenceId)
    if (error) throw error
    return ((data ?? []) as { guest_id: string }[]).map((r) => r.guest_id)
  },

  async assign(guestId: string, sequenceId: string): Promise<void> {
    const { error } = await db
      .from(tbl("guest_sequences") as any)
      .upsert({ guest_id: guestId, sequence_id: sequenceId })
    if (error) throw error
  },

  async unassign(guestId: string, sequenceId: string): Promise<void> {
    const { error } = await db
      .from(tbl("guest_sequences") as any)
      .delete()
      .eq("guest_id", guestId)
      .eq("sequence_id", sequenceId)
    if (error) throw error
  },

  /** Remplace toutes les assignations d'un invité. */
  async setForGuest(guestId: string, sequenceIds: string[]): Promise<void> {
    await db.from(tbl("guest_sequences") as any).delete().eq("guest_id", guestId)
    if (sequenceIds.length > 0) {
      const { error } = await db
        .from(tbl("guest_sequences") as any)
        .insert(sequenceIds.map((sid) => ({ guest_id: guestId, sequence_id: sid })))
      if (error) throw error
    }
  },
}
