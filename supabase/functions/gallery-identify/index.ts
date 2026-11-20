// gallery-identify — étape d'identification de la galerie privée (CDCF ACC-02, ACC-06).
//
// Entrée : { email, firstName?, lastName?, source? }  ou  { email, birthYear, source? }  (connexion par année)
//   source : "photos" (défaut, /photos) ou "invitation" (/Jordan-Sarah-2027/invitation) — même base de comptes.
//   L'origine est notée dans user_metadata.login_source (lue par le modèle d'e-mail du code) et sur la
//   demande d'accès, et adapte les e-mails envoyés aux administrateurs.
// Sortie : { status: "ready", yearLogin? } → le navigateur demande le code (signInWithOtp, shouldCreateUser: false),
//                                            ou l'année de naissance si yearLogin
//          { status: "signed", tokenHash } → année correcte : session ouverte par verifyOtp(token_hash), sans mail
//          { status: "wrong_year", remaining } / { status: "locked" } → 2 échecs : blocage 1 h, repli sur le code mail
//          { status: "need_name" }  → adresse inconnue : demander prénom et nom
//          { status: "pending" }    → demande transmise à Jordan et Sarah
//
// Les comptes ne sont créés qu'ici (clé service) : jamais par le navigateur.
//
// Fichier autonome : à coller tel quel dans l'éditeur Edge Functions du tableau de bord Supabase
// (ou à déployer avec `npx supabase functions deploy gallery-identify --no-verify-jwt`).
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

export type Source = "photos" | "invitation"

/** Adresse publique de l'interface d'origine (galerie ou invitation), pour les liens des e-mails. */
export function sourceUrl(source: Source): string {
  return source === "invitation"
    ? (Deno.env.get("GALLERY_PUBLIC_URL") ?? "").replace(/\/$/, "") + "/Jordan-Sarah-2027/invitation"
    : galleryUrl()
}

/** Libellés des e-mails selon l'interface d'origine. */
export const SOURCE_LABEL: Record<Source, { subject: string; object: string }> = {
  photos: { subject: "Galerie", object: "la galerie" },
  invitation: { subject: "Invitation", object: "l'invitation" },
}

/**
 * Envoi d'un e-mail transactionnel via l'API Resend (secrets RESEND_API_KEY et MAIL_FROM).
 * Sans clé configurée, l'envoi est ignoré sans erreur : l'alerte reste visible dans l'administration.
 */
export async function sendMail(to: string[], subject: string, html: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("MAIL_FROM") ?? "Jordan & Sarah <connexion@20260725.geniius.io>"
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

/**
 * Normalisation pour comparer des noms : minuscules, sans accents, et sans espaces, tirets ni
 * apostrophes — « DE JAHAM », « De-Jaham » et « Dejaham » donnent tous « dejaham ».
 */
export function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z]+/g, "")
}

