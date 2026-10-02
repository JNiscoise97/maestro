import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export const missionSequencesService = {
  async listAll(): Promise<{ missionId: string; sequenceId: string }[]> {
    if (!supabase) return []
    const all: { missionId: string; sequenceId: string }[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from(tbl("mission_sequences"))
        .select("mission_id,sequence_id")
        .range(from, from + PAGE - 1)
      if (error) throw error
      all.push(...(data ?? []).map((r: any) => ({ missionId: r.mission_id as string, sequenceId: r.sequence_id as string })))
      if ((data?.length ?? 0) < PAGE) break
    }
    return all
  },

  async listByMission(missionId: string): Promise<string[]> {
    const { data, error } = await db
      .from(tbl("mission_sequences"))
      .select("sequence_id")
      .eq("mission_id", missionId)
    if (error) throw error
    return (data ?? []).map((r: any) => r.sequence_id as string)
  },

  async setForMission(missionId: string, sequenceIds: string[]): Promise<void> {
    const { error: delError } = await db
      .from(tbl("mission_sequences"))
      .delete()
      .eq("mission_id", missionId)
    if (delError) throw delError
    if (sequenceIds.length === 0) return
    const { error: insError } = await db
      .from(tbl("mission_sequences"))
      .insert(sequenceIds.map((sequence_id) => ({ mission_id: missionId, sequence_id })))
    if (insError) throw insError
  },
}
