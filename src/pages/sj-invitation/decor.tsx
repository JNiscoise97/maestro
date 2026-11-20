import { useEffect, useRef, useState } from "react"

import { MATTE_GOLD } from "@/features/gallery/gilded"
import { PAPER_STYLE, type PictoName } from "./decor-styles"

/**
 * Décor de l'invitation complète, d'après le mood board : des cartes blanches posées sur un fond blanc,
 * et en descendant apparaissent des ornements — fleurs blanches, tourne-disque, polaroïds,
 * rubans de satin, pictogrammes dorés. Fleurs et ruban : images des mariés ; le reste
 * est dessiné en SVG, et les polaroïds reprennent la photo des mariés (public/sj-invitation/).
 */


// ── Apparition au défilement ──────────────────────────────────────────────────

/** Événement : tout faire apparaître d'un coup (avant l'impression en PDF). */
export const REVEAL_ALL = "sj-reveal-all"
// Après REVEAL_ALL, les éléments montés ensuite (onglets affichés pour l'impression) apparaissent d'emblée.
let revealedAll = false
if (typeof window !== "undefined") window.addEventListener(REVEAL_ALL, () => { revealedAll = true })

/** Fait apparaître son contenu (fondu + léger glissement) quand il entre à l'écran. Rien si « réduire les animations ». */

export function Reveal({ children, className = "", delay = 0, from = "up", style }: {
  children: React.ReactNode; className?: string; delay?: number; from?: "up" | "left" | "right" | "zoom"; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(() => revealedAll || typeof IntersectionObserver === "undefined")
  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const all = () => setShown(true)
    window.addEventListener(REVEAL_ALL, all)
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect() }
    }, { rootMargin: "0px 0px -8% 0px" })
    io.observe(el)
    return () => { io.disconnect(); window.removeEventListener(REVEAL_ALL, all) }
  }, [shown])
  const hidden = { up: "translateY(28px)", left: "translateX(-36px)", right: "translateX(36px)", zoom: "scale(.85)" }[from]
  return (
    <div ref={ref} className={`motion-reduce:transform-none! motion-reduce:opacity-100! motion-reduce:transition-none! print:opacity-100! print:transition-none! ${className}`}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? (style?.transform ?? "none") : `${style?.transform ?? ""} ${hidden}`,
        transition: `opacity 1s ease ${delay}ms, transform 1.1s cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      }}>
      {children}
    </div>
  )
}

// ── Séparateur (fleuron doré) ─────────────────────────────────────────────────

export function Fleuron({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex items-center justify-center gap-2 ${className}`} style={{ color: MATTE_GOLD }}>
      <span className="h-px w-14 bg-current opacity-60 sm:w-20" />
      <svg viewBox="0 0 40 24" className="h-4 w-7" fill="currentColor">
        <path d="M20 2c1.6 4 1.6 6 0 10-1.6-4-1.6-6 0-10Zm0 20c-1.6-4-1.6-6 0-10 1.6 4 1.6 6 0 10ZM8 12c4-1.6 6-1.6 10 0-4 1.6-6 1.6-10 0Zm24 0c-4 1.6-6 1.6-10 0 4-1.6 6-1.6 10 0Z" />
        <circle cx="20" cy="12" r="1.6" />
        <path d="M2 12h5M33 12h5" stroke="currentColor" strokeWidth=".8" />
      </svg>
      <span className="h-px w-14 bg-current opacity-60 sm:w-20" />
    </span>
  )
}

// ── Alliances ─────────────────────────────────────────────────────────────────
// PNG détouré de pngimg.com (licence CC BY-NC 4.0 : usage non commercial, crédit en pied de page).

/** Alliances dorées détourées (public/sj-invitation/alliances.webp). */
export function Rings({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img src="/sj-invitation/alliances.webp" alt="" aria-hidden loading="lazy" decoding="async" className={`pointer-events-none select-none ${className}`}
      style={{ ...style, filter: "drop-shadow(0 6px 6px rgba(70,52,25,.22))" }} />
  )
}

// ── Fleurs blanches ──────────────────────────────────────────────
// Fleurs : compositions découpées dans le collage fourni par les mariés (fond transparent), une image
// WebP par composition dans public/sj-invitation/fleurs-*.webp.

