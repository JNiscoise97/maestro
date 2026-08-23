import type { GuestGroup } from "@/types/domain"

const SIDE_LABEL: Record<string, string> = { jordan: "Jordan", sarah: "Sarah", both: "Les deux" }

/** Retourne le nom du groupe, suffixé du côté si un autre groupe porte le même nom. */
export function groupLabel(group: GuestGroup, allGroups: GuestGroup[]): string {
  const hasDuplicate = allGroups.some((g) => g.id !== group.id && g.familyName === group.familyName)
  if (!hasDuplicate) return group.familyName
  const side = group.side ? (SIDE_LABEL[group.side] ?? "?") : "?"
  return `${group.familyName} · ${side}`
}
