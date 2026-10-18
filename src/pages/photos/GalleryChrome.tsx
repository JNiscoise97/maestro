import { NavLink } from "react-router-dom"
import { LogOut, Moon, Settings, Sun } from "lucide-react"

import { useGalleryAuth } from "@/context/GalleryAuthContext"
import type { ColorMode } from "@/features/gallery/theme"

/** Titre de la galerie, commun à tous les écrans. */
export function Masthead({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`relative px-6 text-center ${compact ? "py-4" : "py-12 sm:py-20"}`}>
      <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: "var(--p-gold, var(--p-accent))" }}>
        Fiançailles · 25 juillet 2026
      </p>
      <h1 className={`mt-2 leading-none ${compact ? "text-5xl" : "text-6xl sm:text-8xl"}`}
        style={{ fontFamily: "var(--p-names-font, var(--p-heading))", color: "var(--p-names-color, inherit)" }}>
        Sarah &amp; Jordan
      </h1>
    </header>
  )
}

/** Barre de navigation discrète de la galerie (invités et administrateurs). */
export function GalleryNav({ mode, onToggleMode }: { mode: ColorMode; onToggleMode: () => void }) {
  const { member, signOut } = useGalleryAuth()
  const link = ({ isActive }: { isActive: boolean }) =>
    `border-b pb-0.5 transition-colors ${isActive ? "border-[var(--p-accent)]" : "border-transparent opacity-70 hover:opacity-100"}`
  return (
    <nav className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 text-xs uppercase tracking-[0.18em] backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--p-bg) 88%, transparent)", borderBottom: "1px solid var(--p-line)" }}>
      <NavLink to="/photos" end className={link}>Accueil</NavLink>
      <NavLink to="/photos/albums" className={link}>Toutes les photos</NavLink>
      <NavLink to="/photos/favoris" className={({ isActive }) => `${link({ isActive })} flex items-center gap-1`}>
        <span aria-hidden className="text-[12px] tracking-normal">❤️</span> Favoris
      </NavLink>
      <div className="ml-auto flex items-center gap-3">
        <ModeToggle mode={mode} onToggle={onToggleMode} />
        {member?.role === "admin" && (
          <NavLink to="/photos/admin" className={link} title="Administration">
            <Settings className="size-4" />
          </NavLink>
        )}
        <button type="button" onClick={() => void signOut()} title="Se déconnecter" aria-label="Se déconnecter" className="opacity-70 hover:opacity-100">
          <LogOut className="size-4" />
        </button>
      </div>
    </nav>
  )
}

/** Bascule clair / sombre de la galerie. */
export function ModeToggle({ mode, onToggle, className = "" }: { mode: ColorMode; onToggle: () => void; className?: string }) {
  return (
    <button type="button" onClick={onToggle} className={`opacity-70 transition-opacity hover:opacity-100 ${className}`}
      aria-label={mode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"} title={mode === "dark" ? "Mode clair" : "Mode sombre"}>
      {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

/** Écran simple centré (galerie fermée, compte désactivé, chargement…). */
export function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <Masthead compact />
      <p className="mt-4 text-lg" style={{ fontFamily: "var(--p-heading)" }}>{title}</p>
      {children && <div className="mt-3 max-w-sm text-sm" style={{ color: "var(--p-muted)" }}>{children}</div>}
    </div>
  )
}