// ── Fonction ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "method" }, 405)

  let body: { email?: string; firstName?: string; lastName?: string; birthYear?: number | string; source?: string }
  try { body = await req.json() } catch { return json({ error: "invalid_body" }, 400) }

  const email = (body.email ?? "").trim().toLowerCase()
  const firstName = (body.firstName ?? "").trim().slice(0, 80)
  const lastName = (body.lastName ?? "").trim().slice(0, 80)
  if (!EMAIL_RE.test(email) || email.length > 200) return json({ error: "invalid_email" }, 400)
  const source: Source = body.source === "invitation" ? "invitation" : "photos"
  const label = SOURCE_LABEL[source]
  const adminUrl = `${sourceUrl(source)}/admin/acces`

  const db = serviceClient()

  // 0. Connexion par année de naissance (liste blanche).
  if (body.birthYear != null) return yearLogin(db, email, Number(body.birthYear), source)

  // 1. Compte existant : actif → code (ou année si liste blanche) ; désactivé → même réponse qu'une demande en attente.
  const { data: member } = await db.from(t("members"))
    .select("id, status, role, birth_year, year_kind, year_locked_until").eq("email", email).maybeSingle()
  if (member) {
    if (member.status !== "active") return json({ status: "pending" })
    const locked = member.year_locked_until && new Date(member.year_locked_until) > new Date()
    await markSource(db, member.id, source)
    // Liste blanche : invités (année de naissance) ; dérogation administrateur avec l'année de rencontre (0181).
    const yearKind = (member as { year_kind?: string }).year_kind === "meeting" ? "meeting" : "birth"
    const allowed = member.role === "guest" || (member.role === "admin" && yearKind === "meeting")
    return json({ status: "ready", yearLogin: allowed && member.birth_year != null && !locked, yearKind })
  }

  // 2. Administrateur déclaré : ouverture de son compte à la première connexion.
  const { data: adminRow } = await db.from(t("admin_emails")).select("email").eq("email", email).maybeSingle()
  if (adminRow) {
    const id = await ensureAuthUser(db, email, source)
    if (!id) return json({ error: "server" }, 500)
    await db.from(t("members")).insert({
      id, email, first_name: firstName, last_name: lastName, role: "admin", linked_by: "admin_bootstrap",
    })
    return json({ status: "ready" })
  }

  // 3. Adresse inconnue : il faut le prénom et le nom.
  if (!firstName || !lastName) return json({ status: "need_name" })

  // Demande déjà en attente pour cette adresse : ne pas la dupliquer.
  const { data: pending } = await db.from(t("access_requests"))
    .select("id").eq("email", email).eq("status", "pending").maybeSingle()
  if (pending) return json({ status: "pending" })

  // 4. Rapprochement avec la liste des invités des fiançailles (correspondance unique exigée).
  // Liste complète (quelques centaines de lignes) : la comparaison ignore accents et casse.
  // Puis, à défaut, avec celle du mariage (mêmes identifiants pour les invités repris des fiançailles).
  const wantedFirst = normalizeName(firstName)
  const wantedLast = normalizeName(lastName)
  const findIn = async (table: string) => {
    const { data: guests } = await db.from(table).select("id, first_name, last_name, is_active").range(0, 4999)
    return (guests ?? []).filter((g: { first_name: string | null; last_name: string | null; is_active: boolean | null }) =>
      g.is_active !== false
      && normalizeName(g.first_name ?? "") === wantedFirst
      && normalizeName(g.last_name ?? "") === wantedLast) as { id: string }[]
  }
  let matches = await findIn("_20260725_guests")
  if (matches.length === 0) matches = await findIn("_20270628_guests")
  const matched = matches.length === 1 ? matches[0] : null

  const { data: settings } = await db.from(t("settings")).select("auto_link_known_names").eq("id", 1).single()

  // Un invité ne peut être rattaché automatiquement qu'à un seul compte.
  let guestFree = false
  if (matched) {
    const { count } = await db.from(t("members")).select("id", { count: "exact", head: true }).eq("guest_id", matched.id)
    guestFree = (count ?? 0) === 0
  }

  if (matched && guestFree && settings?.auto_link_known_names) {
    // Arbitrage 1 : approbation automatique + alerte aux administrateurs (déclencheur SQL + e-mail).
    const id = await ensureAuthUser(db, email, source)
    if (!id) return json({ error: "server" }, 500)
    const { error } = await db.from(t("members")).insert({
      id, email, first_name: firstName, last_name: lastName, guest_id: matched.id, linked_by: "auto_name_match",
    })
    if (error) { console.error("[identify] member insert", error); return json({ error: "server" }, 500) }
    await sendMail(await adminEmails(db), `${label.subject} : accès ouvert automatiquement`,
      mailLayout("Nouvel accès automatique",
        `${escapeHtml(firstName)} ${escapeHtml(lastName)} (${escapeHtml(email)}) s'est identifié(e) depuis ${label.object} ` +
        `et a été rattaché(e) automatiquement à la liste des invités.<br><br>` +
        `Si ce n'est pas la bonne personne, désactivez ce compte depuis l'administration : <a href="${adminUrl}">${adminUrl}</a>`))
    return json({ status: "ready" })
  }

  // 5. Sinon : demande en attente de validation (notification par déclencheur SQL).
  const { error } = await db.from(t("access_requests")).insert({
    email, first_name: firstName, last_name: lastName, matched_guest_id: matched?.id ?? null, source,
  })
  if (error) { console.error("[identify] request insert", error); return json({ error: "server" }, 500) }
  await sendMail(await adminEmails(db), `${label.subject} : nouvelle demande d'accès`,
    mailLayout("Nouvelle demande d'accès",
      `${escapeHtml(firstName)} ${escapeHtml(lastName)} (${escapeHtml(email)}) demande l'accès à ${label.object}.<br><br>` +
      `<a href="${adminUrl}">Voir les demandes</a>`))
  return json({ status: "pending" })
})

