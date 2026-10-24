import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"

import { callGalleryFunction, deviceId, galleryClient, gt, GALLERY_BUCKET } from "./client"
import type {
  AccessRequest, ActivityEntry, AdminComment, ConsentVersion, DownloadEntry, GalleryAlbum,
  GalleryMember, GalleryNotification, GalleryPhoto, GalleryReport, GallerySettings, PhotoComment,
  ReactionCount, ReportReason,
} from "./types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => galleryClient! as any

async function selectAll<T>(table: string, build: (q: any) => any = (q) => q): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  // Supabase plafonne chaque réponse à 1 000 lignes : pagination avec un ordre stable.
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(db().from(gt(table)).select("*")).range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < 1000) break
  }
  return rows
}

export const KEYS = {
  settings: ["gal", "settings"],
  albums: ["gal", "albums"],
  photos: ["gal", "photos"],
  favorites: ["gal", "favorites"],
  reactions: (ids: string[]) => ["gal", "reactions", ids.join(",")],
  comments: (photoId: string) => ["gal", "comments", photoId],
  reasons: ["gal", "reasons"],
  consent: ["gal", "consent"],
  admin: ["gal", "admin"],
} as const

// ── Lecture invité ───────────────────────────────────────────────────────────

export function useGallerySettings(enabled = true) {
  return useQuery({
    queryKey: KEYS.settings,
    enabled,
    queryFn: async (): Promise<GallerySettings> => {
      const { data, error } = await db().from(gt("settings")).select("*").eq("id", 1).single()
      if (error) throw error
      return data
    },
  })
}

export function useAlbums(enabled = true) {
  return useQuery({
    queryKey: KEYS.albums,
    enabled,
    queryFn: () => selectAll<GalleryAlbum>("albums", (q) => q.order("sort_order").order("name")),
  })
}

/** Photos lisibles par la personne connectée (visibles pour un invité, toutes pour un admin). */
export function usePhotos(enabled = true) {
  return useQuery({
    queryKey: KEYS.photos,
    enabled,
    queryFn: () => selectAll<GalleryPhoto>("photos",
      (q) => q.order("taken_at", { ascending: true, nullsFirst: false }).order("number")),
  })
}

/**
 * URL signées des fichiers privés (miniatures, versions de consultation), valables 1 h.
 * Le stockage refuse la signature si la photo n'est pas visible ou si le compte n'y a pas droit.
 */
function signedUrlsQuery(paths: string[]) {
  const sorted = [...new Set(paths)].sort()
  return {
    queryKey: ["gal", "signed", sorted.join("|")],
    enabled: sorted.length > 0,
    staleTime: 45 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
    queryFn: async () => {
      const map = new Map<string, string>()
      for (let i = 0; i < sorted.length; i += 100) {
        const chunk = sorted.slice(i, i + 100)
        const { data, error } = await galleryClient!.storage.from(GALLERY_BUCKET).createSignedUrls(chunk, 3600)
        if (error) throw error
        for (const row of data ?? []) {
          if (row.signedUrl && row.path) map.set(row.path, row.signedUrl)
          // Refus du stockage : réponse 200, mais une erreur par fichier.
          else console.warn("[galerie] fichier refusé :", row.path, row.error)
        }
      }
      return map
    },
  }
}

export function useSignedUrls(paths: string[]) {
  return useQuery(signedUrlsQuery(paths))
}

/**
 * URL signées demandées par paquets fixes (ex. une page de 24 miniatures) : charger la page suivante
 * ne re-signe pas les précédentes, et les images déjà affichées gardent leur adresse (pas de rechargement).
 */
export function useSignedUrlsByChunks(paths: string[], size = 24): Map<string, string> {
  const chunks: string[][] = []
  for (let i = 0; i < paths.length; i += size) chunks.push(paths.slice(i, i + size))
  const results = useQueries({ queries: chunks.map((c) => signedUrlsQuery(c)) })
  const merged = new Map<string, string>()
  for (const r of results) r.data?.forEach((url, path) => merged.set(path, url))
  return merged
}

export function useFavorites(enabled = true) {
  return useQuery({
    queryKey: KEYS.favorites,
    enabled,
    queryFn: async () => {
      const rows = await selectAll<{ photo_id: string }>("favorites", (q) => q.order("created_at"))
      return new Set(rows.map((r) => r.photo_id))
    },
  })
}

