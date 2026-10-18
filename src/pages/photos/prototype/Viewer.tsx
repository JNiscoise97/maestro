import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Flag, Heart, MessageCircle, X } from "lucide-react"

import { REACTIONS, REPORT_REASONS, fakeReactionCounts, type ProtoPhoto } from "./data"

type Panel = null | "comments" | "report" | "download"

/**
 * Visionneuse plein écran (CDCF IMG-02) : photo seule, commandes discrètes masquables
 * d'un toucher, navigation clavier / balayage, accès aux réactions, commentaires,
 * favoris, signalement et téléchargement. Interactions simulées (prototype).
 */
export function ProtoViewer({ photos, index, onIndex, onClose, favorites, onToggleFavorite }: {
  photos: ProtoPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  favorites: Set<string>
  onToggleFavorite: (id: string) => void
}) {
  const photo = photos[index]
  const [chrome, setChrome] = useState(true)
  const [panel, setPanel] = useState<Panel>(null)
  const [mine, setMine] = useState<Record<string, Set<string>>>({})
  const [comments, setComments] = useState<Record<string, { body: string; mine: boolean }[]>>({})
  const [draft, setDraft] = useState("")
  const [reported, setReported] = useState<Set<string>>(new Set())
  const touchX = useRef<number | null>(null)

  const go = (delta: number) => {
    const next = index + delta
    if (next >= 0 && next < photos.length) { onIndex(next); setPanel(null) }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { if (panel) setPanel(null); else onClose() }
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // Préchargement limité : seulement la photo suivante (IMG-03).
  const next = photos[index + 1]

  const counts = fakeReactionCounts(photo)
  const myReactions = mine[photo.id] ?? new Set<string>()
  const photoComments = comments[photo.id] ?? [
    { body: "Quelle belle lumière sur cette photo !", mine: false },
  ]
  const isReported = reported.has(photo.id)

  function toggleReaction(r: string) {
    setMine((prev) => {
      const set = new Set(prev[photo.id] ?? [])
      if (set.has(r)) set.delete(r); else set.add(r)
      return { ...prev, [photo.id]: set }
    })
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: "var(--p-viewer-bg)", color: "var(--p-viewer-fg)" }}
      role="dialog"
      aria-label={`Photo ${photo.code}`}
    >
      {/* Barre haute */}
      <div className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 transition-opacity duration-300 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <span className="text-xs tracking-[0.2em] uppercase opacity-70" style={{ fontFamily: "var(--p-body)" }}>
          {photo.code} · {index + 1} / {photos.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 opacity-80 hover:opacity-100">
          <X className="size-5" />
        </button>
      </div>

      {/* Photo */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center p-2 @2xl:p-10"
        onClick={() => { if (panel) setPanel(null); else setChrome((c) => !c) }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        {isReported ? (
          <p className="max-w-xs text-center text-sm opacity-80">
            Merci, cette photo est masquée pour tout le monde le temps que Sarah et Jordan l'examinent.
          </p>
        ) : (
          <img
            key={photo.id}
            src={photo.display}
            alt={photo.code}
            width={photo.width}
            height={photo.height}
            className="max-h-full max-w-full object-contain"
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
          />
        )}
        {next && <link rel="prefetch" href={next.display} />}

        {chrome && index > 0 && (
          <button type="button" aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); go(-1) }}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full p-2 opacity-60 hover:opacity-100 @2xl:block">
            <ChevronLeft className="size-7" />
          </button>
        )}
        {chrome && index < photos.length - 1 && (
          <button type="button" aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); go(1) }}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full p-2 opacity-60 hover:opacity-100 @2xl:block">
            <ChevronRight className="size-7" />
          </button>
        )}
      </div>

      {/* Barre basse : réactions et actions, discrètes */}
      {!isReported && (
        <div className={`z-10 flex flex-wrap items-center justify-between gap-2 px-3 pb-4 pt-2 transition-opacity duration-300 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="flex flex-wrap gap-1">
            {REACTIONS.map((r) => {
              const active = myReactions.has(r)
              const total = counts[r] + (active ? 1 : 0)
              return (
                <button key={r} type="button" onClick={() => toggleReaction(r)} aria-pressed={active}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors"
                  style={{ background: active ? "color-mix(in srgb, var(--p-accent) 35%, transparent)" : "color-mix(in srgb, var(--p-viewer-fg) 8%, transparent)" }}
                >
                  <span>{r}</span>
                  {total > 0 && <span className="text-xs tabular-nums opacity-80">{total}</span>}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1">
            <IconBtn label="Commentaires" onClick={() => setPanel(panel === "comments" ? null : "comments")}>
              <MessageCircle className="size-5" />
              <span className="text-xs tabular-nums">{photoComments.length}</span>
            </IconBtn>
            <IconBtn label={favorites.has(photo.id) ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={() => onToggleFavorite(photo.id)}>
              <Heart className="size-5" fill={favorites.has(photo.id) ? "currentColor" : "none"} style={{ color: favorites.has(photo.id) ? "var(--p-accent-2, var(--p-accent))" : undefined }} />
            </IconBtn>
            <IconBtn label="Télécharger" onClick={() => setPanel(panel === "download" ? null : "download")}>
              <Download className="size-5" />
            </IconBtn>
            <IconBtn label="Signaler" onClick={() => setPanel(panel === "report" ? null : "report")}>
              <Flag className="size-5" />
            </IconBtn>
          </div>
        </div>
      )}

      {/* Panneaux à la demande */}
      {panel && (
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[60%] overflow-y-auto rounded-t-2xl p-4 shadow-2xl"
          style={{ background: "var(--p-surface)", color: "var(--p-fg)", fontFamily: "var(--p-body)" }}>
          {panel === "comments" && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Commentaires · {photo.code}</p>
              <ul className="space-y-2">
                {photoComments.map((c, i) => (
                  <li key={i} className="rounded-lg p-2 text-sm" style={{ background: "color-mix(in srgb, var(--p-fg) 5%, transparent)" }}>
                    <span className="block text-[11px] uppercase tracking-wide" style={{ color: "var(--p-muted)" }}>
                      {c.mine ? "Vous" : "Un invité"}
                    </span>
                    {c.body}
                  </li>
                ))}
              </ul>
              <form className="flex gap-2" onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return
                setComments((prev) => ({ ...prev, [photo.id]: [...photoComments, { body: draft.trim(), mine: true }] }))
                setDraft("")
              }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un commentaire…"
                  className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-base outline-none @2xl:text-sm"
                  style={{ borderColor: "var(--p-line)" }} />
                <button type="submit" className="rounded-lg px-3 py-2 text-sm text-white" style={{ background: "var(--p-accent)" }}>Publier</button>
              </form>
              <p className="text-[11px]" style={{ color: "var(--p-muted)" }}>Les autres invités ne voient pas votre nom.</p>
            </div>
          )}
          {panel === "download" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Télécharger {photo.code}</p>
              <button type="button" className="block w-full rounded-lg border px-3 py-2 text-left text-sm" style={{ borderColor: "var(--p-line)" }}>
                Qualité normale <span style={{ color: "var(--p-muted)" }}>— pour un usage courant</span>
              </button>
              <button type="button" className="block w-full rounded-lg border px-3 py-2 text-left text-sm" style={{ borderColor: "var(--p-line)" }}>
                Qualité HD <span style={{ color: "var(--p-muted)" }}>— fichier original du photographe</span>
              </button>
              <p className="text-[11px]" style={{ color: "var(--p-muted)" }}>Une photo à la fois. Merci de ne pas la repartager.</p>
            </div>
          )}
          {panel === "report" && (
            <form className="space-y-2" onSubmit={(e) => {
              e.preventDefault()
              setReported((prev) => new Set(prev).add(photo.id))
              setPanel(null)
            }}>
              <p className="text-sm font-semibold">Signaler {photo.code}</p>
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="reason" value={r} /> {r}
                </label>
              ))}
              <p className="text-[11px]" style={{ color: "var(--p-muted)" }}>La photo sera masquée immédiatement pour tous.</p>
              <button type="submit" className="rounded-lg px-3 py-2 text-sm text-white" style={{ background: "var(--p-accent)" }}>Signaler</button>
            </form>
          )}
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
