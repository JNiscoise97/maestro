import { Link } from "react-router-dom"

import { useGalleryAuth } from "@/context/GalleryAuthContext"
import { useAccessRequests } from "@/features/gallery/api"
import { AccessAdmin } from "@/pages/photos/admin/AccessAdmin"
import { INVITATION_ROUTES } from "./paths"

/**
 * Administration de l'invitation : /Sarah-Jordan-2027/invitation/admin (lien des e-mails : …/admin/acces).
 * Réservée aux comptes admin de la base galerie (même base, mêmes droits côté serveur : RLS + gallery-admin).
 * Pour l'instant, un seul écran : les demandes d'accès et les comptes.
 */
export function InvitationAdmin() {
  const { member, signOut } = useGalleryAuth()
  const { data: requests = [] } = useAccessRequests()
  const pending = requests.filter((r) => r.status === "pending").length

  return (
    <div className="min-h-svh bg-background font-sans text-foreground">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Administration de l'invitation</h1>
            <p className="text-xs text-muted-foreground">
              Comptes communs avec la galerie photos : un accès ouvert ici donne aussi accès à /photos.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to={INVITATION_ROUTES.envelope} className="underline">Voir l'invitation</Link>
            <button type="button" className="text-muted-foreground underline" onClick={() => void signOut()}>
              Se déconnecter{member?.first_name ? ` (${member.first_name})` : ""}
            </button>
          </div>
        </header>
        <nav className="flex flex-wrap gap-1.5">
          <span aria-current="page" className="rounded-full border border-primary bg-primary px-3 py-1 text-sm text-primary-foreground">
            Accès
            {pending > 0 && <span className="ml-1.5 rounded-full bg-corail px-1.5 text-xs text-white">{pending}</span>}
          </span>
        </nav>
        <AccessAdmin scope="invitation" />
      </div>
    </div>
  )
}
