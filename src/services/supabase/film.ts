import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export type FilmConfig = {
  videoUrl: string | null
}

export type FilmGroup = {
  id: string
  name: string
  code: string
  introMessage: string | null
  sortOrder: number
}

export type FilmView = {
  id: string
  groupId: string
  groupName: string
  viewerName: string
  playedAt: string
}

function fromGroup(r: any): FilmGroup {
  return {
    id:           r.id,
    name:         r.name,
    code:         r.code,
    introMessage: r.intro_message ?? null,
    sortOrder:    r.sort_order ?? 0,
  }
}

export const filmService = {

  async getConfig(): Promise<FilmConfig> {
    const { data, error } = await db
      .from(tbl("film_config"))
      .select("*")
      .eq("id", "main")
      .maybeSingle()
    if (error) throw error
    return { videoUrl: data?.video_url ?? null }
  },

  async setConfig(config: FilmConfig): Promise<void> {
    const { error } = await db
      .from(tbl("film_config"))
      .upsert({ id: "main", video_url: config.videoUrl, updated_at: new Date().toISOString() })
    if (error) throw error
  },

  async listGroups(): Promise<FilmGroup[]> {
    const { data, error } = await db
      .from(tbl("film_groups"))
      .select("*")
      .order("sort_order")
      .order("created_at")
    if (error) throw error
    return (data ?? []).map(fromGroup)
  },

  async createGroup(group: Omit<FilmGroup, "id">): Promise<FilmGroup> {
    const { data, error } = await db
      .from(tbl("film_groups"))
      .insert({
        name:          group.name,
        code:          group.code,
        intro_message: group.introMessage,
        sort_order:    group.sortOrder,
      })
      .select()
      .single()
    if (error) throw error
    return fromGroup(data)
  },

  async updateGroup(id: string, patch: Partial<Omit<FilmGroup, "id">>): Promise<void> {
    const row: Record<string, unknown> = {}
    if (patch.name         !== undefined) row.name          = patch.name
    if (patch.code         !== undefined) row.code          = patch.code
    if (patch.introMessage !== undefined) row.intro_message = patch.introMessage
    if (patch.sortOrder    !== undefined) row.sort_order    = patch.sortOrder
    if (!Object.keys(row).length) return
    const { error } = await db.from(tbl("film_groups")).update(row).eq("id", id)
    if (error) throw error
  },

  async deleteGroup(id: string): Promise<void> {
    const { error } = await db.from(tbl("film_groups")).delete().eq("id", id)
    if (error) throw error
  },

  async validateCode(code: string): Promise<FilmGroup | null> {
    const { data, error } = await db
      .from(tbl("film_groups"))
      .select("*")
      .ilike("code", code.trim())
      .maybeSingle()
    if (error) throw error
    return data ? fromGroup(data) : null
  },

  async logView(groupId: string, viewerName: string): Promise<void> {
    const { error } = await db
      .from(tbl("film_views"))
      .insert({ group_id: groupId, viewer_name: viewerName })
    if (error) throw error
  },

  async listViews(): Promise<FilmView[]> {
    const [{ data: views, error: e1 }, { data: groups, error: e2 }] = await Promise.all([
      db.from(tbl("film_views")).select("*").order("played_at", { ascending: false }),
      db.from(tbl("film_groups")).select("id, name"),
    ])
    if (e1) throw e1
    if (e2) throw e2
    const groupMap = new Map<string, string>((groups ?? []).map((g: any) => [g.id, g.name]))
    return (views ?? []).map((r: any) => ({
      id:          r.id,
      groupId:     r.group_id,
      groupName:   groupMap.get(r.group_id) ?? "—",
      viewerName:  r.viewer_name,
      playedAt:    r.played_at,
    }))
  },
}
