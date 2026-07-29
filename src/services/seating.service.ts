import type { SeatingTable, TableAssignment } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { tablesSeed, tableAssignmentsSeed } from "@/services/mock/data/seating"
import { seatingSupabaseService } from "@/services/supabase/seating"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface SeatTarget {
  guestId?: string | null
  personId?: string | null
  prestataireId?: string | null
}

export interface SeatingService {
  listTables(): Promise<SeatingTable[]>
  createTable(input: Omit<SeatingTable, "id">): Promise<SeatingTable>
  updateTable(id: string, patch: Partial<SeatingTable>): Promise<SeatingTable>
  deleteTable(id: string): Promise<void>
  listAssignments(): Promise<TableAssignment[]>
  assign(tableId: string, target: SeatTarget): Promise<TableAssignment>
  unassign(assignmentId: string): Promise<void>
}

const tablesTable = createMockTable<SeatingTable>(mockKey("tables"), tablesSeed)
const tableAssignmentsTable = createMockTable<TableAssignment>(mockKey("table-assignments"), tableAssignmentsSeed)

function findExisting(assignments: TableAssignment[], target: SeatTarget) {
  return assignments.find(
    (a) =>
      (target.guestId && a.guestId === target.guestId) ||
      (target.personId && a.personId === target.personId) ||
      (target.prestataireId && a.prestataireId === target.prestataireId)
  )
}

const seatingMockService: SeatingService = {
  async listTables() {
    const tables = await tablesTable.getAll()
    return [...tables].sort((a, b) => a.sortOrder - b.sortOrder)
  },
  async createTable(input) {
    return tablesTable.insert({ ...input, id: crypto.randomUUID() })
  },
  async updateTable(id, patch) {
    return tablesTable.update(id, patch)
  },
  async deleteTable(id) {
    await tablesTable.remove(id)
  },
  async listAssignments() {
    return tableAssignmentsTable.getAll()
  },
  async assign(tableId, target) {
    const assignments = await tableAssignmentsTable.getAll()
    const existing = findExisting(assignments, target)
    if (existing) {
      return tableAssignmentsTable.update(existing.id, { tableId })
    }
    return tableAssignmentsTable.insert({ id: crypto.randomUUID(), tableId, ...target })
  },
  async unassign(assignmentId) {
    await tableAssignmentsTable.remove(assignmentId)
  },
}

export const seatingService: SeatingService = USE_SUPABASE ? seatingSupabaseService : seatingMockService
