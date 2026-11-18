import { useEffect, useState } from "react"
import { supabase, USE_SUPABASE } from "@/supabase/client"
import type { GalleryMember } from "@/features/gallery/types"
import { DAYS, type Day } from "./content"

/**
 * Programme personnalisé : chaque invité ne voit que les moments auxquels il est convié.
 *
 * Source : l'appli mariage (préfixe _20270628_), quel que soit le déploiement qui sert la page.
 *   · guests            → l'invité connecté (par guest_id, sinon par prénom + nom) ;
 *   · guest_sequences   → les séquences cochées pour chaque invité (Invités › Séquences).
 */

export const WEDDING_PREFIX = "_20270628_"
export const weddingTable = (name: string) => `${WEDDING_PREFIX}${name}`

// Le client anonyme : les tables de l'appli sont ouvertes en anon (politique anon_all).
const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

export type WeddingGuest = {
  id: string; first_name: string | null; last_name: string | null; household_id: string | null
  /** Langue de l'invitation (Invités › Invitations) ; null = français. */
  invitation_language: "fr" | "en" | null
  /** Surnom et « Nom sur l'invitation » (Invités › Invitations) : nom employé pour s'adresser à l'invité. */
  nickname: string | null
  invitation_name: string | null
}

export type Programme =
  /** Invité retrouvé : sequenceIds = séquences de son foyer (vide possible : aucune séquence cochée). */
  | { status: "found"; guest: WeddingGuest; sequenceIds: Set<string> }
  /** Invité introuvable dans la liste du mariage (ou mode démo sans base). */
  | { status: "unknown" }

const normalize = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "")

/** Liste des invités du mariage (quelques centaines de lignes), chargée une fois par visite. */
let guestsCache: Promise<WeddingGuest[]> | null = null
// Liste déjà reçue : lue sans attendre (pas de prénom affiché une fraction de seconde avant le surnom).
let guestsLoaded: WeddingGuest[] | null = null
export function loadWeddingGuests(): Promise<WeddingGuest[]> {
  guestsCache ??= fetchWeddingGuests()
    .then((g) => (guestsLoaded = g))
    .catch((e) => { guestsCache = null; throw e })
  return guestsCache
}

async function fetchWeddingGuests(): Promise<WeddingGuest[]> {
  if (!USE_SUPABASE) return []
  const query = (columns: string) => db.from(weddingTable("guests")).select(columns).range(0, 4999)
  // Colonnes household_id (0179) et invitation_language (0180) absentes tant que leurs migrations ne sont
  // pas exécutées : on retente sans elles (chacun reste seul, invitation en français).
  let { data, error } = await query("id, first_name, last_name, nickname, invitation_name, household_id, invitation_language, is_active")
  if (error) ({ data, error } = await query("id, first_name, last_name, household_id, invitation_language, is_active"))
  if (error) ({ data, error } = await query("id, first_name, last_name, household_id, is_active"))
  if (error) ({ data, error } = await query("id, first_name, last_name, is_active"))
  if (error) throw error
  return ((data ?? []) as (WeddingGuest & { is_active: boolean | null })[])
    .filter((g) => g.is_active !== false)
    .map((g) => ({
      ...g, household_id: g.household_id ?? null, invitation_language: g.invitation_language ?? null,
      nickname: g.nickname ?? null, invitation_name: g.invitation_name ?? null,
    }))
}

/** Nom pour s'adresser à l'invité : « Nom sur l'invitation », sinon surnom, sinon prénom (du compte à défaut). */
export function greetingName(guest: WeddingGuest | null | undefined, member: Pick<GalleryMember, "first_name">): string {
  return guest?.invitation_name?.trim() || guest?.nickname?.trim() || guest?.first_name?.trim() || member.first_name?.trim() || ""
}

/** greetingName pour le compte connecté ; vide tant que la liste des invités n'est pas chargée (si elle doit l'être). */
export function useGreetingName(member: Pick<GalleryMember, "guest_id" | "first_name" | "last_name">): string {
  const fromCache = () => (guestsLoaded ? greetingName(findGuest(guestsLoaded, member), member) : null)
  const [name, setName] = useState<string | null>(fromCache)
  useEffect(() => {
    let alive = true
    loadWeddingGuests()
      .then((guests) => { if (alive) setName(greetingName(findGuest(guests, member), member)) })
      .catch(() => { if (alive) setName(member.first_name?.trim() ?? "") })
    return () => { alive = false }
  }, [member])
  return name ?? (USE_SUPABASE ? "" : member.first_name?.trim() ?? "")
}

/** Retrouve l'invité du compte : même identifiant (listes fiançailles et mariage partagées), sinon nom unique. */
export function findGuest(guests: WeddingGuest[], member: Pick<GalleryMember, "guest_id" | "first_name" | "last_name">) {
  if (member.guest_id) {
    const byId = guests.find((g) => g.id === member.guest_id)
    if (byId) return byId
  }
  const first = normalize(member.first_name)
  const last = normalize(member.last_name)
  if (!first || !last) return null
  const matches = guests.filter((g) => normalize(g.first_name) === first && normalize(g.last_name) === last)
  return matches.length === 1 ? matches[0] : null
}

/** Séquences de l'invité (le foyer n'est pas pris en compte sur l'invitation). */
export async function loadProgramme(guest: WeddingGuest): Promise<Programme> {
  const { data, error } = await db.from(weddingTable("guest_sequences")).select("sequence_id").eq("guest_id", guest.id)
  if (error) throw error
  return { status: "found", guest, sequenceIds: new Set(((data ?? []) as { sequence_id: string }[]).map((r) => r.sequence_id)) }
}

/** Identifiants des invités ayant au moins une séquence (pour l'aperçu administrateur). */
export async function loadGuestIdsWithSequences(): Promise<Set<string>> {
  if (!USE_SUPABASE) return new Set()
  const ids = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(weddingTable("guest_sequences"))
      .select("guest_id").order("guest_id").order("sequence_id").range(from, from + 999)
    if (error) throw error
    for (const r of (data ?? []) as { guest_id: string }[]) ids.add(r.guest_id)
    if ((data?.length ?? 0) < 1000) return ids
  }
}

/** Jours et moments visibles. null = tout le programme (administrateur sans aperçu). days : programme dans la langue en cours. */
export function visibleDays(sequenceIds: Set<string> | null, onlyOpen = false, days: Day[] = DAYS): Day[] {
  return days
    .map((d) => ({
      ...d,
      moments: d.moments.filter((m) => (sequenceIds ? sequenceIds.has(m.sequenceId) : true) && (!onlyOpen || !m.limited)),
    }))
    .filter((d) => d.moments.length > 0)
}
