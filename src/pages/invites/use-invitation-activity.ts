import { useQuery } from "@tanstack/react-query"

import { KEYS } from "@/features/gallery/api"
import { galleryClient } from "@/features/gallery/client"

/** Une connexion ou un retour sur l'invitation (fonction _20260725_gal_invitation_journal, migration 0182). */
export type Visit = {
  id: number; created_at: string; event: "login" | "visit"; member_id: string | null
  first_name: string | null; last_name: string | null; guest_id: string | null; role: string | null
}

/** Connexions et retours sur l'invitation (journal de la galerie), 1 000 derniers, du plus récent au plus ancien. */
export function useInvitationActivity() {
  return useQuery({
    queryKey: [...KEYS.admin, "activity", "invitation-journal"],
    enabled: !!galleryClient,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Visit[]> => {
      const { data, error } = await (galleryClient! as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .rpc("_20260725_gal_invitation_journal", { p_limit: 1000 })
      if (error) throw error
      return (data ?? []) as Visit[]
    },
  })
}
