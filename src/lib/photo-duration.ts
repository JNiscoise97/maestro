/**
 * Estimation de durée pour les photos de groupe.
 * - `estimatePhotoDurationSeconds` : heuristique a priori (Paramètres), avant que la séance n'ait commencé.
 * - `recordPhotoDuration`/`getAveragePhotoDurationSeconds` : mesure en direct (jour J), accumulée en localStorage
 *   pour affiner la moyenne au fil des photos prises — c'est une métrique de pacing opérationnelle, pas une
 *   donnée métier, donc pas besoin de la faire transiter par Supabase.
 */
import { mockKey } from "@/lib/event"

export const PHOTO_BASE_DURATION_SECONDS = 90
export const PHOTO_PER_PERSON_SECONDS = 15

// La photo générale (tout le monde) prend un temps fixe à installer, sans
// rapport avec le nombre de personnes dans le groupe — l'heuristique par
// personne n'a pas de sens pour elle.
const GENERAL_PHOTO_LABEL = "photo générale"
const GENERAL_PHOTO_DURATION_SECONDS = 6 * 60

export function estimatePhotoDurationSeconds(personCount: number, label?: string): number {
  if (label?.trim().toLowerCase().includes(GENERAL_PHOTO_LABEL)) return GENERAL_PHOTO_DURATION_SECONDS
  return PHOTO_BASE_DURATION_SECONDS + personCount * PHOTO_PER_PERSON_SECONDS
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) return `${remainingSeconds}s`
  if (remainingSeconds === 0) return `${minutes} min`
  return `${minutes} min ${remainingSeconds}s`
}

const DURATION_LOG_KEY = mockKey("photo-duration-log")
const MAX_LOG_ENTRIES = 20

function readDurationLog(): number[] {
  try {
    const raw = localStorage.getItem(DURATION_LOG_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : []
  } catch {
    return []
  }
}

export function recordPhotoDuration(seconds: number): void {
  const log = [...readDurationLog(), seconds].slice(-MAX_LOG_ENTRIES)
  localStorage.setItem(DURATION_LOG_KEY, JSON.stringify(log))
}

export function getAveragePhotoDurationSeconds(): number | null {
  const log = readDurationLog()
  if (log.length === 0) return null
  return log.reduce((sum, n) => sum + n, 0) / log.length
}
