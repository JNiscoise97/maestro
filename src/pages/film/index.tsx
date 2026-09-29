import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { filmService, type FilmGroup, type FilmVideo } from "@/services/supabase/film"

const PHOTO = "https://igyhlwonztzdrciogfuz.supabase.co/storage/v1/object/public/album-photos/1a2e3bdf-ec22-4263-9bf8-8fe9de5fb576/mu8z8lvp_S&J395.jpg"
const ARIAL = "Arial, sans-serif"

type Step = "form" | "watch"

// ── Scroll-reveal ─────────────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".nr")
    if (!els.length) return
    const obs = new IntersectionObserver(
      entries => entries.forEach(e =>
        e.isIntersecting ? e.target.classList.add("nr-in") : e.target.classList.remove("nr-in")
      ),
      { threshold: 0.1 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  })
}

// ── Mini-Markdown ─────────────────────────────────────────────────────────────

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

// ── Divider ornemental ────────────────────────────────────────────────────────

function Divider({ color = "var(--dore)" }: { color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
      <div style={{ height: 1, flex: 1, backgroundColor: color, opacity: 0.5 }} />
      <svg viewBox="0 0 20 10" width="16" height="8" style={{ flexShrink: 0, color, opacity: 0.8 }}>
        <path d="M10 5 L7 2 L4 5 L7 8 Z" fill="currentColor"/>
        <path d="M10 5 L13 2 L16 5 L13 8 Z" fill="currentColor"/>
      </svg>
      <div style={{ height: 1, flex: 1, backgroundColor: color, opacity: 0.5 }} />
    </div>
  )
}

// ── Pattern de points ─────────────────────────────────────────────────────────

function Dots({ style }: { style?: React.CSSProperties }) {
  return (
    <div aria-hidden="true" style={{
      backgroundImage: "radial-gradient(circle, color-mix(in oklch, var(--corail) 50%, transparent 50%) 1.5px, transparent 1.5px)",
      backgroundSize: "11px 11px",
      ...style,
    }} />
  )
}

// ── CSS global de la page ─────────────────────────────────────────────────────

const PAGE_CSS = `
  /* Reveal */
  .nr         { opacity: 0; transform: translateX(-32px); transition: opacity .75s cubic-bezier(.16,1,.3,1), transform .75s cubic-bezier(.16,1,.3,1); }
  .nr.nr-up   { transform: translateY(24px); }
  .nr.nr-in   { opacity: 1 !important; transform: none !important; }

  /* Split-screen formulaire */
  .np-split { display: flex; min-height: 100svh; }
  .np-panel-left {
    flex: 0 0 420px;
    background: var(--ivoire);
    padding: 64px 52px;
    display: flex; flex-direction: column; justify-content: center; gap: 0;
    border-right: 1px solid color-mix(in oklch, var(--dore) 30%, transparent 70%);
  }
  .np-panel-right { flex: 1; position: relative; overflow: hidden; }
  .np-panel-right img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 60%; }

  @media (max-width: 660px) {
    .np-split { flex-direction: column-reverse; }
    .np-panel-right { height: 52svh; }
    .np-panel-left { flex: none; padding: 40px 28px; border-right: none; border-top: 1px solid color-mix(in oklch, var(--dore) 30%, transparent 70%); }
  }

  /* Inputs */
  .np-label {
    display: block; font-size: 10px; letter-spacing: .2em; text-transform: uppercase;
    color: var(--bordeaux); margin-bottom: 5px; font-family: Arial, sans-serif;
  }
  .np-input {
    width: 100%; padding: 9px 0; font-family: Arial, sans-serif; font-size: 14px;
    background: transparent; border: none;
    border-bottom: 1px solid color-mix(in oklch, var(--brun) 18%, transparent 82%);
    color: var(--brun); outline: none; transition: border-color .2s; box-sizing: border-box;
  }
  .np-input:focus { border-bottom-color: var(--bordeaux); }
  .np-input::placeholder { color: color-mix(in oklch, var(--brun) 28%, transparent 72%); }

  /* Bouton ghost */
  .np-ghost {
    display: block; width: 100%; padding: 14px 24px;
    border: 1.5px solid var(--bordeaux); color: var(--bordeaux);
    background: transparent; font-family: Arial, sans-serif;
    font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
    cursor: pointer; transition: background .22s, color .22s;
  }
  .np-ghost:hover:not(:disabled) { background: var(--bordeaux); color: var(--ivoire); }
  .np-ghost:disabled { opacity: .35; cursor: default; }

  /* Bouton plein écran */
  .np-fs {
    position: absolute; bottom: 52px; right: 12px; padding: 8px; border-radius: 8px;
    border: none; cursor: pointer; background: rgba(0,0,0,.5); color: #fff;
    opacity: 0; transition: opacity .2s; display: flex; align-items: center;
  }
  .np-fs:hover { opacity: 1; }

  /* Carte lettre */
  .np-letter {
    background: #fff;
    border-radius: 2px;
    box-shadow: 0 2px 12px rgba(0,0,0,.06), 0 16px 48px rgba(0,0,0,.07);
    padding: 48px 48px 40px;
    max-width: 560px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }
  @media (max-width: 640px) { .np-letter { padding: 32px 24px 28px; } }
`

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
        setGroup(g); setIsPreview(true); setStep("watch")
      })
    }
  }, [])

  if (step === "watch") {
    return <WatchScreen group={group} videos={videos} viewerName={name} isPreview={isPreview} />
  }
  return <AccessForm onAccess={(n, g) => { setName(n); setGroup(g); setStep("watch") }} />
}

