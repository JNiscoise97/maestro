import { useState, useEffect } from "react"
import { Check, ChevronDown, ChevronRight, Copy, Images, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { albumService, type AlbumPartage, type AlbumVote } from "@/services/supabase/album"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const QK = ["album_partages"] as const

function usePartages()       { return useQuery({ queryKey: QK, queryFn: () => albumService.listPartages() }) }
function useCreatePartage()  {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ label, code, sequenceId }: { label: string; code: string; sequenceId: string }) =>
      albumService.createPartage(label, code, sequenceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
function useTogglePartage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      albumService.updatePartage(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
function useUpdatePartageLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, label, code }: { id: string; label: string; code: string }) =>
      albumService.updatePartage(id, { label, code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
function useDeletePartage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => albumService.deletePartage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

// ── CopyLink ──────────────────────────────────────────────────────────────────

function CopyLink({ partage }: { partage: AlbumPartage }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/galerie?code=${partage.code}`
  function handle() {
    void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <code className="truncate max-w-48 rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-xs text-foreground">
        {url}
      </code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon-xs" onClick={handle}
            className={cn("shrink-0", copied && "text-vert-vegetal")}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copié !" : "Copier le lien"}</TooltipContent>
      </Tooltip>
    </div>
  )
}

// ── DeleteButton ──────────────────────────────────────────────────────────────

function DeleteButton({ onConfirm, isPending }: { onConfirm: () => void; isPending: boolean }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) return (
    <div className="flex items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon-xs" onClick={() => setConfirming(false)}><X className="size-3.5" /></Button>
      <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={() => { onConfirm(); setConfirming(false) }}>Supprimer</Button>
    </div>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setConfirming(true)}>
          <Trash2 className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Supprimer ce partage</TooltipContent>
    </Tooltip>
  )
}

// ── CreateDialog ──────────────────────────────────────────────────────────────

function CreateDialog() {
  const [open, setOpen]   = useState(false)
  const [label, setLabel] = useState("")
  const [code,  setCode]  = useState("")
  const [seqId, setSeqId] = useState("")
  const { data: sequences = [] } = useEventSequences()
  const create = useCreatePartage()

  function reset() { setLabel(""); setCode(""); setSeqId("") }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !code.trim() || !seqId) return
    try {
      await create.mutateAsync({ label: label.trim(), code, sequenceId: seqId })
      toast.success("Partage créé.")
      reset(); setOpen(false)
    } catch (err: any) {
      if (err?.code === "23505") toast.error("Ce code est déjà utilisé.")
      else toast.error("Erreur lors de la création.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="size-3.5" /> Nouveau partage</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Nouveau lien de partage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ap-label">Nom (pour toi)</FieldLabel>
              <Input id="ap-label" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Ex. Ma sœur" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="ap-seq">Séquence photo</FieldLabel>
              <Select value={seqId} onValueChange={setSeqId}>
                <SelectTrigger><SelectValue placeholder="Choisir une séquence…" /></SelectTrigger>
                <SelectContent>
                  {sequences.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ap-code">Code d'accès</FieldLabel>
              <Input id="ap-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Ex. SOEUR2026" className="font-mono uppercase" required />
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending || !label.trim() || !code.trim() || !seqId}>
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── EditDialog ────────────────────────────────────────────────────────────────

function EditDialog({ entry }: { entry: AlbumPartage }) {
  const [open,  setOpen]  = useState(false)
  const [label, setLabel] = useState(entry.label)
  const [code,  setCode]  = useState(entry.code)
  const update = useUpdatePartageLabel()

  function reset() { setLabel(entry.label); setCode(entry.code) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !code.trim()) return
    try {
      await update.mutateAsync({ id: entry.id, label: label.trim(), code })
      toast.success("Partage mis à jour.")
      setOpen(false)
    } catch (err: any) {
      if (err?.code === "23505") toast.error("Ce code est déjà utilisé.")
      else toast.error("Erreur lors de la mise à jour.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-xs"><Pencil className="size-3.5" /></Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Modifier</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Modifier le partage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ep-label">Nom</FieldLabel>
              <Input id="ep-label" value={label} onChange={e => setLabel(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="ep-code">Code d'accès</FieldLabel>
              <Input id="ep-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase" required />
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={update.isPending || !label.trim() || !code.trim()}>Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── ReactionsPanel ────────────────────────────────────────────────────────────

const EMOJIS: Record<number, string> = { 1: "🙈", 2: "👎🏾", 3: "👍🏾", 4: "❤️" }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60)  return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return "hier"
  if (d < 7)   return `il y a ${d}j`
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <img src={url} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }} onClick={e => e.stopPropagation()} />
    </div>
  )
}

function ReactionsPanel({ entry }: { entry: AlbumPartage }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["partage_reactions", entry.id],
    queryFn: async () => {
      const [photos, result] = await Promise.all([
        albumService.listPhotos(entry.sequenceId),
        albumService.listVotesByPartage(entry.id, entry.sequenceId),
      ])
      return { photos, ...result }
    },
    staleTime: 0,
    refetchInterval: 15_000,
  })

  if (isLoading) return (
    <div className="px-4 py-3 border-t border-border bg-muted/20">
      <div className="flex gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg flex-1" />)}</div>
    </div>
  )

  const { photos = [], tagged = [], legacy = [] } = data ?? {}
  const photoMap = new Map(photos.map(p => [p.id, p]))

  if (!tagged.length && !legacy.length) return (
    <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
      <p className="text-xs text-muted-foreground">Aucune réaction pour l'instant.</p>
      <p className="text-[10px] text-muted-foreground/50">Mise à jour toutes les 15s</p>
    </div>
  )

  function VoteList({ votes, label }: { votes: AlbumVote[]; label?: string }) {
    const sorted = [...votes].sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime())
    const byVoter = new Map<string, AlbumVote[]>()
    sorted.forEach(v => { const l = byVoter.get(v.voterName) ?? []; l.push(v); byVoter.set(v.voterName, l) })

    return (
      <div className="space-y-4">
        {label && <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>}
        {[...byVoter.entries()].map(([name, voterVotes]) => {
          const counts = [4, 3, 2, 1].map(r => ({ r, n: voterVotes.filter(v => v.rating === r).length })).filter(x => x.n > 0)
          return (
            <div key={name}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-foreground">{name}</p>
                <div className="flex gap-1.5">
                  {counts.map(({ r, n }) => (
                    <span key={r} className="text-xs text-muted-foreground">{EMOJIS[r]} {n}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {voterVotes.map(vote => {
                  const photo = photoMap.get(vote.photoId)
                  if (!photo) return null
                  return (
                    <div key={`${vote.photoId}-${vote.votedAt}`} className="flex flex-col items-center gap-0.5" style={{ width: 56 }}>
                      <div className="relative size-14 rounded-lg overflow-hidden shrink-0 cursor-zoom-in" onClick={() => setLightboxUrl(photo.url)}>
                        <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 right-0.5 text-sm leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
                          {EMOJIS[vote.rating]}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 tabular-nums text-center leading-tight">
                        {relativeTime(vote.votedAt)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-4">
      {tagged.length > 0  && <VoteList votes={tagged} />}
      {legacy.length > 0  && <VoteList votes={legacy} label="Avant migration (non attribués)" />}
      {lastUpdate && (
        <p className="text-[10px] text-muted-foreground/50 text-right">
          Mis à jour à {lastUpdate} · toutes les 15s
        </p>
      )}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function PartageRow({ entry }: { entry: AlbumPartage }) {
  const [open,    setOpen]    = useState(false)
  const toggle    = useTogglePartage()
  const deletePar = useDeletePartage()
  const { data: sequences = [] } = useEventSequences()
  const seqName = sequences.find(s => s.id === entry.sequenceId)?.name ?? "—"

  return (
    <div>
      <div className="flex flex-col gap-1.5 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{entry.label}</p>
            <p className="text-xs text-muted-foreground">{seqName}</p>
          </div>
          <Badge variant="outline" className={cn("shrink-0 text-[10px]", entry.active ? "border-vert-vegetal/40 text-vert-vegetal" : "text-muted-foreground")}>
            {entry.active ? "Actif" : "Inactif"}
          </Badge>
          <Switch
            checked={entry.active}
            onCheckedChange={v => toggle.mutate({ id: entry.id, active: v })}
            className="shrink-0"
          />
          <EditDialog entry={entry} />
          <DeleteButton isPending={deletePar.isPending} onConfirm={() => {
            deletePar.mutate(entry.id, { onSuccess: () => toast.success("Partage supprimé.") })
          }} />
        </div>
        <CopyLink partage={entry} />
      </div>
      {open && <ReactionsPanel entry={entry} />}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function AlbumPartagesManager() {
  const { data: entries, isLoading } = usePartages()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Images className="size-4 text-muted-foreground" />
            Partages photos publics
          </CardTitle>
          <CreateDialog />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !entries?.length ? (
          <p className="text-sm text-muted-foreground">
            Aucun partage. Crée un lien pour partager une galerie avec un code.
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {entries.map(e => <PartageRow key={e.id} entry={e} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
