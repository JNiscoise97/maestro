import { supabase } from "@/supabase/client"
import type { AppSettings, SettingsService } from "@/services/settings.service"
import { tbl } from "@/lib/event"

const db = supabase! as any

function rowToSettings(row: {
  event_name: string
  event_date: string
  event_type: string
  main_end: string | null
  main_time: string | null
  main_end_time: string | null
  setup_start: string | null
  setup_end: string | null
  setup_time: string | null
  setup_end_time: string | null
  cleanup_start: string | null
  cleanup_end: string | null
  cleanup_time: string | null
  cleanup_end_time: string | null
}): AppSettings {
  return {
    eventName: row.event_name,
    eventDate: row.event_date,
    eventType: (row.event_type ?? "fiancailles") as AppSettings["eventType"],
    mainEnd: row.main_end ?? undefined,
    mainTime: row.main_time ?? undefined,
    mainEndTime: row.main_end_time ?? undefined,
    setupStart: row.setup_start ?? undefined,
    setupEnd: row.setup_end ?? undefined,
    setupTime: row.setup_time ?? undefined,
    setupEndTime: row.setup_end_time ?? undefined,
    cleanupStart: row.cleanup_start ?? undefined,
    cleanupEnd: row.cleanup_end ?? undefined,
    cleanupTime: row.cleanup_time ?? undefined,
    cleanupEndTime: row.cleanup_end_time ?? undefined,
  }
}

export const settingsSupabaseService: SettingsService = {
  async get() {
    const { data, error } = await db
      .from(tbl("app_settings") as any)
      .select("*")
      .eq("id", "singleton")
      .single()
    if (error) throw error
    return rowToSettings(data)
  },

  async update(patch) {
    const fields: Partial<{
      updated_at: string
      event_name: string
      event_date: string
      event_type: string
      main_end: string | null
      main_time: string | null
      main_end_time: string | null
      setup_start: string | null
      setup_end: string | null
      setup_time: string | null
      setup_end_time: string | null
      cleanup_start: string | null
      cleanup_end: string | null
      cleanup_time: string | null
      cleanup_end_time: string | null
    }> = { updated_at: new Date().toISOString() }
    if (patch.eventName !== undefined)    fields.event_name       = patch.eventName
    if (patch.eventDate !== undefined)    fields.event_date       = patch.eventDate
    if (patch.eventType !== undefined)    fields.event_type       = patch.eventType
    if ("mainEnd"        in patch)        fields.main_end         = patch.mainEnd        ?? null
    if ("mainTime"       in patch)        fields.main_time        = patch.mainTime       ?? null
    if ("mainEndTime"    in patch)        fields.main_end_time    = patch.mainEndTime    ?? null
    if ("setupStart"     in patch)        fields.setup_start      = patch.setupStart     ?? null
    if ("setupEnd"       in patch)        fields.setup_end        = patch.setupEnd       ?? null
    if ("setupTime"      in patch)        fields.setup_time       = patch.setupTime      ?? null
    if ("setupEndTime"   in patch)        fields.setup_end_time   = patch.setupEndTime   ?? null
    if ("cleanupStart"   in patch)        fields.cleanup_start    = patch.cleanupStart   ?? null
    if ("cleanupEnd"     in patch)        fields.cleanup_end      = patch.cleanupEnd     ?? null
    if ("cleanupTime"    in patch)        fields.cleanup_time     = patch.cleanupTime    ?? null
    if ("cleanupEndTime" in patch)        fields.cleanup_end_time = patch.cleanupEndTime ?? null

    const { data, error } = await db
      .from(tbl("app_settings") as any)
      .update(fields)
      .eq("id", "singleton")
      .select("*")
      .single()
    if (error) throw error
    return rowToSettings(data)
  },
}
