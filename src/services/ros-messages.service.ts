import type { MissionAcceptanceStatus, RosDelivererType, RosDeliveryMode, RosMessage, RosRecipientType } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { rosMessagesSeed } from "@/services/mock/data/ros-messages"
import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl, mockKey } from "@/lib/event"

const mock = createMockTable<RosMessage>(mockKey("ros-messages"), rosMessagesSeed)

function rowToMsg(r: {
  id: string; step_id: string; subject: string | null; content: string
  sort_order: number; sent_at: string | null; delivery_mode: string | null
  deliverer_type: string | null; deliverer_guest_id: string | null
  deliverer_person_id: string | null; recipient_type: string | null
  recipient_guest_id: string | null; recipient_person_id: string | null
  recipient_label: string | null; scheduled_time: string | null
  deliverer_status: string | null
  not_delivered: boolean | null
}): RosMessage {
  return {
    id: r.id,
    stepId: r.step_id,
    subject: r.subject,
    content: r.content,
    sortOrder: r.sort_order,
    sentAt: r.sent_at,
    deliveryMode: r.delivery_mode as RosDeliveryMode | null,
    delivererType: r.deliverer_type as RosDelivererType | null,
    delivererGuestId: r.deliverer_guest_id,
    delivererPersonId: r.deliverer_person_id,
    recipientType: r.recipient_type as RosRecipientType | null,
    recipientGuestId: r.recipient_guest_id,
    recipientPersonId: r.recipient_person_id,
    recipientLabel: r.recipient_label,
    scheduledTime: r.scheduled_time,
    delivererStatus: r.deliverer_status as MissionAcceptanceStatus | null,
    notDelivered: r.not_delivered,
  }
}

export interface RosMessageInput {
  stepId: string
  subject?: string | null
  content: string
  sortOrder?: number
  deliveryMode?: RosDeliveryMode | null
  delivererType?: RosDelivererType | null
  delivererGuestId?: string | null
  delivererPersonId?: string | null
  recipientType?: RosRecipientType | null
  recipientGuestId?: string | null
  recipientPersonId?: string | null
  recipientLabel?: string | null
  scheduledTime?: string | null
}

export interface RosMessagePatch {
  subject?: string | null
  content?: string
  sentAt?: string | null
  sortOrder?: number
  deliveryMode?: RosDeliveryMode | null
  delivererType?: RosDelivererType | null
  delivererGuestId?: string | null
  delivererPersonId?: string | null
  recipientType?: RosRecipientType | null
  recipientGuestId?: string | null
  recipientPersonId?: string | null
  recipientLabel?: string | null
  scheduledTime?: string | null
  delivererStatus?: MissionAcceptanceStatus | null
  notDelivered?: boolean | null
}

