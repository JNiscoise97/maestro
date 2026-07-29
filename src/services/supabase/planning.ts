import type { PlanningEvent } from "@/types/domain"
import type { PlanningService } from "@/services/planning.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toPlanningEvent(row: {
  id: string
  milestone: PlanningEvent["milestone"]
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
}): PlanningEvent {
  return {
    id: row.id,
    milestone: row.milestone,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }
}

export const planningSupabaseService: PlanningService = {
  async list() {
    const { data, error } = await (db as any).from(tbl("planning_events") as any).select("*")
    if (error) throw error
    const events = ((data ?? []) as any[]).map(toPlanningEvent)
    return events.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))
  },
}
