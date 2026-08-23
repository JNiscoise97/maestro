import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Armchair, ArrowUpDown, LayoutList, Network } from "lucide-react"

import type { Guest, GuestGroup, RsvpStatus } from "@/types/domain"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RsvpBadge } from "@/components/invites/RsvpBadge"
import { useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import { GuestTable } from "@/components/invites/GuestTable"
import { GuestCreateDialog } from "@/components/invites/GuestCreateDialog"
import { GuestTreeView } from "@/components/invites/GuestTreeView"
import { PlanTablePage } from "@/pages/plan-table"
import { EnfantsPage } from "@/pages/enfants"
import { PersonnesAgeesPage } from "@/pages/personnes-agees"
import { MessageSuiviPage } from "@/pages/invites/MessageSuiviPage"
import { RsvpSuiviTab } from "@/pages/invites/RsvpSuiviTab"
import { AtelierTab } from "@/pages/invites/AtelierTab"
import { GuestExportDialog } from "@/components/invites/GuestExportDialog"

const ALL_GROUPS = "all"

// ── Vue arbre par groupe ──────────────────────────────────────────────────────

function GuestGroupTree({ guests, groups }: { guests: Guest[]; groups: GuestGroup[] }) {
  const navigate = useNavigate()
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  const byGroup = useMemo(() => {
    const map = new Map<string, Guest[]>()
    for (const g of guests) {
      const key = g.groupId ?? "__none__"
      const list = map.get(key) ?? []
      list.push(g)
      map.set(key, list)
    }
    return map
  }, [guests])

  const sortedGroupIds = useMemo(() => {
    const ids = [...byGroup.keys()]
    return ids.sort((a, b) => {
      if (a === "__none__") return 1
      if (b === "__none__") return -1
      const ga = groupsById.get(a)
      const gb = groupsById.get(b)
      return (ga?.sortOrder ?? 0) - (gb?.sortOrder ?? 0) || (ga?.familyName ?? "").localeCompare(gb?.familyName ?? "", "fr")
    })
  }, [byGroup, groupsById])

  function renderGuest(guest: Guest) {
    return (
      <button
        key={guest.id}
        type="button"
        onClick={() => navigate(`/invites/${guest.id}`)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-muted/60 transition-colors"
      >
        <span className="font-medium text-foreground">{guest.fullName}</span>
        <RsvpBadge status={guest.rsvpStatus} />
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {sortedGroupIds.map((groupId) => {
        const groupGuests = byGroup.get(groupId) ?? []
        const group = groupId === "__none__" ? null : groupsById.get(groupId)
        return (
          <div key={groupId} className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {group?.familyName ?? "Sans groupe"}
              <span className="ml-2 font-normal normal-case tracking-normal">
                {groupGuests.length} invité{groupGuests.length > 1 ? "s" : ""}
              </span>
            </p>
            <GuestTreeView guests={groupGuests} renderGuest={renderGuest} />
          </div>
        )
      })}
    </div>
  )
}

type SortKey = "name" | "family" | "rsvp" | "age"

const SORT_LABELS: Record<SortKey, string> = {
  name: "Nom",
  family: "Famille",
  rsvp: "Présence",
  age: "Âge",
}

const RSVP_ORDER: Record<RsvpStatus, number> = { pending: 0, confirmed: 1, no_show: 2, declined: 3 }

function guestAgeValue(guest: Guest): number {
  if (guest.isChild && guest.childAge != null) return guest.childAge
  const match = guest.ageRange?.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

export function InvitesList() {
  const { data: allGuests, isLoading: guestsLoading } = useGuests()
  const { data: groups, isLoading: groupsLoading } = useGuestGroups()
  // Liste = invités confirmés (main_list ou sans prospect_status = historiques)
  const guests = allGuests?.filter((g) => !g.prospectStatus || g.prospectStatus === "main_list")
  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS)
  const [sortBy, setSortBy] = useState<SortKey>("family")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [view, setView] = useState<"table" | "tree">("table")

  const isLoading = guestsLoading || groupsLoading

  const groupsById = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups])

  const filteredGuests = useMemo(() => {
    if (!guests) return []
    const query = search.trim().toLowerCase()
    return guests.filter((guest) => {
      if (groupFilter !== ALL_GROUPS && guest.groupId !== groupFilter) return false
      if (query && !guest.fullName.toLowerCase().includes(query)) return false
      return true
    })
  }, [guests, search, groupFilter])

  const sortedGuests = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    const familySortOrderOf = (g: Guest) =>
      g.groupId ? groupsById.get(g.groupId)?.sortOrder ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY

    return [...filteredGuests].sort((a, b) => {
      let cmp: number
      switch (sortBy) {
        case "name":
          cmp = a.fullName.localeCompare(b.fullName)
          break
        case "family":
          cmp = familySortOrderOf(a) - familySortOrderOf(b) || a.fullName.localeCompare(b.fullName)
          break
        case "rsvp":
          cmp = RSVP_ORDER[a.rsvpStatus] - RSVP_ORDER[b.rsvpStatus] || a.fullName.localeCompare(b.fullName)
          break
        case "age":
          cmp = guestAgeValue(a) - guestAgeValue(b) || a.fullName.localeCompare(b.fullName)
          break
      }
      return dir * cmp
    })
  }, [filteredGuests, sortBy, sortDir, groupsById])

  const stats = useMemo(() => {
    if (!guests) return null
    return {
      total: guests.length,
      confirmed: guests.filter((g) => g.rsvpStatus === "confirmed").length,
      no_show: guests.filter((g) => g.rsvpStatus === "no_show").length,
      pending: guests.filter((g) => g.rsvpStatus === "pending").length,
      declined: guests.filter((g) => g.rsvpStatus === "declined").length,
    }
  }, [guests])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invités"
        description="Liste des invités et présence."
        actions={
          <div className="flex items-center gap-2">
            {guests && guests.length > 0 && (
              <GuestExportDialog guests={guests} groups={groups ?? []} />
            )}
            <GuestCreateDialog groups={groups ?? []} />
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !guests || guests.length === 0 ? (
        <EmptyState icon={Armchair} title="Aucun invité pour l'instant" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un invité..."
                className="max-w-xs"
              />
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Tous les groupes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_GROUPS}>Tous les groupes</SelectItem>
                  {(groups ?? []).map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.familyName}
                      {group.notes ? ` (${group.notes})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v: SortKey) => setSortBy(v)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Trier par..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      Trier par {SORT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={sortDir === "asc" ? "Ordre croissant" : "Ordre décroissant"}
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  >
                    <ArrowUpDown className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{sortDir === "asc" ? "Ordre croissant" : "Ordre décroissant"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === "tree" ? "default" : "outline"}
                    size="icon-sm"
                    aria-label="Vue arbre par groupe"
                    onClick={() => setView((v) => v === "table" ? "tree" : "table")}
                  >
                    {view === "tree" ? <LayoutList className="size-4" /> : <Network className="size-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{view === "tree" ? "Vue tableau" : "Vue arbre par groupe"}</TooltipContent>
              </Tooltip>
              <p className="text-xs text-muted-foreground">
                {filteredGuests.length} invité{filteredGuests.length === 1 ? "" : "s"} affiché{filteredGuests.length === 1 ? "" : "s"}
              </p>
            </div>
            {stats ? (
              <p className="text-xs text-muted-foreground">
                {stats.confirmed} confirmés · {stats.no_show > 0 ? `${stats.no_show} no show · ` : ""}{stats.pending} en attente · {stats.declined} déclinés · {stats.total} au total
              </p>
            ) : null}
          </div>
          {sortedGuests.length === 0 ? (
            <EmptyState icon={Armchair} title="Aucun invité ne correspond à ces filtres" />
          ) : view === "tree" ? (
            <GuestGroupTree guests={filteredGuests} groups={groups ?? []} />
          ) : (
            <GuestTable guests={sortedGuests} groupsById={groupsById} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Page composite ─────────────────────────────────────────────────────────────

type InvitesTab = "liste" | "rsvp" | "plan-table" | "enfants" | "accessibilite" | "messages" | "atelier"

export function InvitesPage() {
  const [tab, setTab] = useState<InvitesTab>("liste")
  const { data: allGuests = [] } = useGuests()
  const pendingCount = allGuests.filter((g) => g.prospectStatus === "pending").length

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as InvitesTab)}>
        <TabsList>
          <TabsTrigger value="liste">Liste</TabsTrigger>
          <TabsTrigger value="rsvp">Réponses</TabsTrigger>
          <TabsTrigger value="atelier" className="relative">
            À décider
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="plan-table">Plan de table</TabsTrigger>
          <TabsTrigger value="enfants">Enfants</TabsTrigger>
          <TabsTrigger value="accessibilite">Besoins spéciaux</TabsTrigger>
          <TabsTrigger value="messages">Communications</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "liste" && <InvitesList />}
      {tab === "rsvp" && <RsvpSuiviTab />}
      {tab === "atelier" && <AtelierTab />}
      {tab === "plan-table" && <PlanTablePage />}
      {tab === "enfants" && <EnfantsPage />}
      {tab === "accessibilite" && <PersonnesAgeesPage />}
      {tab === "messages" && <MessageSuiviPage />}
    </div>
  )
}
