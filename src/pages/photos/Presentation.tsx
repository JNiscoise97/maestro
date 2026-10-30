import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, X } from "lucide-react"

import { useSignedUrls } from "@/features/gallery/api"
import type { GalleryPhoto } from "@/features/gallery/types"

const INTERVALS = [3, 5, 8, 12] as const
const STORAGE_KEY = "sj-galerie-diaporama-secondes"
/** Photos signées par paquet : la clé de requête ne change que tous les CHUNK clichés. */
const CHUNK = 10

function readInterval(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY))
    return (INTERVALS as readonly number[]).includes(v) ? v : 5
  } catch { return 5 }
}

/**
 * Mode présentation (télé, vidéoprojecteur) : vrai plein écran, défilement automatique dans l'ordre
 * de l'album (en boucle), commandes masquées après 3 s sans mouvement, écran maintenu allumé.
 * Clavier / télécommande : ← → pour naviguer, Espace ou Entrée pour pause / lecture, F plein écran, Échap pour quitter.
 * Même version d'image que la visionneuse (medium-size) : rien de plus n'est exposé.
 */
export function Presentation({ photos, startIndex, onClose }: {
  photos: GalleryPhoto[]
  startIndex: number
  onClose: () => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(Math.min(Math.max(0, startIndex), Math.max(0, photos.length - 1)))
  const [playing, setPlaying] = useState(true)
  const [seconds, setSeconds] = useState(readInterval)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [chrome, setChrome] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)
  // Référence stable : l'effet plein écran ne doit pas se relancer (et sortir du plein écran) à chaque rendu du parent.
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  // Sortie du plein écran demandée par le bouton : on reste dans la présentation (en fenêtre).
  const manualExit = useRef(false)

  const photo = photos[index] as GalleryPhoto | undefined
  const chunkStart = Math.floor(index / CHUNK) * CHUNK
  // Paquet courant + suivant (avec retour au début en fin de liste) : la photo suivante est toujours prête.
  const windowPhotos = [...photos.slice(chunkStart, chunkStart + CHUNK * 2),
    ...(chunkStart + CHUNK * 2 > photos.length ? photos.slice(0, CHUNK) : [])]
  const { data: urls } = useSignedUrls([...new Set(windowPhotos.map((p) => p.display_path))])
  const next = photos.length > 1 ? photos[(index + 1) % photos.length] : undefined
  const src = photo ? urls?.get(photo.display_path) : undefined

  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length)

  // Défilement : le compte à rebours démarre quand la photo est affichée (pas pendant son chargement).
  useEffect(() => {
    if (!playing || !photo || loadedId !== photo.id || photos.length < 2) return
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % photos.length), seconds * 1000)
    return () => window.clearTimeout(t)
  }, [playing, photo, loadedId, seconds, photos.length])

  // Préchargement de la suivante.
  useEffect(() => {
    const url = next ? urls?.get(next.display_path) : undefined
    if (url) { const img = new Image(); img.src = url }
  }, [next, urls])

  // Plein écran à l'ouverture (si le navigateur le permet) ; sortir du plein écran ferme la présentation.
  useEffect(() => {
    const el = root.current
    el?.requestFullscreen?.().catch(() => { /* refusé (ex. iPhone) : on reste en superposition */ })
    let wasFullscreen = false
    const onChange = () => {
      const on = !!document.fullscreenElement
      setFullscreen(on)
      // Échap en plein écran est intercepté par le navigateur : la sortie du plein écran vaut fermeture.
      if (!on && wasFullscreen && !manualExit.current) closeRef.current()
      manualExit.current = false
      wasFullscreen = on
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  // Écran maintenu allumé pendant la présentation (Wake Lock), repris au retour sur l'onglet.
  useEffect(() => {
    type Lock = { release: () => Promise<void> }
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Lock> } }).wakeLock
    if (!wl) return
    let lock: Lock | null = null
    const acquire = () => { if (document.visibilityState === "visible") wl.request("screen").then((l) => { lock = l }).catch(() => {}) }
    acquire()
    document.addEventListener("visibilitychange", acquire)
    return () => {
      document.removeEventListener("visibilitychange", acquire)
      void lock?.release().catch(() => {})
    }
  }, [])

  // Commandes visibles 3 s après chaque mouvement / touche, puis masquées (curseur compris).
  const wake = () => {
    setChrome(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setChrome(false), 3000)
  }
  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setChrome(false), 3000)
    return () => window.clearTimeout(hideTimer.current)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
      else if (e.key === " " || e.key === "Enter" || e.key === "MediaPlayPause") { e.preventDefault(); setPlaying((p) => !p) }
      else if (e.key === "f" || e.key === "F") toggleFullscreen()
      else if (e.key === "Escape") onClose()
      else return
      wake()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function toggleFullscreen() {
    if (document.fullscreenElement) { manualExit.current = true; void document.exitFullscreen().catch(() => {}) }
    else root.current?.requestFullscreen?.().catch(() => {})
  }

  function chooseSeconds(s: number) {
    setSeconds(s)
    try { localStorage.setItem(STORAGE_KEY, String(s)) } catch { /* stockage indisponible */ }
  }

  if (!photo) return null
  const shown = loadedId === photo.id

  return (
    <div ref={root} className={`fixed inset-0 z-[60] bg-black text-white ${chrome ? "" : "cursor-none"}`}
      role="dialog" aria-modal="true" aria-label="Présentation des photos"
      onMouseMove={wake} onTouchStart={wake} onClick={wake}>
      {src && (
        <img key={photo.id} src={src} alt={photo.code} draggable={false} onContextMenu={(e) => e.preventDefault()}
          onLoad={() => setLoadedId(photo.id)}
          className={`absolute inset-0 m-auto size-full select-none object-contain transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"}`} />
      )}

      <div className={`absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-5 py-4 transition-opacity duration-500 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <span className="text-xs uppercase tracking-[0.2em] opacity-80">{photo.code} · {index + 1} / {photos.length}</span>
        <button type="button" onClick={onClose} aria-label="Quitter la présentation" className="rounded-full p-2 opacity-80 hover:opacity-100">
          <X className="size-6" />
        </button>
      </div>

      <div className={`absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent px-5 pb-6 pt-10 transition-opacity duration-500 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <CtrlBtn label="Photo précédente" onClick={() => go(-1)}><ChevronLeft className="size-6" /></CtrlBtn>
        <CtrlBtn label={playing ? "Pause" : "Lecture"} onClick={() => setPlaying((p) => !p)} big>
          {playing ? <Pause className="size-7" /> : <Play className="size-7" />}
        </CtrlBtn>
        <CtrlBtn label="Photo suivante" onClick={() => go(1)}><ChevronRight className="size-6" /></CtrlBtn>
        <div className="ml-2 flex overflow-hidden rounded-full border border-white/30 text-xs" role="radiogroup" aria-label="Durée par photo">
          {INTERVALS.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={seconds === s} onClick={() => chooseSeconds(s)}
              className={`px-3 py-1.5 tabular-nums ${seconds === s ? "bg-white text-black" : "hover:bg-white/15"}`}>
              {s} s
            </button>
          ))}
        </div>
        {document.fullscreenEnabled && (
          <CtrlBtn label={fullscreen ? "Quitter le plein écran" : "Plein écran"} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </CtrlBtn>
        )}
      </div>
    </div>
  )
}

function CtrlBtn({ label, onClick, big = false, children }: { label: string; onClick: () => void; big?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`flex items-center justify-center rounded-full bg-white/10 backdrop-blur transition-colors hover:bg-white/25 ${big ? "size-14" : "size-11"}`}>
      {children}
    </button>
  )
}
