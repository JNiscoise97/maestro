import type { PlanningEvent } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { planningEventsSeed } from "@/services/mock/data/planning-events"
import { planningSupabaseService } from "@/services/supabase/planning"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface PlanningService {
  list(): Promise<PlanningEvent[]>
}

const planningEventsTable = createMockTable<PlanningEvent>(mockKey("planning-events"), planningEventsSeed)

const planningMockService: PlanningService = {
  async list() {
    const events = await planningEventsTable.getAll()
    return [...events].sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))
  },
}

export const planningService: PlanningService = USE_SUPABASE ? planningSupabaseService : planningMockService
