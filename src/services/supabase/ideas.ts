import type { Idea, IdeaSource, IdeaStatus } from "@/types/domain"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

type IdeaRow = {
  id: string
  title: string
  description: string | null
  source: IdeaSource
  source_detail: string | null
  category: string | null
  status: IdeaStatus
  notes: string | null
  created_at: string
}

function toIdea(r: IdeaRow): Idea {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    source: r.source,
    sourceDetail: r.source_detail,
    category: r.category,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
  }
}

export const ideasService = {
  async list(): Promise<Idea[]> {
    const { data, error } = await db
      .from(tbl("ideas") as any)
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return ((data ?? []) as IdeaRow[]).map(toIdea)
  },

  async create(payload: {
    title: string
    description?: string | null
    source: IdeaSource
    sourceDetail?: string | null
    category?: string | null
    status?: IdeaStatus
    notes?: string | null
  }): Promise<Idea> {
    const { data, error } = await db
      .from(tbl("ideas") as any)
      .insert({
        title: payload.title,
        description: payload.description ?? null,
        source: payload.source,
        source_detail: payload.sourceDetail ?? null,
        category: payload.category ?? null,
        status: payload.status ?? "to_study",
        notes: payload.notes ?? null,
      })
      .select("*")
      .single()
    if (error) throw error
    return toIdea(data as IdeaRow)
  },

  async update(id: string, patch: Partial<{
    title: string
    description: string | null
    source: IdeaSource
    sourceDetail: string | null
    category: string | null
    status: IdeaStatus
    notes: string | null
  }>): Promise<Idea> {
    const row: Partial<Record<string, unknown>> = {}
    if (patch.title !== undefined) row.title = patch.title
    if (patch.description !== undefined) row.description = patch.description
    if (patch.source !== undefined) row.source = patch.source
    if (patch.sourceDetail !== undefined) row.source_detail = patch.sourceDetail
    if (patch.category !== undefined) row.category = patch.category
    if (patch.status !== undefined) row.status = patch.status
    if (patch.notes !== undefined) row.notes = patch.notes
    const { data, error } = await db
      .from(tbl("ideas") as any)
      .update(row)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toIdea(data as IdeaRow)
  },

  async delete(id: string): Promise<void> {
    const { error } = await db.from(tbl("ideas") as any).delete().eq("id", id)
    if (error) throw error
  },
}
