// gallery-notify — e-mail aux administrateurs pour les alertes créées en base (CDCF MOD-04, ADM-03).
//
// Appelée par un « Database Webhook » Supabase sur INSERT dans _20260725_gal_notifications,
// pour les alertes nées dans la base : signalements, connexions d'invités et connexions inhabituelles.
// (Demandes d'accès, rattachements automatiques et volumes de téléchargement sont déjà
//  envoyés par gallery-identify / gallery-download.)
// Connexions et visites : payload.source = « photos » (/photos) ou « invitation » (/Sarah-Jordan-2027/invitation),
// même base de comptes ; l'e-mail nomme la page concernée. Sans source (anciennes alertes) : galerie.
// Sécurité : en-tête « x-webhook-secret » égal au secret GALLERY_WEBHOOK_SECRET.
//
// Fichier autonome : à coller tel quel dans l'éditeur Edge Functions du tableau de bord Supabase
// (ou à déployer avec `npx supabase functions deploy gallery-notify --no-verify-jwt`).
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

/** Adresse publique de l'invitation (même base de comptes que la galerie). */
export function invitationUrl(): string {
  return (Deno.env.get("GALLERY_PUBLIC_URL") ?? "").replace(/\/$/, "") + "/Sarah-Jordan-2027/invitation"
}

type Source = "photos" | "invitation"
const sourceOf = (s: unknown): Source => (s === "invitation" ? "invitation" : "photos")

/** Libellés et liens des alertes de connexion selon l'interface d'origine. */
const SOURCE: Record<Source, {
  subject: string; object: string; back: string; linkLabel: string; link: () => string; accessLink: () => string
}> = {
  photos: {
    subject: "Galerie", object: "la galerie", back: "est revenu(e) voir les photos",
    linkLabel: "Voir le journal", link: () => `${galleryUrl()}/admin/journal`, accessLink: () => `${galleryUrl()}/admin/acces`,
  },
  // L'administration de l'invitation n'a pas (encore) de journal : lien vers ses comptes.
  invitation: {
    subject: "Invitation", object: "l'invitation", back: "est revenu(e) sur l'invitation",
    linkLabel: "Voir les comptes", link: () => `${invitationUrl()}/admin/acces`, accessLink: () => `${invitationUrl()}/admin/acces`,
  },
}

// ── Fonction ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  const secret = Deno.env.get("GALLERY_WEBHOOK_SECRET")
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return json({ error: "forbidden" }, 403)

  const payload = await req.json().catch(() => null) as { record?: { kind: string; payload: Record<string, unknown>; created_at: string } } | null
  const record = payload?.record
  if (!record) return json({ ok: true })

  const db = serviceClient()
  const p = record.payload
  const when = new Date(record.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })

  if (record.kind === "report") {
    const { data: reporter } = await db.from("_20260725_gal_members")
      .select("first_name, last_name, email").eq("id", String(p.reporter_id)).maybeSingle()
    const who = reporter ? `${reporter.first_name} ${reporter.last_name} (${reporter.email})`.trim() : "Un invité"
    const reasons = (p.reasons as string[] | undefined ?? []).map(escapeHtml).join(", ")
    await sendMail(await adminEmails(db), `Galerie : photo ${p.photo_code} signalée`,
      mailLayout("Photo signalée",
        `<b>${escapeHtml(String(p.photo_code))}</b> a été signalée le ${when} par ${escapeHtml(who)}` +
        `${p.for_self === false ? " (pour une autre personne)" : ""}.<br>Motif(s) : ${reasons}.<br><br>` +
        `La photo est masquée pour tous en attendant votre décision.<br><br>` +
        `<a href="${galleryUrl()}/admin/moderation">Examiner le signalement</a>`))
  } else if (record.kind === "login") {
    const name = String(p.name || p.email)
    const s = SOURCE[sourceOf(p.source)]
    await sendMail(await adminEmails(db), `${s.subject} : ${name} vient de se connecter`,
      mailLayout(p.first_login ? "Première connexion" : `Connexion à ${s.object}`,
        `<b>${escapeHtml(name)}</b> (${escapeHtml(String(p.email))}) s'est connecté(e) à ${s.object} le ${when}` +
        `${p.first_login ? ", pour la première fois" : ` (connexion n°${p.login_count})`}.<br><br>` +
        `<a href="${s.link()}">${s.linkLabel}</a>`))
  } else if (record.kind === "visit") {
    const name = String(p.name || p.email)
    const s = SOURCE[sourceOf(p.source)]
    await sendMail(await adminEmails(db), `${s.subject} : ${name} ${s.back}`,
      mailLayout(`Retour sur ${s.object}`,
        `<b>${escapeHtml(name)}</b> (${escapeHtml(String(p.email))}) est revenu(e) sur ${s.object} le ${when}.<br>` +
        `Un seul e-mail de ce type par personne et par jour.<br><br>` +
        `<a href="${s.link()}">${s.linkLabel}</a>`))
  } else if (record.kind === "unusual_login") {
    const s = SOURCE[sourceOf(p.source)]
    await sendMail(await adminEmails(db), `${s.subject} : connexions inhabituelles`,
      mailLayout("Connexions inhabituelles",
        `${escapeHtml(String(p.name || p.email))} s'est connecté(e) depuis ${p.devices_24h} appareils différents en 24 h ` +
        `(dernière connexion depuis ${s.object}). Aucune mesure automatique n'a été prise.<br><br>` +
        `<a href="${s.accessLink()}">Gérer les accès</a>`))
  }
  return json({ ok: true })
})
