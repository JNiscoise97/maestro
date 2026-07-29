// Préfixe de toutes les tables Supabase (ex. "_20260725_", "_20260629_").
// Configurer via VITE_TABLE_PREFIX dans le .env de chaque déploiement.
export const TABLE_PREFIX = import.meta.env.VITE_TABLE_PREFIX ?? "_20260725_"

// Construit le nom complet d'une table Supabase.
export function tbl(name: string): string {
  return `${TABLE_PREFIX}${name}`
}

// Construit la clé localStorage pour le mock (une clé par événement).
// "_20260725_" → "sj-20260725-<name>"
const _mockNs = `sj-${TABLE_PREFIX.replace(/_/g, "")}`
export function mockKey(name: string): string {
  return `${_mockNs}-${name}`
}