/**
 * Connexion par année de naissance : essai compté de façon atomique en base (2 échecs → blocage 1 h).
 * Année correcte : jeton de connexion à usage unique généré côté serveur (aucun mail envoyé),
 * que le navigateur échange contre une session avec verifyOtp({ token_hash }).
 */
async function yearLogin(db: SupabaseClient, email: string, year: number, source: Source): Promise<Response> {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return json({ status: "wrong_year", remaining: 1 })
  const { data, error } = await db.rpc("_20260725_gal_year_attempt", { p_email: email, p_year: year })
  if (error) { console.error("[identify] year_attempt", error); return json({ error: "server" }, 500) }
  const row = (data as { result: string; remaining: number; member_id: string | null }[])[0]

  if (row.result === "unavailable") return json({ status: "ready", yearLogin: false })
  if (row.result === "wrong") {
    await db.from(t("activity")).insert({ member_id: row.member_id, event: "year_login_failed", details: {} })
    return json({ status: "wrong_year", remaining: row.remaining })
  }
  if (row.result === "locked") {
    await db.from(t("activity")).insert({ member_id: row.member_id, event: "year_login_locked", details: {} })
    const { data: m } = await db.from(t("members")).select("first_name, last_name, role").eq("id", row.member_id).maybeSingle()
    // Repli sur le code par mail : le modèle d'e-mail doit parler de la bonne interface.
    await markSource(db, row.member_id, source)
    await sendMail(await adminEmails(db), `${SOURCE_LABEL[source].subject} : connexion par année bloquée`,
      mailLayout("Connexion par année bloquée",
        `Deux années incorrectes ont été saisies pour ${escapeHtml(`${m?.first_name ?? ""} ${m?.last_name ?? ""}`.trim() || email)} ` +
        `(${escapeHtml(email)}). La connexion par année est bloquée pendant ${m?.role === "admin" ? "24 heures" : "1 heure"} ; la personne a reçu un code par mail à la place.<br><br>` +
        `Si ce n'est pas elle, vérifiez son compte : <a href="${sourceUrl(source)}/admin/acces">${sourceUrl(source)}/admin/acces</a>`))
    return json({ status: "locked" })
  }

  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: "magiclink", email })
  const tokenHash = link?.properties?.hashed_token
  if (linkError || !tokenHash) { console.error("[identify] generateLink", linkError); return json({ error: "server" }, 500) }
  return json({ status: "signed", tokenHash })
}

/**
 * Note l'interface d'origine de la connexion en cours dans user_metadata.login_source :
 * le modèle d'e-mail du code (Supabase Auth, « Magic Link ») l'utilise pour adapter son texte.
 * Fusionnée avec les autres métadonnées ; un échec n'empêche pas la connexion (texte « galerie » par défaut).
 */
async function markSource(db: SupabaseClient, userId: string | null, source: Source): Promise<void> {
  if (!userId) return
  const { error } = await db.auth.admin.updateUserById(userId, { user_metadata: { login_source: source } })
  if (error) console.error("[identify] login_source", error)
}

/** Crée l'utilisateur Supabase Auth (adresse confirmée) ou retrouve celui qui existe déjà. */
async function ensureAuthUser(db: ReturnType<typeof serviceClient>, email: string, source: Source): Promise<string | null> {
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { login_source: source } })
  if (data?.user) return data.user.id
  // Déjà présent (ex. test d'envoi fait à la main) : on le retrouve par son adresse.
  if (error) {
    for (let page = 1; page <= 20; page++) {
      const { data: list } = await db.auth.admin.listUsers({ page, perPage: 200 })
      const found = list?.users.find((u) => u.email?.toLowerCase() === email)
      if (found) { await markSource(db, found.id, source); return found.id }
      if (!list || list.users.length < 200) break
    }
    console.error("[identify] createUser", error)
  }
  return null
}
