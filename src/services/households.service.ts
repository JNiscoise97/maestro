import type { Household } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { supabase, USE_SUPABASE } from "@/supabase/client"
import { mockKey, tbl } from "@/lib/event"
import { guestsService } from "@/services/guests.service"

/**
 * Foyers (une invitation par foyer) — voir 0179_retour_foyers.sql.
 * Les membres d'un foyer sont les invités dont `householdId` pointe sur lui.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any
const mockHouseholds = createMockTable<Household>(mockKey("households"), [])

type Row = { id: string; group_id: string | null; label: string | null; notes: string | null; sort_order: number | null }
const fromRow = (r: Row): Household => ({ id: r.id, groupId: r.group_id, label: r.label, notes: r.notes, sortOrder: r.sort_order ?? 0 })

export type HouseholdPatch = Partial<Pick<Household, "groupId" | "label" | "notes" | "sortOrder">>

/** Rattache des invités à un foyer (ou les détache avec null). */
async function setGuestsHousehold(guestIds: string[], householdId: string | null): Promise<void> {
  if (!guestIds.length) return
  if (!USE_SUPABASE) { await Promise.all(guestIds.map((id) => guestsService.updateGuest(id, { householdId }))); return }
  const { error } = await db.from(tbl("guests")).update({ household_id: householdId }).in("id", guestIds)
  if (error) throw error
}

export const householdsService = {
  async list(): Promise<Household[]> {
    if (!USE_SUPABASE) return mockHouseholds.getAll()
    const { data, error } = await db.from(tbl("households")).select("*")
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromRow)
  },

  /** Crée un foyer et y rattache les invités donnés. */
  async create(input: { groupId: string | null; label?: string | null; sortOrder?: number }, memberIds: string[]): Promise<Household> {
    if (!USE_SUPABASE) {
      const h = await mockHouseholds.insert({ id: crypto.randomUUID(), groupId: input.groupId, label: input.label ?? null, notes: null, sortOrder: input.sortOrder ?? 0 })
      await setGuestsHousehold(memberIds, h.id)
      return h
    }
    const { data, error } = await db.from(tbl("households"))
      .insert({ group_id: input.groupId, label: input.label ?? null, sort_order: input.sortOrder ?? 0 }).select("*").single()
    if (error) throw error
    await setGuestsHousehold(memberIds, data.id)
    return fromRow(data)
  },

  async update(id: string, patch: HouseholdPatch): Promise<void> {
    if (!USE_SUPABASE) { await mockHouseholds.update(id, patch); return }
    const row: Record<string, unknown> = {}
    if (patch.groupId !== undefined) row.group_id = patch.groupId
    if (patch.label !== undefined) row.label = patch.label
    if (patch.notes !== undefined) row.notes = patch.notes
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    if (!Object.keys(row).length) return
    const { error } = await db.from(tbl("households")).update(row).eq("id", id)
    if (error) throw error
  },

  /** Supprime le foyer ; ses membres redeviennent « sans foyer » (on delete set null). */
  async remove(id: string): Promise<void> {
    if (!USE_SUPABASE) { await mockHouseholds.remove(id); return }
    const { error } = await db.from(tbl("households")).delete().eq("id", id)
    if (error) throw error
  },

  setGuestsHousehold,
}
