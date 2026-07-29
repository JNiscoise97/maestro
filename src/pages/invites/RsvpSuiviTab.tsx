import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"

import type { Attendance, RsvpResponse, Wave } from "@/services/rsvp.service"
import { useRsvpResponses, useMarkRsvpProcessed } from "@/hooks/queries/use-rsvp"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ── Badges ────────────────────────────────────────────────────────────────────

const ATTENDANCE_CONFIG: Record<Attendance, { label: string; className: string }> = {
  yes:          { label: "Présent·e",        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  probably:     { label: "Probablement",      className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  "probably-not": { label: "Peu probable",   className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  no:           { label: "Absent·e",          className: "bg-muted text-muted-foreground" },
}

function AttendanceBadge({ value }: { value: Attendance }) {
  const { label, className } = ATTENDANCE_CONFIG[value] ?? ATTENDANCE_CONFIG.no
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

const WAVE_LABEL: Record<Wave, string> = {
  annonce:    "Annonce",
  invitation: "Invitation",
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso))
}

// ── Ligne ─────────────────────────────────────────────────────────────────────

function RsvpRow({ response }: { response: RsvpResponse }) {
  const mark = useMarkRsvpProcessed()

  async function toggle() {
    await mark.mutateAsync({ id: response.id, processed: !response.processed })
    toast.success(response.processed ? "Marqué comme non traité." : "Marqué comme traité.")
  }

  return (
    <div className={`grid grid-cols-[1fr_auto] gap-4 rounded-xl border p-4 transition-colors ${response.processed ? "border-border/40 bg-muted/30 opacity-60" : "border-border bg-card"}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{response.name}</span>
          <AttendanceBadge value={response.attendance} />
          <Badge variant="outline" className="text-xs">{WAVE_LABEL[response.wave]}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate(response.createdAt)}</span>
        </div>

        {(response.adults != null || response.children != null) && (
          <p className="text-sm text-muted-foreground">
            {[
              response.adults != null && `${response.adults} adulte${response.adults > 1 ? "s" : ""}`,
              response.children != null && response.children > 0 && `${response.children} enfant${response.children > 1 ? "s" : ""}`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}

        {response.cityOfOrigin && (
          <p className="text-sm text-muted-foreground">Vient de : {response.cityOfOrigin}</p>
        )}

        {response.needsAccommodation != null && (
          <p className="text-sm text-muted-foreground">
            Hébergement : {response.needsAccommodation ? "nécessaire" : "non nécessaire"}
          </p>
        )}

        {response.daysAttending && response.daysAttending.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Jours : {response.daysAttending.join(", ")}
          </p>
        )}

        {response.dietaryConstraints && (
          <p className="text-sm text-muted-foreground">Régime : {response.dietaryConstraints}</p>
        )}

        {response.message && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm italic text-foreground">
            « {response.message} »
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5 pt-0.5">
        <Checkbox
          checked={response.processed}
          onCheckedChange={toggle}
          disabled={mark.isPending}
          aria-label="Marquer comme traité"
        />
        <span className="text-[10px] text-muted-foreground">Traité</span>
      </div>
    </div>
  )
}

// ── Onglet principal ──────────────────────────────────────────────────────────

type Filter = "all" | "annonce" | "invitation" | "unprocessed"

export function RsvpSuiviTab() {
  const { data: responses, isLoading } = useRsvpResponses()
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = (responses ?? []).filter((r) => {
    if (filter === "annonce")     return r.wave === "annonce"
    if (filter === "invitation")  return r.wave === "invitation"
    if (filter === "unprocessed") return !r.processed
    return true
  })

  const unprocessedCount = (responses ?? []).filter((r) => !r.processed).length

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    )
  }

  if (!responses || responses.length === 0) {
    return <EmptyState icon={MessageSquare} title="Aucune réponse RSVP pour l'instant" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">Toutes ({responses.length})</TabsTrigger>
            <TabsTrigger value="unprocessed">
              Non traitées {unprocessedCount > 0 ? `(${unprocessedCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="annonce">Annonce</TabsTrigger>
            <TabsTrigger value="invitation">Invitation</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucune réponse dans ce filtre" />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <RsvpRow key={r.id} response={r} />)}
        </div>
      )}
    </div>
  )
}
