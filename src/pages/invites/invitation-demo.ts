import type { Guest } from "@/types/domain"
import type { MomentAnswer, PartyMember, RsvpResponse } from "@/services/rsvp.service"

/**
 * Réponses fictives pour prévisualiser l'onglet Invitations (bouton « Simuler des réponses »).
 * Calculées en mémoire, jamais enregistrées. Déterministes : les mêmes invités « répondent » à chaque fois.
 * Même format que le formulaire par étapes :
 *   · ~55 % des foyers répondent : 1 sur 6 « non », 1 sur 8 « je ne sais pas encore », les autres « oui » ;
 *   · la personne qui répond ajoute son conjoint, parfois un enfant de moins de 10 ans (hors liste) ;
 *   · chaque personne répond à chaque moment : surtout oui, parfois non ou « je ne sais pas encore ».
 */

const MESSAGES = [
  "Nous sommes ravis, félicitations !",
  "Hâte d'y être, on vous embrasse.",
  "Quelle joie, nous serons là avec plaisir.",
  null, null, null,
]
const DIETS = ["Végétarien", "Allergie aux fruits à coque", "Sans gluten", null, null, null, null, null, null, null]
const KIDS = ["Léo", "Inès", "Noé", "Jade", "Malo", "Lina"]

/** Nombre pseudo-aléatoire stable (0 à 9 999) tiré d'un identifiant. */
function hash(s: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return Math.abs(h) % 10_000
}

/** Réponse à un moment : 70 % oui, 15 % non, 15 % je ne sais pas encore (plus d'incertitude si la présence l'est). */
function answer(seed: string, unsure: boolean): MomentAnswer {
  const n = hash(seed, 13) % 100
  if (unsure) return n < 30 ? "yes" : n < 40 ? "no" : "unsure"
  return n < 70 ? "yes" : n < 85 ? "no" : "unsure"
}

export function simulateResponses(invited: Guest[], assigned: Record<string, string[]>, momentIds: string[]): RsvpResponse[] {
  const byId = new Map(invited.map((g) => [g.id, g]))
  const done = new Set<string>()
  const start = new Date("2026-10-20T09:00:00").getTime()
  const span = Math.max(1, Date.now() - start)
  const out: RsvpResponse[] = []

  for (const g of invited) {
    if (done.has(g.id)) continue
    const partner = g.pairedWithId ? byId.get(g.pairedWithId) : undefined
    done.add(g.id)
    if (partner) done.add(partner.id)

    const h = hash(g.id)
    if (h % 100 >= 55) continue // pas encore répondu
    const no = h % 6 === 0
    const unsure = !no && h % 8 === 1
    const moments = momentIds.filter((id) => (assigned[g.id] ?? []).includes(id) || (partner && (assigned[partner.id] ?? []).includes(id)))

    const person = (firstName: string, lastName: string, under10: boolean, seed: string): PartyMember => ({
      firstName, lastName, under10,
      moments: Object.fromEntries(moments.map((id) => [id, answer(seed + id, unsure)])),
      diet: DIETS[hash(seed, 5) % DIETS.length],
    })
    const party: PartyMember[] = no ? [] : [
      person(g.firstName, g.lastName, false, g.id),
      ...(partner ? [person(partner.firstName, partner.lastName, false, partner.id)] : []),
      // Un foyer sur cinq ajoute un enfant de moins de 10 ans, absent de la liste.
      ...(hash(g.id, 17) % 5 === 0 ? [person(KIDS[hash(g.id, 19) % KIDS.length], g.lastName, true, `${g.id}-kid`)] : []),
    ]
    const attended = moments.filter((id) => party.some((p) => p.moments[id] === "yes"))

    out.push({
      id: `demo-${g.id}`,
      wave: "invitation",
      name: `${g.firstName} ${g.lastName}`.trim(),
      attendance: no ? "no" : unsure ? "probably" : "yes",
      adults: no ? null : party.filter((p) => !p.under10).length,
      children: no ? null : party.filter((p) => p.under10).length,
      message: MESSAGES[hash(g.id, 3) % MESSAGES.length],
      cityOfOrigin: null,
      needsAccommodation: null,
      daysAttending: null,
      dietaryConstraints: no ? null : party.filter((p) => p.diet).map((p) => `${p.firstName} ${p.lastName} : ${p.diet}`).join(" · ") || null,
      guestId: g.id,
      partySize: no ? null : party.length,
      partyNames: no ? null : party.map((p) => `${p.firstName} ${p.lastName}`).join("\n"),
      arrivalAck: null,
      sequencesAttending: no ? null : attended,
      party: no ? null : party,
      processed: false,
      // Plus de réponses au début (après l'envoi) puis un rythme qui ralentit.
      createdAt: new Date(start + span * (hash(g.id, 11) / 10_000) ** 1.6).toISOString(),
    })
  }
  return out
}
