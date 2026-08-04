import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl } from "@/lib/event"

export type ProspectStatus = "pending" | "no" | "next_event" | "invite"

export interface Prospect {
  id: string
  fullName: string
  groupName: string | null
  notes: string | null
  status: ProspectStatus
  createdAt: string
}

function toProspect(r: {
  id: string
  full_name: string
  group_name: string | null
  notes: string | null
  status: string
  created_at: string
}): Prospect {
  return {
    id: r.id,
    fullName: r.full_name,
    groupName: r.group_name,
    notes: r.notes,
    status: r.status as ProspectStatus,
    createdAt: r.created_at,
  }
}

export const prospectsService = {
  async list(): Promise<Prospect[]> {
    if (!USE_SUPABASE) return []
    const { data, error } = await supabase!
      .from(tbl("prospect_guests") as any)
      .select("*")
      .order("created_at")
    if (error) throw error
    return ((data ?? []) as unknown as Parameters<typeof toProspect>[0][]).map(toProspect)
  },

  async create(fields: { fullName: string; groupName?: string | null; notes?: string | null }): Promise<Prospect> {
    const { data, error } = await supabase!
      .from(tbl("prospect_guests") as any)
      .insert({ full_name: fields.fullName, group_name: fields.groupName ?? null, notes: fields.notes ?? null })
      .select()
      .single()
    if (error) throw error
    return toProspect(data as unknown as Parameters<typeof toProspect>[0])
  },

  async update(id: string, patch: { fullName?: string; groupName?: string | null; notes?: string | null; status?: ProspectStatus }): Promise<void> {
    const row: Record<string, unknown> = {}
    if (patch.fullName   !== undefined) row.full_name  = patch.fullName
    if (patch.groupName  !== undefined) row.group_name = patch.groupName
    if (patch.notes      !== undefined) row.notes      = patch.notes
    if (patch.status     !== undefined) row.status     = patch.status
    const { error } = await supabase!
      .from(tbl("prospect_guests") as any)
      .update(row)
      .eq("id", id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase!
      .from(tbl("prospect_guests") as any)
      .delete()
      .eq("id", id)
    if (error) throw error
  },
}
