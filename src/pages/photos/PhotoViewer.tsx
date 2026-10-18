import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Flag, Heart, MessageCircle, Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import {
  downloadPhoto, logEvent, useCommentMutations, useFavorites, usePhotoComments, useReactionCounts,
  useReportReasons, useSignedUrls, useSubmitReport, useToggleFavorite, useToggleReaction,
} from "@/features/gallery/api"
import { GalleryError } from "@/features/gallery/client"
import { REACTION_EMOJIS } from "@/features/gallery/theme"
import type { GalleryPhoto, GallerySettings } from "@/features/gallery/types"

type Panel = null | "comments" | "report" | "download"

const DOWNLOAD_ERRORS: Record<string, string> = {
  disabled: "Ce téléchargement est désactivé pour le moment.",
  unavailable: "Cette photo n'est plus disponible.",
  closed: "La galerie est fermée.",
  consent: "Merci d'accepter les règles de confidentialité.",
}

/**
 * Visionneuse plein écran (CDCF IMG-02) : photo seule, commandes discrètes masquables d'un toucher,
 * navigation clavier et balayage, une image chargée à la fois + la suivante en préchargement.
 */
export function PhotoViewer({ photos, index, onIndex, onClose, memberId, settings }: {
  photos: GalleryPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  memberId: string
  settings: GallerySettings
}) {
  const photo = photos[index] as GalleryPhoto | undefined
  const next = photos[index + 1]
  const [chrome, setChrome] = useState(true)
  const [panel, setPanel] = useState<Panel>(null)
  const touchX = useRef<number | null>(null)

  const { data: urls } = useSignedUrls(photo ? [photo.display_path, ...(next ? [next.display_path] : [])] : [])
  const { data: counts = [] } = useReactionCounts(photo ? [photo.id] : [])
  const { data: favorites = new Set<string>() } = useFavorites()
  const toggleFavorite = useToggleFavorite(memberId)
  const toggleReaction = useToggleReaction(memberId)
  const { data: comments = [] } = usePhotoComments(photo?.id ?? null)

  // Ouverture explicite d'une photo : journalisée (ADM-02), une fois par photo affichée.
  useEffect(() => { if (photo) logEvent("photo_open", photo.id) }, [photo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (delta: number) => {
    const target = index + delta
    if (target >= 0 && target < photos.length) { onIndex(target); setPanel(null) }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return
      if (e.key === "Escape") { if (panel) setPanel(null); else onClose() }
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // Photo retirée entre-temps (signalée par quelqu'un) : on referme.
  useEffect(() => { if (!photo) onClose() }, [photo, onClose])
  if (!photo) return null

  const src = urls?.get(photo.display_path)
  const isFav = favorites.has(photo.id)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--p-viewer-bg)", color: "var(--p-viewer-fg)" }}
      role="dialog" aria-modal="true" aria-label={`Photo ${photo.code}`}>
      <div className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 transition-opacity duration-300 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <span className="text-xs uppercase tracking-[0.2em] opacity-70">{photo.code} · {index + 1} / {photos.length}</span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 opacity-80 hover:opacity-100">
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-10"
        onClick={() => { if (panel) setPanel(null); else setChrome((c) => !c) }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}>
        {src ? (
          <img key={photo.id} src={src} alt={photo.code} width={photo.width} height={photo.height}
            className="max-h-full max-w-full object-contain select-none" draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }} />
        ) : (
          <div className="max-h-full max-w-full animate-pulse" style={{ aspectRatio: `${photo.width} / ${photo.height}`, height: "70%", background: "color-mix(in srgb, var(--p-viewer-fg) 8%, transparent)" }} />
        )}
        {next && urls?.get(next.display_path) && <link rel="prefetch" href={urls.get(next.display_path)} />}

        {chrome && index > 0 && (
          <button type="button" aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); go(-1) }}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full p-2 opacity-60 hover:opacity-100 sm:block">
            <ChevronLeft className="size-7" />
          </button>
        )}
        {chrome && index < photos.length - 1 && (
          <button type="button" aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); go(1) }}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full p-2 opacity-60 hover:opacity-100 sm:block">
            <ChevronRight className="size-7" />
          </button>
        )}
      </div>

      <div className={`z-10 flex flex-wrap items-center justify-between gap-2 px-3 pb-4 pt-2 transition-opacity duration-300 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="flex flex-wrap gap-1">
          {settings.reactions_enabled && REACTION_EMOJIS.map((r) => {
            const row = counts.find((c) => c.emoji === r)
            const active = !!row?.mine
            return (
              <button key={r} type="button" aria-pressed={active} aria-label={`Réagir ${r}`}
                onClick={() => toggleReaction.mutate({ photoId: photo.id, emoji: r, on: !active })}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors"
                style={{ background: active ? "color-mix(in srgb, var(--p-accent) 35%, transparent)" : "color-mix(in srgb, var(--p-viewer-fg) 8%, transparent)" }}>
                <span>{r}</span>
                {row && row.total > 0 && <span className="text-xs tabular-nums opacity-80">{row.total}</span>}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Commentaires" onClick={() => setPanel(panel === "comments" ? null : "comments")}>
            <MessageCircle className="size-5" /><span className="text-xs tabular-nums">{comments.length}</span>
          </IconBtn>
          <IconBtn label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={() => toggleFavorite.mutate({ photoId: photo.id, on: !isFav })}>
            <Heart className="size-5" fill={isFav ? "currentColor" : "none"} style={{ color: isFav ? "var(--p-accent-2, var(--p-accent))" : undefined }} />
          </IconBtn>
          {(settings.download_normal_enabled || settings.download_hd_enabled) && (
            <IconBtn label="Télécharger" onClick={() => setPanel(panel === "download" ? null : "download")}>
              <Download className="size-5" />
            </IconBtn>
          )}
          <IconBtn label="Signaler" onClick={() => setPanel(panel === "report" ? null : "report")}>
            <Flag className="size-5" />
          </IconBtn>
        </div>
      </div>

      {panel && (
        <div className="absolute inset-x-0 bottom-0 z-20 mx-auto max-h-[65%] max-w-xl overflow-y-auto rounded-t-2xl p-4 shadow-2xl"
          style={{ background: "var(--p-surface)", color: "var(--p-fg)", fontFamily: "var(--p-body)" }}>
          {panel === "comments" && <CommentsPanel photo={photo} memberId={memberId} enabled={settings.comments_enabled} />}
          {panel === "download" && <DownloadPanel photo={photo} settings={settings} />}
          {panel === "report" && <ReportPanel photo={photo} memberId={memberId} onDone={() => setPanel(null)} />}
        </div>
      )}
    </div>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="flex items-center gap-1 rounded-full p-2 opacity-80 transition-opacity hover:opacity-100">
      {children}
    </button>
  )
}

function CommentsPanel({ photo, memberId, enabled }: { photo: GalleryPhoto; memberId: string; enabled: boolean }) {
  const { data: comments = [] } = usePhotoComments(photo.id)
  const { add, edit, remove } = useCommentMutations(memberId, photo.id)
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Commentaires · {photo.code}</p>
      {comments.length === 0 && <p className="text-sm" style={{ color: "var(--p-muted)" }}>Aucun commentaire pour l'instant.</p>}
      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg p-2 text-sm" style={{ background: "color-mix(in srgb, var(--p-fg) 5%, transparent)" }}>
            <div className="mb-0.5 flex items-center justify-between text-[11px] uppercase tracking-wide" style={{ color: "var(--p-muted)" }}>
              <span>{c.mine ? "Vous" : "Un invité"} · {new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
              {c.mine && enabled && (
                <span className="flex gap-1">
                  <button type="button" aria-label="Modifier" onClick={() => setEditing({ id: c.id, body: c.body })}><Pencil className="size-3.5" /></button>
                  <button type="button" aria-label="Supprimer" onClick={() => remove.mutate(c.id)}><Trash2 className="size-3.5" /></button>
                </span>
              )}
            </div>
            {editing?.id === c.id ? (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (editing.body.trim()) edit.mutate({ id: c.id, body: editing.body.trim() }, { onSuccess: () => setEditing(null) }) }}>
                <input value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} maxLength={2000}
                  className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1 text-base sm:text-sm" style={{ borderColor: "var(--p-line)" }} />
                <button type="submit" className="text-xs underline">OK</button>
                <button type="button" className="text-xs underline" onClick={() => setEditing(null)}>Annuler</button>
              </form>
            ) : (
              <p className="whitespace-pre-line">{c.body}</p>
            )}
          </li>
        ))}
      </ul>
      {enabled ? (
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          add.mutate(draft.trim(), { onSuccess: () => setDraft(""), onError: () => toast.error("Commentaire non publié.") })
        }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un commentaire…" maxLength={2000}
            className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-base outline-none sm:text-sm" style={{ borderColor: "var(--p-line)" }} />
          <button type="submit" disabled={add.isPending} className="rounded-lg px-3 py-2 text-sm text-white" style={{ background: "var(--p-accent)" }}>Publier</button>
        </form>
      ) : (
        <p className="text-[11px]" style={{ color: "var(--p-muted)" }}>Les commentaires sont fermés pour le moment.</p>
      )}
      <p className="text-[11px]" style={{ color: "var(--p-muted)" }}>Les autres invités ne voient pas votre nom.</p>
    </div>
  )
}

function DownloadPanel({ photo, settings }: { photo: GalleryPhoto; settings: GallerySettings }) {
  const [busy, setBusy] = useState<null | "normal" | "hd">(null)
  async function run(quality: "normal" | "hd") {
    setBusy(quality)
    try {
      await downloadPhoto(photo.id, quality)
    } catch (err) {
      toast.error(DOWNLOAD_ERRORS[err instanceof GalleryError ? err.code : ""] ?? "Le téléchargement a échoué.")
    } finally {
      setBusy(null)
    }
  }
  const row = "block w-full rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40"
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Télécharger {photo.code}</p>
      {settings.download_normal_enabled && (
        <button type="button" disabled={!!busy} onClick={() => void run("normal")} className={row} style={{ borderColor: "var(--p-line)" }}>
          Qualité normale <span style={{ color: "var(--p-muted)" }}>— pour un usage courant</span>{busy === "normal" && " …"}
        </button>
      )}
      {settings.download_hd_enabled && (
        <button type="button" disabled={!!busy} onClick={() => void run("hd")} className={row} style={{ borderColor: "var(--p-line)" }}>
          Qualité HD <span style={{ color: "var(--p-muted)" }}>— fichier original du photographe</span>{busy === "hd" && " …"}
        </button>
      )}
      <p className="text-[11px]" style={{ color: "var(--p-muted)" }}>Une photo à la fois. Merci de ne pas la repartager.</p>
    </div>
  )
}

function ReportPanel({ photo, memberId, onDone }: { photo: GalleryPhoto; memberId: string; onDone: () => void }) {
  const { data: reasons = [] } = useReportReasons()
  const submit = useSubmitReport(memberId)
  const [selected, setSelected] = useState<string[]>([])
  const [forSelf, setForSelf] = useState(true)
  return (
    <form className="space-y-2" onSubmit={(e) => {
      e.preventDefault()
      if (selected.length === 0) return
      submit.mutate({ photoId: photo.id, reasons: selected, forSelf }, {
        onSuccess: () => { toast.success("Merci. La photo est masquée le temps que Sarah et Jordan l'examinent."); onDone() },
        onError: () => toast.error("Le signalement n'a pas pu être envoyé."),
      })
    }}>
      <p className="text-sm font-semibold">Signaler {photo.code}</p>
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" checked={forSelf} onChange={() => setForSelf(true)} /> Pour moi</label>
        <label className="flex items-center gap-1.5"><input type="radio" checked={!forSelf} onChange={() => setForSelf(false)} /> Pour quelqu'un d'autre</label>
      </div>
      {reasons.filter((r) => r.active).map((r) => (
        <label key={r.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(r.label)}
            onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, r.label] : prev.filter((x) => x !== r.label))} />
          {r.label}
        </label>
      ))}
      <p className="text-[11px]" style={{ color: "var(--p-muted)" }}>La photo sera masquée immédiatement pour tout le monde.</p>
      <button type="submit" disabled={selected.length === 0 || submit.isPending}
        className="rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40" style={{ background: "var(--p-accent)" }}>
        Signaler
      </button>
    </form>
  )
}
