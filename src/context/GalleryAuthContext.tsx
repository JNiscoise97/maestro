import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"

import { galleryClient, gt } from "@/features/gallery/client"
import { logEvent, logVisit, markVisited } from "@/features/gallery/api"
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

  // Utilisateur de la session précédente : distingue une vraie connexion d'un simple rafraîchissement.
  const userRef = useRef<string | null>(null)

  useEffect(() => {
    if (!galleryClient) return
    let active = true
    void galleryClient.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      userRef.current = data.session?.user.id ?? null
      // Retour sur la galerie avec une session déjà ouverte : « visite ».
      if (data.session) logVisit()
      await loadMember(data.session)
      setLoading(false)
    })
    const { data: sub } = galleryClient.auth.onAuthStateChange((event, s) => {
      setSession(s)
      const previous = userRef.current
      userRef.current = s?.user.id ?? null
      // Hors du callback : un appel Supabase synchrone ici peut bloquer le client.
      setTimeout(() => {
        void loadMember(s)
        // Connexion par code : seulement si personne n'était connecté juste avant.
        if (event === "SIGNED_IN" && s && previous !== s.user.id) {
          logEvent("login")
          markVisited()
        }
      }, 0)
    })
    // Retour sur l'onglet après une absence : nouvelle visite (limitée à une toutes les 30 min).
    const onVisible = () => { if (document.visibilityState === "visible" && userRef.current) logVisit() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      active = false
      sub.subscription.unsubscribe()
      document.removeEventListener("visibilitychange", onVisible)
    }
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
