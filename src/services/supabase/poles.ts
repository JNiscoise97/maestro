import type { Pole } from "@/types/domain"
import type { PolesService } from "@/services/poles.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toPole(row: { id: string; name: string; sort_order: number; responsible_person_id: string | null }): Pole {
  return { id: row.id, name: row.name, sortOrder: row.sort_order, responsiblePersonId: row.responsible_person_id }
}

export const polesSupabaseService: PolesService = {
  async list() {
    const { data, error } = await db.from(tbl("poles") as any).select("*").order("sort_order")
    if (error) throw error
    return (data ?? []).map(toPole)
  },
  async create(pole) {
    const { data, error } = await db
      .from(tbl("poles") as any)
      .insert({ name: pole.name, sort_order: pole.sortOrder })
      .select("*")
      .single()
    if (error) throw error
    return toPole(data)
  },
  async update(id, patch) {
    const row: Partial<{ name: string; sort_order: number; responsible_person_id: string | null }> = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    if (patch.responsiblePersonId !== undefined) row.responsible_person_id = patch.responsiblePersonId ?? null
    const { data, error } = await db.from(tbl("poles") as any).update(row).eq("id", id).select("*").single()
    if (error) throw error
    return toPole(data)
  },
  async remove(id) {
    const { error } = await db.from(tbl("poles") as any).delete().eq("id", id)
    if (error) throw error
  },
}
