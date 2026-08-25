import { useState } from "react"
import { Lightbulb, Plus, Trash2 } from "lucide-react"

import type { Idea, IdeaSource, IdeaStatus } from "@/types/domain"
import { useIdeas, useCreateIdea, useUpdateIdea, useDeleteIdea } from "@/hooks/queries/use-ideas"
import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Constantes ─────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<IdeaSource, string> = {
  us: "Nous",
  pinterest: "Pinterest",
  social: "Réseaux / Proches",
  other: "Autre",
}

const SOURCE_COLORS: Record<IdeaSource, string> = {
  us: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  pinterest: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  social: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  other: "bg-muted text-muted-foreground",
}

const STATUS_LABELS: Record<IdeaStatus, string> = {
  to_study: "À étudier",
  keeping: "On garde !",
  discarded: "On passe",
  in_progress: "En cours",
}

const STATUS_COLORS: Record<IdeaStatus, string> = {
  to_study: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  keeping: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  discarded: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  in_progress: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
}

const STATUS_ORDER: IdeaStatus[] = ["to_study", "in_progress", "keeping", "discarded"]
const SOURCES: IdeaSource[] = ["us", "pinterest", "social", "other"]
const STATUSES: IdeaStatus[] = ["to_study", "in_progress", "keeping", "discarded"]

// ── Sheet création / édition ───────────────────────────────────────────────────

interface IdeaSheetProps {
  idea?: Idea | null
  open: boolean
  onClose: () => void
}