// ── Formulaire d'accès ────────────────────────────────────────────────────────

function AccessForm({ onAccess }: { onAccess: (name: string, group: FilmGroup) => void }) {
  const [name,    setName]    = useState("")
  const [code,    setCode]    = useState("")
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useReveal()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    setLoading(true); setError(null)
    try {
      const g = await filmService.validateCode(code)
      if (!g) { setError("Code incorrect. Vérifie le code qui t'a été transmis."); return }
      await filmService.logView(g.id, name.trim())
      onAccess(name.trim(), g)
    } catch {
      setError("Une erreur est survenue. Réessaie dans un instant.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{PAGE_CSS}</style>
      <div className="np-split" style={{ fontFamily: ARIAL }}>

        {/* ── Panneau gauche : formulaire ── */}
        <div className="np-panel-left">
          <div className="nr" style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* En-tête */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontFamily: "Nickainley, serif", fontSize: "3.6rem", lineHeight: 1, color: "var(--bordeaux)", margin: 0 }}>
                Sarah & Jordan
              </p>
              <Divider />
              <p style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "color-mix(in oklch, var(--brun) 45%, transparent 55%)", margin: 0 }}>
                Notre teaser · Fiançailles 2026
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label className="np-label">Ton prénom</label>
                <input className="np-input" type="text" value={name}
                  onChange={e => setName(e.target.value)} placeholder="Marie"
                  autoComplete="given-name" required />
              </div>
              <div>
                <label className="np-label">Code d'accès</label>
                <input className="np-input" style={{ fontFamily: "monospace" }}
                  type="text" value={code} onChange={e => setCode(e.target.value)}
                  placeholder="••••••" autoComplete="off" autoCapitalize="none" required />
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "var(--destructive)", margin: 0 }}>{error}</p>
              )}

              <button className="np-ghost" type="submit"
                disabled={loading || !name.trim() || !code.trim()}>
                {loading ? "Vérification…" : "Regarder le teaser →"}
              </button>
            </form>
          </div>
        </div>

        {/* ── Panneau droit : photo ── */}
        <div className="np-panel-right">
          <img src={PHOTO} alt="" aria-hidden="true" />
        </div>
      </div>
    </>
  )
}

// ── Écran de visionnage ───────────────────────────────────────────────────────

