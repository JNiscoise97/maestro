import type { Checklist, ChecklistItem, ChecklistOwnerType } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { checklistsSeed, checklistItemsSeed } from "@/services/mock/data/checklists"
import { checklistsSupabaseService } from "@/services/supabase/checklists"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface ChecklistsService {
  listAll(): Promise<Checklist[]>
  listForOwner(ownerType: ChecklistOwnerType, ownerId: string): Promise<Checklist[]>
  create(input: Omit<Checklist, "id">): Promise<Checklist>
  update(id: string, patch: Partial<Checklist>): Promise<Checklist>
  remove(id: string): Promise<void>
  listItems(checklistId: string): Promise<ChecklistItem[]>
  listAllItems(): Promise<ChecklistItem[]>
  createItem(input: Omit<ChecklistItem, "id">): Promise<ChecklistItem>
  updateItem(id: string, patch: Partial<ChecklistItem>): Promise<ChecklistItem>
  removeItem(id: string): Promise<void>
  toggleItem(itemId: string, isDone: boolean): Promise<ChecklistItem>
}

const checklistsTable = createMockTable<Checklist>(mockKey("checklists"), checklistsSeed)
const checklistItemsTable = createMockTable<ChecklistItem>(mockKey("checklist-items"), checklistItemsSeed)

const checklistsMockService: ChecklistsService = {
  async listAll() {
    return checklistsTable.getAll()
  },
  async listForOwner(ownerType, ownerId) {
    const checklists = await checklistsTable.getAll()
    return checklists.filter((c) => c.ownerType === ownerType && c.ownerId === ownerId)
  },
  async create(input) {
    return checklistsTable.insert({ ...input, id: crypto.randomUUID() })
  },
  async update(id, patch) {
    return checklistsTable.update(id, patch)
  },
  async remove(id) {
    return checklistsTable.remove(id)
  },
  async listItems(checklistId) {
    const items = await checklistItemsTable.getAll()
    return items.filter((item) => item.checklistId === checklistId).sort((a, b) => a.sortOrder - b.sortOrder)
  },
  async listAllItems() {
    return checklistItemsTable.getAll()
  },
  async createItem(input) {
    return checklistItemsTable.insert({ ...input, id: crypto.randomUUID() })
  },
  async updateItem(id, patch) {
    return checklistItemsTable.update(id, patch)
  },
  async removeItem(id) {
    return checklistItemsTable.remove(id)
  },
  async toggleItem(itemId, isDone) {
    return checklistItemsTable.update(itemId, { isDone })
  },
}

export const checklistsService: ChecklistsService = USE_SUPABASE ? checklistsSupabaseService : checklistsMockService
