import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { filmService, type FilmGroup, type FilmVideo } from "@/services/supabase/film"

type Step = "form" | "watch"

const ARIAL = "Arial, sans-serif"

// ── Mini-Markdown : sauts de ligne + **gras** ─────────────────────────────────

function renderMessage(text: string) {
  return text.split("\n").map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    const nodes = parts.map((p, pi) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={pi} style={{ fontWeight: 600, color: "var(--bordeaux)" }}>{p.slice(2, -2)}</strong>
        : <span key={pi}>{p}</span>
    )
    return <span key={li}>{li > 0 && <br />}{nodes}</span>
  })
}

// ── Ornement SVG ──────────────────────────────────────────────────────────────

function FloralCorner({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M10 110 Q30 70 60 40 Q80 20 110 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M35 80 Q20 60 15 45" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M65 48 Q80 45 90 30" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
      <ellipse cx="12" cy="42" rx="6" ry="10" transform="rotate(-30 12 42)" fill="currentColor" opacity="0.35"/>
      <ellipse cx="20" cy="58" rx="5" ry="9" transform="rotate(-50 20 58)" fill="currentColor" opacity="0.3"/>
      <ellipse cx="92" cy="28" rx="6" ry="10" transform="rotate(40 92 28)" fill="currentColor" opacity="0.35"/>
      <ellipse cx="78" cy="42" rx="5" ry="8" transform="rotate(20 78 42)" fill="currentColor" opacity="0.3"/>
      <circle cx="55" cy="53" r="3.5" fill="currentColor" opacity="0.7"/>
      <circle cx="55" cy="53" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <circle cx="80" cy="20" r="2.5" fill="currentColor" opacity="0.6"/>
      <circle cx="28" cy="88" r="2" fill="currentColor" opacity="0.5"/>
    </svg>
  )
}

// ── Séparateur ornemental ─────────────────────────────────────────────────────

function OrnamentalDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="h-px flex-1 bg-dore/40" />
      <svg viewBox="0 0 24 12" width="24" height="12" className="text-dore/60 flex-none">
        <path d="M12 6 L8 2 L4 6 L8 10 Z" fill="currentColor"/>
        <path d="M12 6 L16 2 L20 6 L16 10 Z" fill="currentColor"/>
      </svg>
      <div className="h-px flex-1 bg-dore/40" />
    </div>
  )
}

// ── Page entry ────────────────────────────────────────────────────────────────

export function FilmPage() {
  const [step,      setStep]      = useState<Step>("form")
  const [name,      setName]      = useState("")
  const [group,     setGroup]     = useState<FilmGroup | null>(null)
  const [videos,    setVideos]    = useState<FilmVideo[]>([])
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const previewId = params.get("preview")

    filmService.listVideos().then(setVideos)

    if (previewId) {
      filmService.listGroups().then(groups => {
        const g = groups.find(g => g.id === previewId) ?? null
        setGroup(g)
        setIsPreview(true)
        setStep("watch")
      })
    }
  }, [])

  function handleAccess(viewerName: string, g: FilmGroup) {
    setName(viewerName)
    setGroup(g)
    setStep("watch")
  }

  if (step === "watch") {
    return (
      <WatchScreen
        group={group}
        videos={videos}
        viewerName={name}
        isPreview={isPreview}
      />
    )
  }

  return <AccessForm onAccess={handleAccess} />
}

// ── Access form ────────────────────────────────────────────────────────────────

