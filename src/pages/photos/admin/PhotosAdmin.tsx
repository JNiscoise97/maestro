import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { EyeOff, ImageIcon, RotateCcw, Star, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  deletePhotoForever, KEYS, setHomeSelection, updatePhoto, useAdminUpdate, useAlbums, usePhotos, useSignedUrls,
} from "@/features/gallery/api"
import type { GalleryPhoto, GalleryPhotoStatus } from "@/features/gallery/types"

const STATUS_LABELS: Record<GalleryPhotoStatus, string> = { visible: "Visible", hidden: "Masquée", trashed: "Corbeille" }

/**
 * Photos (CDCF IMG-05/06, MOD-06) : identifiants SJ-…, couverture de catégorie,
 * changement d'album, masquage, mise en avant à l'accueil, corbeille et suppression définitive.
 */
export function PhotosAdmin() {
  const qc = useQueryClient()
  const { data: photos = [] } = usePhotos()
  const { data: albums = [] } = useAlbums()
  const [albumId, setAlbumId] = useState<string>("")
  const [status, setStatus] = useState<GalleryPhotoStatus>("visible")
  const [query, setQuery] = useState("")
  const updateAlbum = useAdminUpdate("albums", [[...KEYS.albums]])
  const coverIds = useMemo(() => new Set(albums.map((a) => a.cover_photo_id).filter(Boolean)), [albums])

  const list = useMemo(() => photos.filter((p) =>
    p.status === status
    && (!albumId || p.album_id === albumId)
    && (!query.trim() || p.code.includes(query.trim().toUpperCase()) || p.original_filename.toLowerCase().includes(query.trim().toLowerCase())),
  ), [photos, status, albumId, query])
  const homeIds = useMemo(() => photos.filter((p) => p.home_rank !== null).sort((a, b) => a.home_rank! - b.home_rank!).map((p) => p.id), [photos])

  const refresh = () => qc.invalidateQueries({ queryKey: KEYS.photos })

  async function act(fn: () => Promise<void>, ok?: string) {
    try { await fn(); await refresh(); if (ok) toast.success(ok) } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Action impossible.")
    }
  }

  async function toggleHome(p: GalleryPhoto) {
    const next = p.home_rank !== null ? homeIds.filter((id) => id !== p.id) : [...homeIds, p.id]
    if (next.length > 50) { toast.error("La sélection d'accueil est limitée à 50 photos."); return }
    await act(() => setHomeSelection(next))
  }

  return (
    <div className="space-y-4">

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Photos ({list.length})</CardTitle>
            <Button size="sm" asChild><Link to="/photos/admin/upload"><Upload className="size-3.5" /> Importer des photos</Link></Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(STATUS_LABELS) as GalleryPhotoStatus[]).map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
                {STATUS_LABELS[s]} ({photos.filter((p) => p.status === s).length})
              </Button>
            ))}
            <select className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
              <option value="">Tous les albums</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <Input className="h-8 w-48" placeholder="SJ-0042 ou nom de fichier" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <PhotoTable photos={list.slice(0, 300)} albums={albums.map((a) => ({ id: a.id, name: a.name }))} coverIds={coverIds}
            onCover={(p) => updateAlbum.mutate({ match: { id: p.album_id }, patch: { cover_photo_id: p.id } }, {
              onSuccess: () => toast.success(`${p.code} est la couverture de « ${albums.find((a) => a.id === p.album_id)?.name} ».`),
              onError: () => toast.error("Couverture non enregistrée."),
            })}
            onAlbum={(p, id) => act(() => updatePhoto(p.id, { album_id: id }))}
            onHome={toggleHome}
            onStatus={(p, s) => act(() => updatePhoto(p.id, { status: s, ...(s === "trashed" ? { home_rank: null } : {}) }),
              s === "visible" ? `${p.code} restaurée.` : s === "trashed" ? `${p.code} mise à la corbeille.` : `${p.code} masquée.`)}
            onDelete={(p) => {
              if (!window.confirm(`Supprimer définitivement ${p.code} ? Les fichiers, réactions et commentaires seront effacés. Le numéro ne sera jamais réattribué.`)) return
              void act(() => deletePhotoForever(p), `${p.code} supprimée définitivement.`)
            }} />
          {list.length > 300 && <p className="mt-2 text-xs text-muted-foreground">300 premières photos affichées : affinez avec l'album ou la recherche.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function PhotoTable({ photos, albums, coverIds, onCover, onAlbum, onHome, onStatus, onDelete }: {
  photos: GalleryPhoto[]
  albums: { id: string; name: string }[]
  coverIds: Set<string | null>
  onCover: (p: GalleryPhoto) => void
  onAlbum: (p: GalleryPhoto, albumId: string) => void
  onHome: (p: GalleryPhoto) => void
  onStatus: (p: GalleryPhoto, s: GalleryPhotoStatus) => void
  onDelete: (p: GalleryPhoto) => void
}) {
  const { data: urls } = useSignedUrls(photos.map((p) => p.thumb_path))
  if (photos.length === 0) return <p className="text-sm text-muted-foreground">Aucune photo.</p>
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {photos.map((p) => (
        <li key={p.id} className="space-y-1.5 rounded-lg border border-border p-2 text-xs">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-muted">
            {urls?.get(p.thumb_path) && <img src={urls.get(p.thumb_path)} alt={p.code} className="max-h-full max-w-full object-contain" loading="lazy" />}
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold tabular-nums">{p.code}</span>
            <span className="flex gap-1">
              {coverIds.has(p.id) && <Badge className="bg-bordeaux/10 text-bordeaux">Couverture</Badge>}
              {p.home_rank !== null && <Badge className="bg-dore/20 text-brun">Accueil #{p.home_rank}</Badge>}
            </span>
          </div>
          <p className="truncate text-muted-foreground" title={p.original_filename}>{p.original_filename}</p>
          <p className="text-muted-foreground">{p.taken_at ? new Date(p.taken_at).toLocaleString("fr-FR") : "Date inconnue"}</p>
          <select className="w-full rounded border border-input bg-background px-1 py-1" value={p.album_id} onChange={(e) => onAlbum(p, e.target.value)}>
            {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-1">
            {p.status === "visible" && (
              <>
                <Button size="icon-xs" variant="ghost" title={p.home_rank !== null ? "Retirer de l'accueil" : "Mettre à l'accueil"} onClick={() => onHome(p)}>
                  <Star className="size-3.5" fill={p.home_rank !== null ? "currentColor" : "none"} />
                </Button>
                {!coverIds.has(p.id) && (
                  <Button size="icon-xs" variant="ghost" title="Définir comme couverture de sa catégorie" onClick={() => onCover(p)}>
                    <ImageIcon className="size-3.5" />
                  </Button>
                )}
                <Button size="icon-xs" variant="ghost" title="Masquer" onClick={() => onStatus(p, "hidden")}><EyeOff className="size-3.5" /></Button>
              </>
            )}
            {p.status !== "visible" && (
              <Button size="icon-xs" variant="ghost" title="Restaurer (avec réactions et commentaires)" onClick={() => onStatus(p, "visible")}><RotateCcw className="size-3.5" /></Button>
            )}
            {p.status !== "trashed" ? (
              <Button size="icon-xs" variant="ghost" title="Mettre à la corbeille" onClick={() => onStatus(p, "trashed")}><Trash2 className="size-3.5" /></Button>
            ) : (
              <Button size="xs" variant="destructive" onClick={() => onDelete(p)}>Supprimer définitivement</Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
