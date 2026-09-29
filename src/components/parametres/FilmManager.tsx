import { useState } from "react"
import { Eye, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useFilmVideos, useCreateFilmVideo, useUpdateFilmVideo, useDeleteFilmVideo,
  useFilmGroups, useCreateFilmGroup, useUpdateFilmGroup, useDeleteFilmGroup,
  useFilmViews,
} from "@/hooks/queries/use-film"
import type { FilmGroup, FilmVideo } from "@/services/supabase/film"

// ── Vidéos ────────────────────────────────────────────────────────────────────

const EMPTY_VIDEO = { title: "", url: "", sortOrder: 0 }

function VideoRow({ video, onSaved }: { video: FilmVideo; onSaved: () => void }) {
  const update    = useUpdateFilmVideo()
  const deleteVid = useDeleteFilmVideo()
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState({ title: video.title, url: video.url })

  async function handleSave() {
    try {
      await update.mutateAsync({ id: video.id, patch: { title: draft.title.trim(), url: draft.url.trim() } })
      setEditing(false)
      toast.success("Vidéo mise à jour.")
      onSaved()
    } catch {
      toast.error("Erreur lors de la mise à jour.")
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la vidéo "${video.title}" ?`)) return
    try {
      await deleteVid.mutateAsync(video.id)
      toast.success("Vidéo supprimée.")
    } catch {
      toast.error("Erreur lors de la suppression.")
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Titre</label>
          <Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Teaser" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">URL Supabase Storage</label>
          <Input value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} placeholder="https://xxx.supabase.co/storage/v1/object/public/..." className="font-mono text-xs" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!draft.title.trim() || !draft.url.trim() || update.isPending}>
            Sauvegarder
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft({ title: video.title, url: video.url }) }}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3 bg-card group">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{video.title}</p>
        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{video.url}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={handleDelete} disabled={deleteVid.isPending} className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function VideosSection() {
  const { data: videos = [] } = useFilmVideos()
  const create               = useCreateFilmVideo()
  const [adding, setAdding]  = useState(false)
  const [draft, setDraft]    = useState(EMPTY_VIDEO)

  async function handleCreate() {
    try {
      await create.mutateAsync({ ...draft, title: draft.title.trim(), url: draft.url.trim(), sortOrder: videos.length })
      setDraft(EMPTY_VIDEO)
      setAdding(false)
      toast.success("Vidéo ajoutée.")
    } catch {
      toast.error("Erreur lors de l'ajout.")
    }
  }

  return (
    <div className="space-y-3">
      {videos.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">Aucune vidéo configurée.</p>
      )}
      {videos.map(v => <VideoRow key={v.id} video={v} onSaved={() => {}} />)}

      {adding ? (
        <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Titre</label>
            <Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Teaser" autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL Supabase Storage</label>
            <Input value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} placeholder="https://xxx.supabase.co/storage/v1/object/public/..." className="font-mono text-xs" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!draft.title.trim() || !draft.url.trim() || create.isPending}>
              Ajouter
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setDraft(EMPTY_VIDEO) }}>
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="size-3.5" /> Ajouter une vidéo
        </button>
      )}
    </div>
  )
}

// ── Groupes ────────────────────────────────────────────────────────────────────

const EMPTY_GROUP = { name: "", code: "", introMessage: "", sortOrder: 0 }

function GroupRow({ group }: { group: FilmGroup }) {
  const update    = useUpdateFilmGroup()
  const deleteGrp = useDeleteFilmGroup()
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState({ name: group.name, code: group.code, introMessage: group.introMessage ?? "" })

  function openPreview() {
    window.open(`${window.location.origin}/film?preview=${group.id}`, "_blank", "noopener")
  }

  async function handleSave() {
    try {
      await update.mutateAsync({ id: group.id, patch: { name: draft.name.trim(), code: draft.code.trim(), introMessage: draft.introMessage.trim() || null } })
      setEditing(false)
      toast.success("Groupe mis à jour.")
    } catch {
      toast.error("Erreur lors de la mise à jour.")
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le groupe "${group.name}" et tous ses logs de visionnage ?`)) return
    try {
      await deleteGrp.mutateAsync(group.id)
      toast.success("Groupe supprimé.")
    } catch {
      toast.error("Erreur lors de la suppression.")
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nom du groupe</label>
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Témoins" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Code d'accès</label>
            <Input value={draft.code} onChange={e => setDraft(d => ({ ...d, code: e.target.value }))} placeholder="temoin2025" className="font-mono" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Message d'intro
            <span className="ml-2 text-muted-foreground/50 font-normal">**texte** pour mettre en gras</span>
          </label>
          <textarea
            value={draft.introMessage}
            onChange={e => setDraft(d => ({ ...d, introMessage: e.target.value }))}
            placeholder={"Chers témoins,\n\n**Merci** d'être là…"}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!draft.name.trim() || !draft.code.trim() || update.isPending}>
            Sauvegarder
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft({ name: group.name, code: group.code, introMessage: group.introMessage ?? "" }) }}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3 bg-card group">
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{group.name}</span>
          <code className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground font-mono">{group.code}</code>
        </div>
        {group.introMessage && (
          <p className="text-xs text-muted-foreground line-clamp-2">{group.introMessage}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={openPreview} title="Voir ce que voit ce groupe"
          className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Eye className="size-3.5" />
        </button>
        <button type="button" onClick={() => setEditing(true)}
          className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={handleDelete} disabled={deleteGrp.isPending}
          className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function GroupsSection() {
  const { data: groups = [] } = useFilmGroups()
  const create               = useCreateFilmGroup()
  const [adding, setAdding]  = useState(false)
  const [draft, setDraft]    = useState(EMPTY_GROUP)

  async function handleCreate() {
    try {
      await create.mutateAsync({ ...draft, name: draft.name.trim(), code: draft.code.trim(), introMessage: draft.introMessage.trim() || null, sortOrder: groups.length })
      setDraft(EMPTY_GROUP)
      setAdding(false)
      toast.success("Groupe créé.")
    } catch {
      toast.error("Erreur lors de la création.")
    }
  }

  return (
    <div className="space-y-3">
      {groups.map(g => <GroupRow key={g.id} group={g} />)}

      {adding ? (
        <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nom du groupe</label>
              <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Témoins" autoFocus />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Code d'accès</label>
              <Input value={draft.code} onChange={e => setDraft(d => ({ ...d, code: e.target.value }))} placeholder="temoin2025" className="font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Message d'intro
              <span className="ml-2 text-muted-foreground/50 font-normal">**texte** pour mettre en gras</span>
            </label>
            <textarea
              value={draft.introMessage}
              onChange={e => setDraft(d => ({ ...d, introMessage: e.target.value }))}
              placeholder={"Chers témoins,\n\n**Merci** d'être là…"}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!draft.name.trim() || !draft.code.trim() || create.isPending}>
              Créer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setDraft(EMPTY_GROUP) }}>
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="size-3.5" /> Ajouter un groupe
        </button>
      )}
    </div>
  )
}

