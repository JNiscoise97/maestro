import type { GuestGroup } from "@/types/domain"

const SIDE_LABEL: Record<string, string> = { jordan: "Côté Jordan", sarah: "Côté Sarah", both: "Les deux" }

/** Retourne le nom du groupe, suffixé du côté si un autre groupe porte le même nom. */
export function groupLabel(group: GuestGroup, allGroups: GuestGroup[]): string {
  const hasDuplicate = allGroups.some((g) => g.id !== group.id && g.familyName === group.familyName)
  if (!hasDuplicate) return group.familyName
  // Côté non renseigné (Paramètres › Invités › Groupes & familles) : on le signale plutôt qu'un « ? ».
  const side = group.side ? (SIDE_LABEL[group.side] ?? "côté à renseigner") : "côté à renseigner"
  return `${group.familyName} · ${side}`
}
