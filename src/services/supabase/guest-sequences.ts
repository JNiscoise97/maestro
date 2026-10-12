import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

/**
 * Lit toutes les lignes d'une requête, page par page : Supabase plafonne chaque
 * réponse à 1 000 lignes et tronque le reste sans erreur.
 */
async function selectAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const PAGE = 1000
  const all: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw error
    all.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGE) return all
  }
}

export const guestSequencesService = {
  /** Retourne les sequenceId assignés à chaque invité : { guestId → sequenceId[] } */
  async listByGuest(): Promise<Record<string, string[]>> {
    // Ordre stable obligatoire pour que la pagination ne saute ni ne double aucune ligne.
    const rows = await selectAll<{ guest_id: string; sequence_id: string }>((from, to) =>
      db.from(tbl("guest_sequences") as any)
        .select("guest_id, sequence_id")
        .order("guest_id")
        .order("sequence_id")
        .range(from, to))
    const map: Record<string, string[]> = {}
    for (const row of rows) {
      ;(map[row.guest_id] ??= []).push(row.sequence_id)
    }
    return map
  },

  /** Retourne les guestId assignés à une séquence donnée. */
  async listBySequence(sequenceId: string): Promise<string[]> {
    const rows = await selectAll<{ guest_id: string }>((from, to) =>
      db.from(tbl("guest_sequences") as any)
        .select("guest_id")
        .eq("sequence_id", sequenceId)
        .order("guest_id")
        .range(from, to))
    return rows.map((r) => r.guest_id)
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
    const { error: delError } = await db.from(tbl("guest_sequences") as any).delete().eq("guest_id", guestId)
    if (delError) throw delError
    if (sequenceIds.length > 0) {
      const { error } = await db
        .from(tbl("guest_sequences") as any)
        .insert(sequenceIds.map((sid) => ({ guest_id: guestId, sequence_id: sid })))
      if (error) throw error
    }
  },
}
