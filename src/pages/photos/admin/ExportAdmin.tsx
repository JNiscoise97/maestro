import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { galleryClient, gt } from "@/features/gallery/client"
import { useAlbums, usePhotos } from "@/features/gallery/api"
import { downloadText, toCsv } from "./format"

/**
 * Archive privée (CDCF ARC-03, NF-09) : export des métadonnées indépendant de la plateforme.
 * Les originaux se récupèrent avec le script supabase/scripts/export_galerie.mjs (clé service, en local).
 */
export function ExportAdmin() {
  const { data: photos = [] } = usePhotos()
  const { data: albums = [] } = useAlbums()
  const [busy, setBusy] = useState(false)
  const albumName = new Map(albums.map((a) => [a.id, a.name]))

  function exportCatalog() {
    downloadText(`galerie-catalogue-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([
      ["Identifiant", "Album", "Date de prise de vue", "Fichier original", "Largeur", "Hauteur", "Statut", "Rang accueil", "Chemin original"],
      ...photos.sort((a, b) => a.number - b.number).map((p) => [
        p.code, albumName.get(p.album_id) ?? "", p.taken_at ?? "", p.original_filename, p.width, p.height, p.status, p.home_rank, p.original_path,
      ]),
    ]))
  }

  async function exportInteractions() {
    setBusy(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = galleryClient as any
      const [reactions, comments, favorites] = await Promise.all(
        ["reactions", "comments", "favorites"].map(async (t) => (await db.from(gt(t)).select("*").range(0, 49999)).data ?? []),
      )
      downloadText(`galerie-interactions-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({
        exported_at: new Date().toISOString(),
        // Agrégats anonymes par photo : la politique de conservation reste à arbitrer (CDCF §16-10).
        photos: photos.map((p) => ({
          code: p.code,
          reactions: Object.fromEntries(Object.entries(
            (reactions as { photo_id: string; emoji: string }[]).filter((r) => r.photo_id === p.id)
              .reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] ?? 0) + 1 }), {}),
          )),
          favorites: (favorites as { photo_id: string }[]).filter((f) => f.photo_id === p.id).length,
          comments: (comments as { photo_id: string; body: string; created_at: string; hidden: boolean }[])
            .filter((c) => c.photo_id === p.id && !c.hidden).map((c) => ({ body: c.body, date: c.created_at })),
        })),
      }, null, 2), "application/json")
    } catch {
      toast.error("Export impossible.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Archive privée</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <Button onClick={exportCatalog} disabled={photos.length === 0}>Catalogue des photos (CSV)</Button>
          <p className="text-xs text-muted-foreground">Identifiants permanents, albums, ordre chronologique, sélection d'accueil, statut.</p>
        </div>
        <div className="space-y-1">
          <Button variant="outline" onClick={() => void exportInteractions()} disabled={busy || photos.length === 0}>Réactions, favoris et commentaires (JSON anonymisé)</Button>
          <p className="text-xs text-muted-foreground">Totaux par photo et textes des commentaires visibles, sans identité des auteurs.</p>
        </div>
        <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-xs">
          <p className="font-medium">Originaux du photographe</p>
          <p>Depuis un ordinateur, dans le dossier du projet :</p>
          <code className="block whitespace-pre-wrap rounded bg-background p-2">SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node supabase/scripts/export_galerie.mjs ./archive-galerie</code>
          <p>Le script télécharge chaque original, rangé par album et renommé SJ-0001…, avec le catalogue en JSON. Clé service à ne jamais partager.</p>
        </div>
      </CardContent>
    </Card>
  )
}