const FLOWERS = {
  /** Coin haut-gauche : hortensia et rose, rameaux qui retombent à gauche. */
  "coin-hortensia": "/sj-invitation/fleurs-coin-hortensia.webp",
  /** Coin haut-droit : lys et rose, rameaux qui retombent à droite. */
  "coin-lys": "/sj-invitation/fleurs-coin-lys.webp",
  "bouquet-roses": "/sj-invitation/fleurs-bouquet-roses.webp",
  orchidees: "/sj-invitation/fleurs-orchidees.webp",
  /** Rose et hortensia sous un cercle doré. */
  couronne: "/sj-invitation/fleurs-couronne.webp",
  /** Bouquet noué d'arums et de roses. */
  arums: "/sj-invitation/fleurs-arums.webp",
  "guirlande-rose": "/sj-invitation/fleurs-guirlande-rose.webp",
  "guirlande-hortensia": "/sj-invitation/fleurs-guirlande-hortensia.webp",
  "guirlande-hibiscus": "/sj-invitation/fleurs-guirlande-hibiscus.webp",
} as const

export type FlowerKind = keyof typeof FLOWERS

/** Composition florale ; flip = image retournée en miroir. */
export function FlowerCluster({ className = "", flip = false, kind = "bouquet-roses", style }: {
  className?: string; flip?: boolean; kind?: FlowerKind; style?: React.CSSProperties
}) {
  return (
    <img src={FLOWERS[kind]} alt="" aria-hidden loading="lazy" decoding="async" className={`pointer-events-none select-none ${className}`}
      style={{ ...style, transform: flip ? "scaleX(-1)" : undefined, filter: "drop-shadow(0 8px 10px rgba(70,52,25,.18))" }} />
  )
}

// ── Tourne-disque ─────────────────────────────────────────────────────────────

/**
 * Valise tourne-disque ouverte. Sans morceau : décor, le disque tourne doucement (sauf « réduire les animations »).
 * Avec src : bouton lecture / pause ; le disque ne tourne et le bras ne se pose que pendant la lecture (en boucle).
 * Fichier introuvable ou illisible : le tourne-disque redevient un simple décor.
 */
