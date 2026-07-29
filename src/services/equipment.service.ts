import type { EquipmentItem } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { equipmentSeed } from "@/services/mock/data/equipment"
import { equipmentSupabaseService } from "@/services/supabase/equipment"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface EquipmentService {
  listItems(): Promise<EquipmentItem[]>
  createItem(input: Omit<EquipmentItem, "id">): Promise<EquipmentItem>
  updateItem(id: string, patch: Partial<EquipmentItem>): Promise<EquipmentItem>
  removeItem(id: string): Promise<void>
}

const equipmentTable = createMockTable<EquipmentItem>(mockKey("equipment"), equipmentSeed)

const equipmentMockService: EquipmentService = {
  async listItems() {
    return equipmentTable.getAll()
  },
  async createItem(input) {
    return equipmentTable.insert({ ...input, id: crypto.randomUUID() })
  },
  async updateItem(id, patch) {
    return equipmentTable.update(id, patch)
  },
  async removeItem(id) {
    await equipmentTable.remove(id)
  },
}

export const equipmentService: EquipmentService = USE_SUPABASE
  ? equipmentSupabaseService
  : equipmentMockService
