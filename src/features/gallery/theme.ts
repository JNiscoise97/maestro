import type { CSSProperties } from "react"

import type { GalleryScrollMode, GalleryTheme } from "./types"

/** Directions artistiques et modes de défilement (CDCF §11), partagés par le prototype et la galerie. */
export const THEME_LABELS: Record<GalleryTheme, string> = {
  editorial: "Éditorial",
  cinema: "Cinématographique",
  tropical: "Tropical élégant",
}

export const SCROLL_MODE_LABELS: Record<GalleryScrollMode, string> = {
  portfolio: "Portfolio vertical",
  slideshow: "Diaporama horizontal",
  immersive: "Plein écran immersif",
}

/** Variables CSS de chaque direction artistique, appliquées au conteneur de la galerie. */
export const THEMES: Record<GalleryTheme, Record<string, string>> = {
  editorial: {
    "--p-bg": "#faf7f2",
    "--p-surface": "#ffffff",
    "--p-fg": "#2b2420",
    "--p-muted": "#8a7f76",
    "--p-accent": "#7a1f2b",
    "--p-line": "rgba(43,36,32,.12)",
    "--p-heading": "'Fraunces Variable', serif",
    "--p-body": "'Geist Variable', sans-serif",
    "--p-radius": "0px",
    "--p-viewer-bg": "#faf7f2",
    "--p-viewer-fg": "#2b2420",
  },
  // Direction retenue (18/10/2026) : cinématographique, bordeaux et vert, touches d'or.
  cinema: {
    "--p-bg": "#0b0b0c",
    "--p-surface": "#151314",
    "--p-fg": "#f2efe9",
    "--p-muted": "#8d8a85",
    "--p-accent": "#7a272c",
    "--p-accent-2": "#6e9a74",
    "--p-gold": "#d9b26f",
    "--p-line": "rgba(242,239,233,.12)",
    "--p-heading": "'Fraunces Variable', serif",
    "--p-body": "'Geist Variable', sans-serif",
    "--p-names-font": "\"Nickainley\", serif",
    "--p-names-color": "rgb(122, 39, 44)",
    "--p-radius": "0px",
    "--p-viewer-bg": "#000000",
    "--p-viewer-fg": "#f2efe9",
    "--p-slide-bg": "#000000",
  },
  tropical: {
    "--p-bg": "#f3ead8",
    "--p-surface": "#fbf6ec",
    "--p-fg": "#3a2a1f",
    "--p-muted": "#8c7560",
    "--p-accent": "#1f6f5c",
    "--p-accent-2": "#e07a5f",
    "--p-line": "rgba(58,42,31,.14)",
    "--p-heading": "'Fraunces Variable', serif",
    "--p-body": "'Geist Variable', sans-serif",
    "--p-radius": "14px",
    "--p-viewer-bg": "#1d2a24",
    "--p-viewer-fg": "#fbf6ec",
  },
}

export type ColorMode = "light" | "dark"

/** Version claire de la direction cinématographique : mêmes bordeaux et vert, assombris pour rester lisibles. */
const CINEMA_LIGHT: Record<string, string> = {
  ...THEMES.cinema,
  "--p-bg": "#f6f1e8",
  "--p-surface": "#ffffff",
  "--p-fg": "#1f1a17",
  "--p-muted": "#766c63",
  "--p-accent-2": "#3f6f48",
  "--p-gold": "#94702f",
  "--p-line": "rgba(31,26,23,.12)",
  "--p-viewer-bg": "#f6f1e8",
  "--p-viewer-fg": "#1f1a17",
  "--p-slide-bg": "#ebe4d8",
}

/** Variables d'une direction artistique dans le mode clair ou sombre (seule « cinema » a les deux). */
export function themeVars(theme: GalleryTheme, mode: ColorMode = "dark"): Record<string, string> {
  return theme === "cinema" && mode === "light" ? CINEMA_LIGHT : THEMES[theme]
}

export function themeStyle(theme: GalleryTheme, mode: ColorMode = "dark"): CSSProperties {
  return {
    ...(themeVars(theme, mode) as CSSProperties),
    colorScheme: theme === "cinema" ? mode : "light",
    background: "var(--p-bg)",
    color: "var(--p-fg)",
    fontFamily: "var(--p-body)",
  }
}

/** Émojis de réaction proposés aux invités (SOC-01). */
export const REACTION_EMOJIS = ["❤️", "😍", "🥹", "😂", "👏"] as const
