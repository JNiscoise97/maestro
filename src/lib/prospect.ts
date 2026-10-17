import type { Guest, ProspectStatus } from "@/types/domain"

/** Listes d'invités (prospectStatus) : libellé et couleur de pastille. */
export const PROSPECT_LISTS: { value: ProspectStatus; label: string; color: string }[] = [
  { value: "main_list",      label: "Liste A",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  { value: "secondary_list", label: "Liste B",        color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400" },
  { value: "deferred",       label: "Liste différée", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  { value: "faire_part",     label: "Faire-part",     color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" },
  { value: "pending",        label: "En réflexion",   color: "bg-muted text-muted-foreground" },
  { value: "not_invited",    label: "Hors liste",     color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
]

/** Liste effective d'un invité : sans statut = invité historique, rattaché à la Liste A. */
export function guestList(guest: Pick<Guest, "prospectStatus">): ProspectStatus {
  return guest.prospectStatus ?? "main_list"
}
