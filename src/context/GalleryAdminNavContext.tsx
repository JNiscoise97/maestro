import { createContext, useContext } from "react"

/** Onglets de l'administration de la galerie privée. */
export type AdminTab =
  | "" | "upload" | "photos" | "accueil" | "acces" | "moderation" | "journal" | "reglages" | "export"

/**
 * Navigation de l'administration, indépendante de l'endroit où elle est affichée :
 * en pages (/photos/admin/…) ou intégrée dans Paramètres › Galerie (onglets en mémoire).
 */
export type AdminNav = {
  tab: AdminTab
  params: URLSearchParams
  go: (tab: AdminTab, params?: Record<string, string>) => void
}

export const AdminNavContext = createContext<AdminNav | null>(null)

export function useAdminNav(): AdminNav {
  const ctx = useContext(AdminNavContext)
  if (!ctx) throw new Error("useAdminNav hors de l'administration de la galerie")
  return ctx
}
