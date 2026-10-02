import { useMemo, useState } from "react"
import type { ChecklistItem, ChecklistOwnerType, Guest, Person } from "@/types/domain"
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
import { ChecklistItemDialog } from "@/components/parametres/ChecklistItemDialog"
import { useMilestones } from "@/hooks/queries/use-milestones"
import { useItemSequenceProgress } from "@/hooks/use-item-sequence-progress"
import {
  ITEM_STATE_LABELS, ITEM_STATE_TEXT, NEXT_SEQ_STATUS, SEQ_STATUS_LABELS, dateState, formatDate, toIso,
} from "@/lib/retroplanning"
import { cn } from "@/lib/utils"
import { SequenceDot } from "@/components/shared/SequenceName"
import { ItemRetroPopover } from "@/components/missions/RetroEditors"

const NONE = "__none__"

/** Valeur de filtre « sans jalon » / « sans séquence ». */
export const FILTER_NONE = "__none__"

interface ChecklistWidgetProps {
  ownerType: ChecklistOwnerType
  ownerId: string
  /** Permet à un fiancé de se déléguer la checklist (select Sarah/Jordan) — désactivé sur certaines pages où ça n'a pas sa place (ex. /missions). */
  allowAssignment?: boolean
  /** Affiche l'icône de planification sur chaque item (phases installation/jour_j/désinstallation). */
  schedulable?: boolean
  /** Responsable hérité (mission → domaine → pôle) — affiché en placeholder quand l'item n'a pas d'assigné propre. */
  inheritedResponsable?: string
  /** Affiche le rétroplanning sur chaque item (jalon, dates, état, criticité) + édition de l'item. */
  showRetro?: boolean
  /** Ne garde que les items de ce jalon (id) ou sans jalon (FILTER_NONE). */
  filterMilestoneId?: string | null
  /** Concentre l'affichage et la case des items sur cette séquence (id). */
  filterSequenceId?: string | null
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
  ownerType,
  showRetro,
  filterMilestoneId,
  filterSequenceId,
}: {
  ownerType: ChecklistOwnerType
  showRetro?: boolean
  filterMilestoneId?: string | null
  filterSequenceId?: string | null
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
  const seqProgress = useItemSequenceProgress()
  const { data: milestones = [] } = useMilestones()
  const milestoneById = useMemo(() => new Map(milestones.map((m) => [m.id, m])), [milestones])
  const [today] = useState(() => toIso(new Date()))
  const isMission = ownerType === "mission"

  if (isLoading || !items) return <Skeleton className="h-20 rounded-xl" />

  const visibleItems = items.filter((item) =>
    !filterMilestoneId
    || (filterMilestoneId === FILTER_NONE ? !item.milestoneId : item.milestoneId === filterMilestoneId))

  /** Séquences de l'item (mission) et séquence ciblée par le filtre, si l'item la porte. */
  function sequencesOf(item: ChecklistItem) {
    const all = isMission ? seqProgress.sequencesForItem(item) : []
    const focused = filterSequenceId ? all.find((s) => s.id === filterSequenceId) : undefined
    return { all, focused }
  }
  /** « Fait » au sens de l'affichage : pour la séquence filtrée si elle existe, sinon l'item. */
  function isShownDone(item: ChecklistItem) {
    const { focused } = sequencesOf(item)
    return focused ? seqProgress.statusOf(item, focused.id) !== "todo" : item.isDone
  }
  function onCheck(item: ChecklistItem, checked: boolean) {
    const { all, focused } = sequencesOf(item)
    if (focused) {
      seqProgress.setSequenceStatuses([{ item, sequenceId: focused.id, status: checked ? "done" : "todo" }])
    } else if (all.length > 0) {
      seqProgress.setItemAll(item, checked)
    } else {
      toggleItem.mutate({ itemId: item.id, isDone: checked })
    }
  }

  const doneCount = visibleItems.filter(isShownDone).length
  const progress = visibleItems.length > 0 ? Math.round((doneCount / visibleItems.length) * 100) : 0

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
          {doneCount} / {visibleItems.length}
        </span>
      </div>
      <Progress value={progress} />
      <ul className="space-y-1.5">
        {visibleItems.map((item) => {
          const assigneeGuest  = guests.find((g) => g.id === item.assigneeGuestId)
          const assigneePerson = fiances.find((f) => f.id === item.assigneePersonId)
          const assignee       = assigneeGuest ?? assigneePerson
          const currentValue   = item.assigneeGuestId
            ? `guest:${item.assigneeGuestId}`
            : item.assigneePersonId
            ? `person:${item.assigneePersonId}`
            : NONE
          return (
            <li key={item.id} className="flex items-start gap-2">
              <Checkbox
                id={item.id}
                className="mt-0.5"
                checked={isShownDone(item)}
                onCheckedChange={(checked) => onCheck(item, checked === true)}
              />
              <ItemBody
                item={item}
                done={isShownDone(item)}
                showRetro={showRetro}
                today={today}
                milestone={item.milestoneId ? milestoneById.get(item.milestoneId) : undefined}
                sequences={sequencesOf(item)}
                statusOf={(seqId) => seqProgress.statusOf(item, seqId)}
                onCycle={(seqId) => seqProgress.setSequenceStatuses([
                  { item, sequenceId: seqId, status: NEXT_SEQ_STATUS[seqProgress.statusOf(item, seqId)] },
                ])}
              />
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
              {showRetro && <ChecklistItemDialog item={item} checklistId={item.checklistId} />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Libellé + rétroplanning + pastilles de séquences d'un item. */
function ItemBody({ item, done, showRetro, today, milestone, sequences, statusOf, onCycle }: {
  item: ChecklistItem
  done: boolean
  showRetro?: boolean
  today: string
  milestone?: { name: string; sortOrder: number; targetDate: string }
  sequences: {
    all: { id: string; name: string; color?: string | null; sortOrder?: number }[]
    focused?: { id: string; name: string; color?: string | null; sortOrder?: number }
  }
  statusOf: (sequenceId: string) => "todo" | "done" | "na"
  onCycle: (sequenceId: string) => void
}) {
  const { all, focused } = sequences
  const state = done ? "done" : dateState(item, today)
  const seqDone = all.filter((s) => statusOf(s.id) !== "todo").length
  // Pastilles : la séquence filtrée seule, sinon toutes dès qu'il y en a plusieurs.
  const chips = focused ? [focused] : all.length > 1 ? all : []
  const hasRetro = showRetro && (milestone || item.targetDate || item.deadlineDate || item.criticality === "blocking")
  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={item.id}
        className={done ? "text-sm text-muted-foreground line-through" : "text-sm text-foreground"}
      >
        {item.label}
      </label>
      {showRetro && (
        <ItemRetroPopover item={item}>
          <button
            type="button"
            title="Modifier le jalon, les dates et la criticité"
            className="-mx-1 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted/70"
          >
            {hasRetro ? (
              <>
                {milestone && (
                  <span
                    className="rounded bg-muted px-1.5 py-px font-semibold tabular-nums text-foreground"
                    title={`${milestone.name} — ${formatDate(milestone.targetDate, { day: "numeric", month: "long", year: "numeric" })}`}
                  >
                    J{milestone.sortOrder}
                  </span>
                )}
                {(milestone || item.targetDate || item.deadlineDate) && (
                  <span className={cn("font-medium", ITEM_STATE_TEXT[state])}>
                    {ITEM_STATE_LABELS[state]}
                    {!done && all.length > 1 && !focused ? ` · ${seqDone}/${all.length}` : ""}
                  </span>
                )}
                {(item.targetDate || item.deadlineDate) && (
                  <span
                    className="tabular-nums"
                    title={item.idealStartDate ? `Début idéal : ${formatDate(item.idealStartDate)}` : undefined}
                  >
                    {item.targetDate ? `cible ${formatDate(item.targetDate)}` : ""}
                    {item.targetDate && item.deadlineDate ? " · " : ""}
                    {item.deadlineDate ? `limite ${formatDate(item.deadlineDate)}` : ""}
                  </span>
                )}
                {!done && item.criticality === "blocking" && (
                  <span className="rounded-full bg-bordeaux/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-bordeaux">
                    Bloquant
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/70 hover:text-foreground">+ Planifier (jalon, dates)</span>
            )}
          </button>
        </ItemRetroPopover>
      )}
      {chips.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {chips.map((seq) => {
            const st = statusOf(seq.id)
            return (
              <button key={seq.id} type="button" onClick={() => onCycle(seq.id)}
                title={`${seq.name} — ${SEQ_STATUS_LABELS[st]} (clic : à faire → fait → non concernée)`}
                aria-label={`${seq.name} : ${SEQ_STATUS_LABELS[st]}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                  st === "done" && "border-vert-vegetal bg-vert-vegetal/15 text-vert-vegetal",
                  st === "na" && "border-dashed border-border text-muted-foreground/60 line-through",
                  st === "todo" && "border-border bg-card text-foreground hover:border-lagon",
                )}
              >
                {st === "done" ? <span aria-hidden>✓</span> : <SequenceDot sequence={seq} />}
                {seq.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChecklistWidget({
  ownerType, ownerId, allowAssignment = true, schedulable, inheritedResponsable,
  showRetro, filterMilestoneId, filterSequenceId,
}: ChecklistWidgetProps) {
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
  const fiances = (people ?? []).filter((p) => p.role === "admin")
  const canAssign = allowAssignment && person?.role === "admin"
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
          ownerType={ownerType}
          showRetro={showRetro}
          filterMilestoneId={filterMilestoneId}
          filterSequenceId={filterSequenceId}
        />
      ))}
    </div>
  )
}
