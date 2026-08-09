import { createMockTable } from "@/services/mock/db"
import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl, mockKey } from "@/lib/event"

export interface Gift {
  id: string
  guestIds: string[]
  description: string
  amount: number | null
  thankyouSent: boolean
  notes: string | null
  createdAt: string
  externalGiverName: string | null
  giftType: string | null
  hasCard: boolean
}

export interface GiftInput {
  guestIds: string[]
  description: string
  amount?: number | null
  thankyouSent?: boolean
  notes?: string | null
  externalGiverName?: string | null
  giftType?: string | null
  hasCard?: boolean
}

export interface GiftPatch {
  description?: string
  amount?: number | null
  thankyouSent?: boolean
  notes?: string | null
  externalGiverName?: string | null
  guestIds?: string[]
  giftType?: string | null
  hasCard?: boolean
}

// ── Mock tables ───────────────────────────────────────────────────────────────

interface GiftRow {
  id: string
  description: string
  amount: number | null
  thankyou_sent: boolean
  notes: string | null
  created_at: string
  external_giver_name: string | null
  gift_type: string | null
  has_card: boolean
}

interface GiftGuestRow {
  id: string
  gift_id: string
  guest_id: string
}

const mockGifts = createMockTable<GiftRow>(mockKey("gifts"), [])
const mockGiftGuests = createMockTable<GiftGuestRow>(mockKey("gift-guests"), [])

function giftRowToGift(row: GiftRow, guestIds: string[]): Gift {
  return {
    id: row.id,
    guestIds,
    description: row.description,
    amount: row.amount,
    thankyouSent: row.thankyou_sent,
    notes: row.notes,
    createdAt: row.created_at,
    externalGiverName: row.external_giver_name,
    giftType: row.gift_type ?? null,
    hasCard: row.has_card ?? false,
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const giftsService = {
  async list(): Promise<Gift[]> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("gifts") as any)
        .select(`*, ${tbl("gift_guests")}(guest_id)`)
        .order("created_at")
      if (error) throw error
      return ((data ?? []) as any[]).map((row) => ({
        id: row.id,
        guestIds: (row[tbl("gift_guests")] as { guest_id: string }[]).map((l) => l.guest_id),
        description: row.description,
        amount: row.amount,
        thankyouSent: row.thankyou_sent,
        notes: row.notes,
        createdAt: row.created_at,
        externalGiverName: row.external_giver_name ?? null,
        giftType: row.gift_type ?? null,
        hasCard: row.has_card ?? false,
      }))
    }
    const giftRows = await mockGifts.getAll()
    const links = await mockGiftGuests.getAll()
    const byGiftId = new Map<string, string[]>()
    for (const l of links) {
      const list = byGiftId.get(l.gift_id) ?? []
      list.push(l.guest_id)
      byGiftId.set(l.gift_id, list)
    }
    return giftRows.map((row) => giftRowToGift(row, byGiftId.get(row.id) ?? []))
  },

  async create(input: GiftInput): Promise<Gift> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("gifts") as any)
        .insert({
          description: input.description,
          amount: input.amount ?? null,
          thankyou_sent: input.thankyouSent ?? false,
          notes: input.notes ?? null,
          external_giver_name: input.externalGiverName ?? null,
          gift_type: input.giftType ?? null,
          has_card: input.hasCard ?? false,
        })
        .select()
        .single()
      if (error) throw error
      const giftId = (data as any).id as string
      if (input.guestIds.length > 0) {
        const { error: linkError } = await (supabase! as any)
          .from(tbl("gift_guests") as any)
          .insert(input.guestIds.map((guestId) => ({ gift_id: giftId, guest_id: guestId })))
        if (linkError) throw linkError
      }
      return giftRowToGift(data as unknown as GiftRow, input.guestIds)
    }
    const row: GiftRow = {
      id: crypto.randomUUID(),
      description: input.description,
      amount: input.amount ?? null,
      thankyou_sent: input.thankyouSent ?? false,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
      external_giver_name: input.externalGiverName ?? null,
      gift_type: input.giftType ?? null,
      has_card: input.hasCard ?? false,
    }
    await mockGifts.insert(row)
    for (const guestId of input.guestIds) {
      await mockGiftGuests.insert({ id: crypto.randomUUID(), gift_id: row.id, guest_id: guestId })
    }
    return giftRowToGift(row, input.guestIds)
  },

  async update(id: string, patch: GiftPatch): Promise<void> {
    if (USE_SUPABASE) {
      const row: Record<string, unknown> = {}
      if (patch.description !== undefined) row.description = patch.description
      if ("amount" in patch) row.amount = patch.amount
      if (patch.thankyouSent !== undefined) row.thankyou_sent = patch.thankyouSent
      if ("notes" in patch) row.notes = patch.notes
      if ("externalGiverName" in patch) row.external_giver_name = patch.externalGiverName
      if ("giftType" in patch) row.gift_type = patch.giftType
      if ("hasCard" in patch) row.has_card = patch.hasCard

      if (Object.keys(row).length > 0) {
        const { error } = await (supabase! as any)
          .from(tbl("gifts") as any)
          .update(row)
          .eq("id", id)
        if (error) throw error
      }

      if ("guestIds" in patch) {
        const { error: delError } = await (supabase! as any)
          .from(tbl("gift_guests") as any)
          .delete()
          .eq("gift_id", id)
        if (delError) throw delError
        if (patch.guestIds!.length > 0) {
          const { error: insError } = await (supabase! as any)
            .from(tbl("gift_guests") as any)
            .insert(patch.guestIds!.map((guestId) => ({ gift_id: id, guest_id: guestId })))
          if (insError) throw insError
        }
      }
      return
    }

    const p: Partial<GiftRow> = {}
    if (patch.description !== undefined) p.description = patch.description
    if ("amount" in patch) p.amount = patch.amount ?? null
    if (patch.thankyouSent !== undefined) p.thankyou_sent = patch.thankyouSent
    if ("notes" in patch) p.notes = patch.notes ?? null
    if ("externalGiverName" in patch) p.external_giver_name = patch.externalGiverName ?? null
    if ("giftType" in patch) p.gift_type = patch.giftType ?? null
    if ("hasCard" in patch) p.has_card = patch.hasCard ?? false
    await mockGifts.update(id, p)

    if ("guestIds" in patch) {
      const links = await mockGiftGuests.getAll()
      for (const l of links.filter((l) => l.gift_id === id)) {
        await mockGiftGuests.remove(l.id)
      }
      for (const guestId of patch.guestIds ?? []) {
        await mockGiftGuests.insert({ id: crypto.randomUUID(), gift_id: id, guest_id: guestId })
      }
    }
  },

  async remove(id: string): Promise<void> {
    if (USE_SUPABASE) {
      const { error } = await (supabase! as any)
        .from(tbl("gifts") as any)
        .delete()
        .eq("id", id)
      if (error) throw error
      return
    }
    await mockGifts.remove(id)
    const links = await mockGiftGuests.getAll()
    for (const l of links.filter((l) => l.gift_id === id)) {
      await mockGiftGuests.remove(l.id)
    }
  },
}
