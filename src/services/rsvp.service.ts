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
  /** Invitation en ligne : nombre de personnes, leurs noms (une ligne chacune), confirmation horaire, séquences. */
  partySize: number | null
  partyNames: string | null
  arrivalAck: ArrivalAck | null
  sequencesAttending: string[] | null
  /** Invitation en ligne : chaque personne (la première est celle qui répond) et sa réponse pour chaque moment. */
  party: PartyMember[] | null
  processed: boolean
  createdAt: string
}

/** Confirmation horaire : « C'est bien noté » ou « Nous risquons d'arriver plus tard ». */
export type ArrivalAck = "ok" | "late"

/** Réponse pour un moment : oui, non ou « je ne sais pas encore ». */
export type MomentAnswer = "yes" | "no" | "unsure"

export interface PartyMember {
  firstName: string
  lastName: string
  /** Moins de 10 ans. */
  under10: boolean
  /** Réponse par séquence (event_sequences.id). */
  moments: Record<string, MomentAnswer>
  /** Allergies ou restrictions alimentaires (null : aucune). */
  diet?: string | null
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
  /** Invité de la liste : réponse envoyée depuis l'invitation en ligne, compte connecté. */
  guestId?: string | null
  partySize?: number | null
  partyNames?: string | null
  arrivalAck?: ArrivalAck | null
  sequencesAttending?: string[] | null
  party?: PartyMember[] | null
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
  party_size?: number | null
  party_names?: string | null
  arrival_ack?: string | null
  sequences_attending?: string[] | null
  party?: PartyMember[] | null
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
    partySize: row.party_size ?? null,
    partyNames: row.party_names ?? null,
    arrivalAck: (row.arrival_ack as ArrivalAck | null) ?? null,
    sequencesAttending: row.sequences_attending ?? null,
    party: Array.isArray(row.party) ? row.party : null,
    processed: row.processed,
    createdAt: row.created_at,
  }
}

export const rsvpService = {
  /** table : table complète, pour écrire dans un autre déploiement (ex. l'invitation en ligne → appli mariage). */
  async create(input: RsvpInput, table = tbl("rsvp_responses")): Promise<RsvpResponse> {
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

    // Colonnes ajoutées par les migrations 0177 et 0178 : envoyées seulement si renseignées.
    const extra = Object.fromEntries(Object.entries({
      guest_id:            input.guestId,
      party_size:          input.partySize,
      party_names:         input.partyNames,
      arrival_ack:         input.arrivalAck,
      sequences_attending: input.sequencesAttending,
      party:               input.party,
    }).filter(([, v]) => v != null))

    if (USE_SUPABASE) {
      const insert = (p: object) => (supabase! as any)
        .from(table as any)
        .insert(p)
        .select()
        .single()
      let { data, error } = await insert({ ...payload, ...extra })
      // Colonnes absentes (migrations 0177 / 0178 pas encore appliquées) : on enregistre quand même la réponse,
      // les informations supplémentaires recopiées dans le message pour ne rien perdre.
      if (error && /guest_id|party|arrival_ack|sequences_attending/.test(error.message ?? "")) {
        const answer = { yes: "oui", no: "non", unsure: "?" } as const
        const notes = [
          input.partySize != null && `Personnes : ${input.partySize}`,
          input.party?.length
            ? `Détail : ${input.party.map((m) => `${m.firstName} ${m.lastName}${m.under10 ? " (-10 ans)" : ""}${m.diet ? ` {${m.diet}}` : ""} [${Object.values(m.moments).map((a) => answer[a]).join(" ")}]`).join(", ")}`
            : input.partyNames && `Noms : ${input.partyNames.replace(/\n+/g, ", ")}`,
          input.arrivalAck && `Horaire : ${input.arrivalAck === "ok" ? "bien noté" : "risque d'arriver plus tard"}`,
        ].filter(Boolean).join(" · ")
        const message = [payload.message, notes && `[${notes}]`].filter(Boolean).join("\n\n") || null
        ;({ data, error } = await insert({ ...payload, message }))
      }
      if (error) throw error
      return rowToRsvp(data as RsvpRow)
    }

    const row: RsvpRow = {
      id: crypto.randomUUID(),
      ...payload,
      guest_id: input.guestId ?? null,
      party_size: input.partySize ?? null,
      party_names: input.partyNames ?? null,
      arrival_ack: input.arrivalAck ?? null,
      sequences_attending: input.sequencesAttending ?? null,
      party: input.party ?? null,
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

  /** Dernière réponse « invitation » d'un invité (pour la réafficher sur l'invitation en ligne). */
  async latestForGuest(guestId: string, table = tbl("rsvp_responses")): Promise<RsvpResponse | null> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(table as any)
        .select("*")
        .eq("guest_id", guestId)
        .eq("wave", "invitation")
        .order("created_at", { ascending: false })
        .limit(1)
      if (error) return null
      return data?.[0] ? rowToRsvp(data[0] as RsvpRow) : null
    }
    const rows = (await mockRsvp.getAll()).filter((r) => r.guest_id === guestId && r.wave === "invitation")
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return rows[0] ? rowToRsvp(rows[0]) : null
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
