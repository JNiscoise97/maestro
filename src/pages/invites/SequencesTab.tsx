import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, Search, X } from "lucide-react"

import type { EventSequence, Guest, GuestGroup, ProspectStatus } from "@/types/domain"
import { groupLabel } from "@/lib/groups"
import { useGuests, useGuestGroups } from "@/hooks/queries/use-guests"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useGuestSequences, useAssignGuestToSequence, useUnassignGuestFromSequence } from "@/hooks/queries/use-guest-sequences"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// ── Types filtres ──────────────────────────────────────────────────────────────

type StatusFilter = "all" | "main_list" | "secondary_list"
type SideFilter   = "all" | "sarah" | "jordan"

function resolvedStatus(g: Guest): ProspectStatus {
  return g.prospectStatus ?? "main_list"
}

// ── Checkbox avec état indéterminé ─────────────────────────────────────────────

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="size-4 cursor-pointer rounded border-border accent-primary"
    />
  )
}

// ── Cellule groupe ─────────────────────────────────────────────────────────────

function GroupCell({
  guests,
  seqId,
  assignedPairs,
  onToggleGroup,
}: {
  guests: Guest[]
  seqId: string
  assignedPairs: Set<string>
  onToggleGroup: (guests: Guest[], seqId: string) => void
}) {
  const assigned = guests.filter((g) => assignedPairs.has(`${g.id}:${seqId}`))
  const all  = guests.length > 0 && assigned.length === guests.length
  const some = assigned.length > 0 && !all
  return (
    <td className="px-3 py-1.5 text-center bg-muted/30">
      <IndeterminateCheckbox
        checked={all}
        indeterminate={some}
        onChange={() => onToggleGroup(guests, seqId)}
      />
    </td>
  )
}

// ── Onglet principal ───────────────────────────────────────────────────────────

