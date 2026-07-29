import type { DocumentItem } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { documentsSeed } from "@/services/mock/data/documents"
import { documentsSupabaseService } from "@/services/supabase/documents"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface DocumentsService {
  list(): Promise<DocumentItem[]>
  create(input: Omit<DocumentItem, "id">): Promise<DocumentItem>
}

const documentsTable = createMockTable<DocumentItem>(mockKey("documents"), documentsSeed)

const documentsMockService: DocumentsService = {
  async list() {
    return documentsTable.getAll()
  },
  async create(input) {
    return documentsTable.insert({ ...input, id: crypto.randomUUID() })
  },
}

export const documentsService: DocumentsService = USE_SUPABASE ? documentsSupabaseService : documentsMockService
