import type { GalleryMember, GalleryNotification } from "@/features/gallery/types"

export function memberName(m?: Pick<GalleryMember, "first_name" | "last_name" | "email"> | null): string {
  if (!m) return "—"
  return `${m.first_name} ${m.last_name}`.trim() || m.email
}

export function notificationText(n: GalleryNotification): string {
  const p = n.payload as Record<string, string | number | boolean | string[] | undefined>
  switch (n.kind) {
    case "report":
      return `Photo ${p.photo_code} signalée${p.for_self === false ? " (pour autrui)" : ""} — ${(p.reasons as string[] | undefined)?.join(", ") ?? ""}`
    case "access_request":
      return `Demande d'accès : ${p.first_name} ${p.last_name} (${p.email})`
    case "auto_link":
      return `Accès ouvert automatiquement : ${p.name} (${p.email})`
    case "download_volume":
      return `Volume de téléchargements : ${p.name} — ${p.count_24h} en 24 h`
    case "unusual_login":
      return `Connexions inhabituelles : ${p.name || p.email} — ${p.devices_24h} appareils en 24 h`
    default:
      return n.kind
  }
}

export const EVENT_LABELS: Record<string, string> = {
  login: "Connexion",
  logout: "Déconnexion",
  photo_open: "Ouverture d'une photo",
  search: "Recherche",
  reaction_insert: "Réaction ajoutée",
  reaction_delete: "Réaction retirée",
  comment_insert: "Commentaire publié",
  comment_update: "Commentaire modifié / masqué",
  comment_delete: "Commentaire supprimé",
  favorite_insert: "Favori ajouté",
  favorite_delete: "Favori retiré",
  report_insert: "Signalement",
  report_decision: "Décision de modération",
  download_normal: "Téléchargement normal",
  download_hd: "Téléchargement HD",
  photo_status: "Statut de photo modifié",
  account_created: "Compte ouvert",
  admin_member_update: "Compte modifié (admin)",
  admin_member_created: "Compte créé (admin)",
  admin_member_deleted: "Compte supprimé (admin)",
  admin_request_approved: "Demande approuvée",
  admin_request_rejected: "Demande refusée",
  admin_revoke_sessions: "Sessions révoquées",
  admin_home_selection: "Sélection d'accueil modifiée",
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map((v) => {
    const s = v === null || v === undefined ? "" : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(";")).join("\n")
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿", content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
