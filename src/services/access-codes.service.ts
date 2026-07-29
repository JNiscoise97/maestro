import { peopleService } from "@/services/people.service"
import { guestsService } from "@/services/guests.service"
import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl } from "@/lib/event"

export interface AccessCodeEntry {
  id: string
  fullName: string
  kind: "fiance" | "guest"
  accessCode: string
  isActive: boolean
}

export const accessCodesService = {
  async list(): Promise<AccessCodeEntry[]> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any).rpc(tbl("list_access_codes") as any)
      if (error) throw error
      return ((data ?? []) as any[]).map((row) => ({
        id: row.id,
        fullName: row.full_name,
        kind: row.kind as "fiance" | "guest",
        accessCode: row.access_code,
        isActive: row.is_active,
      }))
    }

    const [people, guests] = await Promise.all([peopleService.list(), guestsService.listGuests()])
    const entries: AccessCodeEntry[] = []
    for (const p of people) {
      if (p.accessCode) entries.push({ id: p.id, fullName: p.fullName, kind: "fiance", accessCode: p.accessCode, isActive: p.isActive })
    }
    for (const g of guests) {
      if (g.accessCode) entries.push({ id: g.id, fullName: g.fullName, kind: "guest", accessCode: g.accessCode, isActive: g.isActive ?? true })
    }
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "fiance" ? -1 : 1
      return a.fullName.localeCompare(b.fullName)
    })
    return entries
  },
}
