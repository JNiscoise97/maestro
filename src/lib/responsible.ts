import type { ChecklistItem, Domaine, DomaineResponsable, Guest, Mission, Person, Pole } from "@/types/domain"

export type ResponsableSource = "item" | "mission" | "domaine" | "pole"

export interface EffectiveResponsable {
  name: string
  source: ResponsableSource
}

function principalResponsable(
  domaineId: string,
  domaineResponsables: DomaineResponsable[],
  people: Person[],
  guests: Guest[],
): EffectiveResponsable | null {
  const drs = domaineResponsables.filter((r) => r.domaineId === domaineId)
  const dr = drs.find((r) => r.rank === "principal") ?? drs[0]
  if (!dr) return null
  if (dr.personId) {
    const p = people.find((p) => p.id === dr.personId)
    if (p) return { name: p.fullName, source: "domaine" }
  }
  if (dr.guestId) {
    const g = guests.find((g) => g.id === dr.guestId)
    if (g) return { name: g.fullName, source: "domaine" }
  }
  return null
}

/** Responsable effectif d'une mission (propre → domaine → pôle). */
export function resolveEffectiveMissionResponsable(
  mission: Mission,
  domaine: Domaine | undefined,
  domaineResponsables: DomaineResponsable[],
  poles: Pole[],
  people: Person[],
  guests: Guest[],
): EffectiveResponsable | null {
  // 1. Affectation propre à la mission
  if (mission.responsiblePersonId) {
    const p = people.find((p) => p.id === mission.responsiblePersonId)
    if (p) return { name: p.fullName, source: "mission" }
  }
  if (mission.responsibleGuestId) {
    const g = guests.find((g) => g.id === mission.responsibleGuestId)
    if (g) return { name: g.fullName, source: "mission" }
  }

  if (!domaine) return null

  // 2. Responsable du domaine
  const dr = principalResponsable(domaine.id, domaineResponsables, people, guests)
  if (dr) return dr

  // 3. Responsable du pôle
  if (domaine.poleId) {
    const pole = poles.find((p) => p.id === domaine.poleId)
    if (pole?.responsiblePersonId) {
      const p = people.find((p) => p.id === pole.responsiblePersonId)
      if (p) return { name: p.fullName, source: "pole" }
    }
  }

  return null
}

/** Responsable effectif d'un item (propre → mission → domaine → pôle). */
export function resolveEffectiveItemResponsable(
  item: ChecklistItem,
  mission: Mission | undefined,
  domaine: Domaine | undefined,
  domaineResponsables: DomaineResponsable[],
  poles: Pole[],
  people: Person[],
  guests: Guest[],
): EffectiveResponsable | null {
  // 1. Assignation propre à l'item (peut être un guest ou un fiancé)
  if (item.assigneeGuestId) {
    const g = guests.find((g) => g.id === item.assigneeGuestId)
    if (g) return { name: g.fullName, source: "item" }
    const p = people.find((p) => p.id === item.assigneeGuestId)
    if (p) return { name: p.fullName, source: "item" }
  }

  // 2. Remonte via la mission
  if (!mission) return null
  return resolveEffectiveMissionResponsable(mission, domaine, domaineResponsables, poles, people, guests)
}
