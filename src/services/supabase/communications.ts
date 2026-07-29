import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl } from "@/lib/event"

export interface Communication {
  id: string
  name: string
  description: string | null
  sortOrder: number
  createdAt: string
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
}): Communication {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
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

  async create(name: string, description: string | null): Promise<Communication> {
    const { data, error } = await supabase!
      .from(tbl("communications") as any)
      .insert({ name, description, sort_order: Date.now() })
      .select()
      .single()
    if (error) throw error
    return toComm(data as unknown as Parameters<typeof toComm>[0])
  },

  async update(id: string, patch: { name?: string; description?: string | null }): Promise<void> {
    const { error } = await supabase!
      .from(tbl("communications") as any)
      .update(patch)
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
}
