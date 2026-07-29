import type { Prestataire } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { prestatairesSeed } from "@/services/mock/data/prestataires"
import { prestatairesSupabaseService } from "@/services/supabase/prestataires"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface PrestatairesService {
  list(): Promise<Prestataire[]>
  create(prestataire: Prestataire): Promise<Prestataire>
  update(id: string, patch: Partial<Prestataire>): Promise<Prestataire>
  remove(id: string): Promise<void>
}

const prestatairesTable = createMockTable<Prestataire>(mockKey("prestataires"), prestatairesSeed)

const prestatairesMockService: PrestatairesService = {
  async list() {
    return prestatairesTable.getAll()
  },
  async create(prestataire) {
    return prestatairesTable.insert(prestataire)
  },
  async update(id, patch) {
    return prestatairesTable.update(id, patch)
  },
  async remove(id) {
    return prestatairesTable.remove(id)
  },
}

export const prestatairesService: PrestatairesService = USE_SUPABASE
  ? prestatairesSupabaseService
  : prestatairesMockService
