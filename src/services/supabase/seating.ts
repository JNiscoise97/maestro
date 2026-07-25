import type { SeatingTable, TableAssignment } from "@/types/domain"
import type { SeatingService } from "@/services/seating.service"
import { supabase } from "@/supabase/client"

const db = supabase!

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
    const { data, error } = await db.from("_20260725_tables").select("*").order("sort_order")
    if (error) throw error
    return (data ?? []).map(toTable)
  },
  async createTable(input) {
    const { data, error } = await db
      .from("_20260725_tables")
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
    const { data, error } = await db.from("_20260725_tables").update(row as any).eq("id", id).select("*").single()
    if (error) throw error
    return toTable(data)
  },
  async deleteTable(id) {
    const { error } = await db.from("_20260725_tables").delete().eq("id", id)
    if (error) throw error
  },
  async listAssignments() {
    const { data, error } = await db.from("_20260725_table_assignments").select("*")
    if (error) throw error
    return (data ?? []).map(toAssignment)
  },
  async assign(tableId, target) {
    const orFilters: string[] = []
    if (target.guestId) orFilters.push(`guest_id.eq.${target.guestId}`)
    if (target.personId) orFilters.push(`person_id.eq.${target.personId}`)
    if (target.prestataireId) orFilters.push(`prestataire_id.eq.${target.prestataireId}`)

    const { data: existing, error: findError } = await db
      .from("_20260725_table_assignments")
      .select("*")
      .or(orFilters.join(","))
      .maybeSingle()
    if (findError) throw findError

    if (existing) {
      const { data, error } = await db
        .from("_20260725_table_assignments")
        .update({ table_id: tableId })
        .eq("id", existing.id)
        .select("*")
        .single()
      if (error) throw error
      return toAssignment(data)
    }

    const { data, error } = await db
      .from("_20260725_table_assignments")
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
    const { error } = await db.from("_20260725_table_assignments").delete().eq("id", assignmentId)
    if (error) throw error
  },
}
