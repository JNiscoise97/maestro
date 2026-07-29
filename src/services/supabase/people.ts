import type { Person } from "@/types/domain"
import type { AppRoleRow } from "@/types/supabase"
import type { PeopleService } from "@/services/people.service"
import { supabase } from "@/supabase/client"
import { formatDisplayName } from "@/lib/utils"
import { tbl } from "@/lib/event"

const db = supabase! as any

// `role` reste typé AppRoleRow côté ligne brute (l'enum Postgres n'est pas
// resserré, voir types/supabase.ts) : seules des lignes 'fiance' doivent
// subsister dans _20260725_people une fois la migration 0025 appliquée.
function toPerson(row: {
  id: string
  full_name: string
  nickname: string | null
  phone: string | null
  role: AppRoleRow
  avatar_url: string | null
  is_active: boolean
  meal_choice: Person["mealChoice"]
  dietary_constraints: string | null
  allergies: string | null
}): Person {
  return {
    id: row.id,
    fullName: formatDisplayName(row.full_name, row.nickname),
    nickname: row.nickname,
    phone: row.phone ?? undefined,
    role: row.role as Person["role"],
    // access_code n'est jamais lisible côté client (revoke select, voir 0038) ;
    // un code vide signale à l'UI qu'il est défini mais masqué.
    accessCode: "",
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    mealChoice: row.meal_choice,
    dietaryConstraints: row.dietary_constraints,
    allergies: row.allergies,
  }
}

export const peopleSupabaseService: PeopleService = {
  async resolveByAccessCode(code) {
    const { data, error } = await db.rpc(tbl("resolve_access_code") as any, { code })
    if (error) throw error
    const row = data?.[0]
    return row ? toPerson(row) : null
  },
  async getById(id) {
    const { data, error } = await db.from(tbl("people") as any).select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data ? toPerson(data) : null
  },
  async list() {
    const { data, error } = await db.from(tbl("people") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toPerson)
  },
  async create(person) {
    const { data, error } = await db.rpc(tbl("create_person") as any, {
      p_full_name: person.fullName,
      p_role: person.role,
      p_code: person.accessCode,
      p_phone: person.phone ?? null,
      p_avatar_url: person.avatarUrl ?? null,
      p_is_active: person.isActive,
    })
    if (error) throw error
    return toPerson(data)
  },
  async update(id, patch) {
    if (patch.accessCode) {
      const { error } = await db.rpc(tbl("set_access_code") as any, { p_person_id: id, p_code: patch.accessCode })
      if (error) throw error
    }
    const fields: Partial<{
      full_name: string
      nickname: string | null
      phone: string | null
      role: Person["role"]
      avatar_url: string | null | undefined
      is_active: boolean
      meal_choice: Person["mealChoice"]
      dietary_constraints: string | null
      allergies: string | null
    }> = {}
    if (patch.fullName !== undefined) fields.full_name = patch.fullName
    if (patch.nickname !== undefined) fields.nickname = patch.nickname ?? null
    if (patch.phone !== undefined) fields.phone = patch.phone ?? null
    if (patch.role !== undefined) fields.role = patch.role
    if (patch.avatarUrl !== undefined) fields.avatar_url = patch.avatarUrl
    if (patch.isActive !== undefined) fields.is_active = patch.isActive
    if (patch.mealChoice !== undefined) fields.meal_choice = patch.mealChoice ?? null
    if (patch.dietaryConstraints !== undefined) fields.dietary_constraints = patch.dietaryConstraints ?? null
    if (patch.allergies !== undefined) fields.allergies = patch.allergies ?? null
    if (Object.keys(fields).length > 0) {
      const { error } = await db.from(tbl("people") as any).update(fields).eq("id", id)
      if (error) throw error
    }
    const updated = await peopleSupabaseService.getById(id)
    if (!updated) throw new Error(`Personne ${id} introuvable après mise à jour.`)
    return updated
  },
  async remove(id) {
    const { error } = await db.from(tbl("people") as any).delete().eq("id", id)
    if (error) throw error
  },
}
