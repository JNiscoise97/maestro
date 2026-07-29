import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { History, Link2, Unlink } from "lucide-react"
import { toast } from "sonner"

import type { Guest, GuestGroup } from "@/types/domain"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RsvpBadge } from "@/components/invites/RsvpBadge"
import { useUpdateGuest, usePairGuests, useUnpairGuest } from "@/hooks/queries/use-guests"

interface GuestTableProps {
  guests: Guest[]
  groupsById: Map<string, GuestGroup>
}

function ageLabel(guest: Guest) {
  if (guest.isChild) return guest.childAge != null ? `${guest.childAge} ans` : "Enfant"
  return guest.ageRange ?? "—"
}

export function GuestTable({ guests, groupsById }: GuestTableProps) {
  const navigate = useNavigate()
  const updateGuest = useUpdateGuest()
  const pairGuests = usePairGuests()
  const unpairGuest = useUnpairGuest()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const allSelected = guests.length > 0 && guests.every((g) => selectedIds.has(g.id))
  const selectedGuests = guests.filter((g) => selectedIds.has(g.id))
  const canTogglePair = selectedGuests.length === 2
  const alreadyPaired = canTogglePair && selectedGuests[0].pairedWithId === selectedGuests[1].id

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(guests.map((g) => g.id)))
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMarkAssignable() {
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) => updateGuest.mutateAsync({ id, patch: { assignable: true } })))
    toast.success(`${ids.length} invité${ids.length === 1 ? "" : "s"} marqué${ids.length === 1 ? "" : "s"} comme assignable.`)
    setSelectedIds(new Set())
  }

  async function handleTogglePair() {
    if (!canTogglePair) return
    const [a, b] = selectedGuests
    if (alreadyPaired) {
      await unpairGuest.mutateAsync(a)
      toast.success(`${a.fullName} et ${b.fullName} ne sont plus inséparables.`)
    } else {
      await pairGuests.mutateAsync({ guestA: a, guestB: b })
      toast.success(`${a.fullName} et ${b.fullName} sont désormais inséparables.`)
    }
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} sélectionné{selectedIds.size === 1 ? "" : "s"}
          </p>
          <Button size="sm" onClick={handleMarkAssignable} disabled={updateGuest.isPending}>
            Marquer comme assignable
          </Button>
          {canTogglePair ? (
            <Button
              size="sm"
              variant={alreadyPaired ? "outline" : "default"}
              onClick={handleTogglePair}
              disabled={pairGuests.isPending || unpairGuest.isPending}
            >
              {alreadyPaired ? (
                <>
                  <Unlink className="size-3.5" />
                  Séparer
                </>
              ) : (
                <>
                  <Link2 className="size-3.5" />
                  Rendre inséparable
                </>
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
            </TableHead>
            <TableHead className="w-56">Invité</TableHead>
            <TableHead className="w-40">Famille</TableHead>
            <TableHead className="w-20">Âge</TableHead>
            <TableHead className="w-32">Présence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.map((guest) => (
            <TableRow
              key={guest.id}
              onClick={() => navigate(`/invites/${guest.id}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(guest.id)}
                  onCheckedChange={() => toggleOne(guest.id)}
                  aria-label={`Sélectionner ${guest.fullName}`}
                />
              </TableCell>
              <TableCell className="truncate font-medium text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  {guest.fullName}
                  {guest.sourceGuestId ? (
                    <Tooltip>
                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <History className={`size-3.5 shrink-0 ${
                          guest.sourceAttendance === "present"  ? "text-emerald-500" :
                          guest.sourceAttendance === "no-show"  ? "text-amber-500"   :
                          guest.sourceAttendance === "declined" ? "text-muted-foreground" :
                          "text-muted-foreground"
                        }`} />
                      </TooltipTrigger>
                      <TooltipContent>
                        {guest.sourceAttendance === "present"  ? "Était présent aux fiançailles" :
                         guest.sourceAttendance === "no-show"  ? "Ne s'est pas présenté·e" :
                         guest.sourceAttendance === "declined" ? "A décliné l'invitation aux fiançailles" :
                         "Était invité aux fiançailles"}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {guest.pairedWithId ? (
                    <Tooltip>
                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Inséparable de {guestsById.get(guest.pairedWithId)?.fullName ?? "un autre invité"}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className="truncate text-sm text-muted-foreground">
                {guest.groupId ? groupsById.get(guest.groupId)?.familyName : "—"}
              </TableCell>
              <TableCell className="truncate text-sm text-muted-foreground">{ageLabel(guest)}</TableCell>
              <TableCell>
                <RsvpBadge status={guest.rsvpStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