export function useToggleFavorite(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ photoId, on }: { photoId: string; on: boolean }) => {
      const q = on
        ? db().from(gt("favorites")).insert({ member_id: memberId, photo_id: photoId })
        : db().from(gt("favorites")).delete().eq("member_id", memberId).eq("photo_id", photoId)
      const { error } = await q
      if (error) throw error
    },
    onMutate: ({ photoId, on }) => {
      qc.setQueryData<Set<string>>(KEYS.favorites, (prev) => {
        const next = new Set(prev ?? [])
        if (on) next.add(photoId); else next.delete(photoId)
        return next
      })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.favorites }),
  })
}

export function useReactionCounts(photoIds: string[]) {
  return useQuery({
    queryKey: KEYS.reactions(photoIds),
    enabled: photoIds.length > 0,
    queryFn: async (): Promise<ReactionCount[]> => {
      const { data, error } = await db().rpc(`${gt("reaction_counts")}`, { p_photos: photoIds })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useToggleReaction(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ photoId, emoji, on }: { photoId: string; emoji: string; on: boolean }) => {
      const q = on
        ? db().from(gt("reactions")).insert({ photo_id: photoId, member_id: memberId, emoji })
        : db().from(gt("reactions")).delete().eq("photo_id", photoId).eq("member_id", memberId).eq("emoji", emoji)
      const { error } = await q
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["gal", "reactions"] }),
  })
}

export function usePhotoComments(photoId: string | null) {
  return useQuery({
    queryKey: KEYS.comments(photoId ?? ""),
    enabled: !!photoId,
    queryFn: async (): Promise<PhotoComment[]> => {
      const { data, error } = await db().rpc(gt("photo_comments"), { p_photo: photoId })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCommentMutations(memberId: string, photoId: string) {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: KEYS.comments(photoId) })
  const add = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await db().from(gt("comments")).insert({ photo_id: photoId, member_id: memberId, body })
      if (error) throw error
    },
    onSuccess: done,
  })
  const edit = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await db().from(gt("comments")).update({ body, updated_at: new Date().toISOString() }).eq("id", id)
      if (error) throw error
    },
    onSuccess: done,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from(gt("comments")).delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: done,
  })
  return { add, edit, remove }
}

export function useReportReasons(enabled = true) {
  return useQuery({
    queryKey: KEYS.reasons,
    enabled,
    queryFn: () => selectAll<ReportReason>("report_reasons", (q) => q.order("sort_order")),
  })
}

export function useSubmitReport(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ photoId, reasons, forSelf }: { photoId: string; reasons: string[]; forSelf: boolean }) => {
      const { error } = await db().from(gt("reports")).insert({
        photo_id: photoId, reporter_id: memberId, reasons, for_self: forSelf,
      })
      if (error) throw error
    },
    // La photo vient d'être masquée côté serveur : elle disparaît de toutes les listes.
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.photos }),
  })
}

export async function downloadPhoto(photoId: string, quality: "normal" | "hd"): Promise<void> {
  const { url } = await callGalleryFunction<{ url: string }>("gallery-download", { photoId, quality })
  const a = document.createElement("a")
  a.href = url
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function logEvent(event: "login" | "logout" | "visit" | "photo_open" | "search", photoId?: string, details: Record<string, unknown> = {}) {
  if (!galleryClient) return
  void db().rpc(gt("log"), {
    p_event: event,
    p_photo: photoId ?? null,
    p_details: event === "login" || event === "visit" ? { ...details, device: deviceId() } : details,
  })
}

const VISIT_KEY = "sj-galerie-derniere-visite"
const VISIT_INTERVAL = 30 * 60 * 1000

/** Retour sur la galerie avec une session déjà active : « visite », au plus une fois toutes les 30 min par appareil. */
export function logVisit() {
  try {
    const last = Number(localStorage.getItem(VISIT_KEY) ?? 0)
    if (Date.now() - last < VISIT_INTERVAL) return
    localStorage.setItem(VISIT_KEY, String(Date.now()))
  } catch { /* stockage indisponible : on journalise quand même */ }
  logEvent("visit")
}

/** Après une connexion par code : la visite est déjà comptée comme connexion. */
export function markVisited() {
  try { localStorage.setItem(VISIT_KEY, String(Date.now())) } catch { /* stockage indisponible */ }
}

// ── Engagement de confidentialité ─────────────────────────────────────────────

export function useConsentStatus(memberId: string | null) {
  return useQuery({
    queryKey: [...KEYS.consent, memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data: current, error } = await db().from(gt("consent_versions"))
        .select("*").order("version", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!current) return { current: null as ConsentVersion | null, accepted: false }
      const { data: mine } = await db().from(gt("consents"))
        .select("version").eq("member_id", memberId).eq("version", current.version).maybeSingle()
      return { current: current as ConsentVersion, accepted: !!mine }
    },
  })
}

