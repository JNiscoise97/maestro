import type { DomaineResponsable } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { domaineResponsablesSeed } from "@/services/mock/data/domaine-responsables"
import { domaineResponsablesSupabaseService } from "@/services/supabase/domaine-responsables"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface DomaineResponsablesService {
  list(): Promise<DomaineResponsable[]>
  create(responsable: DomaineResponsable): Promise<DomaineResponsable>
  remove(id: string): Promise<void>
}

const domaineResponsablesTable = createMockTable<DomaineResponsable>(
  mockKey("domaine-responsables"),
  domaineResponsablesSeed
)

const domaineResponsablesMockService: DomaineResponsablesService = {
  async list() {
    return domaineResponsablesTable.getAll()
  },
  async create(responsable) {
    return domaineResponsablesTable.insert(responsable)
  },
  async remove(id) {
    return domaineResponsablesTable.remove(id)
  },
}

export const domaineResponsablesService: DomaineResponsablesService = USE_SUPABASE
  ? domaineResponsablesSupabaseService
  : domaineResponsablesMockService
