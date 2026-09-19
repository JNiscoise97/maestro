import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Upload, X, Maximize2, Eye, EyeOff } from "lucide-react"

import { useIdentity } from "@/context/IdentityContext"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useAlbumPhotos, useAlbumVotes, useAlbumVote } from "@/hooks/queries/use-album"
import { albumService, compressImage } from "@/services/supabase/album"
import type { AlbumPhoto } from "@/services/supabase/album"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { supabase } from "@/supabase/client"

// ── Types / constants ─────────────────────────────────────────────────────────

type Rating   = 1 | 2 | 3 | 4
type FilterKey = "all" | "unvoted" | "selected" | "common" | "mine" | "theirs" | "disagree"

const ALBUM_TARGET = 50
const IS_SEL = (r: Rating | undefined): boolean => !!r && r >= 3

const RATINGS = [
  { value: 1 as Rating, emoji: "🙈",  label: "Non merci"   },
  { value: 2 as Rating, emoji: "👎🏾", label: "Neutre"      },
  { value: 3 as Rating, emoji: "👍🏾", label: "J'aime bien" },
  { value: 4 as Rating, emoji: "❤️",  label: "J'adore"     },
] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export function AlbumPage() {
  const { data: sequences = [] } = useEventSequences()
  const [seqId, setSeqId] = useState<string | null>(null)

  useEffect(() => {
    if (!seqId && sequences.length > 0) setSeqId(sequences[0].id)
  }, [sequences, seqId])

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {sequences.length > 1 && (
        <div className="px-4 pt-3 pb-0">
          <select
            className="text-sm border rounded px-2 py-1 bg-background"
            value={seqId ?? ""}
            onChange={e => setSeqId(e.target.value)}
          >
            {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      {seqId
        ? <AlbumGrid sequenceId={seqId} />
        : <p className="text-muted-foreground text-sm p-4">Aucune séquence configurée.</p>
      }
    </div>
  )
}

// ── AlbumGrid ─────────────────────────────────────────────────────────────────

function AlbumGrid({ sequenceId }: { sequenceId: string }) {
  const { person }  = useIdentity()
  const qc          = useQueryClient()

  const { data: rawPhotos = [], isLoading } = useAlbumPhotos(sequenceId)
  const { data: allVotes  = [] }            = useAlbumVotes(sequenceId)
  const voteMutation                        = useAlbumVote(sequenceId)

  // Natural sort
  const photos = useMemo(
    () => [...rawPhotos].sort((a, b) =>
      a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: "base" })),
    [rawPhotos],
  )

  // My votes (optimistic)
  const [localVotes, setLocalVotes] = useState<Map<string, Rating>>(new Map())
  useEffect(() => {
    if (!person) return
    const mine = allVotes.filter(v => v.voterId === person.id)
    setLocalVotes(new Map(mine.map(v => [v.photoId, v.rating as Rating])))
  }, [allVotes, person?.id])

  // Partner votes
  const { otherVotes, otherName } = useMemo(() => {
    const others = allVotes.filter(v => v.voterId !== person?.id)
    if (!others.length) return { otherVotes: new Map<string, Rating>(), otherName: null }
    return {
      otherVotes: new Map(others.map(v => [v.photoId, v.rating as Rating])),
      otherName:  others[0].voterName,
    }
  }, [allVotes, person?.id])

  const [filter,      setFilter]      = useState<FilterKey>("all")
  const [showPartner, setShowPartner] = useState(false)
  const [activeId,    setActiveId]    = useState<string | null>(null)
  const [lightbox,    setLightbox]    = useState<AlbumPhoto | null>(null)
  const [uploadOpen,  setUploadOpen]  = useState(false)

  // Upload state
  const [uploading,       setUploading]       = useState(false)
  const [uploadProgress,  setUploadProgress]  = useState<{ done: number; total: number; label: string } | null>(null)
  const cancelRef = useRef(false)

  const handleVote = useCallback((photoId: string, rating: Rating) => {
    if (!person) return
    setLocalVotes(prev => new Map(prev).set(photoId, rating))
    setActiveId(null)
    voteMutation.mutate({ photoId, voterId: person.id, voterName: person.fullName, rating })
  }, [person, voteMutation])

  const handleUpload = useCallback(async (files: FileList) => {
    if (!person) return
    const sorted      = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
    const existing    = new Set(photos.map(p => p.filename))
    const toProcess   = sorted.filter(f => !existing.has(f.name))
    if (!toProcess.length) return

    setUploading(true)
    cancelRef.current = false
    setUploadProgress({ done: 0, total: toProcess.length, label: "" })

    for (let i = 0; i < toProcess.length; i++) {
      if (cancelRef.current) break
      const file = toProcess[i]
      setUploadProgress({ done: i, total: toProcess.length, label: file.name })
      try {
        const blob = await compressImage(file)
        const path = `${sequenceId}/${Date.now().toString(36)}_${file.name.replace(/\s+/g, "_")}`
        const { error } = await supabase!.storage.from("album-photos").upload(path, blob, { contentType: "image/jpeg" })
        if (error) throw error
        await albumService.insertPhoto(sequenceId, file.name, path, photos.length + i)
      } catch (err) {
        console.error("Upload error for", file.name, err)
      }
    }

    setUploadProgress(null)
    setUploading(false)
    qc.invalidateQueries({ queryKey: ["album_photos", sequenceId] })
  }, [person, photos, sequenceId, qc])

  // Filtered list
  const filtered = useMemo(() => {
    switch (filter) {
      case "unvoted":  return photos.filter(p => !localVotes.has(p.id))
      case "selected": return photos.filter(p => IS_SEL(localVotes.get(p.id)))
      case "common":   return photos.filter(p => IS_SEL(localVotes.get(p.id)) && IS_SEL(otherVotes.get(p.id)))
      case "mine":     return photos.filter(p => IS_SEL(localVotes.get(p.id)) && !IS_SEL(otherVotes.get(p.id)))
      case "theirs":   return photos.filter(p => !IS_SEL(localVotes.get(p.id)) && IS_SEL(otherVotes.get(p.id)))
      case "disagree": return photos.filter(p => {
        const my = localVotes.get(p.id); const th = otherVotes.get(p.id)
        return my !== undefined && th !== undefined && IS_SEL(my) !== IS_SEL(th)
      })
      default: return photos
    }
  }, [photos, localVotes, otherVotes, filter])

  // Stats
  const mySelected    = useMemo(() => [...localVotes.values()].filter(IS_SEL).length, [localVotes])
  const myVoted       = localVotes.size
  const common        = useMemo(
    () => photos.filter(p => IS_SEL(localVotes.get(p.id)) && IS_SEL(otherVotes.get(p.id))).length,
    [photos, localVotes, otherVotes],
  )
  const disagreements = useMemo(
    () => photos.filter(p => {
      const my = localVotes.get(p.id); const th = otherVotes.get(p.id)
      return my !== undefined && th !== undefined && IS_SEL(my) !== IS_SEL(th)
    }).length,
    [photos, localVotes, otherVotes],
  )

  // Keyboard
  useEffect(() => {
    if (!activeId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null)
      const n = parseInt(e.key)
      if (n >= 1 && n <= 4) handleVote(activeId, n as Rating)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [activeId, handleVote])

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Chargement…</div>

  if (photos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-muted-foreground">Aucune photo importée pour cette séquence.</p>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" /> Importer les photos
        </Button>
        <UploadSheet
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          uploading={uploading}
          progress={uploadProgress}
          existingCount={0}
          onFiles={handleUpload}
          onCancel={() => { cancelRef.current = true }}
        />
      </div>
    )
  }

  const filterDefs: { key: FilterKey; label: string; count: number; show: boolean }[] = [
    { key: "all",      label: "Toutes",      count: photos.length,    show: true },
    { key: "unvoted",  label: "Non votées",  count: photos.length - myVoted,      show: true },
    { key: "selected", label: "Mes ❤️",      count: mySelected,       show: true },
    { key: "common",   label: "En commun",   count: common,           show: !!otherName },
    { key: "mine",     label: "Que moi",     count: mySelected - common, show: !!otherName },
    { key: "theirs",   label: `Que ${otherName}`, count: [...otherVotes.values()].filter(IS_SEL).length - common, show: !!otherName },
    { key: "disagree", label: "Désaccords",  count: disagreements,    show: !!otherName && disagreements > 0 },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 flex flex-col gap-2">
        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold tabular-nums text-sm">
            ❤️ {mySelected}
            <span className="text-muted-foreground font-normal">/{ALBUM_TARGET}</span>
          </span>
          {otherName && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {otherName} ❤️ {[...otherVotes.values()].filter(IS_SEL).length}
            </span>
          )}
          {otherName && common > 0 && (
            <span className="text-sm font-medium text-emerald-600 tabular-nums">
              {common} en commun
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {myVoted}/{photos.length} votées
          </span>
          <div className="ml-auto flex gap-1.5">
            {otherName && (
              <button
                onClick={() => setShowPartner(v => !v)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-colors",
                  showPartner ? "bg-secondary border-transparent" : "border-border hover:bg-muted",
                )}
              >
                {showPartner ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {otherName}
              </button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3 w-3 mr-1" /> Importer
            </Button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {filterDefs.filter(f => f.show).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs border transition-colors whitespace-nowrap",
                filter === f.key
                  ? "bg-foreground text-background border-transparent"
                  : "border-border hover:bg-muted text-muted-foreground",
              )}
            >
              {f.label}
              {f.count > 0 && <span className="ml-1 opacity-60">{f.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div
        className="flex-1 overflow-y-auto p-3"
        onClick={() => setActiveId(null)}
      >
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
          {filtered.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              myRating={localVotes.get(photo.id)}
              partnerRating={otherVotes.get(photo.id)}
              showPartner={showPartner}
              isActive={activeId === photo.id}
              onActivate={() => setActiveId(id => id === photo.id ? null : photo.id)}
              onVote={rating => handleVote(photo.id, rating)}
              onLightbox={() => { setActiveId(null); setLightbox(photo) }}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-16">
            Aucune photo dans cette catégorie.
          </p>
        )}
      </div>

      <UploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        uploading={uploading}
        progress={uploadProgress}
        existingCount={photos.length}
        onFiles={handleUpload}
        onCancel={() => { cancelRef.current = true }}
      />

      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

// ── PhotoCard ─────────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  myRating,
  partnerRating,
  showPartner,
  isActive,
  onActivate,
  onVote,
  onLightbox,
}: {
  photo: AlbumPhoto
  myRating: Rating | undefined
  partnerRating: Rating | undefined
  showPartner: boolean
  isActive: boolean
  onActivate: () => void
  onVote: (r: Rating) => void
  onLightbox: () => void
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-lg cursor-pointer select-none",
        "ring-2 transition-all duration-150",
        isActive              ? "ring-white ring-offset-1 ring-offset-background scale-[0.97]" :
        IS_SEL(myRating)      ? "ring-emerald-500" :
        myRating !== undefined ? "ring-slate-400/30" :
                                 "ring-transparent",
      )}
      onClick={e => { e.stopPropagation(); onActivate() }}
    >
      {/* Photo */}
      <img
        src={photo.url}
        alt={photo.filename}
        loading="lazy"
        className={cn(
          "w-full h-full object-cover transition-all duration-200",
          isActive          ? "brightness-40" :
          myRating === undefined ? "brightness-75 saturate-50" :
                                   "brightness-100",
        )}
      />

      {/* Unvoted dot */}
      {myRating === undefined && !isActive && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 shadow" />
      )}

      {/* My rating badge */}
      {myRating !== undefined && !isActive && (
        <span className="absolute bottom-1 right-1 text-base leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {RATINGS.find(r => r.value === myRating)?.emoji}
        </span>
      )}

      {/* Partner badge */}
      {showPartner && partnerRating !== undefined && !isActive && (
        <span className="absolute bottom-1 left-1 text-xs leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-80">
          {RATINGS.find(r => r.value === partnerRating)?.emoji}
        </span>
      )}

      {/* Active overlay */}
      {isActive && (
        <div
          className="absolute inset-0 flex flex-col justify-between p-1.5"
          onClick={e => e.stopPropagation()}
        >
          {/* Top: lightbox + close */}
          <div className="flex justify-between">
            <button
              className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
              onClick={onLightbox}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
              onClick={e => { e.stopPropagation(); onActivate() }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bottom: 4 rating buttons */}
          <div className="grid grid-cols-4 gap-1">
            {RATINGS.map(r => (
              <button
                key={r.value}
                onClick={() => onVote(r.value)}
                title={r.label}
                className={cn(
                  "flex items-center justify-center rounded-lg py-2 text-xl leading-none transition-all",
                  myRating === r.value
                    ? "bg-white shadow-lg scale-110"
                    : "bg-black/60 hover:bg-black/30",
                )}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── UploadSheet ────────────────────────────────────────────────────────────────

function UploadSheet({
  open, onOpenChange, uploading, progress, existingCount, onFiles, onCancel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  uploading: boolean
  progress: { done: number; total: number; label: string } | null
  existingCount: number
  onFiles: (f: FileList) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Importer des photos</SheetTitle>
        </SheetHeader>

        {!uploading && (
          <div
            className={cn(
              "flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            )}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-sm">Déposer ou cliquer pour sélectionner</p>
            {existingCount > 0 && (
              <p className="text-xs text-muted-foreground text-center px-4">
                {existingCount} photos déjà importées — les doublons sont ignorés
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
          <div className="flex flex-col gap-3 p-4 rounded-xl border">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Import en cours…</span>
              <span className="tabular-nums text-muted-foreground">{progress.done}/{progress.total}</span>
            </div>
            <Progress value={(progress.done / progress.total) * 100} />
            <p className="text-xs text-muted-foreground truncate">{progress.label}</p>
            <Button variant="outline" size="sm" className="self-start" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" /> Annuler
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
      className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onClose}>
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
