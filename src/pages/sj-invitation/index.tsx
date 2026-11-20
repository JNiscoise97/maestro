import { useEffect } from "react"
import "@fontsource/cormorant-garamond/400.css"
import "@fontsource/cormorant-garamond/500.css"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { GalleryAuthProvider, useGalleryAuth } from "@/context/GalleryAuthContext"
import { InvitationLangProvider, useInvitationLang } from "@/context/InvitationLangContext"
import { useGallerySettings } from "@/features/gallery/api"
import { galleryClient } from "@/features/gallery/client"
import { themeStyle } from "@/features/gallery/theme"
import { useResetZoomOn } from "@/features/gallery/zoom"
import type { GalleryMember } from "@/features/gallery/types"
import { Notice } from "@/pages/photos/GalleryChrome"
import { LoginScreen } from "@/pages/photos/LoginScreen"
import { InvitationAdmin } from "./admin"
import { MATTE_GOLD } from "@/features/gallery/gilded"
import { findGuest, loadWeddingGuests } from "./guest-programme"
import { useContent, type Content } from "./i18n"
import { LangSwitch } from "./lang-switch"
import { INVITATION_ROUTES } from "./paths"
import { DevicePreview } from "./preview"
import { DetailsScreen } from "./details"
import { EnvelopeScreen, LandingScreen, OpenedEnvelopeScreen } from "./screens"

/**
 * Interface invitation S&J — /Jordan-Sarah-2027/invitation/…
 * Page publique, hors ProtectedLayout / AppShell : aucune dépendance à l'interface admin de l'appli.
 *
 * Écrans (une adresse chacun) :
 *   /                   1. accueil public, bouton « Accéder à mon invitation »
 *   /connexion          2. connexion (parcours de /photos) → enveloppe une fois connecté
 *   /enveloppe          3. enveloppe fermée            ┐
 *   /enveloppe-ouverte  4. « Bonjour Prénom Nom… »      ├ connexion requise (sinon → /connexion, puis retour)
 *   /details            5. invitation complète          ┘
 *   /admin/*            administration (comptes admin)
 *
 * Connexion identique à /photos : mêmes comptes (_20260725_gal_members), même session
 * (client galerie, clé « sj-galerie-auth »). Un invité connecté sur /photos l'est donc aussi ici.
 * Les contrôles propres à la galerie (engagement de confidentialité, dates d'ouverture) ne s'appliquent pas.
 */
export function SjInvitationPage() {
  useNoIndex()
  return (
    <GalleryAuthProvider source="invitation">
      <InvitationLangProvider>
        <InvitationRouter />
      </InvitationLangProvider>
    </GalleryAuthProvider>
  )
}

function InvitationRouter() {
  const { session } = useGalleryAuth()
  const { data: settings } = useGallerySettings(!!session)
  const theme = settings?.theme ?? "cinema"
  const location = useLocation()
  const { UI } = useContent()
  useResetZoomOn([!!session, location.pathname].join("|"))

  const content = !galleryClient
    ? <Notice title={UI.common.unavailable} subtitle={UI.subtitle} gilded>{UI.common.missingConfig}</Notice>
    : (
      <Routes>
        <Route index element={<LandingScreen />} />
        <Route path="connexion" element={<LoginRoute />} />
        <Route path="enveloppe" element={<RequireMember>{(m) => <EnvelopeScreen member={m} />}</RequireMember>} />
        <Route path="enveloppe-ouverte" element={<RequireMember>{(m) => <OpenedEnvelopeScreen member={m} />}</RequireMember>} />
        <Route path="details" element={<RequireMember>{(m) => <DetailsScreen member={m} />}</RequireMember>} />
        <Route path="admin/*" element={
          <RequireMember>{(m) => m.role === "admin" ? <InvitationAdmin /> : <Navigate to={INVITATION_ROUTES.envelope} replace />}</RequireMember>
        } />
        <Route path="*" element={<Notice title={UI.common.notFound} subtitle={UI.subtitle} gilded />} />
      </Routes>
    )

  // Fond blanc sur tous les écrans, quel que soit le thème ou le mode choisi sur la galerie.
  return (
    <div className="min-h-svh" style={{ ...themeStyle(theme, "light"), ...WHITE }}>
      {/* Aperçu ordinateur / téléphone : bouton en haut à droite (administrateurs seulement). */}
      <DevicePreview>{content}</DevicePreview>
    </div>
  )
}

