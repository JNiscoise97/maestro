import { useMemo, useState } from "react"
import { CheckCircle2, DoorOpen, Plus, RotateCcw, Search, Sparkles, TriangleAlert, Users } from "lucide-react"
import { toast } from "sonner"

import type { Guest, GuestGroup } from "@/types/domain"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAddWalkInGuest, useCheckInGuest, useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import { GuestTreeView } from "@/components/invites/GuestTreeView"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useGuestSequences } from "@/hooks/queries/use-guest-sequences"
import { useGuestCheckins, useCheckInForSequence, useUndoCheckinForSequence } from "@/hooks/queries/use-guest-checkins"

const NO_FAMILY = "__no_family__"

type Filter = "all" | "pending" | "arrived"

const FILTER_LABELS: Record<Filter, string> = {
  all: "Tous",
  pending: "En attente",
  arrived: "Arrivés",
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}


export function AccueilPage() {
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: groups, isLoading: groupsLoading } = useGuestGroups()
  const { data: sequences = [] } = useEventSequences()
  const { data: assignedByGuest = {} } = useGuestSequences()
  const checkIn = useCheckInGuest()
  const checkInSeq = useCheckInForSequence()
  const undoSeq = useUndoCheckinForSequence()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null)

  const sortedSequences = useMemo(
    () => [...sequences].sort((a, b) => a.sortOrder - b.sortOrder),
    [sequences]
  )
  const hasMultipleSequences = sortedSequences.length > 1

  // Resolve active sequence (null = global view)
  const activeSequenceId = hasMultipleSequences ? selectedSequenceId ?? sortedSequences[0]?.id ?? null : null

  const { data: seqCheckins = [] } = useGuestCheckins(activeSequenceId)
  const checkinedInSeq = useMemo(
    () => new Set(seqCheckins.map((c) => c.guestId)),
    [seqCheckins]
  )

  const isLoading = guestsLoading || groupsLoading

  const groupsById = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups])
  const guestById = useMemo(() => new Map((guests ?? []).map((g) => [g.id, g])), [guests])

  // Guests assigned to the active sequence (or all guests in global mode)
  const scopedGuests = useMemo(() => {
    if (!guests) return []
    if (!activeSequenceId) return guests
    return guests.filter((g) => (assignedByGuest[g.id] ?? []).includes(activeSequenceId))
  }, [guests, activeSequenceId, assignedByGuest])

  function isArrived(guest: Guest): boolean {
    if (activeSequenceId) return checkinedInSeq.has(guest.id)
    return !!guest.checkedInAt
  }

  function getCheckinTime(guest: Guest): string | null {
    if (activeSequenceId) {
      const c = seqCheckins.find((x) => x.guestId === guest.id)
      return c?.checkedInAt ?? null
    }
    return guest.checkedInAt ?? null
  }

  const filteredGuests = useMemo(() => {
    const query = search.trim().toLowerCase()
    return scopedGuests.filter((guest) => {
      if (filter === "pending" && isArrived(guest)) return false
      if (filter === "arrived" && !isArrived(guest)) return false
      if (query) {
        const familyName = guest.groupId ? groupsById.get(guest.groupId)?.familyName ?? "" : ""
        if (!guest.fullName.toLowerCase().includes(query) && !familyName.toLowerCase().includes(query)) return false
      }
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedGuests, search, filter, groupsById, checkinedInSeq, activeSequenceId])

  const families = useMemo(() => {
    const map = new Map<string, { group: GuestGroup | null; guests: Guest[] }>()
    for (const guest of filteredGuests) {
      const key = guest.groupId ?? NO_FAMILY
      const entry = map.get(key) ?? {
        group: guest.groupId ? groupsById.get(guest.groupId) ?? null : null,
        guests: [] as Guest[],
      }
      entry.guests.push(guest)
      map.set(key, entry)
    }
    return [...map.values()]
      .sort((a, b) => (a.group?.sortOrder ?? Number.POSITIVE_INFINITY) - (b.group?.sortOrder ?? Number.POSITIVE_INFINITY))
  }, [filteredGuests, groupsById])

  const stats = useMemo(() => {
    if (!scopedGuests.length) return null
    const arrived = activeSequenceId
      ? scopedGuests.filter((g) => checkinedInSeq.has(g.id)).length
      : scopedGuests.filter((g) => g.checkedInAt).length
    const unexpected = scopedGuests.filter((g) => g.isUnexpected).length
    return { total: scopedGuests.length, arrived, unexpected }
  }, [scopedGuests, activeSequenceId, checkinedInSeq])

  function toggleGuest(guest: Guest) {
    const arrived = isArrived(guest)
    // Always update the global checkedInAt on the guest (backward compat)
    checkIn.mutate({ id: guest.id, checkedInAt: arrived ? null : new Date().toISOString() })
    // Also update per-sequence check-in if in sequence mode
    if (activeSequenceId) {
      if (arrived) {
        undoSeq.mutate({ guestId: guest.id, sequenceId: activeSequenceId })
      } else {
        checkInSeq.mutate({ guestId: guest.id, sequenceId: activeSequenceId })
      }
    }
  }

  async function markFamily(guestsInFamily: Guest[], arrived: boolean) {
    await Promise.all(
      guestsInFamily.map(async (g) => {
        await checkIn.mutateAsync({ id: g.id, checkedInAt: arrived ? new Date().toISOString() : null })
        if (activeSequenceId) {
          if (arrived) {
            await checkInSeq.mutateAsync({ guestId: g.id, sequenceId: activeSequenceId })
          } else {
            await undoSeq.mutateAsync({ guestId: g.id, sequenceId: activeSequenceId })
          }
        }
      })
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accueil"
        description="Pointez les arrivées des invités au fur et à mesure."
        actions={<AddWalkInGuestDialog />}
      />

      {/* Sélecteur de séquence */}
      {hasMultipleSequences && (
        <div className="flex flex-wrap gap-2">
          {sortedSequences.map((seq) => (
            <Button
              key={seq.id}
              size="sm"
              variant={activeSequenceId === seq.id ? "default" : "outline"}
              onClick={() => setSelectedSequenceId(seq.id)}
            >
              {seq.name}
              {seq.startTime && <span className="ml-1.5 text-xs opacity-70">{seq.startTime.slice(0, 5)}</span>}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !guests || guests.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Aucun invité à accueillir" />
      ) : (
        <>
          {stats ? (
            <Card>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">Arrivées</p>
                  <span className="text-sm font-medium text-foreground">
                    {stats.arrived} / {stats.total} invités arrivés
                    {stats.unexpected > 0 ? ` · dont ${stats.unexpected} imprévu${stats.unexpected === 1 ? "" : "s"}` : ""}
                  </span>
                </div>
                <Progress value={stats.total > 0 ? Math.round((stats.arrived / stats.total) * 100) : 0} />
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un invité ou une famille..."
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={filter === key ? "default" : "ghost"}
                  onClick={() => setFilter(key)}
                >
                  {FILTER_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>

          {families.length === 0 ? (
            <EmptyState icon={Users} title="Aucun invité ne correspond à ces filtres" />
          ) : (
            <div className="space-y-4">
              {families.map((family) => {
                const arrivedCount = family.guests.filter((g) => isArrived(g)).length
                const allArrived = arrivedCount === family.guests.length
                const key = family.group?.id ?? NO_FAMILY
                const canBulkMark =
                  family.guests.length > 1 && (family.group?.familyName.toLowerCase().includes("famille") ?? false)
                return (
                  <Card key={key}>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-base text-foreground">
                            {family.group?.familyName ?? "Sans famille"}
                          </p>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {arrivedCount} / {family.guests.length}
                          </Badge>
                        </div>
                        {canBulkMark ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => markFamily(family.guests, !allArrived)}
                          >
                            {allArrived ? (
                              <>
                                <RotateCcw className="size-3.5" />
                                Annuler le groupe
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3.5" />
                                Marquer toute la famille arrivée
                              </>
                            )}
                          </Button>
                        ) : null}
                      </div>
                      {(() => {
                        const familyGuestIds = new Set(family.guests.map((g) => g.id))
                        return (
                          <GuestTreeView
                            guests={family.guests}
                            renderGuest={(guest) => {
                              const arrived = isArrived(guest)
                              const checkinTime = getCheckinTime(guest)
                              const crossFamilyPartner =
                                guest.pairedWithId && !familyGuestIds.has(guest.pairedWithId)
                                  ? guestById.get(guest.pairedWithId)
                                  : null
                              return (
                                <button
                                  type="button"
                                  onClick={() => toggleGuest(guest)}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                                    arrived
                                      ? "border-vert-vegetal/40 bg-vert-vegetal/10"
                                      : "border-border hover:bg-muted/50"
                                  )}
                                >
                                  <CheckCircle2
                                    className={cn(
                                      "size-3.5 shrink-0",
                                      arrived ? "text-vert-vegetal" : "text-muted-foreground/40"
                                    )}
                                  />
                                  <span className="text-foreground">{guest.fullName}</span>
                                  {crossFamilyPartner ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <TriangleAlert className="size-3.5 shrink-0 text-dore" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Inséparable de {crossFamilyPartner.fullName} (autre famille)
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                  {guest.isUnexpected ? (
                                    <Badge className="shrink-0 bg-dore/20 text-xs text-brun">
                                      <Sparkles className="size-3" />
                                      Imprévu
                                    </Badge>
                                  ) : null}
                                  {checkinTime ? (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      {formatTime(checkinTime)}
                                    </span>
                                  ) : null}
                                </button>
                              )
                            }}
                          />
                        )
                      })()}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AddWalkInGuestDialog() {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const addWalkInGuest = useAddWalkInGuest()

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) return
    await addWalkInGuest.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim() })
    toast.success("Invité imprévu ajouté et pointé arrivé.")
    setFirstName("")
    setLastName("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Invité imprévu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Invité non prévu</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pour une personne qui se présente sans être sur la liste — elle sera ajoutée et pointée arrivée
          immédiatement.
        </p>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="walkin-first-name">Prénom</FieldLabel>
            <Input id="walkin-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="walkin-last-name">Nom</FieldLabel>
            <Input id="walkin-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!firstName.trim() || !lastName.trim()}>
            Ajouter et marquer arrivé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
