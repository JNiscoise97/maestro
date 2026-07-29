import type { Checklist, ChecklistItem } from "@/types/domain"
import type { ChecklistsService } from "@/services/checklists.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toChecklist(row: {
  id: string
  owner_type: Checklist["ownerType"]
  owner_id: string | null
  title: string | null
  responsible_person_id: string | null
}): Checklist {
  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    title: row.title,
    responsiblePersonId: row.responsible_person_id,
  }
}

function toChecklistItem(row: {
  id: string
  checklist_id: string
  label: string
  is_done: boolean
  sort_order: number
  priority: ChecklistItem["priority"]
  status: ChecklistItem["status"]
  estimated_start_date: string | null
  estimated_start_time: string | null
  estimated_end_date: string | null
  estimated_end_time: string | null
  assignee_guest_id: string | null
  assignee_person_id?: string | null
  task_scheduling_type: string | null
  task_phase: string | null
  ros_message_id?: string | null
}): ChecklistItem {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    label: row.label,
    isDone: row.is_done,
    sortOrder: row.sort_order,
    priority: row.priority,
    status: row.status,
    estimatedStartDate: row.estimated_start_date,
    estimatedStartTime: row.estimated_start_time,
    estimatedEndDate: row.estimated_end_date,
    estimatedEndTime: row.estimated_end_time,
    assigneeGuestId: row.assignee_guest_id,
    assigneePersonId: row.assignee_person_id ?? null,
    taskSchedulingType: (row.task_scheduling_type as ChecklistItem["taskSchedulingType"]) ?? null,
    taskPhase: row.task_phase,
    rosMessageId: row.ros_message_id ?? null,
  }
}

type ChecklistItemRowPatch = Partial<{
  checklist_id: string
  label: string
  is_done: boolean
  sort_order: number
  priority: ChecklistItem["priority"]
  status: ChecklistItem["status"]
  estimated_start_date: string | null
  estimated_start_time: string | null
  estimated_end_date: string | null
  estimated_end_time: string | null
  assignee_guest_id?: string | null
  assignee_person_id?: string | null
  task_scheduling_type: string | null
  task_phase: string | null
  ros_message_id?: string | null
}>

function toItemRow(input: Partial<ChecklistItem>): ChecklistItemRowPatch {
  const row: ChecklistItemRowPatch = {}
  if (input.checklistId !== undefined) row.checklist_id = input.checklistId
  if (input.label !== undefined) row.label = input.label
  if (input.isDone !== undefined) row.is_done = input.isDone
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder
  if (input.priority !== undefined) row.priority = input.priority
  if (input.status !== undefined) row.status = input.status
  if (input.estimatedStartDate !== undefined) row.estimated_start_date = input.estimatedStartDate ?? null
  if (input.estimatedStartTime !== undefined) row.estimated_start_time = input.estimatedStartTime ?? null
  if (input.estimatedEndDate !== undefined) row.estimated_end_date = input.estimatedEndDate ?? null
  if (input.estimatedEndTime !== undefined) row.estimated_end_time = input.estimatedEndTime ?? null
  if (input.assigneeGuestId !== undefined) row.assignee_guest_id = input.assigneeGuestId ?? null
  if (input.assigneePersonId !== undefined) row.assignee_person_id = input.assigneePersonId ?? null
  if (input.taskSchedulingType !== undefined) row.task_scheduling_type = input.taskSchedulingType ?? null
  if (input.taskPhase !== undefined) row.task_phase = input.taskPhase ?? null
  if (input.rosMessageId !== undefined) row.ros_message_id = input.rosMessageId ?? null
  return row
}

type ChecklistRowPatch = Partial<{
  owner_type: Checklist["ownerType"]
  owner_id: string | null
  title: string | null
  responsible_person_id: string | null
}>

function toChecklistRow(input: Partial<Checklist>): ChecklistRowPatch {
  const row: ChecklistRowPatch = {}
  if (input.ownerType !== undefined) row.owner_type = input.ownerType
  if (input.ownerId !== undefined) row.owner_id = input.ownerId ?? null
  if (input.title !== undefined) row.title = input.title ?? null
  if (input.responsiblePersonId !== undefined) row.responsible_person_id = input.responsiblePersonId ?? null
  return row
}

export const checklistsSupabaseService: ChecklistsService = {
  async listAll() {
    const { data, error } = await (db as any).from(tbl("checklists") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toChecklist)
  },
  async listForOwner(ownerType, ownerId) {
    const { data, error } = await db
      .from(tbl("checklists") as any)
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
    if (error) throw error
    return (data ?? []).map(toChecklist)
  },
  async create(input) {
    const row = toChecklistRow(input) as ChecklistRowPatch & { owner_type: Checklist["ownerType"] }
    const { data, error } = await (db as any).from(tbl("checklists") as any).insert(row).select("*").single()
    if (error) throw error
    return toChecklist(data)
  },
  async update(id, patch) {
    const { data, error } = await db
      .from(tbl("checklists") as any)
      .update(toChecklistRow(patch))
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toChecklist(data)
  },
  async remove(id) {
    const { error } = await (db as any).from(tbl("checklists") as any).delete().eq("id", id)
    if (error) throw error
  },
  async listItems(checklistId) {
    const { data, error } = await db
      .from(tbl("checklist_items") as any)
      .select("*")
      .eq("checklist_id", checklistId)
      .order("sort_order")
    if (error) throw error
    return (data ?? []).map(toChecklistItem)
  },
  async listAllItems() {
    const all: ReturnType<typeof toChecklistItem>[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from(tbl("checklist_items") as any)
        .select("*")
        .range(from, from + PAGE - 1)
      if (error) throw error
      all.push(...(data ?? []).map(toChecklistItem))
      if ((data?.length ?? 0) < PAGE) break
    }
    return all
  },
  async createItem(input) {
    const row = toItemRow(input) as ChecklistItemRowPatch & { checklist_id: string; label: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any).from(tbl("checklist_items") as any).insert(row as any).select("*").single()
    if (error) throw error
    return toChecklistItem(data)
  },
  async updateItem(id, patch) {
    const { data, error } = await db
      .from(tbl("checklist_items") as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(toItemRow(patch) as any)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toChecklistItem(data)
  },
  async removeItem(id) {
    const { error } = await (db as any).from(tbl("checklist_items") as any).delete().eq("id", id)
    if (error) throw error
  },
  async toggleItem(itemId, isDone) {
    const { data, error } = await db
      .from(tbl("checklist_items") as any)
      .update({ is_done: isDone })
      .eq("id", itemId)
      .select("*")
      .single()
    if (error) throw error
    return toChecklistItem(data)
  },
}
