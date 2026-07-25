import { useMemo } from "react"
import { CheckCircle2, CircleDashed, AlertTriangle } from "lucide-react"

import type { MealChoice } from "@/types/domain"
import { useTables, useTableAssignments, useUpdateTable } from "@/hooks/queries/use-seating"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { usePrestataires } from "@/hooks/queries/use-prestataires"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Meal chip ─────────────────────────────────────────────────────────────────

const MEAL_LABEL: Record<MealChoice, { emoji: string; label: string; color: string }> = {
  poulet:         { emoji: "🍗", label: "Poulet",          color: "bg-dore/20 text-brun border-dore/30" },
  poisson:        { emoji: "🐟", label: "Poisson",         color: "bg-lagon/15 text-lagon border-lagon/30" },
  enfant_poulet:  { emoji: "🍗", label: "Poulet (enfant)", color: "bg-dore/20 text-brun border-dore/30" },
  enfant_poisson: { emoji: "🐟", label: "Poisson (enfant)", color: "bg-lagon/15 text-lagon border-lagon/30" },
}

function MealChip({ choice }: { choice: MealChoice | null | undefined }) {
  if (!choice) {
    return (
      <span className="flex items-center gap-1 rounded-full border border-bordeaux/30 bg-bordeaux/10 px-2 py-0.5 text-[11px] font-medium text-bordeaux">
        <AlertTriangle className="size-3" /> Non renseigné
      </span>
    )
  }
  const { emoji, label, color } = MEAL_LABEL[choice]
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", color)}>
      {emoji} {label}
    </span>
  )
}

// ── Ligne assigné ─────────────────────────────────────────────────────────────

interface AssigneeRow {
  name: string
  mealChoice: MealChoice | null | undefined
  note?: string | null
}

function AssigneeItem({ row }: { row: AssigneeRow }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-foreground">{row.name}</span>
      <div className="flex shrink-0 items-center gap-2">
        {row.note && <span className="text-xs text-muted-foreground">{row.note}</span>}
        <MealChip choice={row.mealChoice} />
      </div>
    </div>
  )
}

// ── Carte table ───────────────────────────────────────────────────────────────

function mealCount(rows: AssigneeRow[]) {
  let poulet = 0; let poisson = 0; let unknown = 0
  for (const r of rows) {
    if (!r.mealChoice) { unknown++; continue }
    if (r.mealChoice === "poulet" || r.mealChoice === "enfant_poulet") poulet++
    else poisson++
  }
  return { poulet, poisson, unknown }
}

function TableCard({
  table,
  assignees,
}: {
  table: { id: string; name: string; capacity: number; confirmedAt?: string | null }
  assignees: AssigneeRow[]
}) {
  const updateTable = useUpdateTable()
  const isConfirmed = !!table.confirmedAt
  const { poulet, poisson, unknown } = mealCount(assignees)

  const confirmedLabel = table.confirmedAt
    ? new Date(table.confirmedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null

  function handleToggle() {
    updateTable.mutate({
      id: table.id,
      patch: { confirmedAt: isConfirmed ? null : new Date().toISOString() },
    })
  }

  return (
    <div className={cn(
      "rounded-2xl border bg-card transition-colors",
      isConfirmed ? "border-vert-vegetal/40 bg-vert-vegetal/5" : "border-border"
    )}>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="space-y-0.5">
          <h3 className="font-heading font-semibold text-foreground">{table.name}</h3>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            <span>{assignees.length} / {table.capacity} places</span>
            {poulet > 0 && <span>🍗 {poulet} poulet</span>}
            {poisson > 0 && <span>🐟 {poisson} poisson</span>}
            {unknown > 0 && (
              <span className="flex items-center gap-0.5 text-bordeaux">
                <AlertTriangle className="size-3" /> {unknown} sans choix
              </span>
            )}
          </p>
        </div>

        <Button
          size="sm"
          variant={isConfirmed ? "outline" : "default"}
          onClick={handleToggle}
          disabled={updateTable.isPending}
          className={cn(
            "shrink-0 gap-1.5",
            isConfirmed && "border-vert-vegetal/50 text-vert-vegetal hover:bg-vert-vegetal/10"
          )}
        >
          {isConfirmed
            ? <><CheckCircle2 className="size-3.5" />OK</>
            : <><CircleDashed className="size-3.5" />Confirmer</>}
        </Button>
      </div>

      {confirmedLabel && (
        <p className="px-4 pb-2 text-[11px] text-vert-vegetal/80">Confirmée le {confirmedLabel}</p>
      )}

      {/* Liste */}
      {assignees.length > 0 ? (
        <div className="divide-y divide-border/50 border-t border-border/50 px-4">
          {assignees.map((row, i) => (
            <AssigneeItem key={i} row={row} />
          ))}
        </div>
      ) : (
        <p className="border-t border-border/50 px-4 py-3 text-sm text-muted-foreground">Aucune place assignée.</p>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function TourTablesPage() {
  const { data: tables,      isLoading: lt } = useTables()
  const { data: assignments, isLoading: la } = useTableAssignments()
  const { data: guests,      isLoading: lg } = useGuests()
  const { data: people,      isLoading: lp } = usePeople()
  const { data: prestataires } = usePrestataires()

  const isLoading = lt || la || lg || lp

  const tableCards = useMemo(() => {
    if (!tables || !assignments || !guests || !people) return []

    const guestMap  = new Map(guests.map((g) => [g.id, g]))
    const personMap = new Map(people.map((p) => [p.id, p]))
    const prestaMap = new Map((prestataires ?? []).map((p) => [p.id, p]))

    return [...tables]
      .sort((a, b) => {
        // non confirmées d'abord, puis par sortOrder
        if (!!a.confirmedAt !== !!b.confirmedAt) return a.confirmedAt ? 1 : -1
        return a.sortOrder - b.sortOrder
      })
      .map((table) => {
        const rows: AssigneeRow[] = assignments
          .filter((a) => a.tableId === table.id)
          .map((a): AssigneeRow | null => {
            if (a.guestId) {
              const g = guestMap.get(a.guestId)
              if (!g) return null
              const notes: string[] = []
              if (g.dietaryConstraints) notes.push(g.dietaryConstraints)
              if (g.allergies) notes.push(`allergie : ${g.allergies}`)
              return { name: g.fullName, mealChoice: g.mealChoice, note: notes.join(" · ") || null }
            }
            if (a.personId) {
              const p = personMap.get(a.personId)
              if (!p) return null
              return { name: p.fullName, mealChoice: p.mealChoice }
            }
            if (a.prestataireId) {
              const pr = prestaMap.get(a.prestataireId)
              if (!pr || !pr.needsMeal) return null
              return { name: pr.name + (pr.company ? ` (${pr.company})` : ""), mealChoice: pr.mealChoice }
            }
            return null
          })
          .filter((r): r is AssigneeRow => r !== null)
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))

        return { table, rows }
      })
  }, [tables, assignments, guests, people, prestataires])

  const confirmedCount = tableCards.filter((c) => !!c.table.confirmedAt).length

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    )
  }

  if (!tableCards.length) {
    return <p className="text-sm text-muted-foreground">Aucune table configurée.</p>
  }

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-vert-vegetal transition-all duration-500"
            style={{ width: `${tableCards.length ? (confirmedCount / tableCards.length) * 100 : 0}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
          {confirmedCount} / {tableCards.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tableCards.map(({ table, rows }) => (
          <TableCard key={table.id} table={table} assignees={rows} />
        ))}
      </div>
    </div>
  )
}
