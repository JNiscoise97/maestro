import type { Domaine } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { domainesSeed } from "@/services/mock/data/domaines"
import { domainesSupabaseService } from "@/services/supabase/domaines"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface DomainesService {
  list(): Promise<Domaine[]>
  create(domaine: Domaine): Promise<Domaine>
  update(id: string, patch: Partial<Domaine>): Promise<Domaine>
  remove(id: string): Promise<void>
}

const domainesTable = createMockTable<Domaine>(mockKey("domaines"), domainesSeed)

const domainesMockService: DomainesService = {
  async list() {
    const domaines = await domainesTable.getAll()
    return [...domaines].sort((a, b) => a.sortOrder - b.sortOrder)
  },
  async create(domaine) {
    return domainesTable.insert(domaine)
  },
  async update(id, patch) {
    return domainesTable.update(id, patch)
  },
  async remove(id) {
    return domainesTable.remove(id)
  },
}

export const domainesService: DomainesService = USE_SUPABASE ? domainesSupabaseService : domainesMockService
