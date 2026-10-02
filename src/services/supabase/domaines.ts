import type { Domaine } from "@/types/domain"
import type { DomainesService } from "@/services/domaines.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toDomaine(row: {
  id: string
  pole_id: string | null
  name: string
  slug: string
  description: string | null
  phase: Domaine["phase"]
  icon: string | null
  color: string | null
  sort_order: number
  solicited_milestone: Domaine["solicitedMilestone"]
  preferred_contact_id: string | null
}): Domaine {
  return {
    id: row.id,
    poleId: row.pole_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    phase: row.phase,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    sortOrder: row.sort_order,
    solicitedMilestone: row.solicited_milestone,
    preferredContactId: row.preferred_contact_id,
  }
}

type DomaineRowPatch = Partial<{
  pole_id: string | null
  name: string
  slug: string
  description: string | null
  phase: Domaine["phase"]
  icon: string | null
  color: string | null
  sort_order: number
  solicited_milestone: Domaine["solicitedMilestone"]
  preferred_contact_id: string | null
}>

function toRow(input: Partial<Domaine>): DomaineRowPatch {
  const row: DomaineRowPatch = {}
  if (input.poleId !== undefined) row.pole_id = input.poleId
  if (input.name !== undefined) row.name = input.name
  if (input.slug !== undefined) row.slug = input.slug
  if (input.description !== undefined) row.description = input.description ?? null
  if (input.phase !== undefined) row.phase = input.phase
  if (input.icon !== undefined) row.icon = input.icon ?? null
  if (input.color !== undefined) row.color = input.color ?? null
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder
  if (input.solicitedMilestone !== undefined) row.solicited_milestone = input.solicitedMilestone
  if (input.preferredContactId !== undefined) row.preferred_contact_id = input.preferredContactId
  return row
}

export const domainesSupabaseService: DomainesService = {
  async list() {
    const { data, error } = await db.from(tbl("domaines") as any).select("*").order("sort_order")
    if (error) throw error
    return (data ?? []).map(toDomaine)
  },
  async create(domaine) {
    const row = toRow(domaine) as DomaineRowPatch & { name: string; slug: string }
    const { data, error } = await db.from(tbl("domaines") as any).insert(row).select("*").single()
    if (error) throw error
    return toDomaine(data)
  },
  async update(id, patch) {
    const { data, error } = await db
      .from(tbl("domaines") as any)
      .update(toRow(patch))
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toDomaine(data)
  },
  async remove(id) {
    const { error } = await db.from(tbl("domaines") as any).delete().eq("id", id)
    if (error) throw error
  },
}
