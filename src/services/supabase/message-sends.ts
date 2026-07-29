import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl } from "@/lib/event"

export interface MessageSend {
  id: string
  messageId: string
  guestId: string | null
  personId: string | null
  sentAt: string
}

function toSend(r: { id: string; message_id: string; guest_id: string | null; person_id: string | null; sent_at: string }): MessageSend {
  return { id: r.id, messageId: r.message_id, guestId: r.guest_id, personId: r.person_id, sentAt: r.sent_at }
}

export const messageSendsService = {
  async listForMessage(messageId: string): Promise<MessageSend[]> {
    if (!USE_SUPABASE) return []
    const { data, error } = await supabase!
      .from(tbl("message_sends") as any)
      .select("*")
      .eq("message_id", messageId)
    if (error) throw error
    return ((data ?? []) as unknown as Parameters<typeof toSend>[0][]).map(toSend)
  },

  async mark(messageId: string, guestId?: string, personId?: string): Promise<MessageSend> {
    const { data, error } = await supabase!
      .from(tbl("message_sends") as any)
      .insert({ message_id: messageId, guest_id: guestId ?? null, person_id: personId ?? null })
      .select()
      .single()
    if (error) throw error
    return toSend(data as unknown as Parameters<typeof toSend>[0])
  },

  async unmark(id: string): Promise<void> {
    const { error } = await supabase!
      .from(tbl("message_sends") as any)
      .delete()
      .eq("id", id)
    if (error) throw error
  },
}
