import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowDown, X, UserPlus } from "lucide-react"

import { allRoles } from "@/lib/cortege"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useGuests } from "@/hooks/queries/use-guests"
import {
  useCortegeConfig,
  useCortegeGroups,
  useCortegeAssignments,
  useAssignCortegeGuest,
  useUnassignCortegeGuest,
  useCortegeConfiguredSequenceIds,
} from "@/hooks/queries/use-cortege"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"

// ── Sélecteur de séquence ──────────────────────────────────────────────────────

function SequencePills({
  sequences,
  activeId,
  onSelect,
}: {
  sequences: { id: string; name: string; eventDate?: string | null }[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {sequences.map((seq) => {
        const active = activeId === seq.id
        const date = seq.eventDate
          ? new Date(seq.eventDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
          : null
        return (
          <button
            key={seq.id}
            onClick={() => onSelect(seq.id)}
            className={`flex-shrink-0 flex flex-col items-start rounded-xl border px-3 py-2 text-xs transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border"
            }`}
          >
            <span className="font-semibold">{seq.name}</span>
            {date && (
              <span className={`text-[10px] mt-0.5 ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {date}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Slot d'un rôle (carte cliquable) ──────────────────────────────────────────

function RoleSlot({
  roleKey,
  roleLabel,
  guestName,
  guests,
  onAssign,
  onUnassign,
}: {
  roleKey: string
  roleLabel: string
  guestName: string | null
  guests: { id: string; fullName: string }[]
  onAssign: (roleKey: string, guestId: string) => void
  onUnassign: (roleKey: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(
    () => guests.filter((g) => g.fullName.toLowerCase().includes(search.toLowerCase())),
    [guests, search]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={`group relative flex flex-col items-center justify-center rounded-xl border px-3 py-2 min-h-[64px] cursor-pointer transition-all text-center ${
            guestName
              ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
              : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">
            {roleLabel}
          </span>
          {guestName ? (
            <>
              <span className="text-sm font-semibold text-foreground leading-snug">{guestName}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUnassign(roleKey) }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
              <UserPlus className="size-3.5" /> Assigner
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="center">
        <Command>
          <CommandInput
            placeholder="Rechercher un invité…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Aucun invité trouvé.</CommandEmpty>
            <CommandGroup>
              {filtered.map((g) => (
                <CommandItem
                  key={g.id}
                  value={g.fullName}
                  onSelect={() => {
                    onAssign(roleKey, g.id)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  {g.fullName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Schéma de procession (panneau gauche) ─────────────────────────────────────

function ProcessionDiagram({
  sequenceId,
  assignmentMap,
  guestById,
  guests,
  cavalierCount,
  demoiselleCount,
  temoinsMarieCount,
  temoinsMarieeCount,
}: {
  sequenceId: string
  assignmentMap: Map<string, string>
  guestById: Map<string, { fullName: string }>
  guests: { id: string; fullName: string }[]
  cavalierCount: number
  demoiselleCount: number
  temoinsMarieCount: number
  temoinsMarieeCount: number
}) {
  const assign   = useAssignCortegeGuest()
  const unassign = useUnassignCortegeGuest()
  const { data: groups = [] } = useCortegeGroups(sequenceId)

  const sorted = useMemo(
    () => [...groups].sort((a, b) => a.sortOrder - b.sortOrder),
    [groups]
  )

  const roles = useMemo(
    () => allRoles({ cavalierCount, demoiselleCount, temoinsMarieCount, temoinsMarieeCount }),
    [cavalierCount, demoiselleCount, temoinsMarieCount, temoinsMarieeCount]
  )
  const labelOf = (key: string) => roles.find((r) => r.key === key)?.label ?? key

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Aucun groupe défini pour cette séquence.</p>
        <p className="text-xs text-muted-foreground">
          Créez des groupes dans{" "}
          <Link to="/parametres" className="underline">Paramètres → Cortège</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowDown className="size-3.5 shrink-0" />
        <span>Ordre d'entrée dans la cérémonie</span>
      </div>

      {sorted.map((group, idx) => {
        const isLast = idx === sorted.length - 1
        const cols = group.roleKeys.length === 1 ? "grid-cols-1" : "grid-cols-2"

        return (
          <div key={group.id}>
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </p>
              {group.roleKeys.length === 0 ? (
                <p className="text-xs text-muted-foreground/50">Aucun rôle dans ce groupe.</p>
              ) : (
                <div className={`grid gap-2 ${cols}`}>
                  {group.roleKeys.map((rk) => (
                    <RoleSlot
                      key={rk}
                      roleKey={rk}
                      roleLabel={labelOf(rk)}
                      guestName={
                        assignmentMap.has(rk)
                          ? (guestById.get(assignmentMap.get(rk)!)?.fullName ?? null)
                          : null
                      }
                      guests={guests}
                      onAssign={(k, gid) => assign.mutate({ sequenceId, roleKey: k, guestId: gid })}
                      onUnassign={(k) => unassign.mutate({ sequenceId, roleKey: k })}
                    />
                  ))}
                </div>
              )}
            </div>
            {!isLast && (
              <div className="flex justify-center py-1">
                <ArrowDown className="size-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Liste des assignations (panneau droit) ────────────────────────────────────

function AssignmentList({
  sequenceId,
  assignmentMap,
  guestById,
  cavalierCount,
  demoiselleCount,
  temoinsMarieCount,
  temoinsMarieeCount,
}: {
  sequenceId: string
  assignmentMap: Map<string, string>
  guestById: Map<string, { fullName: string }>
  cavalierCount: number
  demoiselleCount: number
  temoinsMarieCount: number
  temoinsMarieeCount: number
}) {
  const { data: groups = [] } = useCortegeGroups(sequenceId)
  const roles = useMemo(
    () => allRoles({ cavalierCount, demoiselleCount, temoinsMarieCount, temoinsMarieeCount }),
    [cavalierCount, demoiselleCount, temoinsMarieCount, temoinsMarieeCount]
  )
  const labelOf = (key: string) => roles.find((r) => r.key === key)?.label ?? key

  const sorted = useMemo(
    () => [...groups].sort((a, b) => a.sortOrder - b.sortOrder),
    [groups]
  )

  const hasAny = sorted.some((g) => g.roleKeys.some((rk) => assignmentMap.has(rk)))

  if (!hasAny) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucun rôle assigné pour l'instant.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map((group) => {
        const assigned = group.roleKeys.filter((rk) => assignmentMap.has(rk))
        if (assigned.length === 0) return null
        return (
          <div key={group.id}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              {group.label}
            </p>
            <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
              {assigned.map((rk) => (
                <div key={rk} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-muted-foreground">{labelOf(rk)}</span>
                  <span className="text-sm font-medium">
                    {guestById.get(assignmentMap.get(rk)!)?.fullName ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Contenu pour une séquence ──────────────────────────────────────────────────

function SequenceContent({
  sequenceId,
  guestOptions,
  guestById,
}: {
  sequenceId: string
  guestOptions: { id: string; fullName: string }[]
  guestById: Map<string, { fullName: string }>
}) {
  const { data: config,      isLoading: lConfig }  = useCortegeConfig(sequenceId)
  const { data: assignments = [], isLoading: lAss } = useCortegeAssignments(sequenceId)

  const cavalierCount     = config?.cavalierCount     ?? 0
  const demoiselleCount   = config?.demoiselleCount   ?? 0
  const temoinsMarieCount  = config?.temoinsMarieCount  ?? 0
  const temoinsMarieeCount = config?.temoinsMarieeCount ?? 0

  const assignmentMap = useMemo(
    () => new Map(assignments.map((a) => [a.roleKey, a.guestId])),
    [assignments]
  )

  if (lConfig || lAss) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <h3 className="text-sm font-semibold mb-3">Schéma du cortège</h3>
        <ProcessionDiagram
          sequenceId={sequenceId}
          assignmentMap={assignmentMap}
          guestById={guestById}
          guests={guestOptions}
          cavalierCount={cavalierCount}
          demoiselleCount={demoiselleCount}
          temoinsMarieCount={temoinsMarieCount}
          temoinsMarieeCount={temoinsMarieeCount}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">
          Personnes assignées
          {assignments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {assignments.length} rôle{assignments.length > 1 ? "s" : ""} assigné{assignments.length > 1 ? "s" : ""}
            </span>
          )}
        </h3>
        <AssignmentList
          sequenceId={sequenceId}
          assignmentMap={assignmentMap}
          guestById={guestById}
          cavalierCount={cavalierCount}
          demoiselleCount={demoiselleCount}
          temoinsMarieCount={temoinsMarieCount}
          temoinsMarieeCount={temoinsMarieeCount}
        />
      </div>
    </div>
  )
}

// ── Onglet principal ───────────────────────────────────────────────────────────

export function CortegeTab() {
  const { data: sequences = [], isLoading: lSeq }         = useEventSequences()
  const { data: guests   = [], isLoading: lGuests }        = useGuests()
  const { data: configuredIds = [], isLoading: lConfigured } = useCortegeConfiguredSequenceIds()

  const sorted = useMemo(() => {
    const configured = new Set(configuredIds)
    return [...sequences]
      .filter((s) => configured.has(s.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [sequences, configuredIds])

  const [activeSeqId, setActiveSeqId] = useState<string | null>(null)
  const effectiveSeqId = activeSeqId ?? sorted[0]?.id ?? null

  const guestById = useMemo(
    () => new Map(guests.map((g) => [g.id, { fullName: g.fullName }])),
    [guests]
  )
  const guestOptions = useMemo(
    () => [...guests].sort((a, b) => a.fullName.localeCompare(b.fullName, "fr")),
    [guests]
  )

  if (lSeq || lGuests || lConfigured) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune séquence avec un cortège configuré. Activez des rôles dans{" "}
        <Link to="/parametres" className="underline">Paramètres → Cortège</Link>.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <SequencePills sequences={sorted} activeId={effectiveSeqId} onSelect={setActiveSeqId} />
      {effectiveSeqId && (
        <SequenceContent
          sequenceId={effectiveSeqId}
          guestOptions={guestOptions}
          guestById={guestById}
        />
      )}
    </div>
  )
}
