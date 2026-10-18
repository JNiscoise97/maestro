import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, CircleAlert, Copy, ImagePlus, Pause, Play, RotateCcw, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { KEYS, useAlbums, usePhotos } from "@/features/gallery/api"
import { importOne, type ImportStage } from "@/features/gallery/import"
import { cn } from "@/lib/utils"

type ItemStatus = "pending" | ImportStage | "done" | "duplicate" | "error"

type QueueItem = {
  key: string
  file: File
  preview: string
  albumId: string
  status: ItemStatus
  code?: string
  message?: string
}

const STAGE_PROGRESS: Record<ItemStatus, number> = {
  pending: 0, analyse: 15, generation: 40, envoi: 70, enregistrement: 92, done: 100, duplicate: 100, error: 100,
}
const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: "En attente",
  analyse: "Analyse…",
  generation: "Création des versions…",
  envoi: "Envoi des 3 fichiers…",
  enregistrement: "Enregistrement…",
  done: "Importée",
  duplicate: "Déjà présente",
  error: "Erreur",
}
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]
const PARALLEL = 3
const BUSY: ItemStatus[] = ["analyse", "generation", "envoi", "enregistrement"]

/**
 * Interface d'import (CDCF IMG-04/06) : catégorie, glisser-déposer des originaux, file d'attente
 * avec aperçu et avancement par photo. Chaque original est rangé dans full-size/, et la page génère
 * medium-size/ et mini-size/ avant d'enregistrer la photo (identifiant SJ-…) dans la table.
 */
