import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { albumService, type AlbumPhoto, type AlbumPartage, type AlbumVote } from "@/services/supabase/album"

const ARIAL = "Arial, sans-serif"

const RATINGS = [
  { value: 1 as const, emoji: "🙈",  label: "Non merci"   },
  { value: 2 as const, emoji: "👎🏾", label: "Neutre"      },
  { value: 3 as const, emoji: "👍🏾", label: "J'aime bien" },
  { value: 4 as const, emoji: "❤️",  label: "J'adore"     },
] as const
type Rating = 1 | 2 | 3 | 4

function getOrCreateVisitorId(): string {
  try {
    const stored = localStorage.getItem("sj-visitor-id")
    if (stored) return stored
    const id = crypto.randomUUID()
    localStorage.setItem("sj-visitor-id", id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

const CSS = `
  /* ── Formulaire ── */
  .gl-split { display: flex; min-height: 100svh; }
  .gl-left {
    flex: 0 0 380px; background: var(--ivoire);
    padding: 60px 48px; display: flex; flex-direction: column;
    justify-content: center; gap: 28px;
    border-right: 1px solid color-mix(in oklch, var(--dore) 30%, transparent 70%);
  }
  .gl-right { flex: 1; position: relative; overflow: hidden; min-height: 320px; }
  .gl-right img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; }
  @media (max-width: 620px) {
    .gl-split { flex-direction: column-reverse; }
    .gl-right { height: 45svh; }
    .gl-left { flex: none; padding: 36px 24px; border-right: none; border-top: 1px solid color-mix(in oklch, var(--dore) 30%, transparent 70%); }
  }
  .gl-label { display: block; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--bordeaux); margin-bottom: 5px; font-family: Arial, sans-serif; }
  .gl-input {
    width: 100%; padding: 9px 0; font-family: Arial, sans-serif; font-size: 14px;
    background: transparent; border: none;
    border-bottom: 1px solid color-mix(in oklch, var(--brun) 18%, transparent 82%);
    color: var(--brun); outline: none; transition: border-color .2s; box-sizing: border-box;
  }
  .gl-input:focus { border-bottom-color: var(--bordeaux); }
  .gl-input::placeholder { color: color-mix(in oklch, var(--brun) 28%, transparent 72%); }
  .gl-ghost {
    display: block; width: 100%; padding: 14px 24px;
    border: 1.5px solid var(--bordeaux); color: var(--bordeaux);
    background: transparent; font-family: Arial, sans-serif;
    font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
    cursor: pointer; transition: background .22s, color .22s;
  }
  .gl-ghost:hover:not(:disabled) { background: var(--bordeaux); color: var(--ivoire); }
  .gl-ghost:disabled { opacity: .35; cursor: default; }

  /* ── Grille ── */
  .gl-grid { columns: 2; gap: 4px; padding: 10px; }
  @media (min-width: 480px)  { .gl-grid { columns: 3; } }
  @media (min-width: 720px)  { .gl-grid { columns: 4; } }
  @media (min-width: 1024px) { .gl-grid { columns: 5; } }
  .gl-thumb {
    break-inside: avoid; margin-bottom: 4px; display: block;
    position: relative; overflow: hidden; border-radius: 3px; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .gl-thumb img { width: 100%; display: block; transition: transform .25s ease; }
  .gl-thumb:active img { transform: scale(1.04); }
  .gl-badge {
    position: absolute; bottom: 5px; right: 6px;
    font-size: 1.1rem; line-height: 1;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,.7));
    pointer-events: none;
  }

  /* ── Slideshow ── */
  .gl-slide {
    position: fixed; inset: 0; z-index: 50;
    background: #000;
    display: flex; flex-direction: column;
    user-select: none; -webkit-user-select: none;
    touch-action: pan-y;
  }

  /* Barre top */
  .gl-slide-top {
    position: absolute; top: 0; left: 0; right: 0; z-index: 2;
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px;
    background: linear-gradient(to bottom, rgba(0,0,0,.7) 0%, transparent 100%);
  }
  .gl-slide-counter { font-size: 13px; color: rgba(255,255,255,.7); font-family: Arial, sans-serif; letter-spacing: .04em; }
  .gl-slide-close {
    background: rgba(255,255,255,.12); border: none; border-radius: 50%;
    width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
    color: #fff; cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background .15s;
  }
  .gl-slide-close:active { background: rgba(255,255,255,.25); }

  /* Zone image (cliquable pour toggle réactions) */
  .gl-slide-img {
    flex: 1; display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden; cursor: pointer;
  }
  .gl-slide-img img {
    max-width: 100%; max-height: 100%; object-fit: contain;
    pointer-events: none;
    transition: opacity .18s ease;
  }
  .gl-slide-img img.gl-fading { opacity: 0; }

  /* Flèches navigation (desktop) */
  .gl-arrow {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: rgba(255,255,255,.12); border: none; border-radius: 50%;
    width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
    color: #fff; cursor: pointer; z-index: 3; transition: background .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .gl-arrow:hover { background: rgba(255,255,255,.25); }
  .gl-arrow:disabled { opacity: .2; pointer-events: none; }
  .gl-arrow-left  { left: 12px; }
  .gl-arrow-right { right: 12px; }
  @media (max-width: 600px) { .gl-arrow { display: none; } }

  /* Barre réactions */
  .gl-reactions {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    padding: 16px 20px 28px;
    background: linear-gradient(to top, rgba(0,0,0,.82) 0%, transparent 100%);
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    transition: opacity .2s, transform .2s;
  }
  .gl-reactions.gl-hidden { opacity: 0; transform: translateY(16px); pointer-events: none; }
  .gl-reactions-hint {
    font-size: 11px; color: rgba(255,255,255,.45); font-family: Arial, sans-serif;
    letter-spacing: .06em; text-transform: uppercase;
  }
  .gl-emojis { display: flex; gap: 10px; }
  .gl-emoji-btn {
    font-size: 1.8rem; line-height: 1; padding: 12px 14px;
    border-radius: 14px; border: none; cursor: pointer;
    background: rgba(255,255,255,.1); backdrop-filter: blur(8px);
    transition: transform .12s, background .12s;
    -webkit-tap-highlight-color: transparent;
  }
  .gl-emoji-btn:active { transform: scale(.88); }
  .gl-emoji-btn.gl-voted {
    background: rgba(255,255,255,.88);
    transform: scale(1.12);
    box-shadow: 0 4px 16px rgba(0,0,0,.4);
  }

  /* Indicateurs dot */
  .gl-dots {
    display: flex; gap: 5px; flex-wrap: wrap; justify-content: center;
    max-width: 200px;
  }
  .gl-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,.3); transition: background .15s;
    flex-shrink: 0;
  }
  .gl-dot.gl-dot-active { background: #fff; }
`

const HERO = "https://igyhlwonztzdrciogfuz.supabase.co/storage/v1/object/public/album-photos/1a2e3bdf-ec22-4263-9bf8-8fe9de5fb576/mu8z8lvp_S&J395.jpg"

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ height: 1, flex: 1, backgroundColor: "var(--dore)", opacity: 0.5 }} />
      <svg viewBox="0 0 20 10" width="16" height="8" style={{ flexShrink: 0, color: "var(--dore)", opacity: 0.8 }}>
        <path d="M10 5 L7 2 L4 5 L7 8 Z" fill="currentColor"/>
        <path d="M10 5 L13 2 L16 5 L13 8 Z" fill="currentColor"/>
      </svg>
      <div style={{ height: 1, flex: 1, backgroundColor: "var(--dore)", opacity: 0.5 }} />
    </div>
  )
}