function AccessForm({ onAccess }: { onAccess: (name: string, group: FilmGroup) => void }) {
  const [name,    setName]    = useState("")
  const [code,    setCode]    = useState("")
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const g = await filmService.validateCode(code)
      if (!g) {
        setError("Code incorrect. Vérifie le code qui t'a été transmis.")
        return
      }
      await filmService.logView(g.id, name.trim())
      onAccess(name.trim(), g)
    } catch {
      setError("Une erreur est survenue. Réessaie dans un instant.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: "var(--ivoire)", fontFamily: ARIAL }}
    >
      {/* Ornements botaniques */}
      <FloralCorner
        className="absolute top-0 left-0 w-32 h-32 pointer-events-none select-none"
        style={{ color: "var(--vert-vegetal)" }}
      />
      <FloralCorner
        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none select-none rotate-180"
        style={{ color: "var(--vert-vegetal)" }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Cadre doré */}
        <div
          className="rounded-2xl p-8 space-y-6"
          style={{
            backgroundColor: "color-mix(in oklch, var(--ivoire) 85%, white 15%)",
            border: "1.5px solid color-mix(in oklch, var(--dore) 60%, transparent 40%)",
            boxShadow: "0 0 0 4px color-mix(in oklch, var(--dore) 15%, transparent 85%), 0 4px 24px color-mix(in oklch, var(--brun) 10%, transparent 90%)",
          }}
        >
          {/* En-tête */}
          <div className="text-center space-y-2">
            <p
              className="text-4xl leading-tight"
              style={{ fontFamily: "Nickainley, serif", color: "var(--bordeaux)" }}
            >
              Sarah & Jordan
            </p>
            <OrnamentalDivider />
            <h1
              className="text-base font-medium tracking-wide"
              style={{ fontFamily: "var(--font-heading)", color: "var(--brun)" }}
            >
              Notre film
            </h1>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label
                  className="block text-[11px] tracking-widest uppercase mb-1.5 font-medium"
                  style={{ color: "var(--bordeaux)" }}
                >
                  Ton prénom
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Marie"
                  autoComplete="given-name"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    fontFamily: ARIAL,
                    backgroundColor: "color-mix(in oklch, white 80%, var(--ivoire) 20%)",
                    border: "1.5px solid color-mix(in oklch, var(--brun) 20%, transparent 80%)",
                    color: "var(--brun)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "color-mix(in oklch, var(--bordeaux) 60%, transparent 40%)")}
                  onBlur={e => (e.target.style.borderColor = "color-mix(in oklch, var(--brun) 20%, transparent 80%)")}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] tracking-widest uppercase mb-1.5 font-medium"
                  style={{ color: "var(--bordeaux)" }}
                >
                  Code d'accès
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="••••••"
                  autoComplete="off"
                  autoCapitalize="none"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                  style={{
                    backgroundColor: "color-mix(in oklch, white 80%, var(--ivoire) 20%)",
                    border: "1.5px solid color-mix(in oklch, var(--brun) 20%, transparent 80%)",
                    color: "var(--brun)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "color-mix(in oklch, var(--bordeaux) 60%, transparent 40%)")}
                  onBlur={e => (e.target.style.borderColor = "color-mix(in oklch, var(--brun) 20%, transparent 80%)")}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: "var(--destructive)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !code.trim()}
              className="w-full rounded-xl py-3 text-sm font-medium tracking-wide transition-all"
              style={{
                fontFamily: ARIAL,
                backgroundColor: "var(--bordeaux)",
                color: "var(--ivoire)",
                opacity: loading || !name.trim() || !code.trim() ? 0.45 : 1,
              }}
            >
              {loading ? "Vérification…" : "Regarder le film →"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-[11px] tracking-widest uppercase mt-6"
          style={{ color: "color-mix(in oklch, var(--brun) 35%, transparent 65%)", fontFamily: ARIAL }}
        >
          Fiançailles · 25 juillet 2026
        </p>
      </div>
    </div>
  )
}

// ── Watch screen ───────────────────────────────────────────────────────────────

function WatchScreen({
  group,
  videos,
  viewerName,
  isPreview,
}: {
  group: FilmGroup | null
  videos: FilmVideo[]
  viewerName: string
  isPreview: boolean
}) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const lastLogRef = useRef<number>(0)
  const [isFs, setIsFs]           = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const currentVideo = videos[activeIdx] ?? null

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  useEffect(() => {
    videoRef.current?.load()
  }, [activeIdx])

  function handlePlay() {
    if (isPreview || !group) return
    const now = Date.now()
    if (now - lastLogRef.current > 5 * 60 * 1000) {
      lastLogRef.current = now
      filmService.logView(group.id, viewerName).catch(() => {})
    }
  }

  function toggleFullscreen() {
    const el = videoRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--ivoire)", fontFamily: ARIAL }}
    >
      {/* Bandeau prévisualisation */}
      {isPreview && (
        <div
          className="px-4 py-2 text-center"
          style={{
            backgroundColor: "color-mix(in oklch, var(--dore) 15%, var(--ivoire) 85%)",
            borderBottom: "1px solid color-mix(in oklch, var(--dore) 40%, transparent 60%)",
          }}
        >
          <p className="text-xs font-medium tracking-wide" style={{ color: "var(--brun)" }}>
            Mode prévisualisation — {group ? `groupe « ${group.name} »` : "sans groupe"} · aucun visionnage enregistré
          </p>
        </div>
      )}

      {/* Message d'intro façon lettre */}
      {group?.introMessage && (
        <div className="flex-none px-6 pt-10 pb-4 max-w-xl mx-auto w-full">
          <p
            className="text-[11px] tracking-widest uppercase text-center mb-4"
            style={{ color: "color-mix(in oklch, var(--brun) 40%, transparent 60%)" }}
          >
            Fiançailles · 25 juillet 2026
          </p>
          <OrnamentalDivider />
          <div className="mt-5">
            <p
              style={{
                fontFamily: "var(--font-heading)",
                textAlign: "justify",
                fontSize: "1rem",
                lineHeight: 1.9,
                color: "var(--brun)",
              }}
            >
              {renderMessage(group.introMessage)}
            </p>
            <p
              className="mt-4"
              style={{
                fontFamily: "Nickainley, serif",
                color: "var(--bordeaux)",
                textAlign: "right",
                fontSize: "1.5rem",
                lineHeight: 1.2,
              }}
            >
              Sarah & Jordan
            </p>
          </div>
        </div>
      )}

      {/* Sélecteur de vidéo si plusieurs */}
      {videos.length > 1 && (
        <div className="flex justify-center gap-2 px-4 pt-4 pb-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActiveIdx(i)}
              className="px-5 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                fontFamily: ARIAL,
                backgroundColor: i === activeIdx ? "var(--bordeaux)" : "var(--beige)",
                color: i === activeIdx ? "var(--ivoire)" : "var(--brun)",
              }}
            >
              {v.title}
            </button>
          ))}
        </div>
      )}

      {/* Player */}
      <div className="flex-1 flex items-center justify-center px-4 pb-10 pt-4">
        {currentVideo ? (
          <div
            className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
            style={{
              border: "1.5px solid color-mix(in oklch, var(--dore) 40%, transparent 60%)",
              boxShadow: "0 8px 32px color-mix(in oklch, var(--brun) 15%, transparent 85%)",
            }}
          >
            <video
              ref={videoRef}
              src={currentVideo.url}
              controls
              controlsList="nodownload"
              playsInline
              onPlay={handlePlay}
              onContextMenu={e => e.preventDefault()}
              className="w-full bg-black aspect-video block"
            />
            <button
              onClick={toggleFullscreen}
              className="absolute bottom-14 right-3 rounded-lg p-2 transition-opacity opacity-0 hover:opacity-100 focus:opacity-100"
              style={{
                backgroundColor: "color-mix(in oklch, var(--brun) 70%, transparent 30%)",
                color: "var(--ivoire)",
              }}
              title={isFs ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <p
            className="text-sm"
            style={{ color: "color-mix(in oklch, var(--brun) 40%, transparent 60%)" }}
          >
            Aucune vidéo configurée.
          </p>
        )}
      </div>

      <p
        className="text-center text-[11px] tracking-widest uppercase pb-6"
        style={{ color: "color-mix(in oklch, var(--brun) 30%, transparent 70%)" }}
      >
        Sarah & Jordan · Fiançailles
      </p>
    </div>
  )
}
