import { useState } from "react"
import { Trash2, Plus, ChevronDown, Users } from "lucide-react"

import type { Prospect, ProspectStatus } from "@/services/supabase/prospects"
import { useProspects, useCreateProspect, useUpdateProspect, useDeleteProspect } from "@/hooks/queries/use-prospects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ── Constantes ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string }> = {
  pending:    { label: "Pas encore réfléchi",        color: "bg-muted text-muted-foreground" },
  no:         { label: "On ne les invitera pas",      color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  next_event: { label: "Pour un prochain événement", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  invite:     { label: "On les invite !",            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
}

const STATUS_ORDER: ProspectStatus[] = ["pending", "invite", "next_event", "no"]

type Filter = "all" | ProspectStatus

// ── Formulaire d'ajout rapide ──────────────────────────────────────────────────

function AddProspectForm() {
  const [fullName, setFullName]   = useState("")
  const [groupName, setGroupName] = useState("")
  const create = useCreateProspect()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    create.mutate(
      { fullName: fullName.trim(), groupName: groupName.trim() || null },
      { onSuccess: () => { setFullName(""); setGroupName("") } }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card px-4 py-3">
      <div className="flex-1 min-w-40 space-y-1">
        <label className="text-xs text-muted-foreground">Prénom &amp; nom</label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Marie Dupont"
          required
        />
      </div>
      <div className="w-44 space-y-1">
        <label className="text-xs text-muted-foreground">Famille / contexte</label>
        <Input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Cousins Jordan…"
        />
      </div>
      <Button type="submit" size="sm" disabled={create.isPending || !fullName.trim()}>
        <Plus className="size-4" />
        Ajouter
      </Button>
    </form>
  )
}

// ── Carte prospect ─────────────────────────────────────────────────────────────

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes]               = useState(prospect.notes ?? "")
  const update = useUpdateProspect()
  const remove = useDeleteProspect()

  function saveNotes() {
    setEditingNotes(false)
    const trimmed = notes.trim() || null
    if (trimmed !== prospect.notes) {
      update.mutate({ id: prospect.id, patch: { notes: trimmed } })
    }
  }

  function changeStatus(status: ProspectStatus) {
    update.mutate({ id: prospect.id, patch: { status } })
  }

  return (
    <div className="rounded-2xl border bg-card px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug">{prospect.fullName}</p>
          {prospect.groupName && (
            <p className="text-xs text-muted-foreground">{prospect.groupName}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
                  STATUS_CONFIG[prospect.status].color
                )}
              >
                {STATUS_CONFIG[prospect.status].label}
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_ORDER.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={prospect.status === s ? "font-medium" : ""}
                >
                  {STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => remove.mutate(prospect.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {editingNotes ? (
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          autoFocus
          rows={2}
          className="text-xs"
          placeholder="Notes…"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingNotes(true)}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {prospect.notes ?? <span className="italic">Ajouter une note…</span>}
        </button>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<Filter, string> = {
  all:        "Tous",
  pending:    "À décider",
  invite:     "Invités",
  next_event: "Prochain événement",
  no:         "Écartés",
}

export function AtelierTab() {
  const { data: prospects = [], isLoading } = useProspects()
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = filter === "all" ? prospects : prospects.filter((p) => p.status === filter)

  const counts: Record<Filter, number> = {
    all:        prospects.length,
    pending:    prospects.filter((p) => p.status === "pending").length,
    invite:     prospects.filter((p) => p.status === "invite").length,
    next_event: prospects.filter((p) => p.status === "next_event").length,
    no:         prospects.filter((p) => p.status === "no").length,
  }

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Atelier invités</h2>
        <p className="text-sm text-muted-foreground">
          Liste de réflexion — les candidats qu'on n'a pas encore tranchés.
        </p>
      </div>

      <AddProspectForm />

      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === f
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {FILTER_LABELS[f]}
            {counts[f] > 0 && (
              <span className="ml-1.5 tabular-nums">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filter === "all" ? "Aucun candidat pour l'instant" : "Aucun candidat dans cette catégorie"}
          description={filter === "all" ? "Ajoutez des personnes via le formulaire ci-dessus." : undefined}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((p) => (
            <ProspectCard key={p.id} prospect={p} />
          ))}
        </div>
      )}
    </div>
  )
}
