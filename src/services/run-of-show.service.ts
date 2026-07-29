import type { RunOfShowStep } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { runOfShowStepsSeed } from "@/services/mock/data/run-of-show"
import { runOfShowSupabaseService } from "@/services/supabase/run-of-show"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface RunOfShowService {
  list(): Promise<RunOfShowStep[]>
}

const runOfShowTable = createMockTable<RunOfShowStep>(mockKey("run-of-show"), runOfShowStepsSeed)

const runOfShowMockService: RunOfShowService = {
  async list() {
    const steps = await runOfShowTable.getAll()
    return [...steps].sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))
  },
}

export const runOfShowService: RunOfShowService = USE_SUPABASE ? runOfShowSupabaseService : runOfShowMockService
