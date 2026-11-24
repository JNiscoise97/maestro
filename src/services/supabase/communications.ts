import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl } from "@/lib/event"

export interface Communication {
  id: string
  name: string
  description: string | null
  sortOrder: number
  createdAt: string
  targetRsvpStatuses: string[] | null
  targetProspectStatuses: string[] | null
}

/** Qui se charge de l'envoi : Jordan, Sarah, ou les deux ensemble (« à deux »). */
export type CommSender = "jordan" | "sarah" | "both"

/** Préparation de l'envoi d'une communication à un invité (migration 0184). */
export interface CommunicationPrep {
  guestId: string
  ready: boolean
  sender: CommSender | null
  /** Hors envoi : ne recevra pas cette communication (migration 0186). Absent : non modifié à l'enregistrement. */
  excluded?: boolean
}

export interface CommunicationSend {
  id: string
  communicationId: string
  guestId: string
  sentAt: string
}

function toComm(r: {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
  target_rsvp_statuses: string[] | null
  target_prospect_statuses: string[] | null
}): Communication {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    targetRsvpStatuses: r.target_rsvp_statuses,
    targetProspectStatuses: r.target_prospect_statuses,
  }
}

function toSend(r: {
  id: string
  communication_id: string
  guest_id: string
  sent_at: string
}): CommunicationSend {
  return { id: r.id, communicationId: r.communication_id, guestId: r.guest_id, sentAt: r.sent_at }
}

export const communicationsService = {
  async list(): Promise<Communication[]> {
    if (!USE_SUPABASE) return []
    const { data, error } = await supabase!
      .from(tbl("communications") as any)
      .select("*")
      .order("sort_order")
    if (error) throw error
    return ((data ?? []) as unknown as Parameters<typeof toComm>[0][]).map(toComm)
  },

  async create(name: string, description: string | null, targetRsvpStatuses?: string[] | null, targetProspectStatuses?: string[] | null): Promise<Communication> {
    const { data, error } = await supabase!
      .from(tbl("communications") as any)
      .insert({ name, description, sort_order: Date.now(), target_rsvp_statuses: targetRsvpStatuses ?? null, target_prospect_statuses: targetProspectStatuses ?? null })
      .select()
      .single()
    if (error) throw error
    return toComm(data as unknown as Parameters<typeof toComm>[0])
  },

  async update(id: string, patch: { name?: string; description?: string | null; targetRsvpStatuses?: string[] | null; targetProspectStatuses?: string[] | null }): Promise<void> {
    const { name, description, targetRsvpStatuses, targetProspectStatuses } = patch
    const { error } = await supabase!
      .from(tbl("communications") as any)
      .update({ name, description, target_rsvp_statuses: targetRsvpStatuses, target_prospect_statuses: targetProspectStatuses })
      .eq("id", id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase!
      .from(tbl("communications") as any)
      .delete()
      .eq("id", id)
    if (error) throw error
  },

  async listSends(communicationId: string): Promise<CommunicationSend[]> {
    if (!USE_SUPABASE) return []
    const { data, error } = await supabase!
      .from(tbl("communication_sends") as any)
      .select("*")
      .eq("communication_id", communicationId)
    if (error) throw error
    return ((data ?? []) as unknown as Parameters<typeof toSend>[0][]).map(toSend)
  },

  async markSent(communicationId: string, guestId: string): Promise<CommunicationSend> {
    const { data, error } = await supabase!
      .from(tbl("communication_sends") as any)
      .insert({ communication_id: communicationId, guest_id: guestId })
      .select()
      .single()
    if (error) throw error
    return toSend(data as unknown as Parameters<typeof toSend>[0])
  },

  async unmarkSent(id: string): Promise<void> {
    const { error } = await supabase!
      .from(tbl("communication_sends") as any)
      .delete()
      .eq("id", id)
    if (error) throw error
  },

  async listPrep(communicationId: string): Promise<CommunicationPrep[]> {
    if (!USE_SUPABASE) return []
    const { data, error } = await supabase!
      .from(tbl("communication_prep") as any)
      .select("*")
      .eq("communication_id", communicationId)
    if (error) throw error
    return ((data ?? []) as unknown as { guest_id: string; ready: boolean; sender: CommSender | null; excluded?: boolean }[])
      .map((r) => ({ guestId: r.guest_id, ready: r.ready, sender: r.sender, excluded: r.excluded ?? false }))
  },

  /** Enregistre la préparation de plusieurs invités (un invité et son inséparable) : valeurs complètes. */
  async savePrep(communicationId: string, rows: CommunicationPrep[]): Promise<void> {
    if (!rows.length) return
    const { error } = await supabase!
      .from(tbl("communication_prep") as any)
      .upsert(rows.map((r) => ({
        communication_id: communicationId, guest_id: r.guestId, ready: r.ready, sender: r.sender,
        // Colonne de la migration 0186 : envoyée seulement si utilisée (l'écran marche aussi sans la migration).
        ...(r.excluded !== undefined ? { excluded: r.excluded } : {}),
        updated_at: new Date().toISOString(),
      })), { onConflict: "communication_id,guest_id" })
    if (error) throw error
  },

  async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        supabase!.from(tbl("communications") as any).update({ sort_order: sortOrder }).eq("id", id)
      )
    )
  },
}
