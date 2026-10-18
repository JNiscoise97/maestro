// gallery-admin — actions d'administration qui exigent la clé service (CDCF ACC-06, ADM-05).
//
// Entrée : { action, ... } avec un jeton d'administrateur actif dans l'en-tête Authorization.
//   approve_request { requestId }              → crée le compte et prévient le demandeur
//   reject_request  { requestId }              → refuse (le demandeur est prévenu, sans détail)
//   create_member   { email, firstName, lastName, role? } → ouverture manuelle d'un compte
//   delete_member   { memberId }               → supprime le compte (et l'utilisateur Auth)
//
// Fichier autonome : à coller tel quel dans l'éditeur Edge Functions du tableau de bord Supabase
// (ou à déployer avec `npx supabase functions deploy gallery-admin --no-verify-jwt`).
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
  const admin = await currentMember(req, db)
  if (!admin || admin.role !== "admin" || admin.status !== "active") return json({ error: "forbidden" }, 403)

  let body: Record<string, string>
  try { body = await req.json() } catch { return json({ error: "invalid_body" }, 400) }

  const log = (event: string, details: Record<string, unknown>) =>
    db.from(t("activity")).insert({ member_id: admin.id, event, details })

  switch (body.action) {
    case "approve_request": {
      const { data: request } = await db.from(t("access_requests")).select("*").eq("id", body.requestId).maybeSingle()
      if (!request || request.status !== "pending") return json({ error: "not_pending" }, 409)
      const id = await createAccount(db, request.email, request.first_name, request.last_name, "guest", request.matched_guest_id)
      if (!id) return json({ error: "server" }, 500)
      await db.from(t("access_requests"))
        .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: admin.id })
        .eq("id", request.id)
      await log("admin_request_approved", { request_id: request.id, member_id: id })
      await sendMail([request.email], "Votre accès à la galerie est ouvert",
        mailLayout("Bienvenue !",
          `Bonjour ${escapeHtml(request.first_name)},<br><br>Sarah et Jordan ont accepté votre demande. ` +
          `Vous pouvez dès maintenant vous connecter avec votre adresse e-mail :<br><br>` +
          `<a href="${galleryUrl()}" style="color:#7a1f2b;">${galleryUrl()}</a>`))
      return json({ ok: true, memberId: id })
    }

    case "reject_request": {
      const { data: request } = await db.from(t("access_requests")).select("*").eq("id", body.requestId).maybeSingle()
      if (!request || request.status !== "pending") return json({ error: "not_pending" }, 409)
      await db.from(t("access_requests"))
        .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: admin.id })
        .eq("id", request.id)
      await log("admin_request_rejected", { request_id: request.id })
      await sendMail([request.email], "Votre demande d'accès à la galerie",
        mailLayout("Votre demande",
          `Bonjour ${escapeHtml(request.first_name)},<br><br>Votre demande d'accès n'a pas pu être acceptée. ` +
          `Si vous pensez qu'il s'agit d'une erreur, contactez directement Sarah ou Jordan.`))
      return json({ ok: true })
    }

    case "create_member": {
      const email = (body.email ?? "").trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid_email" }, 400)
      const { data: existing } = await db.from(t("members")).select("id").eq("email", email).maybeSingle()
      if (existing) return json({ error: "exists" }, 409)
      const role = body.role === "admin" ? "admin" : "guest"
      const id = await createAccount(db, email, body.firstName ?? "", body.lastName ?? "", role, null)
      if (!id) return json({ error: "server" }, 500)
      await log("admin_member_created", { member_id: id, role })
      return json({ ok: true, memberId: id })
    }

    case "delete_member": {
      if (body.memberId === admin.id) return json({ error: "self" }, 400)
      const { error } = await db.auth.admin.deleteUser(body.memberId)
      if (error) return json({ error: "server" }, 500)
      await log("admin_member_deleted", { member_id: body.memberId })
      return json({ ok: true })
    }

    default:
      return json({ error: "unknown_action" }, 400)
  }
})

async function createAccount(
  db: ReturnType<typeof serviceClient>,
  email: string, firstName: string, lastName: string,
  role: "guest" | "admin", guestId: string | null,
): Promise<string | null> {
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true })
  let id = data?.user?.id ?? null
  if (!id && error) {
    for (let page = 1; page <= 20 && !id; page++) {
      const { data: list } = await db.auth.admin.listUsers({ page, perPage: 200 })
      id = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null
      if (!list || list.users.length < 200) break
    }
  }
  if (!id) { console.error("[gallery-admin] createUser", error); return null }
  const { error: insertError } = await db.from(t("members")).upsert({
    id, email, first_name: firstName, last_name: lastName, role, guest_id: guestId,
    linked_by: guestId || role === "guest" ? "admin_approval" : "admin_manual",
  })
  if (insertError) { console.error("[gallery-admin] member", insertError); return null }
  return id
}
