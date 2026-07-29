import type { Guest, MealChoice, Person, Prestataire } from "@/types/domain"

export type MealAttendeeSource = "guest" | "fiance" | "prestataire"

export interface MealAttendee {
  id: string
  source: MealAttendeeSource
  fullName: string
  subtitle?: string | null
  mealChoice?: MealChoice | null
  dietaryConstraints?: string | null
  allergies?: string | null
  /** Groupe/famille de l'invité (`null` pour fiancés et prestataires) — utilisé par la vue "Par groupe". */
  groupId?: string | null
}

export function guestsToAttendees(guests: Guest[]): MealAttendee[] {
  return guests
    .filter((g) => g.rsvpStatus !== "declined")
    .map((g) => ({
      id: g.id,
      source: "guest",
      fullName: g.fullName,
      subtitle: "Invité",
      mealChoice: g.mealChoice,
      dietaryConstraints: g.dietaryConstraints,
      allergies: g.allergies,
      groupId: g.groupId,
    }))
}

export function fiancesToAttendees(people: Person[]): MealAttendee[] {
  return people
    .filter((p) => p.role === "admin")
    .map((p) => ({
      id: p.id,
      source: "fiance",
      fullName: p.fullName,
      subtitle: "Fiancé(e)",
      mealChoice: p.mealChoice,
      dietaryConstraints: p.dietaryConstraints,
      allergies: p.allergies,
    }))
}

export function prestatairesToAttendees(prestataires: Prestataire[]): MealAttendee[] {
  return prestataires
    .filter((p) => p.needsMeal)
    .map((p) => ({
      id: p.id,
      source: "prestataire",
      fullName: p.name,
      subtitle: ["Prestataire", p.company].filter(Boolean).join(" · "),
      mealChoice: p.mealChoice,
      dietaryConstraints: p.dietaryConstraints,
      allergies: p.allergies,
    }))
}
