import { createClient } from "@supabase/supabase-js"

/**
 * Client Supabase de la galerie privée, distinct du client principal de l'appli.
 *
 * Le reste de l'appli fonctionne en rôle anonyme (politiques « anon_all … to anon ») :
 * une session connectée sur le client principal lui ferait perdre l'accès à ses tables.
 * La galerie garde donc sa propre session, sous une clé de stockage dédiée.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const galleryClient = url && key
  ? createClient(url, key, {
      auth: {
        storageKey: "sj-galerie-auth",
        persistSession: true,
        autoRefreshToken: true,
        // Connexion par code uniquement : aucun lien magique à intercepter dans l'URL.
        detectSessionInUrl: false,
      },
    })
  : null

/** Tables de la galerie : propres aux fiançailles, quel que soit le déploiement. */
export const GAL = "_20260725_gal_"
export const gt = (name: string) => `${GAL}${name}`
export const GALLERY_BUCKET = "gallery-private"

/** Appel d'une edge function de la galerie avec le jeton de la session en cours. */
export async function callGalleryFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!galleryClient) throw new Error("Supabase non configuré")
  const { data, error } = await galleryClient.functions.invoke(name, { body })
  if (error) {
    // Le corps JSON de l'erreur porte le code métier (ex. "disabled", "closed").
    const ctx = (error as { context?: Response }).context
    let code = "server"
    try { code = (await ctx?.json())?.error ?? code } catch { /* corps non JSON */ }
    throw new GalleryError(code)
  }
  return data as T
}

export class GalleryError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

/** Identifiant aléatoire de l'appareil (détection des connexions inhabituelles, sans IP). */
export function deviceId(): string {
  try {
    const k = "sj-galerie-device"
    const v = localStorage.getItem(k)
    if (v) return v
    const id = crypto.randomUUID()
    localStorage.setItem(k, id)
    return id
  } catch {
    return "inconnu"
  }
}