function IdeaSheet({ idea, open, onClose }: IdeaSheetProps) {
  const create = useCreateIdea()
  const update = useUpdateIdea()
  const del = useDeleteIdea()

  const [title, setTitle] = useState(idea?.title ?? "")
  const [description, setDescription] = useState(idea?.description ?? "")
  const [source, setSource] = useState<IdeaSource>(idea?.source ?? "us")
  const [sourceDetail, setSourceDetail] = useState(idea?.sourceDetail ?? "")
  const [category, setCategory] = useState(idea?.category ?? "")
  const [status, setStatus] = useState<IdeaStatus>(idea?.status ?? "to_study")
  const [notes, setNotes] = useState(idea?.notes ?? "")

  // Reset quand l'idée change
  function resetToIdea(i?: Idea | null) {
    setTitle(i?.title ?? "")
    setDescription(i?.description ?? "")
    setSource(i?.source ?? "us")
    setSourceDetail(i?.sourceDetail ?? "")
    setCategory(i?.category ?? "")
    setStatus(i?.status ?? "to_study")
    setNotes(i?.notes ?? "")
  }

  function handleOpenChange(v: boolean) {
    if (!v) { resetToIdea(idea); onClose() }
  }

  // Sync si l'idée change (ex. ouverture sur une autre idée)
  const ideaKey = idea?.id ?? "__new__"

  async function handleSave() {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      source,
      sourceDetail: sourceDetail.trim() || null,
      category: category.trim() || null,
      status,
      notes: notes.trim() || null,
    }
    if (idea) {
      await update.mutateAsync({ id: idea.id, patch: payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  async function handleDelete() {
    if (!idea) return
    await del.mutateAsync(idea.id)
    onClose()
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto flex flex-col gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>{idea ? "Modifier l'idée" : "Nouvelle idée"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1">
          {/* Titre */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Titre *</label>
            <input
              key={`${ideaKey}-title`}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: Arche de pampa pour la cérémonie"
              defaultValue={idea?.title ?? ""}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea
              key={`${ideaKey}-desc`}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Décris l'idée en quelques mots…"
              rows={3}
              defaultValue={idea?.description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
              <Select value={source} onValueChange={(v) => setSource(v as IdeaSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Précision source</label>
              <input
                key={`${ideaKey}-sd`}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder={source === "social" ? "Partagé par…" : source === "pinterest" ? "URL ou board" : ""}
                defaultValue={idea?.sourceDetail ?? ""}
                onChange={(e) => setSourceDetail(e.target.value)}
              />
            </div>
          </div>

          {/* Catégorie & Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
              <input
                key={`${ideaKey}-cat`}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Déco, Traiteur, Animation…"
                defaultValue={idea?.category ?? ""}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
              <Select value={status} onValueChange={(v) => setStatus(v as IdeaStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes / Décision</label>
            <textarea
              key={`${ideaKey}-notes`}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Résultat de la réflexion, raison de la décision…"
              rows={3}
              defaultValue={idea?.notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t mt-4">
          {idea && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive mr-auto"
              onClick={handleDelete}
              disabled={del.isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="ml-auto">Annuler</Button>
          <Button onClick={handleSave} disabled={!title.trim() || isPending}>
            {idea ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Carte idée ─────────────────────────────────────────────────────────────────

function IdeaCard({ idea, onClick }: { idea: Idea; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-border/80 transition-all space-y-2"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 font-medium text-sm leading-snug">{idea.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[idea.status]}`}>
          {STATUS_LABELS[idea.status]}
        </span>
      </div>

      {idea.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[idea.source]}`}>
          {SOURCE_LABELS[idea.source]}
          {idea.sourceDetail && ` · ${idea.sourceDetail}`}
        </span>
        {idea.category && (
          <span className="rounded-full px-2 py-0.5 text-[10px] bg-muted text-muted-foreground">
            {idea.category}
          </span>
        )}
      </div>

      {idea.notes && (
        <p className="text-xs text-muted-foreground/70 italic line-clamp-1 border-t border-border/50 pt-2">
          {idea.notes}
        </p>
      )}
    </button>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

type StatusFilter = "all" | IdeaStatus

export function IdeasPage() {
  const { data: ideas = [], isLoading } = useIdeas()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sourceFilter, setSourceFilter] = useState<IdeaSource | "all">("all")
  const [sheetIdea, setSheetIdea] = useState<Idea | null | undefined>(undefined)

  const filtered = ideas
    .filter((i) => statusFilter === "all" || i.status === statusFilter)
    .filter((i) => sourceFilter === "all" || i.source === sourceFilter)

  const countByStatus = (s: IdeaStatus) => ideas.filter((i) => i.status === s).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Idées"
        description="Toutes vos inspirations en un endroit. Étudiez-les et décidez ce que vous en faites."
        actions={
          <Button onClick={() => setSheetIdea(null)}>
            <Plus className="size-4" />
            Nouvelle idée
          </Button>
        }
      />

      {/* ── Stats ── */}
      {!isLoading && ideas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {STATUS_ORDER.map((s) => (
            <div key={s} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${STATUS_COLORS[s]}`}>
              <span className="font-bold tabular-nums">{countByStatus(s)}</span>
              <span>{STATUS_LABELS[s]}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filtres statut ── */}
      {!isLoading && ideas.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Tous <span className="ml-1.5 text-xs opacity-70">{ideas.length}</span>
            </Button>
            {STATUS_ORDER.map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABELS[s]}
                <span className="ml-1.5 text-xs opacity-70">{countByStatus(s)}</span>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", ...SOURCES] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sourceFilter === s
                    ? "bg-foreground text-background"
                    : s === "all"
                    ? "bg-muted text-muted-foreground hover:bg-muted/60"
                    : `${SOURCE_COLORS[s]} opacity-${sourceFilter === "all" || sourceFilter === s ? "100" : "60"}`
                }`}
              >
                {s === "all" ? "Toutes les sources" : SOURCE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Contenu ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Lightbulb className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {ideas.length === 0
              ? "Aucune idée pour l'instant. Ajoutez votre première inspiration !"
              : "Aucune idée ne correspond à ces filtres."}
          </p>
          {ideas.length === 0 && (
            <Button onClick={() => setSheetIdea(null)}>
              <Plus className="size-4" /> Ajouter une idée
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onClick={() => setSheetIdea(idea)} />
          ))}
        </div>
      )}

      {/* Sheet */}
      {sheetIdea !== undefined && (
        <IdeaSheet
          idea={sheetIdea}
          open
          onClose={() => setSheetIdea(undefined)}
        />
      )}
    </div>
  )
}
