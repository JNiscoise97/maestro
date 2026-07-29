import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import type { Identity } from "@/types/domain"
import { identityService } from "@/services/identity.service"
import { mockKey } from "@/lib/event"

const STORAGE_KEY = mockKey("identity")

interface IdentityContextValue {
  /** Identité effective : celle de l'invité impersonné s'il y en a un, sinon la vraie. */
  person: Identity | null
  /** Toujours l'identité réelle du fiancé connecté — n'est jamais écrasée par l'impersonation. */
  realPerson: Identity | null
  isImpersonating: boolean
  isLoading: boolean
  login: (code: string) => Promise<Identity | null>
  logout: () => void
  /** Met à jour l'identité en mémoire sans refaire d'appel réseau. */
  patchPerson: (patch: Partial<Identity>) => void
  /** Passe en vue "invité" — le fiancé voit l'app à travers les yeux de cet invité. */
  impersonate: (identity: Identity) => void
  /** Revient à la vue normale du fiancé connecté. */
  stopImpersonating: () => void
  /**
   * Vrai juste après un clic sur "Déconnexion" — voir ProtectedLayout.
   */
  justLoggedOut: boolean
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [realPerson, setRealPerson] = useState<Identity | null>(null)
  const [impersonated, setImpersonated] = useState<Identity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [justLoggedOut, setJustLoggedOut] = useState(false)

  const person = impersonated ?? realPerson
  const isImpersonating = impersonated !== null

  useEffect(() => {
    let active = true
    const storedId = localStorage.getItem(STORAGE_KEY)
    const lookup = storedId ? identityService.getById(storedId) : Promise.resolve(null)

    lookup
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        return null
      })
      .then((found) => {
        if (!active) return
        setRealPerson(found && found.isActive ? found : null)
        setIsLoading(false)
      })

    return () => { active = false }
  }, [])

  async function login(code: string) {
    const found = await identityService.resolveByAccessCode(code)
    if (found) {
      localStorage.setItem(STORAGE_KEY, found.id)
      setJustLoggedOut(false)
      setRealPerson(found)
      setImpersonated(null)
    }
    return found
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setJustLoggedOut(true)
    setRealPerson(null)
    setImpersonated(null)
  }

  function patchPerson(patch: Partial<Identity>) {
    if (impersonated) {
      setImpersonated((prev) => (prev ? { ...prev, ...patch } : prev))
    } else {
      setRealPerson((prev) => (prev ? { ...prev, ...patch } : prev))
    }
  }

  function impersonate(identity: Identity) {
    setImpersonated(identity)
  }

  function stopImpersonating() {
    setImpersonated(null)
  }

  return (
    <IdentityContext.Provider
      value={{ person, realPerson, isImpersonating, isLoading, login, logout, patchPerson, impersonate, stopImpersonating, justLoggedOut }}
    >
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error("useIdentity doit être utilisé dans IdentityProvider")
  return ctx
}
