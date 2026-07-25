import { supabase } from "@/supabase/client"

export interface AssigneeHistoryEntry {
  id: string
  createdAt: string
  actorId: string | null
  actorName: string
  entityType: "pole" | "domaine" | "mission" | "checklist_item"
  entityId: string
  entityLabel: string
  previousName: string | null
  newName: string | null
}

export interface CreateAssigneeHistoryInput {
  actorId: string | null
  actorName: string
  entityType: AssigneeHistoryEntry["entityType"]
  entityId: string
  entityLabel: string
  previousName: string | null
  newName: string | null
}

const db = supabase!

function toEntry(row: {
  id: string
  created_at: string
  actor_id: string | null
  actor_name: string
  entity_type: string
  entity_id: string
  entity_label: string
  previous_name: string | null
  new_name: string | null
}): AssigneeHistoryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorId: row.actor_id,
    actorName: row.actor_name,
    entityType: row.entity_type as AssigneeHistoryEntry["entityType"],
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    previousName: row.previous_name,
    newName: row.new_name,
  }
}

export const assigneeHistorySupabaseService = {
  async list(): Promise<AssigneeHistoryEntry[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("_20260725_assignee_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) throw error
    return (data ?? []).map(toEntry)
  },

  async create(input: CreateAssigneeHistoryInput): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from("_20260725_assignee_history").insert({
      actor_id:     input.actorId,
      actor_name:   input.actorName,
      entity_type:  input.entityType,
      entity_id:    input.entityId,
      entity_label: input.entityLabel,
      previous_name: input.previousName,
      new_name:      input.newName,
    })
    if (error) throw error
  },
}