// ── Page entry ────────────────────────────────────────────────────────────────

export function GaleriePage() {
  const [partage,     setPartage]     = useState<AlbumPartage | null>(null)
  const [visitorName, setVisitorName] = useState("")
  const [photos,      setPhotos]      = useState<AlbumPhoto[]>([])
  const [votes,       setVotes]       = useState<AlbumVote[]>([])
  const visitorIdRef = useRef(getOrCreateVisitorId())

  useEffect(() => {
    if (!partage) return
    albumService.listPhotos(partage.sequenceId).then(p =>
      setPhotos([...p].sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true })))
    )
    albumService.listVotes(partage.sequenceId).then(all =>
      setVotes(all.filter(v => v.voterId === visitorIdRef.current))
    )
  }, [partage])

  function handleVote(photoId: string, rating: Rating) {
    if (!partage) return
    setVotes(prev => {
      const next = prev.filter(v => v.photoId !== photoId)
      next.push({ photoId, voterId: visitorIdRef.current, voterName: visitorName, rating, votedAt: new Date().toISOString() })
      return next
    })
    albumService.vote(photoId, visitorIdRef.current, visitorName, rating, partage.id).catch(() => {})
  }

  function handleDeleteVote(photoId: string) {
    setVotes(prev => prev.filter(v => v.photoId !== photoId))
    albumService.deleteVote(photoId, visitorIdRef.current).catch(() => {})
  }

  if (!partage) {
    return <AccessForm onAccess={(name, p) => { setVisitorName(name); setPartage(p) }} />
  }
  return (
    <GalleryView
      partage={partage} photos={photos} votes={votes}
      onVote={handleVote} onDeleteVote={handleDeleteVote}
    />
  )
}

// ── Formulaire d'accès ────────────────────────────────────────────────────────

