import type { ChecklistItem, Domaine, Mission } from "@/types/domain"

/**
 * Ordres d'affichage partagés, identiques au tri des requêtes Supabase.
 * À rang égal, le départage est fixe : sans lui, deux éléments de même rang
 * s'échangent selon l'ordre de chargement (qui change après chaque mise à jour).
 */

/** Items : rang, puis date cible (sans date en dernier), puis libellé. */
export function compareChecklistItems(a: ChecklistItem, b: ChecklistItem): number {
  return a.sortOrder - b.sortOrder
    || (a.targetDate ?? "9999-12-31").localeCompare(b.targetDate ?? "9999-12-31")
    || a.label.localeCompare(b.label, "fr")
    || a.id.localeCompare(b.id)
}

/** Missions : rang, puis titre. */
export function compareMissions(a: Mission, b: Mission): number {
  return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "fr") || a.id.localeCompare(b.id)
}

/** Domaines : rang, puis nom. */
export function compareDomaines(a: Domaine, b: Domaine): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fr") || a.id.localeCompare(b.id)
}
