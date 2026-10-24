export type GalleryTheme = "editorial" | "cinema" | "tropical"
export type GalleryScrollMode = "portfolio" | "slideshow" | "immersive"

export type GalleryMember = {
  id: string
  email: string
  first_name: string
  last_name: string
  guest_id: string | null
  role: "guest" | "admin"
  status: "active" | "disabled"
  linked_by: "admin_bootstrap" | "auto_name_match" | "admin_approval" | "admin_manual"
  created_at: string
  last_seen_at: string | null
}

export type GallerySettings = {
  id: 1
  gallery_open: boolean
  opens_at: string | null
  closes_at: string | null
  download_normal_enabled: boolean
  download_hd_enabled: boolean
  comments_enabled: boolean
  reactions_enabled: boolean
  auto_link_known_names: boolean
  welcome_text: string
  download_alert_threshold: number
  theme: GalleryTheme
  scroll_mode: GalleryScrollMode
  unusual_login_devices: number
  notify_on_login: boolean
  notify_on_visit: boolean
  updated_at: string
}

export type GalleryAlbum = {
  id: string
  name: string
  sort_order: number
  /** Photo de couverture choisie (une par catégorie) ; null = première photo visible. */
  cover_photo_id: string | null
  /** Catégorie masquée aux invités (photos invisibles partout pour eux). */
  hidden: boolean
}

export type GalleryPhotoStatus = "visible" | "hidden" | "trashed"

export type GalleryPhoto = {
  id: string
  number: number
  code: string
  album_id: string
  taken_at: string | null
  original_filename: string
  checksum: string
  width: number
  height: number
  thumb_path: string
  display_path: string
  original_path: string
  status: GalleryPhotoStatus
  home_rank: number | null
  created_at: string
}

export type ConsentVersion = { version: number; body: string; published_at: string }

export type ReactionCount = { photo_id: string; emoji: string; total: number; mine: boolean }

export type PhotoComment = { id: string; body: string; created_at: string; updated_at: string; mine: boolean }

export type ReportReason = { id: string; label: string; sort_order: number; active: boolean }

export type GalleryReport = {
  id: string
  photo_id: string
  reporter_id: string
  reasons: string[]
  for_self: boolean
  status: "open" | "maintained" | "restored" | "deleted"
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

export type AccessRequest = {
  id: string
  email: string
  first_name: string
  last_name: string
  matched_guest_id: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
  decided_at: string | null
}

export type AdminComment = {
  id: string
  photo_id: string
  member_id: string
  body: string
  hidden: boolean
  created_at: string
  updated_at: string
}

export type ActivityEntry = {
  id: number
  member_id: string | null
  event: string
  photo_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export type GalleryNotification = {
  id: number
  kind: "report" | "access_request" | "auto_link" | "download_volume" | "unusual_login" | string
  payload: Record<string, unknown>
  created_at: string
  read_at: string | null
}

export type DownloadEntry = {
  id: number
  photo_id: string
  member_id: string
  quality: "normal" | "hd"
  created_at: string
}
