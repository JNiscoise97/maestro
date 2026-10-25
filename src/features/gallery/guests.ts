import { useQuery } from "@tanstack/react-query"

import { groupLabel } from "@/lib/groups"
import { formatDisplayName } from "@/lib/utils"
import { supabase } from "@/supabase/client"
import type { GuestGroup, GuestSide } from "@/types/domain"

/** Invité de la liste des fiançailles (_20260725_guests), quel que soit le déploiement. */
export type FiancaillesGuest = {
  id: string
  first_name: string | null
  last_name: string | null
  nickname: string | null
  group_id: string | null
  is_active: boolean | null
  is_child: boolean | null
  rsvp_status: string | null
  checked_in_at: string | null
  age_range: string | null
  /** Partenaire inséparable (couple), comme dans Invités. */
  paired_with_id: string | null
  /** Mineur : enfant, ou tranche d'âge qui finit avant 18 ans (même règle que les communications). */
  minor: boolean
  /** Présent aux fiançailles : pointé le jour J, ou RSVP confirmé. */
  present: boolean
  /** Nom affiché comme dans Invités (surnom compris). */
  fullName: string
  /** Libellé du groupe (famille), comme dans Invités ; null si sans groupe. */
  groupName: string | null
}

function isMinor(g: { is_child: boolean | null; age_range: string | null }): boolean {
  if (g.is_child) return true
  const m = g.age_range?.match(/(\d+)\s*-\s*(\d+)/)
  return m ? Number(m[2]) < 18 : false
}

export function guestLabel(g: Pick<FiancaillesGuest, "fullName">): string {
  return g.fullName || "Sans nom"
}

/**
 * Invités des fiançailles triés comme dans Invités (tri par défaut « famille ») :
 * ordre des groupes, puis nom affiché ; les invités sans groupe en dernier.
 */
export function useFiancaillesGuests() {
  return useQuery({
    queryKey: ["gal", "fiancailles-guests"],
    enabled: !!supabase,
    queryFn: async (): Promise<FiancaillesGuest[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const [{ data: rows, error }, { data: groupRows, error: groupError }] = await Promise.all([
        db.from("_20260725_guests").select("id, first_name, last_name, nickname, group_id, is_active, is_child, rsvp_status, checked_in_at, age_range, paired_with_id").range(0, 4999),
        db.from("_20260725_guest_groups").select("id, family_name, notes, sort_order, side"),
      ])
      if (error) throw error
      if (groupError) throw groupError
      const groups: GuestGroup[] = (groupRows ?? []).map((g: { id: string; family_name: string; notes: string | null; sort_order: number; side: GuestSide | null }) => ({
        id: g.id, familyName: g.family_name, notes: g.notes, sortOrder: g.sort_order, side: g.side,
      }))
      const groupsById = new Map(groups.map((g) => [g.id, g]))
      const order = (gid: string | null) => (gid ? groupsById.get(gid)?.sortOrder ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY)

      return (rows ?? [])
        .filter((g: FiancaillesGuest) => g.is_active !== false)
        .map((g: Omit<FiancaillesGuest, "fullName" | "groupName" | "present" | "minor">) => {
          const group = g.group_id ? groupsById.get(g.group_id) : undefined
          return {
            ...g,
            fullName: formatDisplayName(`${g.first_name ?? ""} ${g.last_name ?? ""}`.trim(), g.nickname),
            groupName: group ? groupLabel(group, groups) : null,
            present: !!g.checked_in_at || g.rsvp_status === "confirmed",
            minor: isMinor(g),
          }
        })
        .sort((a: FiancaillesGuest, b: FiancaillesGuest) => order(a.group_id) - order(b.group_id) || a.fullName.localeCompare(b.fullName))
    },
  })
}