export const rosMessagesService = {
  async list(): Promise<RosMessage[]> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("ros_messages") as any)
        .select("*")
        .order("sort_order")
      if (error) throw error
      return (data ?? []).map(rowToMsg)
    }
    return mock.getAll()
  },

  async create(input: RosMessageInput): Promise<RosMessage> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("ros_messages") as any)
        .insert({
          step_id: input.stepId,
          subject: input.subject ?? null,
          content: input.content,
          sort_order: input.sortOrder ?? 0,
          delivery_mode: input.deliveryMode ?? null,
          deliverer_type: input.delivererType ?? null,
          deliverer_guest_id: input.delivererGuestId ?? null,
          deliverer_person_id: input.delivererPersonId ?? null,
          recipient_type: input.recipientType ?? null,
          recipient_guest_id: input.recipientGuestId ?? null,
          recipient_person_id: input.recipientPersonId ?? null,
          recipient_label: input.recipientLabel ?? null,
          scheduled_time: input.scheduledTime ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return rowToMsg(data)
    }
    const msg: RosMessage = {
      id: crypto.randomUUID(),
      stepId: input.stepId,
      subject: input.subject ?? null,
      content: input.content,
      sortOrder: input.sortOrder ?? 0,
      sentAt: null,
      deliveryMode: input.deliveryMode ?? null,
      delivererType: input.delivererType ?? null,
      delivererGuestId: input.delivererGuestId ?? null,
      delivererPersonId: input.delivererPersonId ?? null,
      recipientType: input.recipientType ?? null,
      recipientGuestId: input.recipientGuestId ?? null,
      recipientPersonId: input.recipientPersonId ?? null,
      recipientLabel: input.recipientLabel ?? null,
      scheduledTime: input.scheduledTime ?? null,
      delivererStatus: null,
      notDelivered: null,
    }
    return mock.insert(msg)
  },

  async update(id: string, patch: RosMessagePatch): Promise<void> {
    if (USE_SUPABASE) {
      const row: {
        subject?: string | null; content?: string; sent_at?: string | null
        sort_order?: number; delivery_mode?: string | null
        deliverer_type?: string | null; deliverer_guest_id?: string | null
        deliverer_person_id?: string | null; recipient_type?: string | null
        recipient_guest_id?: string | null; recipient_person_id?: string | null
        recipient_label?: string | null; scheduled_time?: string | null
        deliverer_status?: string | null
        not_delivered?: boolean | null
      } = {}
      if ("subject" in patch) row.subject = patch.subject
      if (patch.content !== undefined) row.content = patch.content
      if ("sentAt" in patch) row.sent_at = patch.sentAt
      if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
      if ("deliveryMode" in patch) row.delivery_mode = patch.deliveryMode
      if ("delivererType" in patch) row.deliverer_type = patch.delivererType
      if ("delivererGuestId" in patch) row.deliverer_guest_id = patch.delivererGuestId
      if ("delivererPersonId" in patch) row.deliverer_person_id = patch.delivererPersonId
      if ("recipientType" in patch) row.recipient_type = patch.recipientType
      if ("recipientGuestId" in patch) row.recipient_guest_id = patch.recipientGuestId
      if ("recipientPersonId" in patch) row.recipient_person_id = patch.recipientPersonId
      if ("recipientLabel" in patch) row.recipient_label = patch.recipientLabel
      if ("scheduledTime" in patch) row.scheduled_time = patch.scheduledTime
      if ("delivererStatus" in patch) row.deliverer_status = patch.delivererStatus ?? null
      if ("notDelivered" in patch) row.not_delivered = patch.notDelivered ?? null
      const { error } = await (supabase! as any).from(tbl("ros_messages") as any).update(row).eq("id", id)
      if (error) throw error
      return
    }
    const mockPatch: Partial<RosMessage> = {}
    if ("subject" in patch) mockPatch.subject = patch.subject ?? null
    if (patch.content !== undefined) mockPatch.content = patch.content
    if ("sentAt" in patch) mockPatch.sentAt = patch.sentAt ?? null
    if (patch.sortOrder !== undefined) mockPatch.sortOrder = patch.sortOrder
    if ("deliveryMode" in patch) mockPatch.deliveryMode = patch.deliveryMode ?? null
    if ("delivererType" in patch) mockPatch.delivererType = patch.delivererType ?? null
    if ("delivererGuestId" in patch) mockPatch.delivererGuestId = patch.delivererGuestId ?? null
    if ("delivererPersonId" in patch) mockPatch.delivererPersonId = patch.delivererPersonId ?? null
    if ("recipientType" in patch) mockPatch.recipientType = patch.recipientType ?? null
    if ("recipientGuestId" in patch) mockPatch.recipientGuestId = patch.recipientGuestId ?? null
    if ("recipientPersonId" in patch) mockPatch.recipientPersonId = patch.recipientPersonId ?? null
    if ("recipientLabel" in patch) mockPatch.recipientLabel = patch.recipientLabel ?? null
    if ("scheduledTime" in patch) mockPatch.scheduledTime = patch.scheduledTime ?? null
    if ("delivererStatus" in patch) mockPatch.delivererStatus = patch.delivererStatus ?? null
    if ("notDelivered" in patch) mockPatch.notDelivered = patch.notDelivered ?? null
    await mock.update(id, mockPatch)
  },

  async remove(id: string): Promise<void> {
    if (USE_SUPABASE) {
      const { error } = await (supabase! as any).from(tbl("ros_messages") as any).delete().eq("id", id)
      if (error) throw error
      return
    }
    await mock.remove(id)
  },
}
