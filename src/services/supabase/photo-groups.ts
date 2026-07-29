import type { PhotoGroup, PhotoGroupMember } from "@/types/domain"
import type { PhotoGroupsService } from "@/services/photo-groups.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toPhotoGroup(row: {
  id: string
  session_id: string
  label: string
  sort_order: number
  is_priority: boolean
  status: PhotoGroup["status"]
  notes: string | null
  required_fiance_ids: string[]
}): PhotoGroup {
  return {
    id: row.id,
    sessionId: row.session_id,
    label: row.label,
    sortOrder: row.sort_order,
    isPriority: row.is_priority,
    status: row.status,
    notes: row.notes,
    requiredFianceIds: row.required_fiance_ids,
  }
}

function toPhotoGroupMember(row: {
  id: string
  photo_group_id: string
  guest_id: string
  is_present: boolean
}): PhotoGroupMember {
  return {
    id: row.id,
    photoGroupId: row.photo_group_id,
    guestId: row.guest_id,
    isPresent: row.is_present,
  }
}

type PhotoGroupRowPatch = Partial<{
  session_id: string
  label: string
  sort_order: number
  is_priority: boolean
  status: PhotoGroup["status"]
  notes: string | null
  required_fiance_ids: string[]
}>

function toPhotoGroupRow(input: Partial<PhotoGroup>): PhotoGroupRowPatch {
  const row: PhotoGroupRowPatch = {}
  if (input.sessionId !== undefined) row.session_id = input.sessionId
  if (input.label !== undefined) row.label = input.label
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder
  if (input.isPriority !== undefined) row.is_priority = input.isPriority
  if (input.status !== undefined) row.status = input.status
  if (input.notes !== undefined) row.notes = input.notes ?? null
  if (input.requiredFianceIds !== undefined) row.required_fiance_ids = input.requiredFianceIds
  return row
}

export const photoGroupsSupabaseService: PhotoGroupsService = {
  async listGroups() {
    const { data, error } = await db.from(tbl("photo_groups") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toPhotoGroup)
  },
  async createGroup(input) {
    const row = toPhotoGroupRow(input) as PhotoGroupRowPatch & { label: string; session_id: string }
    const { data, error } = await db.from(tbl("photo_groups") as any).insert(row).select("*").single()
    if (error) throw error
    return toPhotoGroup(data)
  },
  async updateGroup(id, patch) {
    const { data, error } = await db
      .from(tbl("photo_groups") as any)
      .update(toPhotoGroupRow(patch))
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toPhotoGroup(data)
  },
  async removeGroup(id) {
    const { error } = await db.from(tbl("photo_groups") as any).delete().eq("id", id)
    if (error) throw error
  },
  async resetGroups() {
    const { error } = await db
      .from(tbl("photo_groups") as any)
      .update({ status: "pending", notes: null })
      .not("id", "is", null)
    if (error) throw error
  },
  async listAllMembers() {
    const { data, error } = await db.from(tbl("photo_group_members") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toPhotoGroupMember)
  },
  async addMember(photoGroupId, guestId) {
    const { data, error } = await db
      .from(tbl("photo_group_members") as any)
      .insert({ photo_group_id: photoGroupId, guest_id: guestId })
      .select("*")
      .single()
    if (error) throw error
    return toPhotoGroupMember(data)
  },
  async removeMember(id) {
    const { error } = await db.from(tbl("photo_group_members") as any).delete().eq("id", id)
    if (error) throw error
  },
  async updateMember(id, patch) {
    const row: Partial<{ is_present: boolean }> = {}
    if (patch.isPresent !== undefined) row.is_present = patch.isPresent
    const { data, error } = await db
      .from(tbl("photo_group_members") as any)
      .update(row)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toPhotoGroupMember(data)
  },
}