function AccessForm({ onAccess }: { onAccess: (name: string, p: AlbumPartage) => void }) {
  const [name,    setName]    = useState("")
  const [code,    setCode]    = useState("")
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    setLoading(true); setError(null)
    try {
      const p = await albumService.validatePartageCode(code)
      if (!p) { setError("Code incorrect."); return }
      onAccess(name.trim(), p)
    } catch {
      setError("Erreur réseau. Réessaie.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="gl-split" style={{ fontFamily: ARIAL }}>
        <div className="gl-left">
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontFamily: "Nickainley, serif", fontSize: "3.4rem", lineHeight: 1, color: "var(--bordeaux)", margin: 0 }}>
                Sarah & Jordan
              </p>
              <Divider />
              <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "color-mix(in oklch, var(--brun) 42%, transparent 58%)", margin: 0 }}>
                Album photo · Fiançailles 2026
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="gl-label">Ton prénom</label>
                <input className="gl-input" type="text" value={name}
                  onChange={e => setName(e.target.value)} placeholder="Ex. Camille"
                  autoComplete="given-name" required />
              </div>
              <div>
                <label className="gl-label">Code d'accès</label>
                <input className="gl-input" style={{ fontFamily: "monospace" }}
                  type="text" value={code} onChange={e => setCode(e.target.value)}
                  placeholder="••••••" autoComplete="off" autoCapitalize="none" required />
              </div>
              {error && <p style={{ fontSize: 12, color: "var(--destructive)", margin: 0 }}>{error}</p>}
              <button className="gl-ghost" type="submit" disabled={loading || !name.trim() || !code.trim()}>
                {loading ? "Vérification…" : "Voir les photos →"}
              </button>
            </form>
          </div>
        </div>
        <div className="gl-right"><img src={HERO} alt="" aria-hidden="true" /></div>
      </div>
    </>
  )
}

// ── Galerie (grille) ──────────────────────────────────────────────────────────