export function UploadAdmin() {
  const qc = useQueryClient()
  const { data: albums = [] } = useAlbums()
  const { data: photos = [] } = usePhotos()
  const [albumId, setAlbumId] = useState("")
  const [items, setItems] = useState<QueueItem[]>([])
  const [running, setRunning] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])
  const input = useRef<HTMLInputElement>(null)
  // Copies synchrones pour les voies d'import (l'état React n'est relu qu'au rendu suivant).
  const itemsRef = useRef<QueueItem[]>([])
  const runningRef = useRef(false)
  useEffect(() => { itemsRef.current = items }, [items])
  const targetAlbum = albumId || albums[0]?.id || ""
  const albumName = (id: string) => albums.find((a) => a.id === id)?.name ?? "?"

  const update = (key: string, patch: Partial<QueueItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))

  function addFiles(list: FileList | File[]) {
    const files = [...list]
    const ok = files.filter((f) => ACCEPTED.includes(f.type))
    setRejected(files.filter((f) => !ACCEPTED.includes(f.type)).map((f) => f.name))
    setItems((prev) => [
      ...prev,
      ...ok.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file, preview: URL.createObjectURL(file), albumId: targetAlbum, status: "pending" as const,
      })),
    ])
  }

  // Une « voie » d'import : prend la prochaine photo en attente tant que l'import est lancé.
  const lane = useCallback(async () => {
    while (runningRef.current) {
      const next = itemsRef.current.find((it) => it.status === "pending")
      if (!next) return
      // Réservation immédiate pour que les autres voies ne prennent pas la même photo.
      itemsRef.current = itemsRef.current.map((it) => (it.key === next.key ? { ...it, status: "analyse" } : it))
      update(next.key, { status: "analyse" })
      const res = await importOne(next.file, next.albumId, (stage) => update(next.key, { status: stage }))
      update(next.key, {
        status: res.status === "imported" ? "done" : res.status,
        code: res.code,
        message: res.message,
      })
    }
  }, [])

  async function start() {
    if (!itemsRef.current.some((it) => it.status === "pending")) return
    setRunning(true)
    runningRef.current = true
    await Promise.all(Array.from({ length: PARALLEL }, () => lane()))
    setRunning(false)
    runningRef.current = false
    await qc.invalidateQueries({ queryKey: KEYS.photos })
  }

  // Ne pas quitter la page en plein import.
  useEffect(() => {
    if (!running) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [running])

  // Libère les aperçus à la sortie de la page.
  useEffect(() => () => { itemsRef.current.forEach((it) => URL.revokeObjectURL(it.preview)) }, [])

  function remove(key: string) {
    setItems((prev) => {
      const it = prev.find((x) => x.key === key)
      if (it) URL.revokeObjectURL(it.preview)
      return prev.filter((x) => x.key !== key)
    })
  }
  function clearFinished() {
    setItems((prev) => {
      prev.filter((x) => ["done", "duplicate"].includes(x.status)).forEach((x) => URL.revokeObjectURL(x.preview))
      return prev.filter((x) => !["done", "duplicate"].includes(x.status))
    })
  }

  const count = (s: ItemStatus[]) => items.filter((it) => s.includes(it.status)).length
  const pending = count(["pending"])
  const finished = count(["done", "duplicate", "error"])
  const overall = items.length ? Math.round(items.reduce((sum, it) => sum + STAGE_PROGRESS[it.status], 0) / items.length) : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">1. Catégorie de destination</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {albums.map((a) => {
            const n = photos.filter((p) => p.album_id === a.id && p.status !== "trashed").length
            const active = targetAlbum === a.id
            return (
              <button key={a.id} type="button" onClick={() => setAlbumId(a.id)} aria-pressed={active}
                className={cn("rounded-xl border px-4 py-3 text-left transition-colors",
                  active ? "border-bordeaux bg-bordeaux text-white" : "border-border bg-card hover:border-foreground/30")}>
                <span className="block text-sm font-semibold">{a.name}</span>
                <span className={cn("text-xs", active ? "text-white/80" : "text-muted-foreground")}>{n} photo{n > 1 ? "s" : ""}</span>
              </button>
            )
          })}
          <p className="w-full text-xs text-muted-foreground">
            La catégorie est attachée aux photos au moment où vous les ajoutez : vous pouvez enchaîner plusieurs catégories dans la même file.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Photos originales</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <button type="button" onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragOver ? "border-bordeaux bg-bordeaux/5" : "border-border hover:border-foreground/30 hover:bg-muted/40")}>
            <ImagePlus className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium">Glissez vos photos ici, ou cliquez pour les choisir</span>
            <span className="text-xs text-muted-foreground">
              JPEG, PNG ou WebP · vers « {albumName(targetAlbum)} » · originaux en pleine qualité
            </span>
          </button>
          <input ref={input} type="file" multiple accept={ACCEPTED.join(",")} hidden
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = "" }} />
          {rejected.length > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-bordeaux">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
              Format non pris en charge (HEIC, RAW… à convertir en JPEG) : {rejected.join(", ")}
            </p>
          )}
          <div className="grid gap-1 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground sm:grid-cols-3">
            <span><b className="text-foreground">full-size/</b> — l'original, intact (téléchargement HD)</span>
            <span><b className="text-foreground">medium-size/</b> — 2048 px, pour l'affichage</span>
            <span><b className="text-foreground">mini-size/</b> — 480 px, pour les grilles</span>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">3. Import — {finished} / {items.length}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {running ? (
                  <Button size="sm" variant="outline" onClick={() => { setRunning(false); runningRef.current = false }}>
                    <Pause className="size-3.5" /> Pause (après les photos en cours)
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void start()} disabled={pending === 0}>
                    <Play className="size-3.5" /> {finished > 0 && pending > 0 ? "Reprendre" : "Lancer l'import"} ({pending})
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={clearFinished} disabled={count(["done", "duplicate"]) === 0}>
                  Retirer les terminées
                </Button>
              </div>
            </div>
            <Progress value={overall} />
            <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
              <span className="text-vert-vegetal">{count(["done"])} importée(s)</span>
              <span>{count(["duplicate"])} déjà présente(s)</span>
              <span className="text-bordeaux">{count(["error"])} erreur(s)</span>
              <span>{pending} en attente</span>
              {!running && finished > 0 && pending === 0 && (
                <Link to="/photos/admin/photos" className="ml-auto underline">Voir les photos et choisir les couvertures →</Link>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <li key={it.key} className="flex gap-3 rounded-lg border border-border p-2">
                  <img src={it.preview} alt="" className="size-16 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-xs font-medium" title={it.file.name}>{it.file.name}</p>
                      {it.status === "pending" && (
                        <button type="button" aria-label="Retirer" onClick={() => remove(it.key)}><X className="size-3.5 text-muted-foreground" /></button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {(it.file.size / 1024 / 1024).toFixed(1)} Mo · {albumName(it.albumId)}
                    </p>
                    <Progress value={STAGE_PROGRESS[it.status]}
                      className={cn("h-1", it.status === "error" && "[&>*]:bg-bordeaux", it.status === "duplicate" && "[&>*]:bg-dore")} />
                    <p className={cn("flex items-center gap-1 text-[11px]",
                      it.status === "done" && "text-vert-vegetal", it.status === "error" && "text-bordeaux",
                      BUSY.includes(it.status) && "text-foreground")}>
                      {it.status === "done" && <CheckCircle2 className="size-3" />}
                      {it.status === "duplicate" && <Copy className="size-3" />}
                      {it.status === "error" && <CircleAlert className="size-3" />}
                      {STATUS_LABELS[it.status]}
                      {it.code && <b className="ml-1 tabular-nums">{it.code}</b>}
                    </p>
                    {it.status === "error" && (
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[10px] text-muted-foreground" title={it.message}>{it.message}</p>
                        <button type="button" className="flex shrink-0 items-center gap-0.5 text-[11px] underline"
                          onClick={() => update(it.key, { status: "pending", message: undefined })}>
                          <RotateCcw className="size-3" /> Réessayer
                        </button>
                        <button type="button" aria-label="Retirer" onClick={() => remove(it.key)}><Trash2 className="size-3 text-muted-foreground" /></button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
