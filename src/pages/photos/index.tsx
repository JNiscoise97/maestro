import { lazy, Suspense, useEffect, useState } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { GalleryAuthProvider, useGalleryAuth } from "@/context/GalleryAuthContext"
import { useAlbums, useConsentStatus, useGallerySettings, usePhotos } from "@/features/gallery/api"
import { galleryClient } from "@/features/gallery/client"
import { useColorMode } from "@/features/gallery/colorMode"
import { themeStyle } from "@/features/gallery/theme"
import { useResetZoomOn } from "@/features/gallery/zoom"
import type { ColorMode } from "@/features/gallery/theme"
import type { GalleryPhoto, GallerySettings } from "@/features/gallery/types"
import { CategoriesScreen, CategoryScreen } from "./AlbumsScreen"
import { ConsentScreen } from "./ConsentScreen"
import { GalleryNav, Notice } from "./GalleryChrome"
import { HomeScreen } from "./HomeScreen"
import { LoginScreen } from "./LoginScreen"
import { PhotoViewer } from "./PhotoViewer"

const GalleryAdmin = lazy(() => import("./admin").then((m) => ({ default: m.GalleryAdmin })))

/**
 * Galerie privée des photos de fiançailles (CDCF v1.0) — point d'entrée /photos.
 * Parcours : connexion par code → engagement de confidentialité → accueil / albums / visionneuse.
 * Les droits sont vérifiés côté serveur (RLS, stockage privé, edge functions) ; cette page ne fait
 * qu'afficher ce que le serveur accepte de renvoyer.
 */
export function GalleryPage() {
  useNoIndex()
  return (
    <GalleryAuthProvider>
      <GalleryGate />
    </GalleryAuthProvider>
  )
}

function GalleryGate() {
  const { session, member, loading, signOut } = useGalleryAuth()
  const ready = !!session && !!member && member.status === "active"
  const { data: settings } = useGallerySettings(!!session)
  const { data: consent, isLoading: consentLoading } = useConsentStatus(ready ? member!.id : null)
  const theme = settings?.theme ?? "cinema"
  const [mode, toggleMode] = useColorMode()
  const modeProps = { mode, onToggleMode: toggleMode }
  // Figé au montage : l'ouverture se réévalue à chaque visite.
  const [now] = useState(() => Date.now())

  // Retour au zoom normal à chaque changement d'écran : connexion → règles → accueil, et entre pages.
  const location = useLocation()
  useResetZoomOn([!!session, member?.status ?? "", consent?.accepted ?? "", location.pathname].join("|"))

  let content: React.ReactNode
  if (!galleryClient) content = <Notice title="Galerie indisponible">Configuration Supabase manquante.</Notice>
  else if (loading || (session && !member && !settings)) content = <Notice title="Chargement…" />
  else if (!session) content = <LoginScreen {...modeProps} />
  else if (!member) content = (
    <Notice title="Compte introuvable">
      Votre accès n'est pas (ou plus) actif. <button type="button" className="underline" onClick={() => void signOut()}>Se déconnecter</button>
    </Notice>
  )
  else if (member.status !== "active") content = (
    <Notice title="Accès suspendu">
      Votre compte a été désactivé. Contactez Sarah ou Jordan si besoin.{" "}
      <button type="button" className="underline" onClick={() => void signOut()}>Se déconnecter</button>
    </Notice>
  )
  else if (!settings || consentLoading) content = <Notice title="Chargement…" />
  else if (member.role !== "admin" && !consent?.current) content = (
    <Notice title="Bientôt disponible">La galerie n'est pas encore ouverte. Revenez un peu plus tard.</Notice>
  )
  else if (member.role !== "admin" && consent?.current && !consent.accepted) content = (
    <ConsentScreen memberId={member.id} consent={consent.current} onSignOut={() => void signOut()} />
  )
  else if (member.role !== "admin" && !isOpen(settings, now)) content = (
    <Notice title="La galerie est fermée">
      {settings.opens_at && now < Date.parse(settings.opens_at)
        ? `Ouverture le ${new Date(settings.opens_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
        : "Merci d'avoir partagé ces souvenirs avec nous."}
      <div className="mt-3"><button type="button" className="underline" onClick={() => void signOut()}>Se déconnecter</button></div>
    </Notice>
  )
  else content = <GalleryContent memberId={member.id} settings={settings} isAdmin={member.role === "admin"}
    limited={member.limited && member.role !== "admin"} {...modeProps} />

  return <div className="min-h-svh" style={themeStyle(theme, mode)}>{content}</div>
}

function isOpen(s: GallerySettings, now: number): boolean {
  return s.gallery_open && (!s.opens_at || now >= Date.parse(s.opens_at)) && (!s.closes_at || now < Date.parse(s.closes_at))
}

function GalleryContent({ memberId, settings, isAdmin, limited, mode, onToggleMode }: {
  memberId: string
  settings: GallerySettings
  isAdmin: boolean
  /** Accès limité : accueil seul (le serveur ne renvoie de toute façon que la sélection). */
  limited: boolean
  mode: ColorMode
  onToggleMode: () => void
}) {
  const { data: photos = [] } = usePhotos()
  const { data: albums = [] } = useAlbums()
  const [viewer, setViewer] = useState<{ list: GalleryPhoto[]; index: number } | null>(null)
  // Un administrateur voit aussi les photos masquées ; le parcours invité ne montre que les visibles.
  const visible = photos.filter((p) => p.status === "visible")
  const open = (list: GalleryPhoto[], index: number) => setViewer({ list, index })

  return (
    <>
      <GalleryNav mode={mode} onToggleMode={onToggleMode} />
      <Routes>
        <Route index element={<HomeScreen photos={visible} settings={settings} limited={limited} onOpen={open} />} />
        <Route path="albums" element={limited ? <Navigate to="/photos" replace /> : <CategoriesScreen photos={visible} albums={albums} onOpen={open} />} />
        <Route path="albums/:albumId" element={limited ? <Navigate to="/photos" replace /> : <CategoryScreen photos={visible} albums={albums} onOpen={open} />} />
        <Route path="favoris" element={<CategoryScreen photos={visible} albums={albums} favoritesOnly onOpen={open} />} />
        {isAdmin && (
          <Route path="admin/*" element={
            <Suspense fallback={<Notice title="Chargement…" />}>
              <GalleryAdmin />
            </Suspense>
          } />
        )}
        <Route path="*" element={<Notice title="Page introuvable" />} />
      </Routes>
      {viewer && (
        <PhotoViewer
          photos={viewer.list.filter((p) => visible.some((v) => v.id === p.id))}
          index={viewer.index}
          onIndex={(index) => setViewer({ ...viewer, index })}
          onClose={() => setViewer(null)}
          memberId={memberId}
          settings={settings}
        />
      )}
    </>
  )
}

/** SEC-05 : la galerie n'est jamais indexée par les moteurs de recherche. */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow, noarchive"
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])
}
