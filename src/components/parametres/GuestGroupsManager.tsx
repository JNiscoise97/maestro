import { useMemo, useState } from "react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, Pencil, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import type { GuestGroup, GuestSide } from "@/types/domain"
import {
  useCreateGuestGroup,
  useDeleteGuestGroup,
  useGuestGroups,
  useGuests,
  useReorderGuestGroups,
  useUpdateGuestGroup,
} from "@/hooks/queries/use-guests"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"

const NONE_SIDE = "__none__"

interface GroupFormState {
  familyName: string
  notes: string
  side: GuestSide | typeof NONE_SIDE
}

function GroupDialog({
  group,
  nextSortOrder,
  trigger,
}: {
  group?: GuestGroup
  nextSortOrder?: number
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<GroupFormState>({
    familyName: group?.familyName ?? "",
    notes: group?.notes ?? "",
    side: group?.side ?? NONE_SIDE,
  })
  const createGroup = useCreateGuestGroup()
  const updateGroup = useUpdateGuestGroup()

  async function handleSubmit() {
    if (!form.familyName.trim()) return
    const side = form.side === NONE_SIDE ? null : form.side
    if (group) {
      await updateGroup.mutateAsync({
        id: group.id,
        patch: { familyName: form.familyName.trim(), notes: form.notes.trim() || null, side },
      })
      toast.success("Groupe mis à jour.")
    } else {
      await createGroup.mutateAsync({
        familyName: form.familyName.trim(),
        notes: form.notes.trim() || null,
        sortOrder: nextSortOrder ?? 0,
        side,
      })
      toast.success("Groupe créé.")
      setForm({ familyName: "", notes: "", side: NONE_SIDE })
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{group ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="group-name">Nom de la famille / du groupe</FieldLabel>
            <Input
              id="group-name"
              value={form.familyName}
              onChange={(e) => setForm((f) => ({ ...f, familyName: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Côté</FieldLabel>
            <Select value={form.side} onValueChange={(v) => setForm((f) => ({ ...f, side: v as GuestSide | typeof NONE_SIDE }))}>
              <SelectTrigger><SelectValue placeholder="Non précisé" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SIDE}>Non précisé</SelectItem>
                <SelectItem value="jordan">Côté Jordan</SelectItem>
                <SelectItem value="sarah">Côté Sarah</SelectItem>
                <SelectItem value="both">Les deux</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="group-notes">Notes</FieldLabel>
            <Textarea
              id="group-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!form.familyName.trim()}>
            {group ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDeleteGroupButton({ group, guestCount }: { group: GuestGroup; guestCount: number }) {
  const [open, setOpen] = useState(false)
  const deleteGroup = useDeleteGuestGroup()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Supprimer le groupe">
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Supprimer ce groupe ?</DialogTitle>
          <DialogDescription>
            « {group.familyName} » sera supprimé.
            {guestCount > 0
              ? ` ${guestCount} invité${guestCount === 1 ? "" : "s"} actuellement dans ce groupe ne ${
                  guestCount === 1 ? "sera" : "seront"
                } pas supprimé${guestCount === 1 ? "" : "s"}, juste détaché${guestCount === 1 ? "" : "s"} (sans famille).`
              : ""}
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

function GroupRow({ group, guestCount }: { group: GuestGroup; guestCount: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Réordonner"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="truncate text-sm text-foreground">{group.familyName}</span>
        <Badge variant="outline" className="shrink-0 gap-1 text-xs text-muted-foreground">
          <Users className="size-3" />
          {guestCount}
        </Badge>
        {group.side && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
            {group.side === "jordan" ? "Côté Jordan" : group.side === "sarah" ? "Côté Sarah" : "Les deux"}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <GroupDialog
          group={group}
          trigger={
            <Button variant="ghost" size="icon-xs" aria-label="Modifier">
              <Pencil className="size-3.5" />
            </Button>
          }
        />
        <ConfirmDeleteGroupButton group={group} guestCount={guestCount} />
      </div>
    </div>
  )
}

export function GuestGroupsManager() {
  const { data: groups, isLoading: groupsLoading } = useGuestGroups()
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const reorderGroups = useReorderGuestGroups()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const isLoading = groupsLoading || guestsLoading

  const guestCountByGroupId = useMemo(() => {
    const map = new Map<string, number>()
    for (const guest of guests ?? []) {
      if (!guest.groupId) continue
      map.set(guest.groupId, (map.get(guest.groupId) ?? 0) + 1)
    }
    return map
  }, [guests])

  const sortedGroups = useMemo(() => [...(groups ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [groups])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedGroups.findIndex((g) => g.id === active.id)
    const newIndex = sortedGroups.findIndex((g) => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(sortedGroups, oldIndex, newIndex).map((g, index) => ({ ...g, sortOrder: index }))
    reorderGroups.mutate(reordered)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-heading text-base">Groupes / familles d&apos;invités</CardTitle>
        <GroupDialog
          nextSortOrder={sortedGroups.length}
          trigger={
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Nouveau groupe
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : sortedGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun groupe pour l&apos;instant.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedGroups.map((group) => (
                  <GroupRow key={group.id} group={group} guestCount={guestCountByGroupId.get(group.id) ?? 0} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
