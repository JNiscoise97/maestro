import type { ChecklistOwnerType, Guest, Person } from "@/types/domain"
import {
  useChecklistsForOwner,
  useChecklistItems,
  useToggleChecklistItem,
  useUpdateChecklist,
  useUpdateChecklistItem,
} from "@/hooks/queries/use-checklists"
import { usePeople } from "@/hooks/queries/use-people"
import { useGuests } from "@/hooks/queries/use-guests"
import { useIdentity } from "@/context/IdentityContext"
import { useLogAssigneeChange } from "@/hooks/queries/use-assignee-history"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ItemScheduleTrigger } from "@/components/missions/ItemScheduleDialog"
import { ItemMessageTrigger } from "@/components/missions/ItemMessageDialog"

const NONE = "__none__"

interface ChecklistWidgetProps {
  ownerType: ChecklistOwnerType
  ownerId: string
  /** Permet à un fiancé de se déléguer la checklist (select Sarah/Jordan) — désactivé sur certaines pages où ça n'a pas sa place (ex. /missions). */
  allowAssignment?: boolean
  /** Affiche l'icône de planification sur chaque item (phases installation/jour_j/désinstallation). */
  schedulable?: boolean
  /** Responsable hérité (mission → domaine → pôle) — affiché en placeholder quand l'item n'a pas d'assigné propre. */
  inheritedResponsable?: string
}

function SingleChecklist({
  checklistId,
  title,
  showTitle,
  responsiblePersonId,
  canAssign,
  fiances,
  schedulable,
  guests,
  inheritedResponsable,
  logChange,
}: {
  checklistId: string
  title: string | null
  showTitle: boolean
  responsiblePersonId: string | null
  canAssign: boolean
  fiances: Person[]
  schedulable?: boolean
  guests: Guest[]
  inheritedResponsable?: string
  logChange: ReturnType<typeof useLogAssigneeChange>
}) {
  const { data: items, isLoading } = useChecklistItems(checklistId)
  const toggleItem = useToggleChecklistItem()
  const updateChecklist = useUpdateChecklist()
  const updateItem = useUpdateChecklistItem()
  const responsible = fiances.find((f) => f.id === responsiblePersonId)

  if (isLoading || !items) return <Skeleton className="h-20 rounded-xl" />

  const doneCount = items.filter((item) => item.isDone).length
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {showTitle ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
          {canAssign ? (
            <Select
              value={responsiblePersonId ?? NONE}
              onValueChange={(value) =>
                updateChecklist.mutate({
                  id: checklistId,
                  patch: { responsiblePersonId: value === NONE ? null : value },
                })
              }
            >
              <SelectTrigger size="sm" className="h-6 w-44 border-dashed text-xs">
                <SelectValue placeholder="Assigner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non assigné</SelectItem>
                {fiances.map((fiance) => (
                  <SelectItem key={fiance.id} value={fiance.id}>
                    {fiance.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : responsible ? (
            <Badge className="bg-bordeaux/10 text-bordeaux">{responsible.fullName}</Badge>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {doneCount} / {items.length}
        </span>
      </div>
      <Progress value={progress} />
      <ul className="space-y-1.5">
        {items.map((item) => {
          const assigneeGuest  = guests.find((g) => g.id === item.assigneeGuestId)
          const assigneePerson = fiances.find((f) => f.id === item.assigneePersonId)
          const assignee       = assigneeGuest ?? assigneePerson
          const currentValue   = item.assigneeGuestId
            ? `guest:${item.assigneeGuestId}`
            : item.assigneePersonId
            ? `person:${item.assigneePersonId}`
            : NONE
          return (
            <li key={item.id} className="flex items-center gap-2">
              <Checkbox
                id={item.id}
                checked={item.isDone}
                onCheckedChange={(checked) => toggleItem.mutate({ itemId: item.id, isDone: checked === true })}
              />
              <label
                htmlFor={item.id}
                className={item.isDone ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm text-foreground"}
              >
                {item.label}
              </label>
              {(guests.length > 0 || fiances.length > 0) && (
                <Select
                  value={currentValue}
                  onValueChange={(val) => {
                    const prevName = assignee?.fullName ?? null
                    const [kind, id] = val.split(":")
                    const newName = val === NONE ? null
                      : (kind === "person"
                          ? fiances.find((f) => f.id === id)
                          : guests.find((g) => g.id === id))?.fullName ?? null
                    logChange({ entityType: "checklist_item", entityId: item.id, entityLabel: item.label, previousName: prevName, newName })
                    updateItem.mutate({
                      id: item.id,
                      patch: val === NONE
                        ? { assigneeGuestId: null, assigneePersonId: null }
                        : kind === "person"
                        ? { assigneePersonId: id, assigneeGuestId: null }
                        : { assigneeGuestId: id, assigneePersonId: null },
                    })
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className={`h-6 w-auto max-w-32 shrink-0 border-dashed text-xs${!assignee && inheritedResponsable ? " text-muted-foreground/60" : ""}`}
                  >
                    <SelectValue placeholder="—">
                      {assignee
                        ? assignee.fullName.split(" ")[0]
                        : inheritedResponsable
                        ? `↑ ${inheritedResponsable.split(" ")[0]}`
                        : "—"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      {inheritedResponsable ? `— (hérite : ${inheritedResponsable})` : "—"}
                    </SelectItem>
                    {fiances.length > 0 && (
                      <>
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fiancés</p>
                        {fiances.map((f) => (
                          <SelectItem key={f.id} value={`person:${f.id}`}>{f.fullName}</SelectItem>
                        ))}
                      </>
                    )}
                    {guests.length > 0 && (
                      <>
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invités</p>
                        {guests.map((g) => (
                          <SelectItem key={g.id} value={`guest:${g.id}`}>{g.fullName}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
              {schedulable && <ItemScheduleTrigger item={item} />}
              <ItemMessageTrigger item={item} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ChecklistWidget({ ownerType, ownerId, allowAssignment = true, schedulable, inheritedResponsable }: ChecklistWidgetProps) {
  const { data: checklists, isLoading } = useChecklistsForOwner(ownerType, ownerId)
  const { data: people } = usePeople()
  const { data: guestsData } = useGuests()
  const { person } = useIdentity()
  const logChange = useLogAssigneeChange()

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />
  if (!checklists || checklists.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune checklist pour le moment.</p>
  }

  // Quand il n'y a qu'une seule checklist pour ce propriétaire, son titre fait
  // doublon avec le titre déjà affiché par l'appelant (mission, élément de
  // logistique...) — on ne le réaffiche que s'il y en a plusieurs (ex.
  // Coordinateur général, qui a 3 checklists distinctes pour la même mission).
  const showTitle = checklists.length > 1
  const fiances = (people ?? []).filter((p) => p.role === "fiance")
  const canAssign = allowAssignment && person?.role === "fiance"
  const assignableGuests = (guestsData ?? []).filter((g) => g.assignable)

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => (
        <SingleChecklist
          key={checklist.id}
          checklistId={checklist.id}
          title={checklist.title ?? null}
          showTitle={showTitle}
          responsiblePersonId={checklist.responsiblePersonId ?? null}
          canAssign={canAssign}
          fiances={fiances}
          schedulable={schedulable}
          guests={assignableGuests}
          inheritedResponsable={inheritedResponsable}
          logChange={logChange}
        />
      ))}
    </div>
  )
}
