import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Camera, ChevronDown, ChevronRight, Clock, Copy, GripVertical, Pencil, Plus, Star, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import type { Guest, Person, PhotoGroup, PhotoGroupMember, PhotoGroupStatus, PhotoSession } from "@/types/domain"
import { useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { estimatePhotoDurationSeconds, formatDuration } from "@/lib/photo-duration"
import {
  useAddPhotoGroupMember,
  useAllPhotoGroupMembers,
  useCreatePhotoGroup,
  useDeletePhotoGroup,
  usePhotoGroups,
  useRemovePhotoGroupMember,
  useReorderPhotoGroups,
  useUpdatePhotoGroup,
} from "@/hooks/queries/use-photo-groups"
import {
  useCreatePhotoSession,
  useDeletePhotoSession,
  usePhotoSessions,
  useReorderPhotoSessions,
  useUpdatePhotoSession,
} from "@/hooks/queries/use-photo-sessions"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"

const STATUS_LABELS: Record<PhotoGroupStatus, string> = {
  pending: "À faire",
  done: "Faite",
  skipped: "Passée",
}

function GroupDialog({
  group,
  sessionId,
  nextSortOrder,
  fiances,
}: {
  group?: PhotoGroup
  sessionId: string
  nextSortOrder?: number
  fiances: Person[]
}) {
  const allFianceIds = useMemo(() => fiances.map((f) => f.id), [fiances])
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(group?.label ?? "")
  const [notes, setNotes] = useState(group?.notes ?? "")
  const [isPriority, setIsPriority] = useState(group?.isPriority ?? false)
  const [requiredFianceIds, setRequiredFianceIds] = useState<string[]>(
    group?.requiredFianceIds.length ? group.requiredFianceIds : allFianceIds
  )
  const createGroup = useCreatePhotoGroup()
  const updateGroup = useUpdatePhotoGroup()

  function resetForCreate() {
    setLabel("")
    setNotes("")
    setIsPriority(false)
    setRequiredFianceIds(allFianceIds)
  }

  function toggleFiance(fianceId: string) {
    setRequiredFianceIds((current) =>
      current.includes(fianceId) ? current.filter((id) => id !== fianceId) : [...current, fianceId]
    )
  }

  async function handleSubmit() {
    if (!label.trim()) return
    if (group) {
      await updateGroup.mutateAsync({
        id: group.id,
        patch: { label: label.trim(), notes: notes.trim() || null, isPriority, requiredFianceIds },
      })
      toast.success("Groupe mis à jour.")
    } else {
      await createGroup.mutateAsync({
        sessionId,
        label: label.trim(),
        notes: notes.trim() || null,
        isPriority,
        status: "pending",
        sortOrder: nextSortOrder ?? 0,
        requiredFianceIds,
      })
      toast.success("Groupe créé.")
      resetForCreate()
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {group ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="Modifier le groupe">
                <Pencil className="size-3.5" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Modifier</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-3.5" />
            Nouveau groupe
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">{group ? "Modifier le groupe" : "Nouveau groupe de photo"}</DialogTitle>
          <DialogDescription>Décrivez le reste du groupe attendu pour cette photo.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="pg-label">Nom du groupe</FieldLabel>
            <Input
              id="pg-label"
              placeholder="Ex. Famille proche de Sarah"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pg-notes">Notes (optionnel)</FieldLabel>
            <Textarea
              id="pg-notes"
              rows={3}
              placeholder="Ex. Inclure les grands-parents s'ils sont disponibles"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Prioritaire</p>
              <p className="text-xs text-muted-foreground">
                À signaler en premier au photographe si le temps manque le jour J.
              </p>
            </div>
            <Switch checked={isPriority} onCheckedChange={setIsPriority} />
          </div>
          {fiances.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Fiancés requis</p>
                <p className="text-xs text-muted-foreground">Qui doit être présent sur cette photo.</p>
              </div>
              <div className="space-y-1.5">
                {fiances.map((fiance) => (
                  <label key={fiance.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={requiredFianceIds.includes(fiance.id)}
                      onCheckedChange={() => toggleFiance(fiance.id)}
                    />
                    <span className="text-foreground">{fiance.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>{group ? "Enregistrer" : "Créer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDeleteGroupButton({ group }: { group: PhotoGroup }) {
  const [open, setOpen] = useState(false)
  const deleteGroup = useDeletePhotoGroup()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Supprimer le groupe">
              <Trash2 className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Supprimer</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Supprimer ce groupe ?</DialogTitle>
          <DialogDescription>
            « {group.label} » et sa liste d'invités attendus seront définitivement supprimés.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              deleteGroup.mutate(group.id)
              setOpen(false)
            }}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DuplicateGroupButton({
  group,
  members,
  allGroups,
}: {
  group: PhotoGroup
  members: PhotoGroupMember[]
  allGroups: PhotoGroup[]
}) {
  const createGroup = useCreatePhotoGroup()
  const addMember = useAddPhotoGroupMember()
  const reorderGroups = useReorderPhotoGroups()

  async function handleDuplicate() {
    const duplicate = await createGroup.mutateAsync({
      sessionId: group.sessionId,
      label: `${group.label} (copie)`,
      notes: group.notes,
      isPriority: group.isPriority,
      status: "pending",
      sortOrder: group.sortOrder,
      requiredFianceIds: group.requiredFianceIds,
    })
    await Promise.all(members.map((m) => addMember.mutateAsync({ photoGroupId: duplicate.id, guestId: m.guestId })))

    const originalIndex = allGroups.findIndex((g) => g.id === group.id)
    const reordered = [
      ...allGroups.slice(0, originalIndex + 1),
      duplicate,
      ...allGroups.slice(originalIndex + 1),
    ].map((g, index) => ({ ...g, sortOrder: index }))
    await reorderGroups.mutateAsync(reordered)

    toast.success("Groupe dupliqué.")
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Dupliquer le groupe" onClick={handleDuplicate}>
          <Copy className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Dupliquer</TooltipContent>
    </Tooltip>
  )
}

const NO_FAMILY = "__no_family__"
const ALL_FAMILIES = "__all_families__"
const SELECTED_ZONE = "__selected__"
const UNSELECTED_ZONE = "__unselected__"

function GuestDragRow({ guest, selected, onToggle }: { guest: Guest; selected: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id })
  return (
    <div
      ref={setNodeRef}
      className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50", isDragging && "opacity-40")}
    >
      <button
        type="button"
        aria-label="Déplacer"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <Checkbox checked={selected} onCheckedChange={onToggle} />
        <span className="truncate text-foreground">{guest.fullName}</span>
      </label>
    </div>
  )
}

function MemberDropColumn({
  id,
  title,
  count,
  action,
  children,
}: {
  id: string
  title: string
  count: number
  action: React.ReactNode
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn("flex flex-col rounded-lg border border-border transition-shadow", isOver && "ring-2 ring-primary")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {title} ({count})
        </p>
        {action}
      </div>
      <ScrollArea className="h-80">
        <div className="space-y-0.5 p-2">{children}</div>
      </ScrollArea>
    </div>
  )
}

function MembersDialog({ group, members, guests }: { group: PhotoGroup; members: PhotoGroupMember[]; guests: Guest[] }) {
  const { data: guestGroups } = useGuestGroups()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [familyFilter, setFamilyFilter] = useState(ALL_FAMILIES)
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null)
  const addMember = useAddPhotoGroupMember()
  const removeMember = useRemovePhotoGroupMember()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const memberByGuestId = useMemo(() => new Map(members.map((m) => [m.guestId, m])), [members])

  const familyOptions = useMemo(() => {
    const usedGroupIds = new Set(guests.map((g) => g.groupId).filter((id): id is string => Boolean(id)))
    const hasUngrouped = guests.some((g) => !g.groupId)
    const options = (guestGroups ?? [])
      .filter((fg) => usedGroupIds.has(fg.id))
      .map((fg) => ({ value: fg.id, label: fg.familyName }))
    if (hasUngrouped) options.push({ value: NO_FAMILY, label: "Sans famille" })
    return options
  }, [guests, guestGroups])

  const query = search.trim().toLowerCase()
  const filteredGuests = useMemo(
    () =>
      guests
        .filter((g) => !query || g.fullName.toLowerCase().includes(query))
        .filter((g) => {
          if (familyFilter === ALL_FAMILIES) return true
          if (familyFilter === NO_FAMILY) return !g.groupId
          return g.groupId === familyFilter
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [guests, query, familyFilter]
  )

  const unselectedGuests = filteredGuests.filter((g) => !memberByGuestId.has(g.id))
  const selectedGuests = filteredGuests.filter((g) => memberByGuestId.has(g.id))

  function toggle(guestId: string) {
    const existing = memberByGuestId.get(guestId)
    if (existing) removeMember.mutate(existing.id)
    else addMember.mutate({ photoGroupId: group.id, guestId })
  }

  async function addAllFiltered() {
    await Promise.all(unselectedGuests.map((g) => addMember.mutateAsync({ photoGroupId: group.id, guestId: g.id })))
  }

  async function removeAllFiltered() {
    await Promise.all(
      selectedGuests.map((g) => {
        const existing = memberByGuestId.get(g.id)
        return existing ? removeMember.mutateAsync(existing.id) : Promise.resolve()
      })
    )
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveGuest(guests.find((g) => g.id === event.active.id) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGuest(null)
    const { active, over } = event
    if (!over) return
    const guestId = String(active.id)
    const isMember = memberByGuestId.has(guestId)
    if (over.id === SELECTED_ZONE && !isMember) {
      addMember.mutate({ photoGroupId: group.id, guestId })
    } else if (over.id === UNSELECTED_ZONE && isMember) {
      const existing = memberByGuestId.get(guestId)
      if (existing) removeMember.mutate(existing.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-7 gap-1.5 px-2 text-xs", members.length === 0 && "border-bordeaux/40 text-bordeaux")}
            >
              <Users className="size-3.5" />
              {members.length}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Invités attendus sur cette photo</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Invités attendus — {group.label}</DialogTitle>
          <DialogDescription>
            Les fiancés requis sont gérés depuis le bouton « Modifier le groupe ». Glissez-déposez les invités entre
            les deux colonnes, ou cochez-les directement.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher un invité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select value={familyFilter} onValueChange={setFamilyFilter}>
            <SelectTrigger className="w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FAMILIES}>Toutes les familles</SelectItem>
              {familyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveGuest(null)}
        >
          <div className="grid grid-cols-2 gap-3">
            <MemberDropColumn
              id={UNSELECTED_ZONE}
              title="À sélectionner"
              count={unselectedGuests.length}
              action={
                <button
                  type="button"
                  onClick={addAllFiltered}
                  disabled={unselectedGuests.length === 0}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  Tout ajouter
                </button>
              }
            >
              {unselectedGuests.map((guest) => (
                <GuestDragRow key={guest.id} guest={guest} selected={false} onToggle={() => toggle(guest.id)} />
              ))}
              {unselectedGuests.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucun invité.</p>
              ) : null}
            </MemberDropColumn>

            <MemberDropColumn
              id={SELECTED_ZONE}
              title="Sélectionnés"
              count={selectedGuests.length}
              action={
                <button
                  type="button"
                  onClick={removeAllFiltered}
                  disabled={selectedGuests.length === 0}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  Tout retirer
                </button>
              }
            >
              {selectedGuests.map((guest) => (
                <GuestDragRow key={guest.id} guest={guest} selected onToggle={() => toggle(guest.id)} />
              ))}
              {selectedGuests.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucun invité sélectionné.</p>
              ) : null}
            </MemberDropColumn>
          </div>
          <DragOverlay>
            {activeGuest ? (
              <div className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground shadow-lg">
                {activeGuest.fullName}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <DialogFooter className="mt-2">
          <Button onClick={() => setOpen(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GroupRow({
  group,
  members,
  guests,
  fiances,
  allGroups,
}: {
  group: PhotoGroup
  members: PhotoGroupMember[]
  guests: Guest[]
  fiances: Person[]
  allGroups: PhotoGroup[]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    data: { type: "group" as const, sessionId: group.sessionId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const updateGroup = useUpdatePhotoGroup()
  const requiredFiances = group.requiredFianceIds.length
    ? fiances.filter((f) => group.requiredFianceIds.includes(f.id))
    : fiances
  const estimatedSeconds = estimatePhotoDurationSeconds(members.length + requiredFiances.length, group.label)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        aria-label="Réordonner"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={group.isPriority ? "Retirer la priorité" : "Marquer prioritaire"}
            onClick={() => updateGroup.mutate({ id: group.id, patch: { isPriority: !group.isPriority } })}
          >
            <Star className={cn("size-3.5", group.isPriority ? "fill-dore text-dore" : "text-muted-foreground")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{group.isPriority ? "Prioritaire" : "Marquer prioritaire"}</TooltipContent>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{group.label}</p>
        {group.notes ? <p className="truncate text-xs text-muted-foreground">{group.notes}</p> : null}
        {requiredFiances.length < fiances.length ? (
          <p className="truncate text-xs text-muted-foreground">
            {requiredFiances.length > 0 ? requiredFiances.map((f) => f.fullName).join(" et ") : "Aucun fiancé"}
          </p>
        ) : null}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {formatDuration(estimatedSeconds)}
          </span>
        </TooltipTrigger>
        <TooltipContent>Durée estimée avant la séance (s'affine en direct le jour J)</TooltipContent>
      </Tooltip>

      <Select
        value={group.status}
        onValueChange={(value: PhotoGroupStatus) => updateGroup.mutate({ id: group.id, patch: { status: value } })}
      >
        <SelectTrigger size="sm" className="h-7 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(STATUS_LABELS) as PhotoGroupStatus[]).map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <MembersDialog group={group} members={members} guests={guests} />
      <GroupDialog group={group} sessionId={group.sessionId} fiances={fiances} />
      <DuplicateGroupButton group={group} members={members} allGroups={allGroups} />
      <ConfirmDeleteGroupButton group={group} />
    </div>
  )
}

function SessionPeoplePanel({
  groups,
  membersByGroupId,
  guests,
  fiances,
}: {
  groups: PhotoGroup[]
  membersByGroupId: Map<string, PhotoGroupMember[]>
  guests: Guest[]
  fiances: Person[]
}) {
  const [open, setOpen] = useState(false)

  const participants = useMemo(() => {
    if (groups.length === 0) return []
    const guestById = new Map(guests.map((g) => [g.id, g]))

    const guestLastIdx = new Map<string, number>()
    groups.forEach((group, idx) => {
      for (const m of membersByGroupId.get(group.id) ?? []) {
        if (idx > (guestLastIdx.get(m.guestId) ?? -1)) guestLastIdx.set(m.guestId, idx)
      }
    })

    const fianceLastIdx = new Map<string, number>()
    groups.forEach((group, idx) => {
      const reqIds = group.requiredFianceIds.length > 0 ? group.requiredFianceIds : fiances.map((f) => f.id)
      for (const fianceId of reqIds) {
        if (idx > (fianceLastIdx.get(fianceId) ?? -1)) fianceLastIdx.set(fianceId, idx)
      }
    })

    const result: { name: string; lastGroupIdx: number; isFiance: boolean }[] = []
    for (const [guestId, lastIdx] of guestLastIdx) {
      const g = guestById.get(guestId)
      if (g) result.push({ name: g.fullName, lastGroupIdx: lastIdx, isFiance: false })
    }
    for (const [fianceId, lastIdx] of fianceLastIdx) {
      const f = fiances.find((p) => p.id === fianceId)
      if (f) result.push({ name: f.fullName, lastGroupIdx: lastIdx, isFiance: true })
    }

    return result.sort((a, b) => {
      const d = a.lastGroupIdx - b.lastGroupIdx
      return d !== 0 ? d : a.name.localeCompare(b.name, "fr")
    })
  }, [groups, membersByGroupId, guests, fiances])

  if (participants.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-foreground"
      >
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        <Users className="size-3.5 shrink-0" />
        <span>{participants.length} personne{participants.length > 1 ? "s" : ""} attendue{participants.length > 1 ? "s" : ""}</span>
      </button>

      {open && (
        <div className="space-y-0.5">
          {participants.map((p, i) => {
            const lastGroup = groups[p.lastGroupIdx]
            const isLast = p.lastGroupIdx === groups.length - 1
            return (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1">
                <span className={cn("truncate text-xs font-medium", p.isFiance ? "text-bordeaux" : "text-foreground")}>
                  {p.name}
                </span>
                {!isLast && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    jusqu'à « {lastGroup.label} »
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SessionDialog({ session, nextSortOrder }: { session?: PhotoSession; nextSortOrder?: number }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(session?.label ?? "")
  const createSession = useCreatePhotoSession()
  const updateSession = useUpdatePhotoSession()

  async function handleSubmit() {
    if (!label.trim()) return
    if (session) {
      await updateSession.mutateAsync({ id: session.id, patch: { label: label.trim() } })
      toast.success("Séance renommée.")
    } else {
      await createSession.mutateAsync({ label: label.trim(), sortOrder: nextSortOrder ?? 0 })
      toast.success("Séance créée.")
      setLabel("")
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {session ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="Renommer la séance">
                <Pencil className="size-3.5" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Renommer</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="size-3.5" />
            Nouvelle séance
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">{session ? "Renommer la séance" : "Nouvelle séance"}</DialogTitle>
          <DialogDescription>
            Une séance regroupe plusieurs photos sous un même nom (ex. « Avant cérémonie », « Cocktail »).
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="ps-label">Nom de la séance</FieldLabel>
          <Input
            id="ps-label"
            placeholder="Ex. Avant cérémonie"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>{session ? "Enregistrer" : "Créer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDeleteSessionButton({ session, groupCount }: { session: PhotoSession; groupCount: number }) {
  const [open, setOpen] = useState(false)
  const deleteSession = useDeletePhotoSession()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Supprimer la séance">
              <Trash2 className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Supprimer</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Supprimer cette séance ?</DialogTitle>
          <DialogDescription>
            « {session.label} »
            {groupCount > 0 ? ` et ${groupCount} groupe${groupCount === 1 ? "" : "s"} de photo` : ""} seront
            définitivement supprimés.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              deleteSession.mutate(session.id)
              setOpen(false)
            }}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SessionSection({
  session,
  groups,
  membersByGroupId,
  guests,
  fiances,
}: {
  session: PhotoSession
  groups: PhotoGroup[]
  membersByGroupId: Map<string, PhotoGroupMember[]>
  guests: Guest[]
  fiances: Person[]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: session.id,
    data: { type: "session" as const },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const sessionEstimatedSeconds = useMemo(() => {
    return groups.reduce((sum, group) => {
      const requiredFiances = group.requiredFianceIds.length
        ? fiances.filter((f) => group.requiredFianceIds.includes(f.id))
        : fiances
      const personCount = (membersByGroupId.get(group.id) ?? []).length + requiredFiances.length
      return sum + estimatePhotoDurationSeconds(personCount, group.label)
    }, 0)
  }, [groups, membersByGroupId, fiances])

  // For each group index: list of people whose last group in this session is that index.
  // People in the very last group are excluded (session ends for everyone simultaneously).
  const freedAfterIdx = useMemo(() => {
    const lastIdx = groups.length - 1
    const guestById = new Map(guests.map((g) => [g.id, g]))

    const guestLastIdx = new Map<string, number>()
    groups.forEach((group, idx) => {
      for (const m of membersByGroupId.get(group.id) ?? []) {
        if (idx > (guestLastIdx.get(m.guestId) ?? -1)) guestLastIdx.set(m.guestId, idx)
      }
    })

    const fianceLastIdx = new Map<string, number>()
    groups.forEach((group, idx) => {
      const reqIds = group.requiredFianceIds.length > 0 ? group.requiredFianceIds : fiances.map((f) => f.id)
      for (const id of reqIds) {
        if (idx > (fianceLastIdx.get(id) ?? -1)) fianceLastIdx.set(id, idx)
      }
    })

    const result = new Map<number, string[]>()
    for (const [id, idx] of guestLastIdx) {
      if (idx === lastIdx) continue
      const g = guestById.get(id)
      if (!g) continue
      const list = result.get(idx) ?? []
      list.push(g.fullName)
      result.set(idx, list)
    }
    for (const [id, idx] of fianceLastIdx) {
      if (idx === lastIdx) continue
      const f = fiances.find((p) => p.id === id)
      if (!f) continue
      const list = result.get(idx) ?? []
      list.push(f.fullName)
      result.set(idx, list)
    }
    for (const list of result.values()) list.sort((a, b) => a.localeCompare(b, "fr"))
    return result
  }, [groups, membersByGroupId, guests, fiances])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("space-y-2 rounded-xl border border-border p-3", isDragging && "opacity-50")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Réordonner la séance"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <p className="font-heading text-sm text-foreground">{session.label}</p>
        <span className="text-xs text-muted-foreground">({groups.length})</span>
        {groups.length > 0 ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {formatDuration(sessionEstimatedSeconds)}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <GroupDialog sessionId={session.id} nextSortOrder={groups.length} fiances={fiances} />
          <SessionDialog session={session} />
          <ConfirmDeleteSessionButton session={session} groupCount={groups.length} />
        </div>
      </div>

      <SessionPeoplePanel
        groups={groups}
        membersByGroupId={membersByGroupId}
        guests={guests}
        fiances={fiances}
      />

      {groups.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">Aucun groupe de photo dans cette séance.</p>
      ) : (
        <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {groups.map((group, idx) => {
              const freed = freedAfterIdx.get(idx)
              const label = freed
                ? freed.length === 1
                  ? `${freed[0]} est libéré pour cette séance`
                  : freed.length === 2
                    ? `${freed[0]} et ${freed[1]} sont libérés pour cette séance`
                    : `${freed.slice(0, -1).join(", ")} et ${freed[freed.length - 1]} sont libérés pour cette séance`
                : null
              return (
                <div key={group.id}>
                  <GroupRow
                    group={group}
                    members={membersByGroupId.get(group.id) ?? []}
                    guests={guests}
                    fiances={fiances}
                    allGroups={groups}
                  />
                  {label && (
                    <div className="mt-1.5 flex items-center gap-2 px-1">
                      <div className="h-px flex-1 bg-vert-vegetal/20" />
                      <span className="text-[10px] font-medium text-vert-vegetal">{label}</span>
                      <div className="h-px flex-1 bg-vert-vegetal/20" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SortableContext>
      )}
    </div>
  )
}

type DragItemData = { type: "session" } | { type: "group"; sessionId: string }

export function PhotoGroupsManager() {
  const { data: sessions, isLoading: sessionsLoading } = usePhotoSessions()
  const { data: groups, isLoading: groupsLoading } = usePhotoGroups()
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: members, isLoading: membersLoading } = useAllPhotoGroupMembers()
  const { data: people, isLoading: peopleLoading } = usePeople()
  const reorderSessions = useReorderPhotoSessions()
  const reorderGroups = useReorderPhotoGroups()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const isLoading = sessionsLoading || groupsLoading || guestsLoading || membersLoading || peopleLoading
  const fiances = useMemo(() => (people ?? []).filter((p) => p.role === "admin"), [people])

  const sortedSessions = useMemo(() => [...(sessions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [sessions])

  const membersByGroupId = useMemo(() => {
    const map = new Map<string, PhotoGroupMember[]>()
    for (const m of members ?? []) {
      const list = map.get(m.photoGroupId) ?? []
      list.push(m)
      map.set(m.photoGroupId, list)
    }
    return map
  }, [members])

  const groupsBySessionId = useMemo(() => {
    const map = new Map<string, PhotoGroup[]>()
    for (const group of groups ?? []) {
      const list = map.get(group.sessionId) ?? []
      list.push(group)
      map.set(group.sessionId, list)
    }
    for (const [sessionId, list] of map) {
      map.set(
        sessionId,
        [...list].sort((a, b) => a.sortOrder - b.sortOrder)
      )
    }
    return map
  }, [groups])

  const uncoveredGuests = useMemo(() => {
    const coveredIds = new Set((members ?? []).map((m) => m.guestId))
    return (guests ?? []).filter((g) => !coveredIds.has(g.id))
  }, [guests, members])

  const totalGroupCount = groups?.length ?? 0
  const totalEstimatedSeconds = useMemo(() => {
    return (groups ?? []).reduce((sum, group) => {
      const requiredFiances = group.requiredFianceIds.length
        ? fiances.filter((f) => group.requiredFianceIds.includes(f.id))
        : fiances
      const personCount = (membersByGroupId.get(group.id) ?? []).length + requiredFiances.length
      return sum + estimatePhotoDurationSeconds(personCount, group.label)
    }, 0)
  }, [groups, membersByGroupId, fiances])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current as DragItemData | undefined
    if (!activeData) return

    if (activeData.type === "session") {
      if (active.id === over.id) return
      const oldIndex = sortedSessions.findIndex((s) => s.id === active.id)
      const newIndex = sortedSessions.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(sortedSessions, oldIndex, newIndex).map((s, index) => ({ ...s, sortOrder: index }))
      reorderSessions.mutate(reordered)
      return
    }

    // Glisser un groupe : soit une autre position dans sa séance, soit vers
    // une autre séance — déposer sur un groupe vise sa position, déposer sur
    // l'en-tête/le corps d'une séance (peu ou pas de groupes) l'ajoute à la fin.
    const groupId = String(active.id)
    const sourceSessionId = activeData.sessionId
    const overData = over.data.current as DragItemData | undefined

    let destSessionId: string
    let destIndex: number
    if (overData?.type === "group") {
      destSessionId = overData.sessionId
      const destGroups = groupsBySessionId.get(destSessionId) ?? []
      const index = destGroups.findIndex((g) => g.id === over.id)
      destIndex = index === -1 ? destGroups.length : index
    } else if (overData?.type === "session") {
      destSessionId = String(over.id)
      destIndex = (groupsBySessionId.get(destSessionId) ?? []).length
    } else {
      return
    }

    if (destSessionId === sourceSessionId) {
      const sessionGroups = groupsBySessionId.get(sourceSessionId) ?? []
      const oldIndex = sessionGroups.findIndex((g) => g.id === groupId)
      if (oldIndex === -1 || oldIndex === destIndex) return
      const reordered = arrayMove(sessionGroups, oldIndex, destIndex).map((g, index) => ({ ...g, sortOrder: index }))
      reorderGroups.mutate(reordered)
      return
    }

    const movedGroup = (groups ?? []).find((g) => g.id === groupId)
    if (!movedGroup) return

    const sourceRemaining = (groupsBySessionId.get(sourceSessionId) ?? [])
      .filter((g) => g.id !== groupId)
      .map((g, index) => ({ ...g, sortOrder: index }))

    const destGroups = [...(groupsBySessionId.get(destSessionId) ?? [])]
    destGroups.splice(destIndex, 0, { ...movedGroup, sessionId: destSessionId })
    const destReindexed = destGroups.map((g, index) => ({ ...g, sortOrder: index }))

    reorderGroups.mutate([...sourceRemaining, ...destReindexed])
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Camera className="size-4" />
            Photos de groupe
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Organisez vos séances et leur séquencement — précisez quels fiancés sont requis sur chaque photo.
          </p>
          {totalGroupCount > 0 ? (
            <p className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Clock className="size-3.5" />
              Durée totale estimée : {formatDuration(totalEstimatedSeconds)}
            </p>
          ) : null}
        </div>
        <SessionDialog nextSortOrder={sortedSessions.length} />
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : (
          <>
            {uncoveredGuests.length > 0 ? (
              <div className="space-y-1.5 rounded-xl border border-dashed border-bordeaux/40 bg-bordeaux/5 p-3">
                <p className="text-sm font-medium text-bordeaux">
                  {uncoveredGuests.length} invité{uncoveredGuests.length === 1 ? "" : "s"} sans photo de groupe
                </p>
                <p className="text-xs text-muted-foreground">{uncoveredGuests.map((g) => g.fullName).join(", ")}</p>
              </div>
            ) : (guests?.length ?? 0) > 0 && totalGroupCount > 0 ? (
              <p className="text-xs text-vert-vegetal">Tous les invités sont couverts par au moins un groupe. 🎉</p>
            ) : null}

            {sortedSessions.length === 0 ? (
              <EmptyState
                icon={Camera}
                title="Aucune séance pour l'instant"
                description="Créez votre première séance pour commencer à séquencer vos photos."
              />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedSessions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {sortedSessions.map((session) => (
                      <SessionSection
                        key={session.id}
                        session={session}
                        groups={groupsBySessionId.get(session.id) ?? []}
                        membersByGroupId={membersByGroupId}
                        guests={guests ?? []}
                        fiances={fiances}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
