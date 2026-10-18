/**
 * Données fictives du prototype (CDCF §11 DA-04) : aucune vraie photo, aucun contrôle d'accès.
 * Images de démonstration servies par picsum.photos, aux proportions variées (portrait, paysage, carré).
 */

export type ProtoStyle = "editorial" | "cinema" | "tropical"
export type ProtoMode = "portfolio" | "slideshow" | "immersive"
export type ProtoScreen = "login" | "home" | "albums"

export { THEME_LABELS as STYLE_LABELS, SCROLL_MODE_LABELS as MODE_LABELS, THEMES } from "@/features/gallery/theme"
export const SCREEN_LABELS: Record<ProtoScreen, string> = {
  login: "Connexion",
  home: "Accueil",
  albums: "Galerie complète",
}

export type ProtoPhoto = {
  id: string
  code: string
  album: string
  width: number
  height: number
  thumb: string
  display: string
}

export const ALBUMS = ["Cérémonie", "Cocktail", "Photos de groupe", "Soirée"] as const

// Proportions courantes d'un photographe : 2:3 portrait, 3:2 paysage, 4:5, carré, panoramique.
const RATIOS: [number, number][] = [[2, 3], [3, 2], [3, 2], [4, 5], [2, 3], [1, 1], [3, 2], [16, 9], [2, 3], [3, 2]]
const COUNTS: Record<(typeof ALBUMS)[number], number> = { "Cérémonie": 28, "Cocktail": 42, "Photos de groupe": 30, "Soirée": 48 }

function build(): ProtoPhoto[] {
  const photos: ProtoPhoto[] = []
  let n = 0
  for (const album of ALBUMS) {
    for (let i = 0; i < COUNTS[album]; i++) {
      n++
      const [rw, rh] = RATIOS[(n * 7) % RATIOS.length]
      const w = rw >= rh ? 1600 : Math.round((1600 * rw) / rh)
      const h = rw >= rh ? Math.round((1600 * rh) / rw) : 1600
      const seed = `sj-proto-${n}`
      photos.push({
        id: seed,
        code: `SJ-${String(n).padStart(4, "0")}`,
        album,
        width: w,
        height: h,
        thumb: `https://picsum.photos/seed/${seed}/${Math.round(w / 4)}/${Math.round(h / 4)}`,
        display: `https://picsum.photos/seed/${seed}/${w}/${h}`,
      })
    }
  }
  return photos
}

export const PHOTOS = build()

// Sélection d'accueil : 50 photos choisies « à la main » (ici, une sur deux et demie).
export const HOME_SELECTION = PHOTOS.filter((_, i) => i % 12 < 5).slice(0, 50)

export const WELCOME_TEXT =
  "Merci d'avoir partagé ce moment avec nous. Voici quelques souvenirs de nos fiançailles — " +
  "prenez le temps de les revivre, et gardez-les pour vous : ces images sont privées."

export const REACTIONS = ["❤️", "😍", "🥹", "😂", "👏"] as const

export const REPORT_REASONS = [
  "Je n'aime pas cette photo de moi",
  "Je trouve cette photo inappropriée",
  "Cette photo concerne une autre personne",
  "Autre motif",
]

/** Totaux fictifs mais stables de réactions par photo. */
export function fakeReactionCounts(photo: ProtoPhoto): Record<string, number> {
  const n = Number(photo.code.slice(3))
  return Object.fromEntries(REACTIONS.map((r, i) => [r, (n * (i + 3)) % (9 - i)]))
}
