import type { SeatingTable, TableAssignment } from "@/types/domain"
import type { SeatingService } from "@/services/seating.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toTable(row: { id: string; name: string; capacity: number; sort_order: number; pos_x?: number | null; pos_y?: number | null; confirmed_at?: string | null }): SeatingTable {
  return { id: row.id, name: row.name, capacity: row.capacity, sortOrder: row.sort_order, posX: row.pos_x, posY: row.pos_y, confirmedAt: row.confirmed_at ?? null }
}

function toAssignment(row: {
  id: string
  table_id: string
  guest_id: string | null
  person_id: string | null
  prestataire_id: string | null
  seat_number: number | null
}): TableAssignment {
  return {
    id: row.id,
    tableId: row.table_id,
    guestId: row.guest_id,
    personId: row.person_id,
    prestataireId: row.prestataire_id,
    seatNumber: row.seat_number,
  }
}

export const seatingSupabaseService: SeatingService = {
  async listTables() {
    const { data, error } = await db.from(tbl("tables") as any).select("*").order("sort_order")
    if (error) throw error
    return (data ?? []).map(toTable)
  },
  async createTable(input) {
    const { data, error } = await db
      .from(tbl("tables") as any)
      .insert({ name: input.name, capacity: input.capacity, sort_order: input.sortOrder })
      .select("*")
      .single()
    if (error) throw error
    return toTable(data)
  },
  async updateTable(id, patch) {
    const row: Partial<{ name: string; capacity: number; sort_order: number; pos_x: number | null; pos_y: number | null; confirmed_at: string | null }> = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.capacity !== undefined) row.capacity = patch.capacity
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    if (patch.posX !== undefined) row.pos_x = patch.posX
    if (patch.posY !== undefined) row.pos_y = patch.posY
    if (patch.confirmedAt !== undefined) row.confirmed_at = patch.confirmedAt ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await db.from(tbl("tables") as any).update(row as any).eq("id", id).select("*").single()
    if (error) throw error
    return toTable(data)
  },
  async deleteTable(id) {
    const { error } = await db.from(tbl("tables") as any).delete().eq("id", id)
    if (error) throw error
  },
  async listAssignments() {
    const { data, error } = await db.from(tbl("table_assignments") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toAssignment)
  },
  async assign(tableId, target) {
    const orFilters: string[] = []
    if (target.guestId) orFilters.push(`guest_id.eq.${target.guestId}`)
    if (target.personId) orFilters.push(`person_id.eq.${target.personId}`)
    if (target.prestataireId) orFilters.push(`prestataire_id.eq.${target.prestataireId}`)

    const { data: existing, error: findError } = await db
      .from(tbl("table_assignments") as any)
      .select("*")
      .or(orFilters.join(","))
      .maybeSingle()
    if (findError) throw findError

    if (existing) {
      const { data, error } = await db
        .from(tbl("table_assignments") as any)
        .update({ table_id: tableId })
        .eq("id", existing.id)
        .select("*")
        .single()
      if (error) throw error
      return toAssignment(data)
    }

    const { data, error } = await db
      .from(tbl("table_assignments") as any)
      .insert({
        table_id: tableId,
        guest_id: target.guestId ?? null,
        person_id: target.personId ?? null,
        prestataire_id: target.prestataireId ?? null,
      })
      .select("*")
      .single()
    if (error) throw error
    return toAssignment(data)
  },
  async unassign(assignmentId) {
    const { error } = await db.from(tbl("table_assignments") as any).delete().eq("id", assignmentId)
    if (error) throw error
  },
}
