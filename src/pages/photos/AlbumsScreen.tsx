import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Heart, Search } from "lucide-react"

import { logEvent, useFavorites, useSignedUrls } from "@/features/gallery/api"
import type { GalleryAlbum, GalleryPhoto } from "@/features/gallery/types"
import { Img } from "./HomeScreen"

const PAGE = 24

/**
 * Galerie complète (CDCF NAV-03..06) : uniquement les catégories (albums) et « Mes favoris »,
 * avec la recherche par identifiant SJ-…. Chaque carte ouvre la catégorie correspondante.
 */
export function CategoriesScreen({ photos, albums, onOpen }: {
  photos: GalleryPhoto[]
  albums: GalleryAlbum[]
  onOpen: (list: GalleryPhoto[], index: number) => void
}) {
  const [query, setQuery] = useState("")
  const { data: favorites = new Set<string>() } = useFavorites()
  const favoriteList = photos.filter((p) => favorites.has(p.id))

  const cards = [
    ...albums.map((a) => {
      const list = photos.filter((p) => p.album_id === a.id)
      // Couverture choisie par Sarah et Jordan si elle est visible, sinon la première photo.
      const cover = list.find((p) => p.id === a.cover_photo_id) ?? list[0]
      return { key: a.id, to: `/photos/albums/${a.id}`, title: a.name, count: list.length, cover, favorite: false, hidden: a.hidden }
    }),
    { key: "favoris", to: "/photos/favoris", title: "Mes favoris", count: favoriteList.length, cover: favoriteList[0], favorite: true, hidden: false },
  ].filter((c) => c.favorite || c.count > 0) // une catégorie vide n'est pas proposée
  const { data: urls } = useSignedUrls(cards.map((c) => c.cover?.display_path).filter((p): p is string => !!p))

  const q = query.trim().toUpperCase().replace(/\s+/g, "").replace(/^SJ-?/, "")
  const found = /^\d+$/.test(q) ? photos.filter((p) => p.number === Number(q)) : []

  // Recherche journalisée une fois la saisie stabilisée.
  useEffect(() => {
    if (!query.trim()) return
    const timer = setTimeout(() => logEvent("search", undefined, { query: query.trim() }), 1200)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-light uppercase tracking-[0.15em]" style={{ fontFamily: "var(--p-heading)" }}>Toutes les photos</h2>
        <label className="flex items-center gap-2 border-b text-xs" style={{ borderColor: "var(--p-line)" }}>
          <Search className="size-3.5" style={{ color: "var(--p-muted)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher SJ-0042" aria-label="Rechercher une photo par numéro"
            className="w-36 bg-transparent py-1 text-base outline-none sm:text-xs" />
        </label>
      </div>

      {query.trim() ? (
        found.length ? <SearchResult photo={found[0]} onOpen={() => onOpen(found, 0)} /> : (
          <p className="text-sm" style={{ color: "var(--p-muted)" }}>Aucune photo ne porte ce numéro.</p>
        )
      ) : (
        <div className="-mx-4 grid grid-cols-1 gap-1 sm:mx-0 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.key} to={c.to} className="group relative block aspect-[4/5] overflow-hidden" style={{ background: "var(--p-surface)", borderRadius: "var(--p-radius)" }}>
              {c.cover && urls?.get(c.cover.display_path) ? (
                <img src={urls.get(c.cover.display_path)} alt="" loading="lazy" draggable={false}
                  className="absolute inset-0 size-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
              ) : c.favorite && (
                <Heart className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 opacity-30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <span className="block h-0.5 w-8" style={{ background: c.favorite ? "var(--p-accent-2, var(--p-accent))" : "var(--p-accent)" }} />
                <span className="mt-3 flex items-center gap-2 text-xl font-light uppercase tracking-[0.12em]" style={{ fontFamily: "var(--p-heading)" }}>
                  {c.favorite && <span aria-hidden className="text-base">❤️</span>}
                  {c.title}
                </span>
                <span className="mt-1 block text-[11px] uppercase tracking-[0.25em] text-[#e8c98f]">
                  {c.count} photo{c.count > 1 ? "s" : ""}
                  {/* Seuls les administrateurs reçoivent les catégories masquées. */}
                  {c.hidden && " · masquée aux invités"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchResult({ photo, onOpen }: { photo: GalleryPhoto; onOpen: () => void }) {
  const { data: urls } = useSignedUrls([photo.thumb_path])
  return (
    <button type="button" onClick={onOpen} className="block w-48">
      <Img src={urls?.get(photo.thumb_path)} photo={photo} />
      <span className="mt-1 block text-xs tracking-[0.2em]" style={{ color: "var(--p-gold, var(--p-accent))" }}>{photo.code}</span>
    </button>
  )
}

/** Une catégorie (album) ou « Mes favoris » : ses photos en ordre chronologique, chargées au défilement. */
export function CategoryScreen({ photos, albums, favoritesOnly = false, onOpen }: {
  photos: GalleryPhoto[]
  albums: GalleryAlbum[]
  favoritesOnly?: boolean
  onOpen: (list: GalleryPhoto[], index: number) => void
}) {
  const { albumId } = useParams()
  const { data: favorites = new Set<string>() } = useFavorites()
  const album = albums.find((a) => a.id === albumId)
  const list = favoritesOnly ? photos.filter((p) => favorites.has(p.id)) : photos.filter((p) => p.album_id === albumId)
  const title = favoritesOnly ? "Mes favoris" : album?.name ?? "Catégorie"

  return (
    <div className="pb-16">
      <div className="px-4 pb-6 pt-8 sm:px-6">
        <Link to="/photos/albums" className="flex w-fit items-center gap-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--p-accent-2, var(--p-accent))" }}>
          <ArrowLeft className="size-3.5" /> Catégories
        </Link>
        <h2 className="mt-3 text-3xl font-light uppercase tracking-[0.15em]" style={{ fontFamily: "var(--p-heading)" }}>{title}</h2>
        <span className="mt-1 block text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--p-gold, var(--p-muted))" }}>
          {list.length} photo{list.length > 1 ? "s" : ""}
        </span>
      </div>
      {list.length === 0 ? (
        <p className="px-6 py-10 text-sm" style={{ color: "var(--p-muted)" }}>
          {favoritesOnly ? "Touchez le cœur d'une photo pour la retrouver ici." : "Aucune photo dans cette catégorie pour l'instant."}
        </p>
      ) : (
        <PagedGrid key={`${albumId}|${favoritesOnly}`} list={list} favorites={favorites} onOpen={(i) => onOpen(list, i)} />
      )}
    </div>
  )
}

function PagedGrid({ list, favorites, onOpen }: { list: GalleryPhoto[]; favorites: Set<string>; onOpen: (i: number) => void }) {
  const [pages, setPages] = useState(1)
  const sentinel = useRef<HTMLDivElement>(null)
  const more = pages * PAGE < list.length

  // Chargement automatique au défilement (IMG-03), sans bouton de pagination.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !more) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setPages((n) => n + 1)
    }, { rootMargin: "800px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [more, pages])

  return (
    <>
      <div className="columns-2 gap-1 px-1 sm:columns-3 sm:gap-2 sm:px-2 lg:columns-4 xl:columns-5">
        {Array.from({ length: pages }, (_, p) => (
          <GridPage key={p} photos={list.slice(p * PAGE, (p + 1) * PAGE)} offset={p * PAGE} favorites={favorites} onOpen={onOpen} />
        ))}
      </div>
      {more && <div ref={sentinel} className="h-10" />}
    </>
  )
}

/** Une page de miniatures : ses URL signées sont demandées en un seul appel. */
function GridPage({ photos, offset, favorites, onOpen }: {
  photos: GalleryPhoto[]
  offset: number
  favorites: Set<string>
  onOpen: (i: number) => void
}) {
  const { data: urls } = useSignedUrls(photos.map((p) => p.thumb_path))
  return (
    <>
      {photos.map((p, i) => (
        <button key={p.id} type="button" onClick={() => onOpen(offset + i)} aria-label={`Ouvrir ${p.code}`}
          className="relative mb-1 block w-full break-inside-avoid sm:mb-2">
          <Img src={urls?.get(p.thumb_path)} photo={p} />
          {favorites.has(p.id) && (
            <Heart className="absolute right-2 top-2 size-4 drop-shadow" style={{ color: "var(--p-accent-2, #fff)" }} fill="currentColor" />
          )}
        </button>
      ))}
    </>
  )
}
