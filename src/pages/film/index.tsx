import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { filmService, type FilmGroup } from "@/services/supabase/film"

type Step = "form" | "watch"

// ── Page entry ────────────────────────────────────────────────────────────────

export function FilmPage() {
  const [step,     setStep]     = useState<Step>("form")
  const [name,     setName]     = useState("")
  const [group,    setGroup]    = useState<FilmGroup | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    filmService.getConfig().then(c => setVideoUrl(c.videoUrl))
  }, [])

  function handleAccess(viewerName: string, g: FilmGroup) {
    setName(viewerName)
    setGroup(g)
    setStep("watch")
  }

  if (step === "watch" && group && videoUrl) {
    return <WatchScreen group={group} videoUrl={videoUrl} viewerName={name} />
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
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / titre */}
        <div className="text-center space-y-2">
          <p className="text-white/30 text-xs tracking-[0.25em] uppercase">Sarah & Jordan</p>
          <h1 className="text-white text-2xl font-light tracking-wide">Notre film</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-white/40 tracking-widest uppercase mb-1.5">
                Ton prénom
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Marie"
                autoComplete="given-name"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-white/30 focus:bg-white/8 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 tracking-widest uppercase mb-1.5">
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-white/30 focus:bg-white/8 transition-colors font-mono"
              />
            </div>
          </div>

          {error && (
            <p className="text-[#ff6b6b] text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !code.trim()}
            className="w-full bg-white text-[#0d0d0d] font-medium text-sm rounded-lg py-3 transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {loading ? "Vérification…" : "Regarder le film"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Watch screen ───────────────────────────────────────────────────────────────

function WatchScreen({
  group,
  videoUrl,
  viewerName,
}: {
  group: FilmGroup
  videoUrl: string
  viewerName: string
}) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const lastLogRef = useRef<number>(0)
  const [isFs, setIsFs] = useState(false)

  // Track fullscreen state from native API
  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // Log each "play" event, debounced to 5 min
  function handlePlay() {
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
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Intro message */}
      {group.introMessage && (
        <div className="flex-none px-6 pt-10 pb-6 text-center max-w-xl mx-auto w-full">
          <p className="text-white/30 text-xs tracking-[0.25em] uppercase mb-3">Sarah & Jordan</p>
          <p className="text-white/80 text-base leading-relaxed whitespace-pre-wrap font-light">
            {group.introMessage}
          </p>
        </div>
      )}

      {/* Video */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            controlsList="nodownload"
            playsInline
            onPlay={handlePlay}
            onContextMenu={e => e.preventDefault()}
            className="w-full rounded-xl shadow-2xl bg-black aspect-video"
          />
          {/* Bouton plein écran custom (visible au survol) */}
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-12 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg p-2 transition-opacity opacity-0 hover:opacity-100 focus:opacity-100"
            title={isFs ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <p className="text-center text-white/15 text-[10px] pb-4 tracking-widest uppercase">
        Sarah & Jordan · Fiançailles
      </p>
    </div>
  )
}
