import type { MissionAcceptance } from "@/types/domain"
import type { MissionAcceptancesService } from "@/services/mission-acceptances.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toMissionAcceptance(row: {
  id: string
  mission_id: string
  guest_id: string
  status: MissionAcceptance["status"]
  responded_at: string | null
}): MissionAcceptance {
  return {
    id: row.id,
    missionId: row.mission_id,
    guestId: row.guest_id,
    status: row.status,
    respondedAt: row.responded_at,
  }
}

export const missionAcceptancesSupabaseService: MissionAcceptancesService = {
  async list() {
    const { data, error } = await db.from(tbl("mission_acceptances") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toMissionAcceptance)
  },
  async listForGuest(guestId) {
    const { data, error } = await db.from(tbl("mission_acceptances") as any).select("*").eq("guest_id", guestId)
    if (error) throw error
    return (data ?? []).map(toMissionAcceptance)
  },
  async respond(missionId, guestId, status) {
    const { data, error } = await db
      .from(tbl("mission_acceptances") as any)
      .upsert(
        { mission_id: missionId, guest_id: guestId, status, responded_at: new Date().toISOString() },
        { onConflict: "mission_id,guest_id" }
      )
      .select("*")
      .single()
    if (error) throw error
    return toMissionAcceptance(data)
  },
}