// ── Stats visionnages ─────────────────────────────────────────────────────────

function ViewsSection() {
  const { data: views = [], refetch, isFetching } = useFilmViews()

  if (views.length === 0 && !isFetching) {
    return <p className="text-sm text-muted-foreground">Aucun visionnage enregistré pour l'instant.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{views.length} visionnage{views.length > 1 ? "s" : ""}</span>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`size-3 ${isFetching ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground bg-muted/30">
              <th className="px-3 py-2 text-left font-medium">Prénom</th>
              <th className="px-3 py-2 text-left font-medium">Groupe</th>
              <th className="px-3 py-2 text-left font-medium">Date & heure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {views.map(v => (
              <tr key={v.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{v.viewerName}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">{v.groupName}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs whitespace-nowrap">
                  {new Date(v.playedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export function FilmManager() {
  return (
    <div className="space-y-8">
      {/* Lien */}
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Lien à partager</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{window.location.origin}/film</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`${window.location.origin}/film`, "_blank", "noopener")}>
            <Eye className="size-3.5 mr-1.5" /> Prévisualiser
          </Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/film`); toast.success("Lien copié !") }}>
            Copier le lien
          </Button>
        </div>
      </div>

      {/* Vidéos */}
      <div>
        <h3 className="font-heading text-base font-medium mb-3">Vidéos</h3>
        <VideosSection />
      </div>

      {/* Groupes */}
      <div>
        <h3 className="font-heading text-base font-medium mb-3">Groupes d'accès</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Survole un groupe et clique sur <Eye className="size-3 inline" /> pour voir exactement ce que ce groupe voit.
        </p>
        <GroupsSection />
      </div>

      {/* Stats */}
      <div>
        <h3 className="font-heading text-base font-medium mb-3">Visionnages</h3>
        <ViewsSection />
      </div>
    </div>
  )
}
