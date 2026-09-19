import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, Upload, Images, GitMerge, Scissors, X, Check } from "lucide-react"

import { useIdentity } from "@/context/IdentityContext"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useAlbumPhotos, useAlbumVotes, useAlbumVote } from "@/hooks/queries/use-album"
import { albumService, compressImage } from "@/services/supabase/album"
import type { AlbumPhoto } from "@/services/supabase/album"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/supabase/client"

// ── Constants ─────────────────────────────────────────────────────────────────

type Rating = 1 | 2 | 3 | 4
type Mode = "swipe" | "compare" | "tranche" | "upload"

const ALBUM_TARGET = 50

const RATINGS = [
  { value: 1 as Rating, emoji: "🙈", label: "Non merci",    ring: "ring-slate-400",   bg: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" },
  { value: 2 as Rating, emoji: "👎", label: "Pas vraiment", ring: "ring-orange-400",  bg: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/60" },
  { value: 3 as Rating, emoji: "👍", label: "J'aime bien",  ring: "ring-emerald-400", bg: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60" },
  { value: 4 as Rating, emoji: "❤️", label: "J'adore",      ring: "ring-rose-400",    bg: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60" },
] as const

const IS_SEL = (r: Rating | undefined) => !!r && r >= 3

// ── Helpers ────────────────────────────────────────────────────────────────────

function usePreload(urls: string[], current: number, ahead = 4) {
  useEffect(() => {
    for (let i = current + 1; i <= Math.min(current + ahead, urls.length - 1); i++) {
      const img = new Image()
      img.src = urls[i]
    }
  }, [urls, current, ahead])
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AlbumPage() {
  const { data: sequences = [] } = useEventSequences()
  const [seqId, setSeqId] = useState<string | null>(null)

  useEffect(() => {
    if (!seqId && sequences.length > 0) setSeqId(sequences[0].id)
  }, [sequences, seqId])

  return (
    <div className="p-4 max-w-screen-xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Images className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Album photo</h1>
        {sequences.length > 1 && (
          <select
            className="ml-auto text-sm border rounded px-2 py-1 bg-background"
            value={seqId ?? ""}
            onChange={e => setSeqId(e.target.value)}
          >
            {sequences.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {seqId ? (
        <SequenceAlbum sequenceId={seqId} />
      ) : (
        <p className="text-muted-foreground text-sm">Aucune séquence configurée.</p>
      )}
    </div>
  )
}

// ── SequenceAlbum ─────────────────────────────────────────────────────────────

function SequenceAlbum({ sequenceId }: { sequenceId: string }) {
  const { person } = useIdentity()
  const qc = useQueryClient()

  const { data: photos = [], isLoading: photosLoading } = useAlbumPhotos(sequenceId)
  const { data: allVotes = [] }                          = useAlbumVotes(sequenceId)
  const voteMutation                                     = useAlbumVote(sequenceId)

  // Local optimistic vote map: photoId → rating
  const [localVotes, setLocalVotes] = useState<Map<string, Rating>>(new Map())
  useEffect(() => {
    if (!person) return
    const mine = allVotes.filter(v => v.voterId === person.id)
    setLocalVotes(new Map(mine.map(v => [v.photoId, v.rating as Rating])))
  }, [allVotes, person?.id])

  // Other voter's votes
  const { otherVotes, otherName } = useMemo(() => {
    const others = allVotes.filter(v => v.voterId !== person?.id)
    if (others.length === 0) return { otherVotes: new Map<string, Rating>(), otherName: null }
    const name = others[0].voterName
    return {
      otherVotes: new Map(others.map(v => [v.photoId, v.rating as Rating])),
      otherName: name,
    }
  }, [allVotes, person?.id])

  // Mode
  const [mode, setMode] = useState<Mode>("swipe")
  useEffect(() => {
    if (!photosLoading && photos.length === 0) setMode("upload")
  }, [photosLoading, photos.length])

  // Swipe index (start from first unvoted)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (photos.length === 0) return
    const first = photos.findIndex(p => !localVotes.has(p.id))
    setIndex(first >= 0 ? first : 0)
  }, [photos.length]) // intentionally only on photos.length change

  // Preview lightbox
  const [preview, setPreview] = useState<AlbumPhoto | null>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; label: string } | null>(null)
  const uploadCancelRef = useRef(false)

  const handleVote = useCallback((photoId: string, rating: Rating) => {
    if (!person) return
    setLocalVotes(prev => new Map(prev).set(photoId, rating))
    voteMutation.mutate({ photoId, voterId: person.id, voterName: person.fullName, rating })
  }, [person, voteMutation])

  const handleUpload = useCallback(async (files: FileList) => {
    if (!person) return
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name))
    const existingNames = new Set(photos.map(p => p.filename))
    const toProcess = sorted.filter(f => !existingNames.has(f.name))
    if (toProcess.length === 0) return

    setUploading(true)
    uploadCancelRef.current = false
    setUploadProgress({ done: 0, total: toProcess.length, label: "" })

    let startOrder = photos.length
    for (let i = 0; i < toProcess.length; i++) {
      if (uploadCancelRef.current) break
      const file = toProcess[i]
      setUploadProgress({ done: i, total: toProcess.length, label: file.name })
      try {
        const blob = await compressImage(file)
        const path = `${sequenceId}/${Date.now().toString(36)}_${file.name.replace(/\s+/g, "_")}`
        const { error } = await supabase!.storage.from("album-photos").upload(path, blob, { contentType: "image/jpeg" })
        if (error) throw error
        await albumService.insertPhoto(sequenceId, file.name, path, startOrder + i)
      } catch (err) {
        console.error("Upload error for", file.name, err)
      }
    }

    setUploadProgress(null)
    setUploading(false)
    qc.invalidateQueries({ queryKey: ["album_photos", sequenceId] })
    if (photos.length === 0) setMode("swipe")
  }, [person, photos, sequenceId, qc])

  // Derived stats
  const myVoted    = localVotes.size
  const mySelected = [...localVotes.values()].filter(IS_SEL).length
  const otherSelected = [...otherVotes.values()].filter(IS_SEL).length
  const common = photos.filter(p => IS_SEL(localVotes.get(p.id)) && IS_SEL(otherVotes.get(p.id))).length
  const disagreements = photos.filter(p => {
    const my = localVotes.get(p.id)
    const th = otherVotes.get(p.id)
    return my !== undefined && th !== undefined && IS_SEL(my) !== IS_SEL(th)
  })

  return (
    <>
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {photos.length > 0 && (
          <>
            <Button
              variant={mode === "swipe" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("swipe")}
            >
              <Images className="h-4 w-4 mr-1" /> Voter
            </Button>
            <Button
              variant={mode === "compare" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("compare")}
            >
              <GitMerge className="h-4 w-4 mr-1" /> Comparer
            </Button>
            {otherName && disagreements.length > 0 && (
              <Button
                variant={mode === "tranche" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("tranche")}
              >
                <Scissors className="h-4 w-4 mr-1" /> Trancher
                <Badge variant="secondary" className="ml-1">{disagreements.length}</Badge>
              </Button>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {photos.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {photos.length} photos · {myVoted} votées · ❤️ {mySelected}/{ALBUM_TARGET}
              {otherName && ` · ${otherName} ❤️${otherSelected}`}
              {otherName && common > 0 && ` · ${common} en commun`}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("upload")}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            {photos.length === 0 ? "Importer les photos" : "Ajouter"}
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {mode === "upload" && (
        <UploadPanel
          uploading={uploading}
          progress={uploadProgress}
          existingCount={photos.length}
          onFiles={handleUpload}
          onCancel={() => { uploadCancelRef.current = true }}
          onDone={() => setMode(photos.length > 0 ? "swipe" : "upload")}
        />
      )}

      {mode === "swipe" && photos.length > 0 && (
        <SwipePanel
          photos={photos}
          index={index}
          localVotes={localVotes}
          onVote={handleVote}
          onPrev={() => setIndex(i => Math.max(0, i - 1))}
          onNext={() => setIndex(i => Math.min(photos.length - 1, i + 1))}
          onPreview={setPreview}
        />
      )}

      {mode === "compare" && (
        <ComparePanel
          photos={photos}
          myVotes={localVotes}
          otherVotes={otherVotes}
          otherName={otherName}
          onPreview={setPreview}
          onDisagreements={() => setMode("tranche")}
          disagreementCount={disagreements.length}
        />
      )}

      {mode === "tranche" && otherName && (
        <TranchagePanel
          photos={disagreements}
          myVotes={localVotes}
          otherVotes={otherVotes}
          otherName={otherName}
          onVote={handleVote}
          onPreview={setPreview}
          onDone={() => setMode("compare")}
        />
      )}

      {preview && (
        <Lightbox photo={preview} onClose={() => setPreview(null)} />
      )}
    </>
  )
}

// ── UploadPanel ────────────────────────────────────────────────────────────────

function UploadPanel({
  uploading,
  progress,
  existingCount,
  onFiles,
  onCancel,
  onDone,
}: {
  uploading: boolean
  progress: { done: number; total: number; label: string } | null
  existingCount: number
  onFiles: (f: FileList) => void
  onCancel: () => void
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-4">
      {!uploading && (
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          )}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Déposer les photos ici</p>
          <p className="text-sm text-muted-foreground mt-1">
            ou cliquer pour sélectionner les fichiers
          </p>
          {existingCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {existingCount} photos déjà importées — les doublons (même nom de fichier) seront ignorés
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.length && onFiles(e.target.files)}
          />
        </div>
      )}

      {uploading && progress && (
        <div className="rounded-xl border p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Import en cours…</span>
            <span className="text-muted-foreground tabular-nums">{progress.done}/{progress.total}</span>
          </div>
          <Progress value={(progress.done / progress.total) * 100} />
          <p className="text-xs text-muted-foreground truncate">{progress.label}</p>
          <Button variant="outline" size="sm" className="self-start" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" /> Annuler
          </Button>
        </div>
      )}

      {!uploading && existingCount > 0 && (
        <Button variant="outline" size="sm" className="self-start" onClick={onDone}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Retour au vote
        </Button>
      )}
    </div>
  )
}

// ── SwipePanel ─────────────────────────────────────────────────────────────────

function SwipePanel({
  photos,
  index,
  localVotes,
  onVote,
  onPrev,
  onNext,
  onPreview,
}: {
  photos: AlbumPhoto[]
  index: number
  localVotes: Map<string, Rating>
  onVote: (photoId: string, rating: Rating) => void
  onPrev: () => void
  onNext: () => void
  onPreview: (p: AlbumPhoto) => void
}) {
  const photo = photos[index]
  if (!photo) return null

  const urls = useMemo(() => photos.map(p => p.url), [photos])
  usePreload(urls, index)

  const currentRating = localVotes.get(photo.id)
  const votedCount    = localVotes.size
  const selectedCount = [...localVotes.values()].filter(IS_SEL).length

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  onPrev()
      if (e.key === "ArrowRight") onNext()
      const n = parseInt(e.key)
      if (n >= 1 && n <= 4) onVote(photo.id, n as Rating)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [photo.id, onVote, onPrev, onNext])

  return (
    <div className="flex flex-col gap-3">
      {/* Progress */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums font-medium">{index + 1}/{photos.length}</span>
        <div className="flex-1">
          <Progress value={((index + 1) / photos.length) * 100} className="h-1.5" />
        </div>
        <span>votées {votedCount}</span>
        <span>❤️ {selectedCount}/{ALBUM_TARGET}</span>
      </div>

      {/* Photo */}
      <div
        className="relative rounded-xl overflow-hidden bg-muted cursor-zoom-in"
        style={{ height: "min(60vh, 520px)" }}
        onClick={() => onPreview(photo)}
      >
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.filename}
          className="w-full h-full object-contain"
          loading="eager"
        />
        {currentRating !== undefined && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-base px-2 py-0.5">
              {RATINGS.find(r => r.value === currentRating)?.emoji}
            </Badge>
          </div>
        )}
        <p className="absolute bottom-2 left-2 text-xs text-white/60 bg-black/30 rounded px-1.5 py-0.5">
          {photo.filename}
        </p>
      </div>

      {/* Rating buttons */}
      <div className="grid grid-cols-4 gap-2">
        {RATINGS.map(r => (
          <button
            key={r.value}
            onClick={() => { onVote(photo.id, r.value); onNext() }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-sm font-medium transition-all",
              currentRating === r.value
                ? `${r.ring} ring-2 ring-offset-1 ${r.bg}`
                : `border-transparent ${r.bg}`,
            )}
          >
            <span className="text-xl leading-none">{r.emoji}</span>
            <span className="hidden sm:block text-xs leading-tight text-center">{r.label}</span>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={onPrev} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
        </Button>
        <span className="text-xs text-muted-foreground self-center">
          touches 1–4 ou ← →
        </span>
        <Button variant="ghost" size="sm" onClick={onNext} disabled={index === photos.length - 1}>
          Suivant <ChevronLeft className="h-4 w-4 ml-1 rotate-180" />
        </Button>
      </div>
    </div>
  )
}

// ── ComparePanel ───────────────────────────────────────────────────────────────

type CompareTab = "common" | "mine" | "theirs" | "no"

function ComparePanel({
  photos,
  myVotes,
  otherVotes,
  otherName,
  onPreview,
  onDisagreements,
  disagreementCount,
}: {
  photos: AlbumPhoto[]
  myVotes: Map<string, Rating>
  otherVotes: Map<string, Rating>
  otherName: string | null
  onPreview: (p: AlbumPhoto) => void
  onDisagreements: () => void
  disagreementCount: number
}) {
  const [tab, setTab] = useState<CompareTab>("common")

  const common = useMemo(
    () => photos.filter(p => IS_SEL(myVotes.get(p.id)) && IS_SEL(otherVotes.get(p.id))),
    [photos, myVotes, otherVotes],
  )
  const onlyMine = useMemo(
    () => photos.filter(p => IS_SEL(myVotes.get(p.id)) && !IS_SEL(otherVotes.get(p.id))),
    [photos, myVotes, otherVotes],
  )
  const onlyTheirs = useMemo(
    () => photos.filter(p => !IS_SEL(myVotes.get(p.id)) && IS_SEL(otherVotes.get(p.id))),
    [photos, myVotes, otherVotes],
  )
  const neither = useMemo(
    () => photos.filter(p => !IS_SEL(myVotes.get(p.id)) && !IS_SEL(otherVotes.get(p.id))),
    [photos, myVotes, otherVotes],
  )

  const displayed = tab === "common" ? common : tab === "mine" ? onlyMine : tab === "theirs" ? onlyTheirs : neither

  const tabs: { key: CompareTab; label: string; count: number; color: string }[] = [
    { key: "common",  label: "En commun",  count: common.length,     color: "text-emerald-600" },
    { key: "mine",    label: "Mes choix",  count: onlyMine.length,   color: "text-blue-600" },
    { key: "theirs",  label: otherName ? `${otherName}` : "Leurs choix", count: onlyTheirs.length, color: "text-purple-600" },
    { key: "no",      label: "Non retenues", count: neither.length,  color: "text-muted-foreground" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border p-4 flex flex-wrap gap-4 items-center">
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums">{common.length}</p>
          <p className="text-xs text-muted-foreground">En commun</p>
        </div>
        <div className="h-8 w-px bg-border hidden sm:block" />
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-rose-500">{ALBUM_TARGET}</p>
          <p className="text-xs text-muted-foreground">Objectif</p>
        </div>
        <div className="h-8 w-px bg-border hidden sm:block" />
        <div className="flex-1">
          <Progress
            value={Math.min(100, (common.length / ALBUM_TARGET) * 100)}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {common.length >= ALBUM_TARGET
              ? `✓ Objectif atteint ! (${common.length - ALBUM_TARGET} de plus)`
              : `${ALBUM_TARGET - common.length} encore nécessaires en commun`}
          </p>
        </div>
        {disagreementCount > 0 && (
          <Button size="sm" variant="outline" onClick={onDisagreements} className="ml-auto">
            <Scissors className="h-4 w-4 mr-1" />
            Trancher {disagreementCount} désaccords
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              tab === t.key ? "bg-secondary border-transparent font-medium" : "border-border hover:bg-muted",
            )}
          >
            <span className={t.color}>{t.label}</span>
            <span className="ml-1.5 text-muted-foreground tabular-nums">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune photo dans cette catégorie.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1.5">
          {displayed.map(p => {
            const myR  = myVotes.get(p.id)
            const thR  = otherVotes.get(p.id)
            return (
              <div
                key={p.id}
                className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => onPreview(p)}
              >
                <img src={p.url} alt={p.filename} className="w-full h-full object-cover group-hover:opacity-80 transition" />
                <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                  {myR && <span className="text-xs leading-none">{RATINGS.find(r => r.value === myR)?.emoji}</span>}
                  {thR && <span className="text-xs leading-none">{RATINGS.find(r => r.value === thR)?.emoji}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TranchagePanel ─────────────────────────────────────────────────────────────

function TranchagePanel({
  photos,
  myVotes,
  otherVotes,
  otherName,
  onVote,
  onPreview,
  onDone,
}: {
  photos: AlbumPhoto[]
  myVotes: Map<string, Rating>
  otherVotes: Map<string, Rating>
  otherName: string
  onVote: (photoId: string, rating: Rating) => void
  onPreview: (p: AlbumPhoto) => void
  onDone: () => void
}) {
  const [idx, setIdx] = useState(0)

  const remaining = photos.filter(p => {
    const my = myVotes.get(p.id)
    const th = otherVotes.get(p.id)
    return my !== undefined && th !== undefined && IS_SEL(my) !== IS_SEL(th)
  })

  if (remaining.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center flex flex-col items-center gap-3">
        <Check className="h-8 w-8 text-emerald-500" />
        <p className="font-medium">Tous les désaccords ont été résolus !</p>
        <Button size="sm" onClick={onDone}>Voir les résultats</Button>
      </div>
    )
  }

  const safeIdx = Math.min(idx, remaining.length - 1)
  const photo   = remaining[safeIdx]
  if (!photo) return null

  const myR  = myVotes.get(photo.id)!
  const thR  = otherVotes.get(photo.id)!
  const iLike = IS_SEL(myR)

  return (
    <div className="flex flex-col gap-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{safeIdx + 1}/{remaining.length} désaccords</span>
        <Button variant="ghost" size="sm" onClick={onDone}>Terminer</Button>
      </div>

      <div
        className="rounded-xl overflow-hidden bg-muted cursor-zoom-in"
        style={{ height: "min(50vh, 440px)" }}
        onClick={() => onPreview(photo)}
      >
        <img src={photo.url} alt={photo.filename} className="w-full h-full object-contain" />
      </div>

      <div className="rounded-xl border p-3 flex justify-around text-sm">
        <div className="text-center">
          <p className="text-lg">{RATINGS.find(r => r.value === myR)?.emoji}</p>
          <p className="text-muted-foreground text-xs">Moi · {RATINGS.find(r => r.value === myR)?.label}</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-lg">{RATINGS.find(r => r.value === thR)?.emoji}</p>
          <p className="text-muted-foreground text-xs">{otherName} · {RATINGS.find(r => r.value === thR)?.label}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            onVote(photo.id, iLike ? 2 : 3)
            if (safeIdx === remaining.length - 1) setIdx(0)
          }}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 py-3 text-sm font-medium text-rose-700 dark:text-rose-300 transition"
        >
          <span className="text-lg">🗑️</span> Je l'enlève
        </button>
        <button
          onClick={() => {
            onVote(photo.id, iLike ? 3 : 4)
            if (safeIdx === remaining.length - 1) setIdx(0)
          }}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 transition"
        >
          <span className="text-lg">✅</span> Je la garde
        </button>
      </div>

      <div className="flex gap-1 justify-center">
        <Button variant="ghost" size="sm" disabled={safeIdx === 0} onClick={() => setIdx(safeIdx - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" disabled={safeIdx === remaining.length - 1} onClick={() => setIdx(safeIdx + 1)}>
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </Button>
      </div>
    </div>
  )
}

// ── Lightbox ───────────────────────────────────────────────────────────────────

function Lightbox({ photo, onClose }: { photo: AlbumPhoto; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={photo.url}
        alt={photo.filename}
        className="max-w-full max-h-full object-contain rounded"
        onClick={e => e.stopPropagation()}
      />
      <p className="absolute bottom-4 text-xs text-white/40">{photo.filename}</p>
    </div>
  )
}
