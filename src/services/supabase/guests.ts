import type { Guest, GuestGroup } from "@/types/domain"
import type { GuestsService } from "@/services/guests.service"
import { supabase } from "@/supabase/client"
import { formatDisplayName } from "@/lib/utils"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toGuestGroup(row: { id: string; family_name: string; notes: string | null; sort_order: number }): GuestGroup {
  return { id: row.id, familyName: row.family_name, notes: row.notes, sortOrder: row.sort_order }
}

function toGuest(row: {
  id: string
  group_id: string | null
  first_name: string
  last_name: string
  rsvp_status: Guest["rsvpStatus"]
  dietary_constraints: string | null
  meal_choice: Guest["mealChoice"] | null
  arrival_info: string | null
  departure_info: string | null
  accommodation: string | null
  accommodation_type: Guest["accommodationType"] | null
  travel_mode: Guest["travelMode"] | null
  attending_parents_anniversary: boolean
  attending_montpellier_visit: boolean
  has_vehicle: boolean
  needs_late_transport: boolean
  is_reduced_mobility: boolean
  is_child: boolean
  child_age: number | null
  in_cortege: boolean
  communication_j30_sent: boolean
  communication_j15_sent: boolean
  communication_j3_sent: boolean
  side: Guest["side"] | null
  age_range: string | null
  relation_category: string | null
  city: string | null
  meal_message_sent: boolean
  rsvp_responded_at: string | null
  rsvp_channel: string | null
  needs_accommodation: boolean
  guide_sent: boolean
  address_change_sent: boolean
  reservation_done: boolean
  allergies: string | null
  drinks_alcohol: boolean | null
  cultural_origin: string | null
  primary_language: string | null
  has_ceremonial_role: boolean
  likely_traditional_attire: boolean
  notes: string | null
  is_active: boolean
  introduction_seen: boolean
  assignable: boolean
  paired_with_id: string | null
  parent_id: string | null
  allowed_tabs: string[] | null
  checked_in_at: string | null
  is_unexpected: boolean
  nickname: string | null
  source_guest_id: string | null
  source_attendance: "present" | "declined" | "no-show" | null
}): Guest {
  return {
    id: row.id,
    groupId: row.group_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    fullName: formatDisplayName(`${row.first_name} ${row.last_name}`.trim(), row.nickname),
    rsvpStatus: row.rsvp_status,
    dietaryConstraints: row.dietary_constraints,
    mealChoice: row.meal_choice,
    arrivalInfo: row.arrival_info,
    departureInfo: row.departure_info,
    accommodation: row.accommodation,
    accommodationType: row.accommodation_type,
    travelMode: row.travel_mode,
    attendingParentsAnniversary: row.attending_parents_anniversary,
    attendingMontpellierVisit: row.attending_montpellier_visit,
    hasVehicle: row.has_vehicle,
    needsLateTransport: row.needs_late_transport,
    isReducedMobility: row.is_reduced_mobility,
    isChild: row.is_child,
    childAge: row.child_age,
    inCortege: row.in_cortege,
    communicationJ30Sent: row.communication_j30_sent,
    communicationJ15Sent: row.communication_j15_sent,
    communicationJ3Sent: row.communication_j3_sent,
    side: row.side,
    ageRange: row.age_range,
    relationCategory: row.relation_category,
    city: row.city,
    mealMessageSent: row.meal_message_sent,
    rsvpRespondedAt: row.rsvp_responded_at,
    rsvpChannel: row.rsvp_channel,
    needsAccommodation: row.needs_accommodation,
    guideSent: row.guide_sent,
    addressChangeSent: row.address_change_sent,
    reservationDone: row.reservation_done,
    allergies: row.allergies,
    drinksAlcohol: row.drinks_alcohol,
    culturalOrigin: row.cultural_origin,
    primaryLanguage: row.primary_language,
    hasCeremonialRole: row.has_ceremonial_role,
    likelyTraditionalAttire: row.likely_traditional_attire,
    notes: row.notes,
    // access_code n'est jamais lisible côté client (revoke select, voir 0038) ;
    // un code vide signale à l'UI qu'il est défini mais masqué.
    accessCode: "",
    isActive: row.is_active,
    introductionSeen: row.introduction_seen,
    assignable: row.assignable,
    pairedWithId: row.paired_with_id,
    parentId: row.parent_id,
    allowedTabs: row.allowed_tabs,
    checkedInAt: row.checked_in_at,
    isUnexpected: row.is_unexpected,
    sourceGuestId: row.source_guest_id,
    sourceAttendance: row.source_attendance,
  }
}

