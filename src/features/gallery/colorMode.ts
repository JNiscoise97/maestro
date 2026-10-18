import { useState } from "react"

import type { ColorMode } from "./theme"

const KEY = "sj-galerie-mode"

/**
 * Mode clair / sombre de la galerie : choix mémorisé sur l'appareil,
 * sinon préférence du système.
 */
export function useColorMode(): [ColorMode, () => void] {
  const [mode, setMode] = useState<ColorMode>(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === "light" || saved === "dark") return saved
    } catch { /* stockage indisponible */ }
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"
  })
  const toggle = () => setMode((m) => {
    const next = m === "dark" ? "light" : "dark"
    try { localStorage.setItem(KEY, next) } catch { /* stockage indisponible */ }
    return next
  })
  return [mode, toggle]
}
