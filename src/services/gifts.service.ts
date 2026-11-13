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
  /** Cadeau anticipé : finance des dépenses du budget (affectations dans le budget). */
  anticipated: boolean
  /** Promis mais pas encore versé : ne compte pas dans « Offert ». */
  promised: boolean
  receivedOn: string | null
  /** Compte où l'argent est arrivé (Commun, Sarah…). */
  account: string | null
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
  anticipated?: boolean
  promised?: boolean
  receivedOn?: string | null
  account?: string | null
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
  anticipated?: boolean
  promised?: boolean
  receivedOn?: string | null
  account?: string | null
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
  anticipated?: boolean
  promised?: boolean
  received_on?: string | null
  account?: string | null
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
    amount: row.amount == null ? null : Number(row.amount),
    thankyouSent: row.thankyou_sent,
    notes: row.notes,
    createdAt: row.created_at,
    externalGiverName: row.external_giver_name ?? null,
    giftType: row.gift_type ?? null,
    hasCard: row.has_card ?? false,
    anticipated: row.anticipated ?? false,
    promised: row.promised ?? false,
    receivedOn: row.received_on ?? null,
    account: row.account ?? null,
  }
}

/** Colonnes communes à l'insertion (Supabase et mock). */
function inputToRow(input: GiftInput) {
  return {
    description: input.description,
    amount: input.amount ?? null,
    thankyou_sent: input.thankyouSent ?? false,
    notes: input.notes ?? null,
    external_giver_name: input.externalGiverName ?? null,
    gift_type: input.giftType ?? null,
    has_card: input.hasCard ?? false,
    anticipated: input.anticipated ?? false,
    promised: input.promised ?? false,
    received_on: input.receivedOn ?? null,
    account: input.account ?? null,
  }
}

/** Colonnes modifiées par un patch. */
function patchToRow(patch: GiftPatch): Partial<GiftRow> {
  const row: Partial<GiftRow> = {}
  if (patch.description !== undefined) row.description = patch.description
  if ("amount" in patch) row.amount = patch.amount ?? null
  if (patch.thankyouSent !== undefined) row.thankyou_sent = patch.thankyouSent
  if ("notes" in patch) row.notes = patch.notes ?? null
  if ("externalGiverName" in patch) row.external_giver_name = patch.externalGiverName ?? null
  if ("giftType" in patch) row.gift_type = patch.giftType ?? null
  if ("hasCard" in patch) row.has_card = patch.hasCard ?? false
  if ("anticipated" in patch) row.anticipated = patch.anticipated ?? false
  if ("promised" in patch) row.promised = patch.promised ?? false
  if ("receivedOn" in patch) row.received_on = patch.receivedOn ?? null
  if ("account" in patch) row.account = patch.account ?? null
  return row
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
      return ((data ?? []) as any[]).map((row) =>
        giftRowToGift(row as GiftRow, (row[tbl("gift_guests")] as { guest_id: string }[]).map((l) => l.guest_id)))
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
        .insert(inputToRow(input))
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
    const row: GiftRow = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...inputToRow(input) }
    await mockGifts.insert(row)
    for (const guestId of input.guestIds) {
      await mockGiftGuests.insert({ id: crypto.randomUUID(), gift_id: row.id, guest_id: guestId })
    }
    return giftRowToGift(row, input.guestIds)
  },

  async update(id: string, patch: GiftPatch): Promise<void> {
    if (USE_SUPABASE) {
      const row = patchToRow(patch)

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

    await mockGifts.update(id, patchToRow(patch))

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