function GalleryView({
  partage, photos, votes, onVote, onDeleteVote,
}: {
  partage: AlbumPartage
  photos: AlbumPhoto[]
  votes: AlbumVote[]
  onVote: (photoId: string, rating: Rating) => void
  onDeleteVote: (photoId: string) => void
}) {
  const [slideIdx, setSlideIdx] = useState<number | null>(null)
  const voteMap = new Map(votes.map(v => [v.photoId, v.rating as Rating]))
  const totalLoved = [...voteMap.values()].filter(r => r >= 3).length

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100svh", backgroundColor: "var(--ivoire)", fontFamily: ARIAL }}>

        {/* Header */}
        <header style={{
          padding: "14px 18px",
          borderBottom: "1px solid color-mix(in oklch, var(--dore) 25%, transparent 75%)",
          display: "flex", alignItems: "center", gap: 14,
          backgroundColor: "var(--ivoire)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <p style={{ fontFamily: "Nickainley, serif", fontSize: "1.5rem", lineHeight: 1, color: "var(--bordeaux)", margin: 0, flexShrink: 0 }}>
            Sarah & Jordan
          </p>
          <div style={{ height: 26, width: 1, backgroundColor: "color-mix(in oklch, var(--dore) 30%, transparent 70%)", flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "color-mix(in oklch, var(--brun) 45%, transparent 55%)", margin: 0, flex: 1 }}>
            {partage.label} · {photos.length} photos
          </p>
          {voteMap.size > 0 && (
            <p style={{ fontSize: 11, color: "var(--bordeaux)", margin: 0, flexShrink: 0 }}>
              ❤️ {totalLoved}
            </p>
          )}
        </header>

        {/* Hint premier accès */}
        {photos.length > 0 && voteMap.size === 0 && (
          <p style={{ textAlign: "center", padding: "12px 20px 0", fontSize: 12, color: "color-mix(in oklch, var(--brun) 36%, transparent 64%)" }}>
            Appuie sur une photo pour la voir en grand et réagir
          </p>
        )}

        {/* Grille */}
        {photos.length === 0 ? (
          <p style={{ textAlign: "center", padding: "80px 24px", color: "color-mix(in oklch, var(--brun) 35%, transparent 65%)", fontSize: 14 }}>
            Chargement…
          </p>
        ) : (
          <div className="gl-grid">
            {photos.map((photo, i) => (
              <div key={photo.id} className="gl-thumb" onClick={() => setSlideIdx(i)}>
                <img src={photo.url} alt={photo.filename} loading="lazy" />
                {voteMap.has(photo.id) && (
                  <span className="gl-badge">{RATINGS.find(r => r.value === voteMap.get(photo.id))?.emoji}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer style={{
          backgroundColor: "color-mix(in oklch, var(--brun) 90%, black 10%)",
          padding: "28px 24px 20px", textAlign: "center",
          borderTop: "3px solid color-mix(in oklch, var(--dore) 60%, transparent 40%)",
          marginTop: 16,
        }}>
          <p style={{ fontFamily: "Nickainley, serif", fontSize: "1.7rem", color: "var(--ivoire)", margin: "0 0 6px", lineHeight: 1 }}>
            Sarah & Jordan
          </p>
          <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "color-mix(in oklch, var(--ivoire) 38%, transparent 62%)", margin: 0 }}>
            Fiançailles · 25 juillet 2026
          </p>
        </footer>
      </div>

      {/* Slideshow */}
      {slideIdx !== null && (
        <Slideshow
          photos={photos} initialIdx={slideIdx} voteMap={voteMap}
          onVote={onVote} onDeleteVote={onDeleteVote}
          onClose={() => setSlideIdx(null)}
        />
      )}
    </>
  )
}

// ── Slideshow plein écran ─────────────────────────────────────────────────────

function Slideshow({
  photos, initialIdx, voteMap, onVote, onDeleteVote, onClose,
}: {
  photos: AlbumPhoto[]
  initialIdx: number
  voteMap: Map<string, Rating>
  onVote: (photoId: string, rating: Rating) => void
  onDeleteVote: (photoId: string) => void
  onClose: () => void
}) {
  const [idx,         setIdx]         = useState(initialIdx)
  const [showRx,      setShowRx]      = useState(true)
  const [fading,      setFading]      = useState(false)
  const touchX  = useRef(0)
  const touchY  = useRef(0)
  const swipped = useRef(false)

  const photo   = photos[idx]
  const myVote  = voteMap.get(photo.id)
  const total   = photos.length

  function navigate(next: number) {
    if (next < 0 || next >= total) return
    setFading(true)
    setTimeout(() => { setIdx(next); setFading(false) }, 160)
  }

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowRight") navigate(idx + 1)
    if (e.key === "ArrowLeft")  navigate(idx - 1)
    if (e.key === "Escape")     onClose()
  }, [idx, total]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [handleKey])

  // Swipe touch
  function onTouchStart(e: React.TouchEvent) {
    touchX.current  = e.touches[0].clientX
    touchY.current  = e.touches[0].clientY
    swipped.current = false
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchX.current
    const dy = e.changedTouches[0].clientY - touchY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      swipped.current = true
      navigate(dx < 0 ? idx + 1 : idx - 1)
    }
  }

  // Dots (max 15 visibles)
  const showDots = total <= 40
  const dotStart = showDots ? Math.max(0, Math.min(idx - 7, total - 15)) : 0
  const dotSlice = showDots ? photos.slice(dotStart, dotStart + 15) : []

  return (
    <div
      className="gl-slide"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Barre top */}
      <div className="gl-slide-top">
        <span className="gl-slide-counter">{idx + 1} / {total}</span>
        <button className="gl-slide-close" onClick={onClose}><X size={18} /></button>
      </div>

      {/* Zone image */}
      <div className="gl-slide-img" onClick={() => { if (!swipped.current) setShowRx(v => !v) }}>
        <img src={photo.url} alt={photo.filename} className={fading ? "gl-fading" : ""} />

        {/* Flèches (desktop) */}
        <button className="gl-arrow gl-arrow-left"  disabled={idx === 0}          onClick={e => { e.stopPropagation(); navigate(idx - 1) }}><ChevronLeft  size={22} /></button>
        <button className="gl-arrow gl-arrow-right" disabled={idx === total - 1}   onClick={e => { e.stopPropagation(); navigate(idx + 1) }}><ChevronRight size={22} /></button>
      </div>

      {/* Barre réactions */}
      <div className={`gl-reactions${showRx ? "" : " gl-hidden"}`}>
        {showDots && (
          <div className="gl-dots">
            {dotSlice.map((p, di) => (
              <div
                key={p.id}
                className={`gl-dot${p.id === photo.id ? " gl-dot-active" : ""}`}
                onClick={() => navigate(dotStart + di)}
              />
            ))}
          </div>
        )}
        <div className="gl-emojis">
          {RATINGS.map(r => (
            <button
              key={r.value}
              className={`gl-emoji-btn${myVote === r.value ? " gl-voted" : ""}`}
              title={r.label}
              onClick={e => {
                e.stopPropagation()
                if (myVote === r.value) onDeleteVote(photo.id)
                else onVote(photo.id, r.value)
              }}
            >
              {r.emoji}
            </button>
          ))}
        </div>
        <span className="gl-reactions-hint">Appuie pour {showRx ? "masquer" : "afficher"}</span>
      </div>
    </div>
  )
}