export function RecordPlayer({ className = "", caption = "Mettons l'ambiance", src, playLabel = "Lancer la musique", pauseLabel = "Mettre la musique en pause",
  playHint, pauseHint }: {
  className?: string; caption?: string; src?: string; playLabel?: string; pauseLabel?: string
  /** Consigne sur le couvercle (une ligne par élément) quand la musique est arrêtée / en cours ; sinon caption. */
  playHint?: string[]; pauseHint?: string[]
}) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  const interactive = !!src && !broken

  // Quitter la page (ou changer de langue) coupe la musique.
  useEffect(() => () => { audio.current?.pause(); audio.current = null }, [src])

  function toggle() {
    if (!src) return
    if (!audio.current) {
      const a = new Audio(src)
      a.loop = true
      a.onpause = () => setPlaying(false)
      a.onplay = () => setPlaying(true)
      a.onerror = () => { setBroken(true); setPlaying(false) }
      audio.current = a
    }
    const a = audio.current
    if (a.paused) void a.play().catch(() => setBroken(true))
    else a.pause()
  }

  const svg = (
    <svg viewBox="0 0 240 230" aria-hidden className={interactive ? "block w-full" : `pointer-events-none ${className}`} style={{ filter: "drop-shadow(0 12px 14px rgba(70,52,25,.25))" }}>
      {/* Couvercle ouvert */}
      <path d="M30 18h180l-6 70H36Z" fill="#f8f4ec" stroke="#cfc4b0" strokeWidth="1.5" />
      <path d="M40 26h160l-5 54H45Z" fill="none" stroke={MATTE_GOLD} strokeWidth=".8" opacity=".6" />
      {interactive && playHint && pauseHint ? (
        // Consigne explicite : « ▶ Clique ici / pour écouter / l'ambiance » (ou pour arrêter pendant la lecture).
        <text textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fill={MATTE_GOLD}>
          {(playing ? pauseHint : playHint).map((line, i) => (
            <tspan key={i} x="120" y={44 + i * 17} fontSize={i === 0 ? 19 : 16} fontWeight={i === 0 ? 700 : 500} fontStyle={i === 0 ? "normal" : "italic"}>{line}</tspan>
          ))}
        </text>
      ) : (
        <text x="120" y="60" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontStyle="italic" fontSize="17" fill={MATTE_GOLD}>{caption}</text>
      )}
      {/* Charnières */}
      <rect x="60" y="86" width="14" height="6" rx="1" fill="#c7a160" />
      <rect x="166" y="86" width="14" height="6" rx="1" fill="#c7a160" />
      {/* Valise */}
      <rect x="22" y="92" width="196" height="122" rx="10" fill="#fbf8f2" stroke="#cfc4b0" strokeWidth="1.5" />
      <rect x="30" y="100" width="180" height="106" rx="6" fill="#f1ebe0" />
      {/* Disque */}
      <g className="origin-[105px_153px] motion-safe:animate-[spin_6s_linear_infinite]" style={src ? { animationPlayState: playing ? "running" : "paused" } : undefined}>
        <circle cx="105" cy="153" r="46" fill="#1d1b19" />
        {[40, 34, 28, 22].map((r) => <circle key={r} cx="105" cy="153" r={r} fill="none" stroke="#3a3632" strokeWidth=".8" />)}
        <circle cx="105" cy="153" r="14" fill="#f4efe6" />
        <path d="M98 150a8 8 0 0 1 7-5" stroke={MATTE_GOLD} strokeWidth="1.2" fill="none" />
        <circle cx="105" cy="153" r="2" fill="#1d1b19" />
        <path d="M80 130a34 34 0 0 1 22-11" stroke="#6b6560" strokeWidth="1.5" fill="none" opacity=".6" />
      </g>
      {/* Bras : posé sur le disque pendant la lecture. */}
      <g style={{ transformOrigin: "180px 118px", transform: src && playing ? "rotate(20deg)" : "none", transition: "transform .7s ease" }}>
        <path d="M180 118l4 46-18 14" stroke={MATTE_GOLD} strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="158" y="174" width="12" height="7" rx="2" fill="#e8dcc4" stroke={MATTE_GOLD} transform="rotate(-38 164 177)" />
      </g>
      <circle cx="180" cy="118" r="8" fill="#e8dcc4" stroke={MATTE_GOLD} />
      {/* Boutons */}
      <circle cx="190" cy="192" r="5" fill="#c7a160" />
      <circle cx="176" cy="196" r="3.5" fill="#c7a160" />
      {/* Fermoir */}
      <rect x="110" y="206" width="20" height="10" rx="2" fill="#c7a160" />
    </svg>
  )

  if (!interactive) return svg
  return (
    <button type="button" onClick={toggle} aria-pressed={playing} aria-label={playing ? pauseLabel : playLabel} title={playing ? pauseLabel : playLabel}
      className={`pointer-events-auto cursor-pointer rounded-xl transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a8844f] ${className}`}>
      {svg}
    </button>
  )
}

// ── Ruban de satin ────────────────────────────────────────────────────────────

/** Ruban de satin ivoire en spirale (image fournie par les mariés, fond transparent), vertical. */
export function Ribbon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img src="/sj-invitation/ruban-satin.webp" alt="" aria-hidden loading="lazy" decoding="async" className={`pointer-events-none select-none ${className}`}
      style={{ ...style, filter: "drop-shadow(4px 8px 8px rgba(70,52,25,.22)) drop-shadow(0 0 1px rgba(70,52,25,.25))" }} />
  )
}

// ── Polaroïd ──────────────────────────────────────────────────────────────────

