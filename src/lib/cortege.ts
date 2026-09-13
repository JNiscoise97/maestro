export type RoleCategory = "marie" | "mariee" | "autre"

export type CortegeRoleDef = {
  key: string
  label: string
  category: RoleCategory
}

export type CortegeGroupRecord = {
  id: string
  sequenceId: string
  label: string
  roleKeys: string[]
  sortOrder: number
}

// Rôles fixes (toujours disponibles)
export const FIXED_ROLES: CortegeRoleDef[] = [
  { key: "marie",                label: "Marié",                              category: "marie" },
  { key: "mere_marie",           label: "Mère du marié",                      category: "marie" },
  { key: "pere_marie",           label: "Père du marié",                      category: "marie" },
  { key: "gp_pat_marie",         label: "Grand-père paternel du marié",       category: "marie" },
  { key: "gm_pat_marie",         label: "Grand-mère paternelle du marié",     category: "marie" },
  { key: "gp_mat_marie",         label: "Grand-père maternel du marié",       category: "marie" },
  { key: "gm_mat_marie",         label: "Grand-mère maternelle du marié",     category: "marie" },
  { key: "mariee",               label: "Mariée",                             category: "mariee" },
  { key: "mere_mariee",          label: "Mère de la mariée",                  category: "mariee" },
  { key: "pere_mariee",          label: "Père de la mariée",                  category: "mariee" },
  { key: "gp_pat_mariee",        label: "Grand-père paternel de la mariée",   category: "mariee" },
  { key: "gm_pat_mariee",        label: "Grand-mère paternelle de la mariée", category: "mariee" },
  { key: "gp_mat_mariee",        label: "Grand-père maternel de la mariée",   category: "mariee" },
  { key: "gm_mat_mariee",        label: "Grand-mère maternelle de la mariée", category: "mariee" },
  { key: "garcon_mini",          label: "Garçon miniature",                   category: "autre" },
  { key: "fille_mini",           label: "Fille miniature",                    category: "autre" },
  { key: "porteur_alliance",     label: "Porteur d'alliance",                 category: "autre" },
  { key: "flower_girl",          label: "Flower girl",                        category: "autre" },
]

// Rôles dynamiques générés selon les compteurs
export function cavalierRoles(count: number): CortegeRoleDef[] {
  return Array.from({ length: count }, (_, i) => ({
    key:      `cavalier_${i + 1}`,
    label:    `Cavalier d'honneur ${i + 1}`,
    category: "autre" as RoleCategory,
  }))
}

export function demoiselleRoles(count: number): CortegeRoleDef[] {
  return Array.from({ length: count }, (_, i) => ({
    key:      `demoiselle_${i + 1}`,
    label:    `Demoiselle d'honneur ${i + 1}`,
    category: "autre" as RoleCategory,
  }))
}

export function temoinsMarieRoles(count: number): CortegeRoleDef[] {
  return Array.from({ length: count }, (_, i) => ({
    key:      `temoin_marie_${i + 1}`,
    label:    count === 1 ? "Témoin du marié" : `Témoin du marié ${i + 1}`,
    category: "marie" as RoleCategory,
  }))
}

export function temoinsMarieeRoles(count: number): CortegeRoleDef[] {
  return Array.from({ length: count }, (_, i) => ({
    key:      `temoin_mariee_${i + 1}`,
    label:    count === 1 ? "Témoin de la mariée" : `Témoin de la mariée ${i + 1}`,
    category: "mariee" as RoleCategory,
  }))
}

export type AllRolesCounts = {
  cavalierCount: number
  demoiselleCount: number
  temoinsMarieCount: number
  temoinsMarieeCount: number
}

export function allRoles(counts: AllRolesCounts): CortegeRoleDef[]
export function allRoles(cavalierCount: number, demoiselleCount: number, temoinsMarieCount?: number, temoinsMarieeCount?: number): CortegeRoleDef[]
export function allRoles(
  countsOrCavalier: AllRolesCounts | number,
  demoiselleCount = 0,
  temoinsMarieCount = 0,
  temoinsMarieeCount = 0,
): CortegeRoleDef[] {
  let cav: number, dem: number, tmarie: number, tmariee: number
  if (typeof countsOrCavalier === "object") {
    cav    = countsOrCavalier.cavalierCount
    dem    = countsOrCavalier.demoiselleCount
    tmarie  = countsOrCavalier.temoinsMarieCount
    tmariee = countsOrCavalier.temoinsMarieeCount
  } else {
    cav    = countsOrCavalier
    dem    = demoiselleCount
    tmarie  = temoinsMarieCount
    tmariee = temoinsMarieeCount
  }
  return [
    ...FIXED_ROLES,
    ...temoinsMarieRoles(tmarie),
    ...temoinsMarieeRoles(tmariee),
    ...cavalierRoles(cav),
    ...demoiselleRoles(dem),
  ]
}

export function roleLabel(key: string, counts: Partial<AllRolesCounts> = {}): string {
  const { cavalierCount = 8, demoiselleCount = 8, temoinsMarieCount = 4, temoinsMarieeCount = 4 } = counts
  return allRoles(cavalierCount, demoiselleCount, temoinsMarieCount, temoinsMarieeCount).find((r) => r.key === key)?.label ?? key
}

export const CATEGORY_LABELS: Record<RoleCategory, string> = {
  marie:  "Côté marié",
  mariee: "Côté mariée",
  autre:  "Autres",
}
