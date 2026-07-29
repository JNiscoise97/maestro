import { useMemo, useState } from "react"
import { Armchair, ArrowUpDown } from "lucide-react"

import type { Guest, RsvpStatus } from "@/types/domain"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import { GuestTable } from "@/components/invites/GuestTable"
import { GuestCreateDialog } from "@/components/invites/GuestCreateDialog"
import { PlanTablePage } from "@/pages/plan-table"
import { EnfantsPage } from "@/pages/enfants"
import { PersonnesAgeesPage } from "@/pages/personnes-agees"
import { MessageSuiviPage } from "@/pages/invites/MessageSuiviPage"
import { RsvpSuiviTab } from "@/pages/invites/RsvpSuiviTab"

const ALL_GROUPS = "all"

type SortKey = "name" | "family" | "rsvp" | "age"

const SORT_LABELS: Record<SortKey, string> = {
  name: "Nom",
  family: "Famille",
  rsvp: "Présence",
  age: "Âge",
}

const RSVP_ORDER: Record<RsvpStatus, number> = { pending: 0, confirmed: 1, declined: 2 }

function guestAgeValue(guest: Guest): number {
  if (guest.isChild && guest.childAge != null) return guest.childAge
  const match = guest.ageRange?.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

export function InvitesList() {
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: groups, isLoading: groupsLoading } = useGuestGroups()
  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS)
  const [sortBy, setSortBy] = useState<SortKey>("family")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

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
      pending: guests.filter((g) => g.rsvpStatus === "pending").length,
      declined: guests.filter((g) => g.rsvpStatus === "declined").length,
    }
  }, [guests])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invités"
        description="Liste des invités et présence."
        actions={<GuestCreateDialog groups={groups ?? []} />}
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
              <p className="text-xs text-muted-foreground">
                {filteredGuests.length} invité{filteredGuests.length === 1 ? "" : "s"} affiché{filteredGuests.length === 1 ? "" : "s"}
              </p>
            </div>
            {stats ? (
              <p className="text-xs text-muted-foreground">
                {stats.confirmed} confirmés · {stats.pending} en attente · {stats.declined} déclinés · {stats.total} au total
              </p>
            ) : null}
          </div>
          {sortedGuests.length === 0 ? (
            <EmptyState icon={Armchair} title="Aucun invité ne correspond à ces filtres" />
          ) : (
            <GuestTable guests={sortedGuests} groupsById={groupsById} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Page composite ─────────────────────────────────────────────────────────────

type InvitesTab = "liste" | "rsvp" | "plan-table" | "enfants" | "accessibilite" | "messages"

export function InvitesPage() {
  const [tab, setTab] = useState<InvitesTab>("liste")
  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as InvitesTab)}>
        <TabsList>
          <TabsTrigger value="liste">Invités</TabsTrigger>
          <TabsTrigger value="rsvp">RSVP</TabsTrigger>
          <TabsTrigger value="plan-table">Plan de table</TabsTrigger>
          <TabsTrigger value="enfants">Enfants</TabsTrigger>
          <TabsTrigger value="accessibilite">Accessibilité</TabsTrigger>
          <TabsTrigger value="messages">Communications</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "liste" && <InvitesList />}
      {tab === "rsvp" && <RsvpSuiviTab />}
      {tab === "plan-table" && <PlanTablePage />}
      {tab === "enfants" && <EnfantsPage />}
      {tab === "accessibilite" && <PersonnesAgeesPage />}
      {tab === "messages" && <MessageSuiviPage />}
    </div>
  )
}
