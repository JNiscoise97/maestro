import type { Guest, ProspectStatus } from "@/types/domain"

/** Nom par défaut sur l'invitation : le surnom s'il existe, sinon le prénom. */
export function defaultInvitationName(g: Guest): string {
  return g.nickname?.trim() || g.firstName.trim() || g.lastName.trim()
}

/** Nom qui figurera sur l'invitation : celui saisi, sinon le nom par défaut. */
export function invitationName(g: Guest): string {
  return g.invitationName?.trim() || defaultInvitationName(g)
}

/** Statut de prospection effectif (null = historique, traité comme Liste A). */
export const effectiveProspect = (g: Guest): ProspectStatus => g.prospectStatus ?? "main_list"

/** Personnes qui reçoivent un courrier (invitation ou faire-part), comme dans l'onglet Papeterie. */
export const MAILED_STATUSES: { value: ProspectStatus; label: string }[] = [
  { value: "main_list", label: "Liste A" },
  { value: "secondary_list", label: "Liste B" },
  { value: "deferred", label: "Différée" },
  { value: "faire_part", label: "Faire-part" },
]