/** Fond blanc imposé (variables du thème + fond du conteneur). */
const WHITE = {
  "--p-bg": "#ffffff", "--p-surface": "#ffffff", background: "#ffffff", colorScheme: "light",
  // Police classique de faire-part (serif à fort contraste) pour les noms et les titres de l'invitation.
  "--p-heading": "'Cormorant Garamond', 'Times New Roman', serif",
  "--p-names-font": "'Cormorant Garamond', 'Times New Roman', serif",
  // Or mat (piste retenue) : sous-titres, cachet de l'enveloppe et boutons de la connexion.
  "--p-gold": MATTE_GOLD,
  "--p-accent": MATTE_GOLD,
} as React.CSSProperties

/** Page d'origine mémorisée lors d'une redirection vers /connexion. */
type FromState = { from?: string } | null

/**
 * 2. Connexion : parcours de /photos (e-mail → nom si inconnu → code ou année de naissance).
 * Une fois connecté (compte actif), redirection vers la page demandée au départ, sinon l'enveloppe.
 */
function LoginRoute() {
  const { session, member, loading, signOut } = useGalleryAuth()
  const location = useLocation()
  const { UI } = useContent()
  const { lang } = useInvitationLang()
  const from = (location.state as FromState)?.from

  if (loading) return <Notice title={UI.common.loading} subtitle={UI.subtitle} gilded />
  // Fond blanc fixe : pas de bascule clair / sombre (masquée par LoginScreen pour l'invitation).
  if (!session) return (
    <div className="relative">
      <LangSwitch className="absolute right-4 top-4 z-10" />
      <LoginScreen mode="light" onToggleMode={() => {}} source="invitation" lang={lang} subtitle={UI.subtitle} />
    </div>
  )
  const blocked = accountProblem(member, () => void signOut(), UI)
  if (blocked) return blocked
  return <Navigate to={from ?? INVITATION_ROUTES.envelope} replace />
}

/** Écrans réservés aux invités connectés : sinon, connexion puis retour à la page demandée. */
function RequireMember({ children }: { children: (member: GalleryMember) => React.ReactNode }) {
  const { session, member, loading, signOut } = useGalleryAuth()
  const location = useLocation()
  const { UI } = useContent()
  if (loading) return <Notice title={UI.common.loading} subtitle={UI.subtitle} gilded />
  if (!session) return <Navigate to={INVITATION_ROUTES.login} replace state={{ from: location.pathname } satisfies FromState} />
  const blocked = accountProblem(member, () => void signOut(), UI)
  if (blocked) return blocked
  return <><GuestLanguage member={member!} />{children(member!)}</>
}

/**
 * Langue de l'invitation réglée dans la fiche de l'invité (Invités › Invitations) : appliquée dès qu'il
 * est retrouvé, sauf s'il a choisi une langue avec le sélecteur FR / EN sur cet appareil.
 */
function GuestLanguage({ member }: { member: GalleryMember }) {
  const { applyGuestLang } = useInvitationLang()
  useEffect(() => {
    let alive = true
    loadWeddingGuests()
      .then((guests) => { if (alive) applyGuestLang(findGuest(guests, member)?.invitation_language) })
      .catch(() => { /* liste indisponible : on garde la langue en cours */ })
    return () => { alive = false }
  }, [member, applyGuestLang])
  return null
}

/** Session ouverte mais compte absent ou désactivé : message, comme sur /photos. */
function accountProblem(member: GalleryMember | null, signOut: () => void, UI: Content["UI"]): React.ReactNode | null {
  if (!member) return (
    <Notice title={UI.common.accountMissing} subtitle={UI.subtitle} gilded>
      {UI.common.accountMissingText} <button type="button" className="underline" onClick={signOut}>{UI.common.signOut}</button>
    </Notice>
  )
  if (member.status !== "active") return (
    <Notice title={UI.common.suspended} subtitle={UI.subtitle} gilded>
      {UI.common.suspendedText}{" "}
      <button type="button" className="underline" onClick={signOut}>{UI.common.signOut}</button>
    </Notice>
  )
  return null
}

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow, noarchive"
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])
}