export const guestsSupabaseService: GuestsService = {
  async listGroups() {
    const { data, error } = await (db as any).from(tbl("guest_groups") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toGuestGroup)
  },
  async createGroup({ familyName, notes, sortOrder }) {
    const { data, error } = await db
      .from(tbl("guest_groups") as any)
      .insert({ family_name: familyName, notes: notes ?? null, sort_order: sortOrder })
      .select("*")
      .single()
    if (error) throw error
    return toGuestGroup(data)
  },
  async updateGroup(id, patch) {
    const row: Partial<{ family_name: string; notes: string | null; sort_order: number }> = {}
    if (patch.familyName !== undefined) row.family_name = patch.familyName
    if (patch.notes !== undefined) row.notes = patch.notes
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    const { data, error } = await (db as any).from(tbl("guest_groups") as any).update(row).eq("id", id).select("*").single()
    if (error) throw error
    return toGuestGroup(data)
  },
  async deleteGroup(id) {
    // FK group_id -> guest_groups est "on delete set null" (voir 0006_guests_tables.sql) :
    // les invités du groupe sont simplement détachés, pas supprimés.
    const { error } = await (db as any).from(tbl("guest_groups") as any).delete().eq("id", id)
    if (error) throw error
  },
  async listGuests() {
    const { data, error } = await (db as any).from(tbl("guests") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toGuest)
  },
  async createGuest({ firstName, lastName, groupId }) {
    const { data, error } = await db
      .from(tbl("guests") as any)
      .insert({ first_name: firstName, last_name: lastName, group_id: groupId ?? null })
      .select("*")
      .single()
    if (error) throw error
    return toGuest(data)
  },
  async updateGuest(id, patch) {
    const row: Partial<{
      group_id: string | null
      first_name: string
      last_name: string
      rsvp_status: Guest["rsvpStatus"]
      dietary_constraints: string | null
      meal_choice: Guest["mealChoice"] | null
      arrival_info: string | null
      departure_info: string | null
      accommodation: string | null
      accommodation_type: Guest["accommodationType"] | null
      travel_mode: Guest["travelMode"] | null
      attending_parents_anniversary: boolean
      attending_montpellier_visit: boolean
      has_vehicle: boolean
      needs_late_transport: boolean
      is_reduced_mobility: boolean
      is_child: boolean
      child_age: number | null
      in_cortege: boolean
      communication_j30_sent: boolean
      communication_j15_sent: boolean
      communication_j3_sent: boolean
      side: Guest["side"] | null
      age_range: string | null
      relation_category: string | null
      city: string | null
      meal_message_sent: boolean
      rsvp_responded_at: string | null
      rsvp_channel: string | null
      needs_accommodation: boolean
      guide_sent: boolean
      address_change_sent: boolean
      reservation_done: boolean
      allergies: string | null
      drinks_alcohol: boolean | null
      cultural_origin: string | null
      primary_language: string | null
      has_ceremonial_role: boolean
      likely_traditional_attire: boolean
      notes: string | null
      is_active: boolean
      introduction_seen: boolean
      assignable: boolean
      paired_with_id: string | null
      parent_id: string | null
      allowed_tabs: string[] | null
      checked_in_at: string | null
      is_unexpected: boolean
      nickname: string | null
    }> = {}
    if (patch.groupId !== undefined) row.group_id = patch.groupId
    if (patch.firstName !== undefined) row.first_name = patch.firstName
    if (patch.lastName !== undefined) row.last_name = patch.lastName
    if (patch.rsvpStatus !== undefined) row.rsvp_status = patch.rsvpStatus
    if (patch.dietaryConstraints !== undefined) row.dietary_constraints = patch.dietaryConstraints
    if (patch.mealChoice !== undefined) row.meal_choice = patch.mealChoice
    if (patch.arrivalInfo !== undefined) row.arrival_info = patch.arrivalInfo
    if (patch.departureInfo !== undefined) row.departure_info = patch.departureInfo
    if (patch.accommodation !== undefined) row.accommodation = patch.accommodation
    if (patch.accommodationType !== undefined) row.accommodation_type = patch.accommodationType
    if (patch.travelMode !== undefined) row.travel_mode = patch.travelMode
    if (patch.attendingParentsAnniversary !== undefined)
      row.attending_parents_anniversary = patch.attendingParentsAnniversary
    if (patch.attendingMontpellierVisit !== undefined)
      row.attending_montpellier_visit = patch.attendingMontpellierVisit
    if (patch.hasVehicle !== undefined) row.has_vehicle = patch.hasVehicle
    if (patch.needsLateTransport !== undefined) row.needs_late_transport = patch.needsLateTransport
    if (patch.isReducedMobility !== undefined) row.is_reduced_mobility = patch.isReducedMobility
    if (patch.isChild !== undefined) row.is_child = patch.isChild
    if (patch.childAge !== undefined) row.child_age = patch.childAge
    if (patch.inCortege !== undefined) row.in_cortege = patch.inCortege
    if (patch.communicationJ30Sent !== undefined) row.communication_j30_sent = patch.communicationJ30Sent
    if (patch.communicationJ15Sent !== undefined) row.communication_j15_sent = patch.communicationJ15Sent
    if (patch.communicationJ3Sent !== undefined) row.communication_j3_sent = patch.communicationJ3Sent
    if (patch.side !== undefined) row.side = patch.side
    if (patch.ageRange !== undefined) row.age_range = patch.ageRange
    if (patch.relationCategory !== undefined) row.relation_category = patch.relationCategory
    if (patch.city !== undefined) row.city = patch.city
    if (patch.mealMessageSent !== undefined) row.meal_message_sent = patch.mealMessageSent
    if (patch.rsvpRespondedAt !== undefined) row.rsvp_responded_at = patch.rsvpRespondedAt
    if (patch.rsvpChannel !== undefined) row.rsvp_channel = patch.rsvpChannel
    if (patch.needsAccommodation !== undefined) row.needs_accommodation = patch.needsAccommodation
    if (patch.guideSent !== undefined) row.guide_sent = patch.guideSent
    if (patch.addressChangeSent !== undefined) row.address_change_sent = patch.addressChangeSent
    if (patch.reservationDone !== undefined) row.reservation_done = patch.reservationDone
    if (patch.allergies !== undefined) row.allergies = patch.allergies
    if (patch.drinksAlcohol !== undefined) row.drinks_alcohol = patch.drinksAlcohol
    if (patch.culturalOrigin !== undefined) row.cultural_origin = patch.culturalOrigin
    if (patch.primaryLanguage !== undefined) row.primary_language = patch.primaryLanguage
    if (patch.hasCeremonialRole !== undefined) row.has_ceremonial_role = patch.hasCeremonialRole
    if (patch.likelyTraditionalAttire !== undefined) row.likely_traditional_attire = patch.likelyTraditionalAttire
    if (patch.notes !== undefined) row.notes = patch.notes
    if (patch.isActive !== undefined) row.is_active = patch.isActive
    if (patch.introductionSeen !== undefined) row.introduction_seen = patch.introductionSeen
    if (patch.assignable !== undefined) row.assignable = patch.assignable
    if (patch.pairedWithId !== undefined) row.paired_with_id = patch.pairedWithId
    if (patch.parentId !== undefined) row.parent_id = patch.parentId ?? null
    if (patch.allowedTabs !== undefined) row.allowed_tabs = patch.allowedTabs ?? null
    if (patch.checkedInAt !== undefined) row.checked_in_at = patch.checkedInAt
    if (patch.isUnexpected !== undefined) row.is_unexpected = patch.isUnexpected
    if (patch.nickname !== undefined) row.nickname = patch.nickname ?? null
    if (Object.keys(row).length > 0) {
      const { error } = await (db as any).from(tbl("guests") as any).update(row).eq("id", id)
      if (error) throw error
    }
    if (patch.accessCode) {
      const { error } = await db.rpc(tbl("set_guest_access_code") as any, {
        p_guest_id: id,
        p_code: patch.accessCode,
      })
      if (error) throw error
    }
    const { data, error } = await (db as any).from(tbl("guests") as any).select("*").eq("id", id).single()
    if (error) throw error
    return toGuest(data)
  },
  async deleteGuest(id) {
    const { error } = await (db as any).from(tbl("guests") as any).delete().eq("id", id)
    if (error) throw error
  },
  async resolveByAccessCode(code) {
    const { data, error } = await db.rpc(tbl("resolve_guest_access_code") as any, { code })
    if (error) throw error
    const row = data?.[0]
    return row ? toGuest(row) : null
  },
  async getById(id) {
    const { data, error } = await (db as any).from(tbl("guests") as any).select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data ? toGuest(data) : null
  },
  async resetIntroductionSeenForAll() {
    const { error } = await db
      .from(tbl("guests") as any)
      .update({ introduction_seen: false })
      .not("id", "is", null)
    if (error) throw error
  },
  async resetCheckInsForAll() {
    const { error } = await (db as any).from(tbl("guests") as any).update({ checked_in_at: null }).not("id", "is", null)
    if (error) throw error
  },
}
