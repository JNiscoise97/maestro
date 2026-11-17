import type { Guest, Household, ProspectStatus } from "@/types/domain"

/** Nom par défaut sur l'invitation : le surnom s'il existe, sinon le prénom. */
export function defaultInvitationName(g: Guest): string {
  return g.nickname?.trim() || g.firstName.trim() || g.lastName.trim()
}

/** Nom qui figurera sur l'invitation : celui saisi, sinon le nom par défaut. */
export function invitationName(g: Guest): string {
  return g.invitationName?.trim() || defaultInvitationName(g)
}

/** « A », « A et B », « A, B et C ». */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`
}

/** Membres d'un foyer dans l'ordre de l'invitation : adultes puis enfants, ordre donné sinon conservé. */
export function orderMembers(members: Guest[]): Guest[] {
  return [...members.filter((m) => !m.isChild), ...members.filter((m) => m.isChild)]
}

/** Texte de l'invitation pour un foyer : celui saisi, sinon les noms des membres. */
export function householdText(h: Household, members: Guest[]): string {
  return h.label?.trim() || joinNames(orderMembers(members).map(invitationName)) || "Foyer vide"
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
