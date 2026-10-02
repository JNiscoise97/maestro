import type { SequenceStep } from "@/types/domain"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

type StepRow = {
  id: string
  sequence_id: string
  title: string
  description: string | null
  start_date: string | null
  start_time: string | null
  end_date: string | null
  end_time: string | null
  responsible_person_id: string | null
  sort_order: number
  created_at: string
}

function toStep(r: StepRow): SequenceStep {
  return {
    id: r.id,
    sequenceId: r.sequence_id,
    title: r.title,
    description: r.description,
    startDate: r.start_date,
    startTime: r.start_time,
    endDate: r.end_date,
    endTime: r.end_time,
    responsiblePersonId: r.responsible_person_id,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

export const sequenceStepsService = {
  async list(sequenceId: string): Promise<SequenceStep[]> {
    const { data, error } = await db
      .from(tbl("sequence_steps"))
      .select("*")
      .eq("sequence_id", sequenceId)
      .order("sort_order", { ascending: true })
    if (error) throw error
    return ((data ?? []) as StepRow[]).map(toStep)
  },

  async create(payload: {
    sequenceId: string
    title: string
    description?: string | null
    startDate?: string | null
    startTime?: string | null
    endDate?: string | null
    endTime?: string | null
    responsiblePersonId?: string | null
    sortOrder: number
  }): Promise<SequenceStep> {
    const { data, error } = await db
      .from(tbl("sequence_steps"))
      .insert({
        sequence_id: payload.sequenceId,
        title: payload.title,
        description: payload.description ?? null,
        start_date: payload.startDate ?? null,
        start_time: payload.startTime ?? null,
        end_date: payload.endDate ?? null,
        end_time: payload.endTime ?? null,
        responsible_person_id: payload.responsiblePersonId ?? null,
        sort_order: payload.sortOrder,
      })
      .select("*")
      .single()
    if (error) throw error
    return toStep(data as StepRow)
  },

  async update(
    id: string,
    patch: Partial<{
      title: string
      description: string | null
      startDate: string | null
      startTime: string | null
      endDate: string | null
      endTime: string | null
      responsiblePersonId: string | null
      sortOrder: number
    }>
  ): Promise<SequenceStep> {
    const row: Record<string, unknown> = {}
    if (patch.title !== undefined) row.title = patch.title
    if (patch.description !== undefined) row.description = patch.description
    if (patch.startDate !== undefined) row.start_date = patch.startDate
    if (patch.startTime !== undefined) row.start_time = patch.startTime
    if (patch.endDate !== undefined) row.end_date = patch.endDate
    if (patch.endTime !== undefined) row.end_time = patch.endTime
    if (patch.responsiblePersonId !== undefined) row.responsible_person_id = patch.responsiblePersonId
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    const { data, error } = await db
      .from(tbl("sequence_steps"))
      .update(row)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toStep(data as StepRow)
  },

  async delete(id: string): Promise<void> {
    const { error } = await db.from(tbl("sequence_steps")).delete().eq("id", id)
    if (error) throw error
  },

  async reorder(steps: Pick<SequenceStep, "id" | "sortOrder">[]): Promise<void> {
    await Promise.all(steps.map((s) => sequenceStepsService.update(s.id, { sortOrder: s.sortOrder })))
  },
}