export function useAcceptConsent(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (version: number) => {
      const { error } = await db().from(gt("consents")).insert({ member_id: memberId, version })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gal"] }),
  })
}

// ── Administration ───────────────────────────────────────────────────────────

export function useAdminList<T>(table: string, order: string, enabled = true, ascending = false) {
  return useQuery({
    queryKey: [...KEYS.admin, table],
    enabled,
    queryFn: () => selectAll<T>(table, (q) => q.order(order, { ascending })),
  })
}

export const useMembers = (enabled = true) => useAdminList<GalleryMember>("members", "created_at", enabled)
export const useAccessRequests = (enabled = true) => useAdminList<AccessRequest>("access_requests", "created_at", enabled)
export const useReports = (enabled = true) => useAdminList<GalleryReport>("reports", "created_at", enabled)
export const useAdminComments = (enabled = true) => useAdminList<AdminComment>("comments", "created_at", enabled)
export const useNotifications = (enabled = true) => useAdminList<GalleryNotification>("notifications", "created_at", enabled)
export const useDownloads = (enabled = true) => useAdminList<DownloadEntry>("downloads", "created_at", enabled)
export const useConsentVersions = (enabled = true) => useAdminList<ConsentVersion>("consent_versions", "version", enabled)
export const useAdminEmails = (enabled = true) => useAdminList<{ email: string }>("admin_emails", "email", enabled, true)

/** Journal filtré côté serveur (personne, période, photo, type), 500 lignes maximum. */
export function useActivity(filters: { memberId?: string; photoId?: string; event?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: [...KEYS.admin, "activity", filters],
    queryFn: async (): Promise<ActivityEntry[]> => {
      let q = db().from(gt("activity")).select("*").order("created_at", { ascending: false }).limit(500)
      if (filters.memberId) q = q.eq("member_id", filters.memberId)
      if (filters.photoId) q = q.eq("photo_id", filters.photoId)
      if (filters.event) q = q.like("event", `${filters.event}%`)
      if (filters.from) q = q.gte("created_at", filters.from)
      if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

/** Mise à jour générique d'une table de la galerie par un administrateur. */
export function useAdminUpdate(table: string, invalidate: readonly unknown[][] = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ match, patch }: { match: Record<string, unknown>; patch: Record<string, unknown> }) => {
      let q = db().from(gt(table)).update(patch)
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...KEYS.admin, table] })
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useAdminInsert(table: string, invalidate: readonly unknown[][] = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await db().from(gt(table)).insert(row)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...KEYS.admin, table] })
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useAdminDelete(table: string, invalidate: readonly unknown[][] = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (match: Record<string, unknown>) => {
      let q = db().from(gt(table)).delete()
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...KEYS.admin, table] })
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useAdminAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => callGalleryFunction<{ ok: boolean }>("gallery-admin", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.admin }),
  })
}

export async function revokeSessions(memberId: string): Promise<void> {
  const { error } = await db().rpc(gt("revoke_sessions"), { p_member: memberId })
  if (error) throw error
}

export async function setHomeSelection(ids: string[]): Promise<void> {
  const { error } = await db().rpc(gt("set_home_selection"), { p_ids: ids })
  if (error) throw error
}

/** Suppression définitive (depuis la corbeille) : fichiers puis ligne. */
export async function deletePhotoForever(photo: GalleryPhoto): Promise<void> {
  const { error: storageError } = await galleryClient!.storage.from(GALLERY_BUCKET)
    .remove([photo.thumb_path, photo.display_path, photo.original_path])
  if (storageError) throw storageError
  const { error } = await db().from(gt("photos")).delete().eq("id", photo.id)
  if (error) throw error
}

export async function updatePhoto(id: string, patch: Partial<GalleryPhoto>): Promise<void> {
  const { error } = await db().from(gt("photos")).update(patch).eq("id", id)
  if (error) throw error
}
