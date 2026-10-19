import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/supabase/client"

/** Invité de la liste des fiançailles (_20260725_guests), quel que soit le déploiement. */
export type FiancaillesGuest = {
  id: string
  first_name: string | null
  last_name: string | null
  is_active: boolean | null
  is_child: boolean | null
  rsvp_status: string | null
}

export function guestLabel(g: Pick<FiancaillesGuest, "first_name" | "last_name">): string {
  return `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim() || "Sans nom"
}

/** Liste des invités des fiançailles, triée par nom puis prénom (lue avec le client principal de l'appli). */
export function useFiancaillesGuests() {
  return useQuery({
    queryKey: ["gal", "fiancailles-guests"],
    enabled: !!supabase,
    queryFn: async (): Promise<FiancaillesGuest[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("_20260725_guests")
        .select("id, first_name, last_name, is_active, is_child, rsvp_status")
        .range(0, 4999)
      if (error) throw error
      return ((data ?? []) as FiancaillesGuest[])
        .filter((g) => g.is_active !== false)
        .sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "fr") || (a.first_name ?? "").localeCompare(b.first_name ?? "", "fr"))
    },
  })
}
