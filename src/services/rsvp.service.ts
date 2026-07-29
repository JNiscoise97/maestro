import { createMockTable } from "@/services/mock/db"
import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl, mockKey } from "@/lib/event"

export type Attendance = "yes" | "probably" | "probably-not" | "no"
export type Wave = "annonce" | "invitation"

export interface RsvpResponse {
  id: string
  wave: Wave
  name: string
  attendance: Attendance
  adults: number | null
  children: number | null
  message: string | null
  cityOfOrigin: string | null
  needsAccommodation: boolean | null
  daysAttending: string[] | null
  dietaryConstraints: string | null
  guestId: string | null
  processed: boolean
  createdAt: string
}

export interface RsvpInput {
  wave: Wave
  name: string
  attendance: Attendance
  adults?: number | null
  children?: number | null
  message?: string | null
  cityOfOrigin?: string | null
  needsAccommodation?: boolean | null
  daysAttending?: string[] | null
  dietaryConstraints?: string | null
}

interface RsvpRow {
  id: string
  wave: string
  name: string
  attendance: string
  adults: number | null
  children: number | null
  message: string | null
  city_of_origin: string | null
  needs_accommodation: boolean | null
  days_attending: string[] | null
  dietary_constraints: string | null
  guest_id: string | null
  processed: boolean
  created_at: string
}

const mockRsvp = createMockTable<RsvpRow>(mockKey("rsvp-responses"), [])

function rowToRsvp(row: RsvpRow): RsvpResponse {
  return {
    id: row.id,
    wave: row.wave as Wave,
    name: row.name,
    attendance: row.attendance as Attendance,
    adults: row.adults,
    children: row.children,
    message: row.message,
    cityOfOrigin: row.city_of_origin,
    needsAccommodation: row.needs_accommodation,
    daysAttending: row.days_attending,
    dietaryConstraints: row.dietary_constraints,
    guestId: row.guest_id,
    processed: row.processed,
    createdAt: row.created_at,
  }
}

export const rsvpService = {
  async create(input: RsvpInput): Promise<RsvpResponse> {
    const withCount = input.attendance === "yes" || input.attendance === "probably"

    const payload = {
      wave:                 input.wave,
      name:                 input.name,
      attendance:           input.attendance,
      adults:               withCount ? (input.adults ?? 1) : null,
      children:             withCount ? (input.children ?? 0) : null,
      message:              input.message ?? null,
      city_of_origin:       input.cityOfOrigin ?? null,
      needs_accommodation:  input.needsAccommodation ?? null,
      days_attending:       input.daysAttending ?? null,
      dietary_constraints:  input.dietaryConstraints ?? null,
    }

    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("rsvp_responses") as any)
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return rowToRsvp(data as RsvpRow)
    }

    const row: RsvpRow = {
      id: crypto.randomUUID(),
      ...payload,
      guest_id: null,
      processed: false,
      created_at: new Date().toISOString(),
    }
    await mockRsvp.insert(row)
    return rowToRsvp(row)
  },

  async reset(): Promise<void> {
    if (USE_SUPABASE) {
      const { error } = await (supabase! as any)
        .from(tbl("rsvp_responses") as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
      if (error) throw error
      return
    }
    const rows = await mockRsvp.getAll()
    await Promise.all(rows.map((r) => mockRsvp.remove(r.id)))
  },

  async markProcessed(id: string, processed: boolean): Promise<void> {
    if (USE_SUPABASE) {
      const { error } = await (supabase! as any)
        .from(tbl("rsvp_responses") as any)
        .update({ processed })
        .eq("id", id)
      if (error) throw error
      return
    }
    await mockRsvp.update(id, { processed })
  },

  async list(): Promise<RsvpResponse[]> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("rsvp_responses") as any)
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return ((data ?? []) as any[]).map(rowToRsvp)
    }
    const rows = await mockRsvp.getAll()
    return rows.map(rowToRsvp)
  },
}
