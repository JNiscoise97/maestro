import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { filmService, type FilmGroup, type FilmVideo } from "@/services/supabase/film"

type Step = "form" | "watch"

// ── Mini-Markdown : sauts de ligne + **gras** ─────────────────────────────────

function renderMessage(text: string) {
  return text.split("\n").map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    const nodes = parts.map((p, pi) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={pi}>{p.slice(2, -2)}</strong>
        : <span key={pi}>{p}</span>
    )
    return <span key={li}>{li > 0 && <br />}{nodes}</span>
  })
}

// ── Page entry ────────────────────────────────────────────────────────────────

export function FilmPage() {
  const [step,      setStep]      = useState<Step>("form")
  const [name,      setName]      = useState("")
  const [group,     setGroup]     = useState<FilmGroup | null>(null)
  const [videos,    setVideos]    = useState<FilmVideo[]>([])
  const [isPreview, setIsPreview] = useState(false)

  // Chargement des vidéos + mode prévisualisation (?preview=<groupId>)
  useEffect(() => {
    const params      = new URLSearchParams(window.location.search)
    const previewId   = params.get("preview")

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
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <p className="text-white/30 text-xs tracking-[0.25em] uppercase">Sarah & Jordan</p>
          <h1 className="text-white text-2xl font-light tracking-wide">Notre film</h1>
        </div>

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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-white/30 transition-colors"
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-white/30 transition-colors font-mono"
              />
            </div>
          </div>

          {error && <p className="text-[#ff6b6b] text-xs text-center">{error}</p>}

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
  videos,
  viewerName,
  isPreview,
}: {
  group: FilmGroup | null
  videos: FilmVideo[]
  viewerName: string
  isPreview: boolean
}) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const lastLogRef  = useRef<number>(0)
  const [isFs, setIsFs]         = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const currentVideo = videos[activeIdx] ?? null

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // Réinitialiser le player quand on change de vidéo
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
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Bandeau prévisualisation */}
      {isPreview && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center">
          <p className="text-amber-300 text-xs font-medium tracking-wide">
            Mode prévisualisation — {group ? `groupe "${group.name}"` : "sans groupe"} · aucun visionnage enregistré
          </p>
        </div>
      )}

      {/* Message d'intro */}
      {group?.introMessage && (
        <div className="flex-none px-6 pt-10 pb-6 text-center max-w-xl mx-auto w-full">
          <p className="text-white/30 text-xs tracking-[0.25em] uppercase mb-3">Sarah & Jordan</p>
          <p className="text-white/80 text-base leading-relaxed font-light">
            {renderMessage(group.introMessage)}
          </p>
        </div>
      )}

      {/* Sélecteur de vidéo si plusieurs */}
      {videos.length > 1 && (
        <div className="flex justify-center gap-2 px-4 pt-6 pb-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActiveIdx(i)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                i === activeIdx
                  ? "bg-white text-[#0d0d0d] font-medium"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {v.title}
            </button>
          ))}
        </div>
      )}

      {/* Player */}
      <div className="flex-1 flex items-center justify-center p-4">
        {currentVideo ? (
          <div className="relative w-full max-w-4xl">
            <video
              ref={videoRef}
              src={currentVideo.url}
              controls
              controlsList="nodownload"
              playsInline
              onPlay={handlePlay}
              onContextMenu={e => e.preventDefault()}
              className="w-full rounded-xl shadow-2xl bg-black aspect-video"
            />
            <button
              onClick={toggleFullscreen}
              className="absolute bottom-12 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg p-2 transition-opacity opacity-0 hover:opacity-100 focus:opacity-100"
              title={isFs ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <p className="text-white/30 text-sm">Aucune vidéo configurée.</p>
        )}
      </div>

      <p className="text-center text-white/15 text-[10px] pb-4 tracking-widest uppercase">
        Sarah & Jordan · Fiançailles
      </p>
    </div>
  )
}
