import type { Checklist, ChecklistItem, Domaine, DomaineResponsable, Guest, Mission, Person, Pole } from "@/types/domain"

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

/**
 * Missions dont un fiancé est responsable, avec la même cascade que le responsable effectif :
 *   1. responsable propre de la mission ;
 *   2. sinon responsable du domaine (principal ou secondaire) ;
 *   3. sinon responsable du pôle (si le domaine n'a aucun responsable).
 * S'y ajoutent les missions dont une checklist lui a été déléguée.
 */
export function myMissionIds(
  personId: string,
  data: {
    missions: Mission[]
    domaines: Domaine[]
    domaineResponsables: DomaineResponsable[]
    poles: Pole[]
    checklists: Checklist[]
  },
): Set<string> {
  const domaineById = new Map(data.domaines.map((d) => [d.id, d]))
  const poleById = new Map(data.poles.map((p) => [p.id, p]))
  const respsByDomaine = new Map<string, DomaineResponsable[]>()
  for (const r of data.domaineResponsables) {
    const list = respsByDomaine.get(r.domaineId) ?? []
    list.push(r)
    respsByDomaine.set(r.domaineId, list)
  }
  const mine = new Set<string>()
  for (const m of data.missions) {
    if (m.responsiblePersonId || m.responsibleGuestId) {
      if (m.responsiblePersonId === personId) mine.add(m.id)
      continue
    }
    const domaine = m.domaineId ? domaineById.get(m.domaineId) : undefined
    if (!domaine) continue
    const resps = respsByDomaine.get(domaine.id) ?? []
    if (resps.length > 0) {
      if (resps.some((r) => r.personId === personId)) mine.add(m.id)
      continue
    }
    const pole = domaine.poleId ? poleById.get(domaine.poleId) : undefined
    if (pole?.responsiblePersonId === personId) mine.add(m.id)
  }
  for (const c of data.checklists) {
    if (c.ownerType === "mission" && c.ownerId && c.responsiblePersonId === personId) mine.add(c.ownerId)
  }
  return mine
}
