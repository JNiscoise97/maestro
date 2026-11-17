import { useInvitationLang, type InvitationLang } from "@/context/InvitationLangContext"
import * as FR from "./content"
import * as EN from "./content-en"

/**
 * Textes de l'invitation dans la langue en cours : ./content.ts (français) ou ./content-en.ts (anglais).
 * Les deux fichiers ont la même structure ; le typage vérifie que l'anglais ne manque de rien.
 */
export type Content = typeof FR
const EN_CONTENT: Content = EN

export function contentFor(lang: InvitationLang): Content {
  return lang === "en" ? EN_CONTENT : FR
}

export function useContent(): Content {
  return contentFor(useInvitationLang().lang)
}

/** Intitulé français d'un moment (les pictogrammes du programme sont choisis d'après lui). */
export function frenchTitle(sequenceId: string): string {
  return FR.DAYS.flatMap((d) => d.moments).find((m) => m.sequenceId === sequenceId)?.title ?? ""
}

/** « A », « A et B », « A, B et C » (and : « et » / « and »). */
export function joinList(items: string[], and: string): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}` : items[0] ?? ""
}