export function SequencesTab() {
  const { data: sequences = [], isLoading: lSeq }            = useEventSequences()
  const { data: guests   = [], isLoading: lGuests }          = useGuests()
  const { data: groups   = [], isLoading: lGroups }          = useGuestGroups()
  const { data: assignedByGuest = {}, isLoading: lAssign }   = useGuestSequences()
  const assign   = useAssignGuestToSequence()
  const unassign = useUnassignGuestFromSequence()

  // ── État des filtres ──
  const [statusFilter,      setStatusFilter]      = useState<StatusFilter>("all")
  const [nameSearch,        setNameSearch]         = useState("")
  const [sideFilter,        setSideFilter]         = useState<SideFilter>("all")
  const [selectedGroupIds,  setSelectedGroupIds]   = useState<Set<string>>(new Set())

  const isLoading = lSeq || lGuests || lGroups || lAssign

  // ── Données dérivées ──
  const sorted = useMemo(
    () => [...sequences].sort((a, b) => a.sortOrder - b.sortOrder),
    [sequences]
  )
  const guestById  = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const groupById  = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sortOrder - b.sortOrder),
    [groups]
  )

  // Présence des côtés dans les groupes
  const hasSarah  = useMemo(() => groups.some((g) => g.side === "sarah" || g.side === "both"), [groups])
  const hasJordan = useMemo(() => groups.some((g) => g.side === "jordan" || g.side === "both"), [groups])

  const assignedPairs = useMemo(() => {
    const s = new Set<string>()
    for (const [guestId, seqIds] of Object.entries(assignedByGuest))
      for (const seqId of seqIds) s.add(`${guestId}:${seqId}`)
    return s
  }, [assignedByGuest])

  // Total assignés par séquence (toutes personnes confondues)
  const totalBySeq = useMemo(() => {
    const map = new Map<string, number>()
    for (const pair of assignedPairs) {
      const seqId = pair.slice(pair.indexOf(":") + 1)
      map.set(seqId, (map.get(seqId) ?? 0) + 1)
    }
    return map
  }, [assignedPairs])

  // ── Filtrage ──
  const allFilteredGuests = useMemo(() => {
    const q = nameSearch.trim().toLowerCase()
    return guests.filter((g) => {
      const s = resolvedStatus(g)
      if (s !== "main_list" && s !== "secondary_list") return false
      if (statusFilter !== "all" && s !== statusFilter) return false
      if (q && !g.fullName.toLowerCase().includes(q)) return false
      if (sideFilter !== "all") {
        const grpSide = g.groupId ? (groupById.get(g.groupId)?.side ?? null) : null
        if (grpSide !== sideFilter && grpSide !== "both") return false
      }
      if (selectedGroupIds.size > 0 && !selectedGroupIds.has(g.groupId ?? "__none__")) return false
      return true
    })
  }, [guests, statusFilter, nameSearch, sideFilter, selectedGroupIds, groupById])

  // Assignés par séquence parmi les invités visibles
  const filteredBySeq = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of allFilteredGuests)
      for (const seqId of (assignedByGuest[g.id] ?? []))
        map.set(seqId, (map.get(seqId) ?? 0) + 1)
    return map
  }, [allFilteredGuests, assignedByGuest])

  // Groupement des invités filtrés par groupe
  const filteredByGroup = useMemo(() => {
    const map = new Map<string, Guest[]>()
    for (const g of allFilteredGuests) {
      const key = g.groupId ?? "__none__"
      const list = map.get(key) ?? []
      list.push(g)
      map.set(key, list)
    }
    return map
  }, [allFilteredGuests])

  // ── Helpers ──
  function dedupedGuests(list: Guest[]): Guest[] {
    const ids  = new Set(list.map((g) => g.id))
    const seen = new Set<string>()
    return list.filter((g) => {
      if (seen.has(g.id)) return false
      seen.add(g.id)
      if (g.pairedWithId && ids.has(g.pairedWithId)) seen.add(g.pairedWithId)
      return true
    })
  }

  function partnersOf(guest: Guest, groupList: Guest[]): Guest[] {
    if (!guest.pairedWithId) return []
    const partner  = guestById.get(guest.pairedWithId)
    if (!partner) return []
    const groupIds = new Set(groupList.map((g) => g.id))
    return groupIds.has(partner.id) ? [partner] : []
  }

  function toggleGuest(guestId: string, seqId: string) {
    const doAssign = !assignedPairs.has(`${guestId}:${seqId}`)
    const guest    = guestById.get(guestId)
    const targets  = [guestId]
    if (guest?.pairedWithId && guestById.has(guest.pairedWithId)) targets.push(guest.pairedWithId)
    for (const id of targets) {
      if (doAssign) assign.mutate({ guestId: id, sequenceId: seqId })
      else          unassign.mutate({ guestId: id, sequenceId: seqId })
    }
  }

  function toggleGroup(groupGuests: Guest[], seqId: string) {
    const allAssigned = groupGuests.every((g) => assignedPairs.has(`${g.id}:${seqId}`))
    for (const g of groupGuests) {
      if (allAssigned) unassign.mutate({ guestId: g.id, sequenceId: seqId })
      else             assign.mutate({ guestId: g.id, sequenceId: seqId })
    }
  }

  function toggleGroupId(id: string) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasActiveFilters = nameSearch !== "" || sideFilter !== "all" || selectedGroupIds.size > 0

  // ── Rendu ──
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
      </div>
    )
  }

  if (sorted.length <= 1) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Ajoutez au moins 2 séquences dans{" "}
        <Link to="/parametres" className="underline">Paramètres → Séquences</Link>{" "}
        pour activer cette vue.
      </p>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Filtres statut ── */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "main_list", "secondary_list"] as StatusFilter[]).map((s) => {
          const label = s === "all" ? "Tous" : s === "main_list" ? "Liste A" : "Liste B"
          const color = s === "all"
            ? statusFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-foreground/30"
            : s === "main_list"
              ? statusFilter === "main_list" ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:border-emerald-400"
              : statusFilter === "secondary_list" ? "bg-sky-600 text-white border-sky-600" : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 hover:border-sky-400"
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${color}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Barre de recherche ── */}
      <div className="flex flex-wrap gap-2 items-center">

        {/* Nom */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Rechercher un invité…"
            className="w-full rounded-lg border border-border bg-background pl-8 pr-7 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {nameSearch && (
            <button
              onClick={() => setNameSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Côté */}
        {(hasSarah || hasJordan) && (
          <div className="flex gap-1">
            {(["all", "sarah", "jordan"] as SideFilter[]).map((s) => {
              const label = s === "all" ? "Tous" : s === "sarah" ? "Sarah" : "Jordan"
              const active = sideFilter === s
              return (
                <button
                  key={s}
                  onClick={() => setSideFilter(s)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Groupes */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedGroupIds.size > 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-background text-muted-foreground border-border hover:border-foreground/30"
            }`}>
              Groupes {selectedGroupIds.size > 0 && `· ${selectedGroupIds.size}`}
              <ChevronDown className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <div className="space-y-1">
              {sortedGroups.map((grp) => (
                <label key={grp.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.has(grp.id)}
                    onChange={() => toggleGroupId(grp.id)}
                    className="size-3.5 accent-primary"
                  />
                  {groupLabel(grp, groups)}
                </label>
              ))}
              {selectedGroupIds.size > 0 && (
                <button
                  onClick={() => setSelectedGroupIds(new Set())}
                  className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground text-left px-2 py-1"
                >
                  Tout décocher
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset global */}
        {hasActiveFilters && (
          <button
            onClick={() => { setNameSearch(""); setSideFilter("all"); setSelectedGroupIds(new Set()) }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="size-3" /> Réinitialiser
          </button>
        )}
      </div>

      {/* ── Tableau ── */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">

          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 top-0 z-30 bg-muted/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[180px]">
                Invité
              </th>
              {sorted.map((seq) => (
                <th key={seq.id} className="sticky top-0 z-20 bg-muted/50 px-2 py-2 text-center min-w-[100px] max-w-[140px]">
                  <SequenceHeader
                    seq={seq}
                    visible={filteredBySeq.get(seq.id) ?? 0}
                    total={totalBySeq.get(seq.id) ?? 0}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedGroups.map((group) => {
              const filtered = filteredByGroup.get(group.id) ?? []
              if (filtered.length === 0) return null
              const deduped = dedupedGuests(filtered)
              return (
                <GroupRows
                  key={group.id}
                  group={group}
                  allGroups={groups}
                  rawGuests={filtered}
                  dedupedGuests={deduped}
                  sequences={sorted}
                  assignedPairs={assignedPairs}
                  partnersOf={(g) => partnersOf(g, filtered)}
                  onToggleGuest={toggleGuest}
                  onToggleGroup={toggleGroup}
                />
              )
            })}

            {/* Sans groupe */}
            {(() => {
              const filtered = filteredByGroup.get("__none__") ?? []
              if (filtered.length === 0) return null
              const deduped = dedupedGuests(filtered)
              return (
                <>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="sticky left-0 z-10 bg-muted/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Sans groupe
                    </td>
                    {sorted.map((seq) => (
                      <GroupCell key={seq.id} guests={filtered} seqId={seq.id} assignedPairs={assignedPairs} onToggleGroup={toggleGroup} />
                    ))}
                  </tr>
                  {deduped.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      partners={partnersOf(guest, filtered)}
                      sequences={sorted}
                      assignedPairs={assignedPairs}
                      onToggle={toggleGuest}
                    />
                  ))}
                </>
              )
            })()}

            {allFilteredGuests.length === 0 && (
              <tr>
                <td colSpan={sorted.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                  Aucun invité ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── En-tête séquence ──────────────────────────────────────────────────────────

function SequenceHeader({ seq, visible, total }: { seq: EventSequence; visible: number; total: number }) {
  const date = seq.eventDate
    ? new Date(seq.eventDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : null
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-semibold leading-snug text-center">{seq.name}</span>
      {date && <span className="text-[10px] text-muted-foreground font-normal">{date}</span>}
      <span className="text-[10px] font-medium text-primary tabular-nums">
        {visible}/{total} invité{total > 1 ? "s" : ""}
      </span>
    </div>
  )
}

// ── Lignes d'un groupe ─────────────────────────────────────────────────────────

function GroupRows({
  group,
  allGroups,
  rawGuests,
  dedupedGuests,
  sequences,
  assignedPairs,
  partnersOf,
  onToggleGuest,
  onToggleGroup,
}: {
  group: GuestGroup
  allGroups: GuestGroup[]
  rawGuests: Guest[]
  dedupedGuests: Guest[]
  sequences: EventSequence[]
  assignedPairs: Set<string>
  partnersOf: (g: Guest) => Guest[]
  onToggleGuest: (guestId: string, seqId: string) => void
  onToggleGroup: (guests: Guest[], seqId: string) => void
}) {
  return (
    <>
      <tr className="border-t-2 border-border bg-muted/20">
        <td className="sticky left-0 z-10 bg-muted/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {groupLabel(group, allGroups)}
        </td>
        {sequences.map((seq) => (
          <GroupCell key={seq.id} guests={rawGuests} seqId={seq.id} assignedPairs={assignedPairs} onToggleGroup={onToggleGroup} />
        ))}
      </tr>
      {dedupedGuests.map((guest) => (
        <GuestRow
          key={guest.id}
          guest={guest}
          partners={partnersOf(guest)}
          sequences={sequences}
          assignedPairs={assignedPairs}
          onToggle={onToggleGuest}
        />
      ))}
    </>
  )
}

// ── Ligne d'un invité ──────────────────────────────────────────────────────────

function GuestRow({
  guest,
  partners,
  sequences,
  assignedPairs,
  onToggle,
}: {
  guest: Guest
  partners: Guest[]
  sequences: EventSequence[]
  assignedPairs: Set<string>
  onToggle: (guestId: string, seqId: string) => void
}) {
  const names = [guest, ...partners].map((g) => g.fullName).join(" & ")
  return (
    <tr className="border-t border-border/40 hover:bg-muted/20 transition-colors">
      <td className="sticky left-0 z-10 bg-card hover:bg-muted/20 px-3 py-2 text-sm">
        {names}
      </td>
      {sequences.map((seq) => (
        <td key={seq.id} className="px-3 py-2 text-center">
          <input
            type="checkbox"
            checked={assignedPairs.has(`${guest.id}:${seq.id}`)}
            onChange={() => onToggle(guest.id, seq.id)}
            className="size-4 cursor-pointer rounded border-border accent-primary"
          />
        </td>
      ))}
    </tr>
  )
}
