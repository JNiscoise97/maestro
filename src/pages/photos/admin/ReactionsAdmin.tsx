import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Heart, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  useAdminComments, useAdminList, useAlbums, useMembers, usePhotos, useSignedUrlsByChunks,
} from "@/features/gallery/api"
import type { GalleryMember, GalleryPhoto } from "@/features/gallery/types"
import { cn } from "@/lib/utils"
import { memberName } from "./format"

type Reaction = { photo_id: string; member_id: string; emoji: string; created_at: string }
type Favorite = { photo_id: string; member_id: string; created_at: string }
type View = "photos" | "personnes"

const PAGE = 40

/**
 * Réactions, favoris et commentaires — vue de synthèse réservée aux administrateurs
 * (les invités ne voient que des totaux anonymes).
 *   · Par photo : les plus appréciées en tête, et qui a réagi avec quoi.
 *   · Par personne : l'activité de chaque invité et les photos qu'il a aimées.
 */
export function ReactionsAdmin() {
  const { data: photos = [] } = usePhotos()
  const { data: albums = [] } = useAlbums()
  const { data: members = [] } = useMembers()
  const { data: reactions = [] } = useAdminList<Reaction>("reactions", "created_at")
  const { data: favorites = [] } = useAdminList<Favorite>("favorites", "created_at")
  const { data: comments = [] } = useAdminComments()
  const [view, setView] = useState<View>("photos")
  const [albumFilter, setAlbumFilter] = useState("")
  const [query, setQuery] = useState("")

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos])
  const albumName = (id: string) => albums.find((a) => a.id === id)?.name ?? ""

  // Activité regroupée par photo.
  const byPhoto = useMemo(() => {
    const map = new Map<string, { reactions: Reaction[]; favorites: Favorite[]; comments: typeof comments }>()
    const entry = (id: string) => {
      if (!map.has(id)) map.set(id, { reactions: [], favorites: [], comments: [] })
      return map.get(id)!
    }
    reactions.forEach((r) => entry(r.photo_id).reactions.push(r))
    favorites.forEach((f) => entry(f.photo_id).favorites.push(f))
    comments.forEach((c) => entry(c.photo_id).comments.push(c))
    return map
  }, [reactions, favorites, comments])

  // Activité regroupée par personne.
  const byMember = useMemo(() => {
    const map = new Map<string, { reactions: Reaction[]; favorites: Favorite[]; comments: typeof comments }>()
    const entry = (id: string) => {
      if (!map.has(id)) map.set(id, { reactions: [], favorites: [], comments: [] })
      return map.get(id)!
    }
    reactions.forEach((r) => entry(r.member_id).reactions.push(r))
    favorites.forEach((f) => entry(f.member_id).favorites.push(f))
    comments.forEach((c) => entry(c.member_id).comments.push(c))
    return map
  }, [reactions, favorites, comments])

  const q = query.trim().toLowerCase()
  const photoRows = [...byPhoto.entries()]
    .map(([id, a]) => ({ photo: photoById.get(id), ...a, score: a.reactions.length + a.favorites.length + a.comments.length }))
    .filter((r): r is typeof r & { photo: GalleryPhoto } => !!r.photo)
    .filter((r) => !albumFilter || r.photo.album_id === albumFilter)
    .filter((r) => !q || r.photo.code.toLowerCase().includes(q))
    .sort((a, b) => b.score - a.score || a.photo.number - b.photo.number)

  const memberRows = [...byMember.entries()]
    .map(([id, a]) => ({ member: memberById.get(id), ...a, score: a.reactions.length + a.favorites.length + a.comments.length }))
    .filter((r): r is typeof r & { member: GalleryMember } => !!r.member)
    .filter((r) => !q || `${memberName(r.member)} ${r.member.email}`.toLowerCase().includes(q))
    .sort((a, b) => b.score - a.score || memberName(a.member).localeCompare(memberName(b.member), "fr"))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Réactions", value: reactions.length },
          { label: "Favoris", value: favorites.length },
          { label: "Commentaires", value: comments.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {view === "photos" ? `Photos appréciées (${photoRows.length})` : `Personnes actives (${memberRows.length})`}
            </CardTitle>
            <div className="flex overflow-hidden rounded-md border border-input text-sm">
              {([["photos", "Par photo"], ["personnes", "Par personne"]] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => { setView(v); setQuery("") }} aria-pressed={view === v}
                  className={cn("px-3 py-1", view === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input className="h-8 w-56 text-base sm:text-sm" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={view === "photos" ? "Photo SJ-0042" : "Nom ou e-mail"} />
            {view === "photos" && (
              <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {view === "photos" ? (
            <PhotoList rows={photoRows} memberById={memberById} albumName={albumName} />
          ) : (
            <MemberList rows={memberRows} photoById={photoById} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Totaux par émoji, du plus fréquent au moins fréquent. */
function emojiCounts(reactions: Reaction[]): [string, number][] {
  const map = new Map<string, number>()
  reactions.forEach((r) => map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1))
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

type Activity = { reactions: Reaction[]; favorites: Favorite[]; comments: { id: string; photo_id: string; member_id: string; body: string; hidden: boolean; created_at: string }[] }

function PhotoList({ rows, memberById, albumName }: {
  rows: (Activity & { photo: GalleryPhoto; score: number })[]
  memberById: Map<string, GalleryMember>
  albumName: (id: string) => string
}) {
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState<string | null>(null)
  const visible = rows.slice(0, shown)
  const urls = useSignedUrlsByChunks(visible.map((r) => r.photo.thumb_path), PAGE)
  const name = (id: string) => memberName(memberById.get(id))

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Aucune réaction pour l'instant.</p>
  return (
    <ul className="divide-y divide-border">
      {visible.map((r, i) => {
        const isOpen = open === r.photo.id
        return (
          <li key={r.photo.id} className="py-2">
            <button type="button" onClick={() => setOpen(isOpen ? null : r.photo.id)} className="flex w-full items-center gap-3 text-left">
              <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {urls.get(r.photo.thumb_path) && <img src={urls.get(r.photo.thumb_path)} alt={r.photo.code} className="max-h-full max-w-full object-contain" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tabular-nums">{r.photo.code} <span className="font-normal text-muted-foreground">· {albumName(r.photo.album_id)}</span></p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  {emojiCounts(r.reactions).map(([e, n]) => <span key={e}>{e} {n}</span>)}
                  {r.favorites.length > 0 && <span className="flex items-center gap-0.5 text-bordeaux"><Heart className="size-3.5" fill="currentColor" /> {r.favorites.length}</span>}
                  {r.comments.length > 0 && <span className="flex items-center gap-0.5 text-muted-foreground"><MessageCircle className="size-3.5" /> {r.comments.length}</span>}
                </p>
              </div>
              {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="ml-9 mt-2 space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                {emojiCounts(r.reactions).map(([e]) => (
                  <p key={e}><span className="mr-1">{e}</span>{r.reactions.filter((x) => x.emoji === e).map((x) => name(x.member_id)).join(", ")}</p>
                ))}
                {r.favorites.length > 0 && (
                  <p><span className="mr-1">❤️ favori</span>{r.favorites.map((f) => name(f.member_id)).join(", ")}</p>
                )}
                {r.comments.map((c) => (
                  <p key={c.id} className={cn(c.hidden && "text-muted-foreground line-through")}>
                    💬 <b>{name(c.member_id)}</b> : {c.body}
                  </p>
                ))}
              </div>
            )}
          </li>
        )
      })}
      {shown < rows.length && (
        <li className="pt-3"><Button size="sm" variant="outline" onClick={() => setShown((n) => n + PAGE)}>Afficher plus ({rows.length - shown})</Button></li>
      )}
    </ul>
  )
}

function MemberList({ rows, photoById }: {
  rows: (Activity & { member: GalleryMember; score: number })[]
  photoById: Map<string, GalleryPhoto>
}) {
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState<string | null>(null)
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Aucune activité pour l'instant.</p>
  return (
    <ul className="divide-y divide-border">
      {rows.slice(0, shown).map((r) => {
        const isOpen = open === r.member.id
        return (
          <li key={r.member.id} className="py-2">
            <button type="button" onClick={() => setOpen(isOpen ? null : r.member.id)} className="flex w-full items-center gap-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{memberName(r.member)}</p>
                <p className="text-xs text-muted-foreground">
                  {r.reactions.length} réaction(s) · {r.favorites.length} favori(s) · {r.comments.length} commentaire(s)
                  {r.member.last_seen_at && ` · vu le ${new Date(r.member.last_seen_at).toLocaleDateString("fr-FR")}`}
                </p>
              </div>
              <p className="hidden text-sm sm:block">{emojiCounts(r.reactions).slice(0, 4).map(([e, n]) => `${e} ${n}`).join("  ")}</p>
              {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </button>
            {isOpen && <MemberDetail activity={r} photoById={photoById} />}
          </li>
        )
      })}
      {shown < rows.length && (
        <li className="pt-3"><Button size="sm" variant="outline" onClick={() => setShown((n) => n + PAGE)}>Afficher plus ({rows.length - shown})</Button></li>
      )}
    </ul>
  )
}

/** Photos aimées par une personne : miniature avec ses émojis, son favori et ses commentaires. */
function MemberDetail({ activity, photoById }: { activity: Activity; photoById: Map<string, GalleryPhoto> }) {
  const ids = [...new Set([...activity.reactions, ...activity.favorites, ...activity.comments].map((a) => a.photo_id))]
  const items = ids.map((id) => photoById.get(id)).filter((p): p is GalleryPhoto => !!p).sort((a, b) => a.number - b.number)
  const urls = useSignedUrlsByChunks(items.map((p) => p.thumb_path), PAGE)
  return (
    <div className="ml-1 mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
      {items.map((p) => {
        const emojis = activity.reactions.filter((r) => r.photo_id === p.id).map((r) => r.emoji).join("")
        const fav = activity.favorites.some((f) => f.photo_id === p.id)
        const com = activity.comments.filter((c) => c.photo_id === p.id)
        return (
          <div key={p.id} className="space-y-0.5 text-[11px]" title={com.map((c) => c.body).join("\n") || undefined}>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded bg-muted">
              {urls.get(p.thumb_path) && <img src={urls.get(p.thumb_path)} alt={p.code} className="max-h-full max-w-full object-contain" loading="lazy" />}
              {fav && <Heart className="absolute right-1 top-1 size-3.5 text-bordeaux drop-shadow" fill="currentColor" />}
            </div>
            <p className="truncate tabular-nums">{p.code} {emojis}{com.length > 0 && " 💬"}</p>
          </div>
        )
      })}
    </div>
  )
}
