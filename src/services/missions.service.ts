import type { Mission } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { missionsSeed } from "@/services/mock/data/missions"
import { missionsSupabaseService } from "@/services/supabase/missions"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface MissionsService {
  list(): Promise<Mission[]>
  getById(id: string): Promise<Mission | null>
  create(mission: Mission): Promise<Mission>
  update(id: string, patch: Partial<Mission>): Promise<Mission>
  remove(id: string): Promise<void>
}

const missionsTable = createMockTable<Mission>(mockKey("missions"), missionsSeed)

const missionsMockService: MissionsService = {
  async list() {
    return missionsTable.getAll()
  },
  async getById(id) {
    return missionsTable.getById(id)
  },
  async create(mission) {
    return missionsTable.insert(mission)
  },
  async update(id, patch) {
    return missionsTable.update(id, patch)
  },
  async remove(id) {
    return missionsTable.remove(id)
  },
}

export const missionsService: MissionsService = USE_SUPABASE ? missionsSupabaseService : missionsMockService
