import type { Prestataire } from "@/types/domain"
import type { PrestatairesService } from "@/services/prestataires.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toPrestataire(row: {
  id: string
  name: string
  company: string | null
  role: string | null
  needs_meal: boolean
  meal_choice: Prestataire["mealChoice"]
  dietary_constraints: string | null
  allergies: string | null
  notes: string | null
}): Prestataire {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    role: row.role,
    needsMeal: row.needs_meal,
    mealChoice: row.meal_choice,
    dietaryConstraints: row.dietary_constraints,
    allergies: row.allergies,
    notes: row.notes,
  }
}

type PrestataireRowPatch = Partial<{
  name: string
  company: string | null
  role: string | null
  needs_meal: boolean
  meal_choice: Prestataire["mealChoice"]
  dietary_constraints: string | null
  allergies: string | null
  notes: string | null
}>

function toRow(input: Partial<Prestataire>): PrestataireRowPatch {
  const row: PrestataireRowPatch = {}
  if (input.name !== undefined) row.name = input.name
  if (input.company !== undefined) row.company = input.company ?? null
  if (input.role !== undefined) row.role = input.role ?? null
  if (input.needsMeal !== undefined) row.needs_meal = input.needsMeal
  if (input.mealChoice !== undefined) row.meal_choice = input.mealChoice ?? null
  if (input.dietaryConstraints !== undefined) row.dietary_constraints = input.dietaryConstraints ?? null
  if (input.allergies !== undefined) row.allergies = input.allergies ?? null
  if (input.notes !== undefined) row.notes = input.notes ?? null
  return row
}

export const prestatairesSupabaseService: PrestatairesService = {
  async list() {
    const { data, error } = await (db as any).from(tbl("prestataires") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toPrestataire)
  },
  async create(prestataire) {
    const row = toRow(prestataire) as PrestataireRowPatch & { name: string }
    const { data, error } = await (db as any).from(tbl("prestataires") as any).insert(row).select("*").single()
    if (error) throw error
    return toPrestataire(data)
  },
  async update(id, patch) {
    const { data, error } = await db
      .from(tbl("prestataires") as any)
      .update(toRow(patch))
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toPrestataire(data)
  },
  async remove(id) {
    const { error } = await (db as any).from(tbl("prestataires") as any).delete().eq("id", id)
    if (error) throw error
  },
}