export function Polaroid({ src, rotate = 0, caption, className = "", square = false }: {
  src: string; rotate?: number; caption?: string; className?: string; square?: boolean
}) {
  return (
    <figure className={`bg-white p-2.5 pb-9 sm:p-3 sm:pb-11 ${className}`}
      style={{ transform: `rotate(${rotate}deg)`, boxShadow: "0 2px 3px rgba(70,52,25,.12), 0 16px 30px -12px rgba(70,52,25,.4)" }}>
      <img src={src} alt="" loading="lazy" className={`${square ? "aspect-square" : "aspect-[14/17]"} w-full object-cover`} />
      {caption && (
        <figcaption className="-mb-7 mt-2 text-center text-base italic sm:-mb-8 sm:text-lg" style={{ fontFamily: "var(--p-heading)", color: MATTE_GOLD }}>
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

// ── La carte (coins échancrés, double filet doré) ─────────────────────────────

const NOTCH = 22
const notchMask = ["0 0", "100% 0", "0 100%", "100% 100%"].map((at, i) =>
  `radial-gradient(circle at ${at}, transparent ${NOTCH}px, #000 ${NOTCH + 0.5}px) ${["top left", "top right", "bottom left", "bottom right"][i]} / 51% 51% no-repeat`,
).join(", ")

/** Carte de faire-part : coins arrondis vers l'intérieur et filet doré intérieur qui suit la découpe. */
export function Carte({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const inset = 10
  const r = NOTCH + inset // arc intérieur concentrique à la découpe
  const along = Math.sqrt(r * r - inset * inset) - inset // où le filet droit rejoint l'arc
  const line = { background: MATTE_GOLD, opacity: 0.55, position: "absolute" } as const
  return (
    <div className={className} style={{ filter: "drop-shadow(0 1px 1px rgba(70,52,25,.1)) drop-shadow(0 18px 22px rgba(70,52,25,.22))" }}>
      <div className="relative" style={{ ...PAPER_STYLE, boxShadow: undefined, mask: notchMask, WebkitMask: notchMask }}>
        <div aria-hidden className="pointer-events-none absolute overflow-hidden" style={{ inset }}>
          <span style={{ ...line, top: 0, left: along, right: along, height: 1 }} />
          <span style={{ ...line, bottom: 0, left: along, right: along, height: 1 }} />
          <span style={{ ...line, left: 0, top: along, bottom: along, width: 1 }} />
          <span style={{ ...line, right: 0, top: along, bottom: along, width: 1 }} />
          {[{ left: -inset - r, top: -inset - r }, { right: -inset - r, top: -inset - r }, { left: -inset - r, bottom: -inset - r }, { right: -inset - r, bottom: -inset - r }].map((pos, i) => (
            <span key={i} className="absolute rounded-full border" style={{ ...pos, width: 2 * r, height: 2 * r, borderColor: MATTE_GOLD, opacity: 0.55 }} />
          ))}
        </div>
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

// ── Pictogrammes dorés ────────────────────────────────────────────────────────


const PICTOS: Record<PictoName, React.ReactNode> = {
  mairie: <><path d="M6 40h36M9 40V20h30v20M5 20h38L24 9Z" /><path d="M14 24v12M20 24v12M28 24v12M34 24v12" /><path d="M24 9V4l5 2-5 2" /></>,
  champagne: <><path d="M15 6h8l-1 12a3 3 0 0 1-6 0Z" /><path d="M19 21v15M14 38h10" /><path d="M33 8h8l-2 12a3 3 0 0 1-5 0Z" transform="rotate(14 37 14)" /><path d="M35 23l-3 14M28 38l9 1" /><path d="M24 4l1-2M27 6l2-1" /></>,
  panier: <><path d="M6 22h36l-4 18H10Z" /><path d="M14 22c0-10 20-10 20 0" /><path d="M10 28h28M12 34h24M18 22l-2 18M24 22v18M30 22l2 18" /></>,
  jeux: <><rect x="6" y="16" width="18" height="18" rx="3" transform="rotate(-12 15 25)" /><rect x="24" y="12" width="18" height="18" rx="3" transform="rotate(10 33 21)" /><circle cx="12" cy="22" r="1.2" /><circle cx="17" cy="28" r="1.2" /><circle cx="29" cy="16" r="1.2" /><circle cx="33" cy="21" r="1.2" /><circle cx="37" cy="26" r="1.2" /></>,
  lotus: <><path d="M24 12c5 6 5 16 0 24-5-8-5-18 0-24Z" /><path d="M24 36c-3-8-9-14-16-14 0 8 7 14 16 14Zm0 0c3-8 9-14 16-14 0 8-7 14-16 14Z" /><path d="M8 40h32" /><path d="M24 6v2M18 8l1 2M30 8l-1 2" /></>,
  pinceau: <><path d="M30 6l8 8-16 16-8-8Z" /><path d="M14 22c-4 0-8 4-8 8 0 3-2 6-2 6s8 2 12-2c3-3 2-7 2-8" /><path d="M26 10l8 8" /></>,
  eglise: <><path d="M24 4v8M20 8h8" /><path d="M14 22l10-10 10 10" /><path d="M16 20v20h16V20" /><path d="M8 40V28l8-6M40 40V28l-8-6M6 40h36" /><path d="M21 40v-8a3 3 0 0 1 6 0v8" /></>,
  photo: <><rect x="6" y="14" width="36" height="24" rx="3" /><path d="M16 14l3-5h10l3 5" /><circle cx="24" cy="26" r="7" /><circle cx="24" cy="26" r="3" /><path d="M36 19h2" /></>,
  boule: <><path d="M24 2v8" /><circle cx="24" cy="24" r="14" /><path d="M10 24h28M12 17h24M12 31h24M24 10c-6 8-6 20 0 28M24 10c6 8 6 20 0 28" /><path d="M42 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1ZM6 34l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" /></>,
  robe: <><path d="M19 4v6M29 4v6" /><path d="M19 10c2 2 8 2 10 0l-1 8 10 22H10l10-22Z" /><path d="M20 18h8" /></>,
  train: <><rect x="12" y="6" width="24" height="28" rx="5" /><path d="M12 22h24M18 12h12" /><circle cx="18" cy="28" r="1.6" /><circle cx="30" cy="28" r="1.6" /><path d="M16 34l-5 8M32 34l5 8M14 39h20" /></>,
  avion: <><path d="M24 4c2 0 3 3 3 6v8l14 9v4l-14-4v8l5 4v3l-8-2-8 2v-3l5-4v-8L7 31v-4l14-9v-8c0-3 1-6 3-6Z" /></>,
  voiture: <><path d="M6 32v-7l5-9h26l5 9v7Z" /><path d="M11 25h26" /><circle cx="14" cy="34" r="4" /><circle cx="34" cy="34" r="4" /><path d="M16 16l2 9M32 16l-2 9" /></>,
  hotel: <><path d="M6 40V10h22v30M28 18h14v22M4 40h40" /><path d="M11 15h4M19 15h4M11 22h4M19 22h4M11 29h4M19 29h4M33 24h4M33 31h4" /><path d="M14 40v-5h6v5" /></>,
  cadeau: <><rect x="8" y="18" width="32" height="22" /><path d="M6 12h36v6H6ZM24 12v28" /><path d="M24 12c-4-8-12-6-10-1 1 2 6 1 10 1Zm0 0c4-8 12-6 10-1-1 2-6 1-10 1Z" /></>,
  question: <><circle cx="24" cy="24" r="17" /><path d="M19 19a5 5 0 1 1 7 4.6c-1.4.6-2 1.6-2 3.4v1" /><circle cx="24" cy="33" r=".8" /></>,
  enveloppe: <><rect x="6" y="12" width="36" height="26" rx="2" /><path d="M6 13l18 14 18-14" /><path d="M24 27c-2-3-6-2-5 1 1 2 5 4 5 4s4-2 5-4c1-3-3-4-5-1Z" /></>,
  coeurs: <><path d="M18 36S6 28 6 19a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 9-12 17-12 17Z" /><path d="M31 30s9-6 9-13a5 5 0 0 0-9-2" /></>,
  pin: <><path d="M24 42s-12-13-12-22a12 12 0 0 1 24 0c0 9-12 22-12 22Z" /><circle cx="24" cy="20" r="4" /></>,
}

/** Pictogramme au trait doré, flanqué de deux brins de feuillage comme sur le mood board. */
export function Picto({ name, className = "", sprigs = true }: { name: PictoName; className?: string; sprigs?: boolean }) {
  return (
    <span aria-hidden className={`inline-flex items-center justify-center ${className}`} style={{ color: MATTE_GOLD }}>
      {sprigs && <Sprig />}
      <svg viewBox="0 0 48 48" className="size-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {PICTOS[name]}
      </svg>
      {sprigs && <Sprig flip />}
    </span>
  )
}

function Sprig({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 32" className="h-[60%] w-auto shrink-0 opacity-80" style={{ transform: flip ? "scaleX(-1)" : undefined }} fill="currentColor">
      <path d="M12 30C6 24 5 14 9 4" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M8 22c-4 0-6-3-6-5 3 0 6 2 6 5ZM8 14c-3-1-5-4-4-6 3 1 4 3 4 6ZM10 8c-1-3 0-5 2-6 1 2 0 5-2 6Z" />
    </svg>
  )
}
