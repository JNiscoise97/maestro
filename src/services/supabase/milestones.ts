import type { Milestone } from "@/types/domain"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type MilestoneRow = {
  id: string
  name: string
  description: string | null
  target_date: string
  sort_order: number
}

export const milestonesService = {
  async list(): Promise<Milestone[]> {
    // Pas de couche mock : sans Supabase, pas de rétroplanning.
    if (!db) return []
    const { data, error } = await db
      .from(tbl("milestones"))
      .select("id,name,description,target_date,sort_order")
      .order("sort_order")
    if (error) throw error
    return ((data ?? []) as MilestoneRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      targetDate: r.target_date,
      sortOrder: r.sort_order,
    }))
  },

  async create(input: Omit<Milestone, "id">): Promise<void> {
    const { error } = await db.from(tbl("milestones")).insert({
      name: input.name,
      description: input.description ?? null,
      target_date: input.targetDate,
      sort_order: input.sortOrder,
    })
    if (error) throw error
  },

  async update(id: string, patch: Partial<Omit<Milestone, "id">>): Promise<void> {
    const row: Partial<MilestoneRow> = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.description !== undefined) row.description = patch.description ?? null
    if (patch.targetDate !== undefined) row.target_date = patch.targetDate
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    const { error } = await db.from(tbl("milestones")).update(row).eq("id", id)
    if (error) throw error
  },

  /** Les items rattachés perdent leur jalon (FK on delete set null), leurs dates restent. */
  async remove(id: string): Promise<void> {
    const { error } = await db.from(tbl("milestones")).delete().eq("id", id)
    if (error) throw error
  },
}
