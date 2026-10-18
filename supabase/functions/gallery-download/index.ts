// gallery-download — téléchargement individuel d'une photo (CDCF DL-01..05, SEC-01).
//
// Entrée : { photoId, quality: "normal" | "hd" } avec le jeton de l'invité.
// Contrôles côté serveur : compte actif, engagement en vigueur accepté, galerie ouverte,
// photo visible (une photo signalée n'est plus téléchargeable), interrupteur de la qualité actif.
// Sortie : { url } — URL signée valable 60 s, nom de fichier SJ-0001.jpg / original.
// Journal + alerte (sans blocage) au-delà du seuil de téléchargements sur 24 h.
//
// Fichier autonome : à coller tel quel dans l'éditeur Edge Functions du tableau de bord Supabase
// (ou à déployer avec `npx supabase functions deploy gallery-download --no-verify-jwt`).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

export const GAL = "_20260725_gal_"
export const t = (name: string) => `${GAL}${name}`
export const BUCKET = "gallery-private"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

/** Client « service » : contourne la RLS. À n'utiliser qu'après les contrôles d'autorisation. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type Member = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "guest" | "admin"
  status: "active" | "disabled"
}

/** Utilisateur connecté (jeton de l'en-tête Authorization) et sa fiche de membre, ou null. */
export async function currentMember(req: Request, db: SupabaseClient): Promise<Member | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!token) return null
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return null
  const { data: member } = await db.from(t("members")).select("*").eq("id", data.user.id).maybeSingle()
  return (member as Member | null) ?? null
}

/** Adresse publique de la galerie, pour les liens des e-mails. */
export function galleryUrl(): string {
  return (Deno.env.get("GALLERY_PUBLIC_URL") ?? "").replace(/\/$/, "") + "/photos"
}

/**
 * Envoi d'un e-mail transactionnel via l'API Resend (secrets RESEND_API_KEY et MAIL_FROM).
 * Sans clé configurée, l'envoi est ignoré sans erreur : l'alerte reste visible dans l'administration.
 */
export async function sendMail(to: string[], subject: string, html: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("MAIL_FROM") ?? "Sarah & Jordan <connexion@20260725.geniius.io>"
  if (!key || to.length === 0) return
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) console.error("[sendMail]", res.status, await res.text())
}

/** Adresses e-mail des administrateurs actifs. */
export async function adminEmails(db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from(t("members")).select("email").eq("role", "admin").eq("status", "active")
  return (data ?? []).map((r: { email: string }) => r.email)
}

/** Mise en forme minimale et sobre des e-mails envoyés par les fonctions. */
export function mailLayout(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#f4efe6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fbf8f2;border:1px solid #e6dccb;">
<tr><td style="height:4px;background:#7a1f2b;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#2b2420;">${title}</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#4a403a;">${body}</td></tr>
</table></td></tr></table></body></html>`
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

/** Normalisation pour comparer des noms : minuscules, sans accents ni espaces superflus. */
export function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z]+/g, " ").trim()
}

// ── Fonction ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "method" }, 405)

  const db = serviceClient()
  const member = await currentMember(req, db)
  if (!member || member.status !== "active") return json({ error: "forbidden" }, 403)

  let body: { photoId?: string; quality?: string }
  try { body = await req.json() } catch { return json({ error: "invalid_body" }, 400) }
  const quality = body.quality === "hd" ? "hd" : "normal"

  const [{ data: settings }, { data: photo }, { data: consentVersion }] = await Promise.all([
    db.from(t("settings")).select("*").eq("id", 1).single(),
    db.from(t("photos")).select("id, code, status, display_path, original_path, original_filename, album:_20260725_gal_albums(hidden)").eq("id", body.photoId ?? "").maybeSingle(),
    db.from(t("consent_versions")).select("version").order("version", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!settings || !photo) return json({ error: "not_found" }, 404)

  const isAdmin = member.role === "admin"
  if (!isAdmin) {
    const now = Date.now()
    const open = settings.gallery_open
      && (!settings.opens_at || now >= Date.parse(settings.opens_at))
      && (!settings.closes_at || now < Date.parse(settings.closes_at))
    if (!open) return json({ error: "closed" }, 403)
    if (!consentVersion) return json({ error: "consent" }, 403)
    const { data: consent } = await db.from(t("consents")).select("version")
      .eq("member_id", member.id).eq("version", consentVersion.version).maybeSingle()
    if (!consent) return json({ error: "consent" }, 403)
    // Photo signalée, en corbeille, ou dans une catégorie masquée aux invités : plus téléchargeable.
    const albumHidden = (photo as { album?: { hidden?: boolean } | null }).album?.hidden === true
    if (photo.status !== "visible" || albumHidden) return json({ error: "unavailable" }, 403)
    if (quality === "hd" ? !settings.download_hd_enabled : !settings.download_normal_enabled) {
      return json({ error: "disabled" }, 403)
    }
  }

  const path = quality === "hd" ? photo.original_path : photo.display_path
  const ext = quality === "hd" ? (photo.original_filename.split(".").pop() ?? "jpg") : "jpg"
  const { data: signed, error } = await db.storage.from(BUCKET)
    .createSignedUrl(path, 60, { download: `${photo.code}${quality === "hd" ? "-HD" : ""}.${ext}` })
  if (error || !signed) return json({ error: "server" }, 500)

  await db.from(t("downloads")).insert({ photo_id: photo.id, member_id: member.id, quality })
  await db.from(t("activity")).insert({ member_id: member.id, event: `download_${quality}`, photo_id: photo.id })

  // Alerte (jamais de blocage) quand le volume sur 24 h atteint le seuil.
  if (!isAdmin) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count } = await db.from(t("downloads")).select("id", { count: "exact", head: true })
      .eq("member_id", member.id).gte("created_at", since)
    if ((count ?? 0) === settings.download_alert_threshold) {
      const name = `${member.first_name} ${member.last_name}`.trim() || member.email
      await db.from(t("notifications")).insert({
        kind: "download_volume",
        payload: { member_id: member.id, email: member.email, name, count_24h: count },
      })
      await sendMail(await adminEmails(db), "Galerie : volume de téléchargements inhabituel",
        mailLayout("Téléchargements nombreux",
          `${escapeHtml(name)} a téléchargé ${count} photos en 24 h. Aucune mesure automatique n'a été prise.<br><br>` +
          `<a href="${galleryUrl()}/admin/journal">Consulter le journal</a>`))
    }
  }

  return json({ url: signed.signedUrl })
})
