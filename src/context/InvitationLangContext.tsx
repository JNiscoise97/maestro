import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

/**
 * Langue de l'invitation en ligne (/Jordan-Sarah-2027/invitation) : français ou anglais.
 *
 * Ordre de priorité :
 *   0. langue indiquée dans l'adresse (?lang=en ou ?lang=fr, lien envoyé aux invités) : vaut choix, mémorisée ;
 *   1. choix fait sur cet appareil avec le sélecteur FR / EN (mémorisé) ;
 *   2. langue de l'invité, réglée dans l'appli (Invités › Invitations), dès qu'il est retrouvé après connexion ;
 *   3. avant connexion : langue du navigateur (anglais si le navigateur est en anglais, sinon français).
 */
export type InvitationLang = "fr" | "en"

const KEY = "sj-invitation-lang"

function readStored(): InvitationLang | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === "fr" || v === "en" ? v : null
  } catch {
    return null
  }
}

/** ?lang=en / ?lang=fr dans l'adresse (aussi en, en-GB, english… : tout ce qui commence par « en »). */
function urlLang(): InvitationLang | null {
  try {
    const v = new URLSearchParams(window.location.search).get("lang")?.trim().toLowerCase()
    if (!v) return null
    return v.startsWith("en") ? "en" : v.startsWith("fr") ? "fr" : null
  } catch {
    return null
  }
}

function browserLang(): InvitationLang {
  const langs = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]
  const first = (langs[0] ?? "fr").toLowerCase()
  return first.startsWith("en") ? "en" : "fr"
}

type Ctx = {
  lang: InvitationLang
  /** Choix de l'invité avec le sélecteur : mémorisé sur l'appareil, prioritaire sur la langue de sa fiche. */
  choose: (lang: InvitationLang) => void
  /** Langue de la fiche de l'invité : appliquée seulement s'il n'a rien choisi sur cet appareil. */
  applyGuestLang: (lang: InvitationLang | null | undefined) => void
}

const LangContext = createContext<Ctx | null>(null)

export function InvitationLangProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => {
    // Lien avec ?lang= : comme un choix au sélecteur (mémorisé, prioritaire sur la langue de la fiche).
    const fromUrl = urlLang()
    if (fromUrl) {
      try { localStorage.setItem(KEY, fromUrl) } catch { /* stockage indisponible : langue de l'adresse pour la visite */ }
      return { lang: fromUrl, manual: true }
    }
    const stored = readStored()
    return { lang: stored ?? browserLang(), manual: stored !== null }
  })

  const choose = useCallback((lang: InvitationLang) => {
    try { localStorage.setItem(KEY, lang) } catch { /* stockage indisponible : choix limité à la visite */ }
    setState({ lang, manual: true })
  }, [])

  const applyGuestLang = useCallback((lang: InvitationLang | null | undefined) => {
    setState((s) => (s.manual ? s : { ...s, lang: lang ?? "fr" }))
  }, [])

  // Langue du document (lecteurs d'écran, césure, correcteur).
  useEffect(() => {
    const prev = document.documentElement.lang
    document.documentElement.lang = state.lang
    return () => { document.documentElement.lang = prev }
  }, [state.lang])

  const value = useMemo(() => ({ lang: state.lang, choose, applyGuestLang }), [state.lang, choose, applyGuestLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

/** Langue en cours ; français hors de l'invitation (pas de fournisseur). */
export function useInvitationLang(): Ctx {
  return useContext(LangContext) ?? { lang: "fr", choose: () => {}, applyGuestLang: () => {} }
}
