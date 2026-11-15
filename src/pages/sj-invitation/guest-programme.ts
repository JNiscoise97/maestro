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

export type WeddingGuest = { id: string; first_name: string | null; last_name: string | null }

export type Programme =
  /** Invité retrouvé : sequenceIds = ses séquences (vide possible : aucune séquence cochée). */
  | { status: "found"; guest: WeddingGuest; sequenceIds: Set<string> }
  /** Invité introuvable dans la liste du mariage (ou mode démo sans base). */
  | { status: "unknown" }

const normalize = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "")

/** Liste des invités du mariage (quelques centaines de lignes). */
export async function loadWeddingGuests(): Promise<WeddingGuest[]> {
  if (!USE_SUPABASE) return []
  const { data, error } = await db.from(weddingTable("guests"))
    .select("id, first_name, last_name, is_active")
    .range(0, 4999)
  if (error) throw error
  return ((data ?? []) as (WeddingGuest & { is_active: boolean | null })[]).filter((g) => g.is_active !== false)
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

/** Séquences de l'invité. */
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

/** Jours et moments visibles. null = tout le programme (administrateur sans aperçu). */
export function visibleDays(sequenceIds: Set<string> | null, onlyOpen = false): Day[] {
  return DAYS
    .map((d) => ({
      ...d,
      moments: d.moments.filter((m) => (sequenceIds ? sequenceIds.has(m.sequenceId) : true) && (!onlyOpen || !m.limited)),
    }))
    .filter((d) => d.moments.length > 0)
}

const NUMBERS = ["Aucun", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"]
/** « Trois moments », « Un moment ». */
export const momentsInWords = (n: number) => `${NUMBERS[n] ?? n} moment${n > 1 ? "s" : ""}`
