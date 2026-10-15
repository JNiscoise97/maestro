import { differenceInCalendarDays } from "date-fns"

export type EventPhase = "prep" | "j-1" | "jour-j" | "j+1" | "post"

export const EVENT_PHASES: EventPhase[] = ["prep", "j-1", "jour-j", "j+1", "post"]

export function getDaysUntilEvent(now: Date, eventDate: Date): number {
  return differenceInCalendarDays(eventDate, now)
}

export function getEventPhase(now: Date, eventDate: Date): EventPhase {
  const daysUntilEvent = getDaysUntilEvent(now, eventDate)
  if (daysUntilEvent > 1) return "prep"
  if (daysUntilEvent === 1) return "j-1"
  if (daysUntilEvent === 0) return "jour-j"
  if (daysUntilEvent === -1) return "j+1"
  return "post"
}

/** Compte à rebours en semaines : « 36 semaines et 4 jours », « 1 semaine », « moins d'une semaine ». */
export function formatWeeks(days: number): string {
  if (days < 7) return "moins d'une semaine"
  const weeks = Math.floor(days / 7)
  const rest = days % 7
  const w = `${weeks} semaine${weeks > 1 ? "s" : ""}`
  return rest === 0 ? w : `${w} et ${rest} jour${rest > 1 ? "s" : ""}`
}
