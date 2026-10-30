import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useSignedUrls } from "@/features/gallery/api"
import type { GalleryPhoto, GallerySettings } from "@/features/gallery/types"
import { Masthead } from "./GalleryChrome"
import { JustifiedGrid } from "./JustifiedGrid"

/**
 * Accueil (CDCF NAV-01/02/03) : texte de Sarah et Jordan puis la sélection d'au plus 50 photos,
 * dans le mode de défilement choisi en réglages. Une photo signalée disparaît sans remplacement.
 */
export function HomeScreen({ photos, settings, limited = false, onOpen }: {
  photos: GalleryPhoto[]
  settings: GallerySettings
  /** Accès limité : pas de lien vers la galerie complète, la sélection est reprise en grille. */
  limited?: boolean
  onOpen: (list: GalleryPhoto[], index: number) => void
}) {
  const selection = photos
    .filter((p) => p.home_rank !== null && p.status === "visible")
    .sort((a, b) => (a.home_rank ?? 0) - (b.home_rank ?? 0))
  const { data: urls } = useSignedUrls(selection.map((p) => p.display_path))
  const open = (i: number) => onOpen(selection, i)

  const intro = (
    <>
      <Masthead />
      {settings.welcome_text && (
        <p className="mx-auto max-w-xl whitespace-pre-line px-6 pb-10 text-center text-base leading-relaxed"
          style={{ color: "var(--p-muted)", fontFamily: settings.theme === "editorial" ? "var(--p-heading)" : undefined }}>
          {settings.welcome_text}
        </p>
      )}
    </>
  )
  const cta = limited ? <SelectionGrid photos={selection} onOpen={open} /> : (
    <div className="flex justify-center px-6 py-16">
      <Link to="/photos/albums" className="border px-8 py-4 text-xs uppercase tracking-[0.25em]"
        style={{ borderColor: "var(--p-accent-2, var(--p-accent))", color: "var(--p-accent-2, var(--p-accent))", borderRadius: "var(--p-radius)" }}>
        Voir toutes les photos
      </Link>
    </div>
  )

  if (settings.scroll_mode === "slideshow") {
    return <>{intro}<Slideshow photos={selection} urls={urls} onOpen={open} />{cta}</>
  }
  if (settings.scroll_mode === "immersive") {
    return <Immersive photos={selection} urls={urls} intro={intro} cta={cta} onOpen={open} cinema={settings.theme === "cinema"} />
  }
  return (
    <>
      {intro}
      <div className={`mx-auto space-y-6 px-4 sm:space-y-16 ${settings.theme === "cinema" ? "max-w-6xl" : "max-w-4xl"}`}>
        {selection.map((p, i) => {
          const landscape = p.width > p.height
          const align = settings.theme === "editorial" && !landscape ? (i % 2 ? "ml-auto" : "mr-auto") : "mx-auto"
          return (
            <figure key={p.id} className={`${align} ${landscape ? "w-full" : "w-full sm:w-3/5"}`}>
              <button type="button" onClick={() => open(i)} className="block w-full">
                <Img src={urls?.get(p.display_path)} photo={p} />
              </button>
              {settings.theme !== "cinema" && (
                <figcaption className="mt-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--p-muted)" }}>{p.code}</figcaption>
              )}
            </figure>
          )
        })}
      </div>
      {cta}
    </>
  )
}

/** Accès limité : la sélection d'accueil en grille, sous le défilement (à la place de « Voir toutes les photos »). */
function SelectionGrid({ photos, onOpen }: { photos: GalleryPhoto[]; onOpen: (i: number) => void }) {
  const { data: urls } = useSignedUrls(photos.map((p) => p.thumb_path))
  if (photos.length === 0) return null
  return (
    <section className="mx-auto max-w-6xl px-1 pb-16 pt-12 sm:px-2">
      <p className="pb-4 text-center text-xs uppercase tracking-[0.25em]" style={{ color: "var(--p-muted)" }}>
        {photos.length} photo{photos.length > 1 ? "s" : ""}
      </p>
      <JustifiedGrid items={photos} render={(p, i) => (
        <button type="button" onClick={() => onOpen(i)} aria-label={`Ouvrir ${p.code}`} className="block size-full">
          <Img src={urls?.get(p.thumb_path)} photo={p} className="size-full object-cover" />
        </button>
      )} />
    </section>
  )
}

/** Image à dimensions réservées (aucun décalage pendant le chargement), proportions respectées. */
export function Img({ src, photo, className = "h-auto w-full", fit = false }: {
  src?: string
  photo: GalleryPhoto
  className?: string
  fit?: boolean
}) {
  const style = { aspectRatio: `${photo.width} / ${photo.height}`, borderRadius: "var(--p-radius)", background: "var(--p-line)" }
  if (!src) return <div className={fit ? "max-h-full max-w-full" : className} style={{ ...style, ...(fit ? { height: "100%" } : {}) }} />
  return (
    <img src={src} alt={photo.code} loading="lazy" decoding="async" width={photo.width} height={photo.height} draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className={fit ? "max-h-full max-w-full object-contain" : className} style={style} />
  )
}

function Slideshow({ photos, urls, onOpen }: { photos: GalleryPhoto[]; urls?: Map<string, string>; onOpen: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const scrollTo = (i: number) =>
    (ref.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  return (
    <div className="relative">
      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[10%] pb-4" style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const el = e.currentTarget
          const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1
          setCurrent(Math.round(el.scrollLeft / (w + 16)))
        }}>
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => onOpen(i)}
            className="flex h-[60svh] w-[80%] shrink-0 snap-center items-center justify-center sm:h-[70vh]" style={{ background: "var(--p-slide-bg, transparent)" }}>
            <Img src={urls?.get(p.display_path)} photo={p} fit />
          </button>
        ))}
      </div>
      {photos.length > 0 && (
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "var(--p-muted)" }}>
          <button type="button" aria-label="Précédente" onClick={() => scrollTo(Math.max(0, current - 1))}><ChevronLeft className="size-5" /></button>
          <span className="tabular-nums tracking-[0.25em]" style={{ color: "var(--p-gold, var(--p-muted))" }}>{String(current + 1).padStart(2, "0")} / {photos.length}</span>
          <button type="button" aria-label="Suivante" onClick={() => scrollTo(Math.min(photos.length - 1, current + 1))}><ChevronRight className="size-5" /></button>
        </div>
      )}
    </div>
  )
}

function Immersive({ photos, urls, intro, cta, onOpen, cinema }: {
  photos: GalleryPhoto[]
  urls?: Map<string, string>
  intro: React.ReactNode
  cta: React.ReactNode
  onOpen: (i: number) => void
  cinema: boolean
}) {
  // Séquences plein écran aimantées au défilement de la page.
  useEffect(() => {
    const root = document.documentElement
    root.style.scrollSnapType = "y mandatory"
    return () => { root.style.scrollSnapType = "" }
  }, [])
  return (
    <>
      <section className="flex min-h-svh snap-start flex-col justify-center">{intro}</section>
      {photos.map((p, i) => (
        <section key={p.id} className="relative flex h-svh snap-start items-center justify-center p-3 sm:p-8"
          style={{ background: cinema ? "var(--p-slide-bg)" : undefined }}>
          <button type="button" onClick={() => onOpen(i)} className="flex h-full w-full items-center justify-center">
            <Img src={urls?.get(p.display_path)} photo={p} fit />
          </button>
          <span className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--p-muted)" }}>
            {i + 1} / {photos.length}
          </span>
        </section>
      ))}
      <section className="flex min-h-svh snap-start items-center justify-center">{cta}</section>
    </>
  )
}
