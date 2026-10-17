import { useEffect } from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

/**
 * Table (sans préfixe) → données React Query à recharger quand elle change.
 * Couvre les écrans Missions (pilotage, rétroplanning, opérationnelle) et
 * Paramètres › Pôles, domaines & missions / Séquences / Jalons.
 */
const TABLE_KEYS: Record<string, QueryKey[]> = {
  poles: [["poles"]],
  domaines: [["domaines"]],
  missions: [["missions"]],
  checklists: [["checklists"]],
  checklist_items: [["checklist-items"]],
  mission_sequences: [["mission-sequences"]],
  checklist_item_sequences: [["item-sequences"]],
  milestones: [["milestones"]],
  event_sequences: [["event-sequences"]],
  domaine_responsables: [["domaine-responsables"]],
  mission_acceptances: [["mission-acceptances"]],
  assignee_history: [["assignee-history"]],
  people: [["people"]],
  guests: [["guests"]],
  guest_groups: [["guest-groups"]],
}

/** Délai de regroupement : une rafale de changements (lot, réordonnancement) = un seul rechargement. */
const DEBOUNCE_MS = 300

/**
 * Écoute les changements de la base (Supabase Realtime) et recharge les données
 * affichées, sans rafraîchir la page. À monter une seule fois, sous le QueryClientProvider.
 * Nécessite la migration 0145 (tables ajoutées à la publication supabase_realtime).
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const pending = new Map<string, QueryKey>()
    let timer: ReturnType<typeof setTimeout> | undefined
    const flush = () => {
      for (const key of pending.values()) queryClient.invalidateQueries({ queryKey: key })
      pending.clear()
    }
    const schedule = (keys: QueryKey[]) => {
      for (const key of keys) pending.set(JSON.stringify(key), key)
      clearTimeout(timer)
      timer = setTimeout(flush, DEBOUNCE_MS)
    }

    let channel = client.channel(`db-sync-${tbl("")}`)
    for (const [table, keys] of Object.entries(TABLE_KEYS)) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tbl(table) },
        () => schedule(keys),
      )
    }
    channel.subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[realtime] synchronisation en direct indisponible :", status, err ?? "")
      }
    })

    // Au retour sur l'onglet, on rattrape ce qui a pu être manqué pendant la veille.
    const onVisible = () => {
      if (document.visibilityState === "visible") schedule(Object.values(TABLE_KEYS).flat())
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      client.removeChannel(channel)
    }
  }, [queryClient])
}
