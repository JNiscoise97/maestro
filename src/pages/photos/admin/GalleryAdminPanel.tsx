import { ExternalLink, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GalleryAuthProvider, useGalleryAuth } from "@/context/GalleryAuthContext"
import { themeStyle } from "@/features/gallery/theme"
import { LoginScreen } from "../LoginScreen"
import { memberName } from "./format"
import { GalleryAdminEmbedded } from "./index"

/**
 * Administration de la galerie privée intégrée dans Paramètres › Galerie › Partage photos.
 * La galerie a sa propre connexion (compte admin par code e-mail), distincte de l'appli
 * d'organisation : si la session galerie existe déjà dans ce navigateur, l'admin s'affiche directement.
 */
export function GalleryAdminPanel() {
  return (
    <GalleryAuthProvider>
      <PanelGate />
    </GalleryAuthProvider>
  )
}

function PanelGate() {
  const { session, member, loading, signOut } = useGalleryAuth()

  if (loading) return <p className="text-sm text-muted-foreground">Connexion à la galerie…</p>

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Galerie privée — connexion administrateur</CardTitle>
          <p className="text-xs text-muted-foreground">
            La galerie a sa propre connexion. Utilisez une adresse administrateur (ex. sj18082020@gmail.com) :
            un code vous est envoyé par e-mail.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl" style={themeStyle("cinema", "light")}>
            <LoginScreen compact mode="light" onToggleMode={() => {}} />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!member || member.role !== "admin" || member.status !== "active") {
    return (
      <Card>
        <CardContent className="space-y-3 text-sm">
          <p>Ce compte de galerie n'est pas administrateur.</p>
          <Button size="sm" variant="outline" onClick={() => void signOut()}><LogOut className="size-3.5" /> Changer de compte</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm">
        <span>Galerie privée · connecté en tant que <b>{memberName(member)}</b></span>
        <span className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href="/photos" target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Voir la galerie</a>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void signOut()}><LogOut className="size-3.5" /> Se déconnecter</Button>
        </span>
      </div>
      <GalleryAdminEmbedded />
    </div>
  )
}