function WatchScreen({ group, videos, viewerName, isPreview }: {
  group: FilmGroup | null
  videos: FilmVideo[]
  viewerName: string
  isPreview: boolean
}) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const lastLogRef = useRef<number>(0)
  const [isFs, setIsFs]           = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const currentVideo              = videos[activeIdx] ?? null

  useReveal()

  useEffect(() => {
    const fn = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", fn)
    return () => document.removeEventListener("fullscreenchange", fn)
  }, [])

  useEffect(() => { videoRef.current?.load() }, [activeIdx])

  function handlePlay() {
    if (isPreview || !group) return
    const now = Date.now()
    if (now - lastLogRef.current > 5 * 60 * 1000) {
      lastLogRef.current = now
      filmService.logView(group.id, viewerName).catch(() => {})
    }
  }

  function toggleFs() {
    const el = videoRef.current; if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <>
      <style>{PAGE_CSS}</style>
      <div style={{ minHeight: "100svh", backgroundColor: "var(--ivoire)", fontFamily: ARIAL }}>

        {/* Bandeau preview */}
        {isPreview && (
          <div style={{
            padding: "8px 20px", textAlign: "center",
            backgroundColor: "color-mix(in oklch, var(--dore) 18%, var(--ivoire) 82%)",
            borderBottom: "1px solid color-mix(in oklch, var(--dore) 35%, transparent 65%)",
          }}>
            <p style={{ fontSize: 12, color: "var(--brun)", margin: 0 }}>
              Mode prévisualisation — {group ? `groupe « ${group.name} »` : "sans groupe"} · aucun visionnage enregistré
            </p>
          </div>
        )}

        {/* ── Section lettre ── */}
        {group?.introMessage && (
          <section style={{
            position: "relative", padding: "72px 24px 80px",
            backgroundColor: "color-mix(in oklch, var(--beige) 45%, var(--ivoire) 55%)",
            overflow: "hidden",
          }}>
            {/* Dots décoratifs */}
            <Dots style={{ position: "absolute", top: 24, right: 0, width: 160, height: 120, opacity: 0.4 }} />
            <Dots style={{ position: "absolute", bottom: 0, left: 0, width: 120, height: 90, opacity: 0.3 }} />

            <div className="nr np-letter">
              {/* En-tête lettre */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "color-mix(in oklch, var(--brun) 38%, transparent 62%)", margin: "0 0 10px" }}>
                  Fiançailles · 25 juillet 2026
                </p>
                <Divider color="var(--dore)" />
              </div>

              {/* Corps de la lettre */}
              <p style={{ fontSize: "1rem", lineHeight: 1.95, textAlign: "justify", color: "var(--brun)", margin: 0 }}>
                {renderMessage(group.introMessage)}
              </p>

              {/* Signature */}
              <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
                <p style={{ fontFamily: "Nickainley, serif", fontSize: "1.8rem", color: "var(--bordeaux)", margin: 0, lineHeight: 1.1 }}>
                  Sarah & Jordan
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Section vidéo ── */}
        <section style={{ padding: "60px 24px 80px", backgroundColor: "var(--ivoire)" }}>

          {/* Heading section */}
          <div className="nr nr-up" style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--bordeaux)", margin: "0 0 8px" }}>
              Sarah & Jordan
            </p>
            <div style={{ width: 48, height: 1.5, backgroundColor: "var(--bordeaux)", margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "color-mix(in oklch, var(--brun) 40%, transparent 60%)", margin: 0 }}>
              Notre teaser
            </p>
          </div>

          {/* Onglets multi-vidéos */}
          {videos.length > 1 && (
            <div className="nr nr-up" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
              {videos.map((v, i) => (
                <button key={v.id} onClick={() => setActiveIdx(i)} style={{
                  padding: "6px 20px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                  fontFamily: ARIAL, border: "none", transition: "all .2s",
                  backgroundColor: i === activeIdx ? "var(--bordeaux)" : "var(--beige)",
                  color: i === activeIdx ? "var(--ivoire)" : "var(--brun)",
                }}>
                  {v.title}
                </button>
              ))}
            </div>
          )}

          {/* Player */}
          {currentVideo ? (
            <div className="nr nr-up" style={{
              maxWidth: 880, margin: "0 auto", position: "relative",
              borderRadius: 4, overflow: "hidden",
              boxShadow: "0 4px 6px rgba(0,0,0,.04), 0 20px 60px rgba(0,0,0,.12)",
              border: "1px solid color-mix(in oklch, var(--dore) 35%, transparent 65%)",
            }}>
              <video
                ref={videoRef} src={currentVideo.url} controls controlsList="nodownload"
                playsInline onPlay={handlePlay} onContextMenu={e => e.preventDefault()}
                style={{ display: "block", width: "100%", aspectRatio: "16/9", backgroundColor: "#000" }}
              />
              <button onClick={toggleFs} className="np-fs" title={isFs ? "Quitter le plein écran" : "Plein écran"}>
                {isFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "color-mix(in oklch, var(--brun) 38%, transparent 62%)", fontSize: 14 }}>
              Aucune vidéo configurée.
            </p>
          )}
        </section>

        {/* ── Footer ── */}
        <footer style={{
          backgroundColor: "color-mix(in oklch, var(--brun) 90%, black 10%)",
          padding: "44px 24px 36px", textAlign: "center",
          borderTop: "3px solid color-mix(in oklch, var(--dore) 60%, transparent 40%)",
        }}>
          <p style={{ fontFamily: "Nickainley, serif", fontSize: "2.2rem", color: "var(--ivoire)", margin: "0 0 10px", lineHeight: 1 }}>
            Sarah & Jordan
          </p>
          <Divider color="color-mix(in oklch, var(--ivoire) 30%, transparent 70%)" />
          <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "color-mix(in oklch, var(--ivoire) 38%, transparent 62%)", margin: "10px 0 0" }}>
            Fiançailles · 25 juillet 2026
          </p>
        </footer>
      </div>
    </>
  )
}
