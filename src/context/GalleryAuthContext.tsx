import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"

import { galleryClient, gt } from "@/features/gallery/client"
import { logEvent } from "@/features/gallery/api"
import type { GalleryMember } from "@/features/gallery/types"

/**
 * Session de la galerie privée (Supabase Auth, connexion par code e-mail).
 * Indépendante de l'identité de l'appli d'organisation (IdentityContext).
 */
type GalleryAuth = {
  session: Session | null
  member: GalleryMember | null
  loading: boolean
  refreshMember: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<GalleryAuth | null>(null)

export function GalleryAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<GalleryMember | null>(null)
  // Sans client configuré, rien à charger.
  const [loading, setLoading] = useState(() => !!galleryClient)
  // Utilisateur dont la fiche a été chargée : évite d'afficher « compte introuvable »
  // entre l'arrivée de la session et celle de la fiche.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  const loadMember = useCallback(async (s: Session | null) => {
    if (!s || !galleryClient) { setMember(null); setLoadedFor(null); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (galleryClient as any).from(gt("members")).select("*").eq("id", s.user.id).maybeSingle()
    setMember(data ?? null)
    setLoadedFor(s.user.id)
  }, [])

  useEffect(() => {
    if (!galleryClient) return
    let active = true
    void galleryClient.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadMember(data.session)
      setLoading(false)
    })
    const { data: sub } = galleryClient.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // Hors du callback : un appel Supabase synchrone ici peut bloquer le client.
      setTimeout(() => {
        void loadMember(s)
        if (event === "SIGNED_IN") logEvent("login")
      }, 0)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadMember])

  const value: GalleryAuth = {
    session,
    member,
    loading: loading || (!!session && loadedFor !== session.user.id),
    refreshMember: () => loadMember(session),
    signOut: async () => {
      logEvent("logout")
      await galleryClient?.auth.signOut()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGalleryAuth(): GalleryAuth {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useGalleryAuth hors de GalleryAuthProvider")
  return ctx
}
