import { useMemo, useState } from "react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, GripVertical, ListChecks, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { usePoles, useDeletePole, useUpdatePole, useReorderPoles } from "@/hooks/queries/use-poles"
import { useDomaines, useDeleteDomaine, useReorderDomaines } from "@/hooks/queries/use-domaines"
import { useMissions, useDeleteMission, useReorderMissions } from "@/hooks/queries/use-missions"
import { useDomaineResponsables } from "@/hooks/queries/use-domaine-responsables"
import { usePeople } from "@/hooks/queries/use-people"
import { useGuests } from "@/hooks/queries/use-guests"
import {
  useAllChecklists,
  useAllChecklistItems,
  useCreateChecklist,
  useDeleteChecklist,
  useDeleteChecklistItem,
  useReorderChecklistItems,
} from "@/hooks/queries/use-checklists"
import type { Checklist, ChecklistItem, Domaine, DomaineResponsable, DomainePhase, Mission, Pole } from "@/types/domain"
import { DOMAINE_PHASE_LABELS, DOMAINE_PHASE_ORDER } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PoleDialog } from "@/components/parametres/PoleManager"
import { DomaineDialog } from "@/components/parametres/DomaineManager"
import { MissionDialog } from "@/components/parametres/MissionManager"
import { ChecklistDialog } from "@/components/parametres/ChecklistDialog"
import { ChecklistItemDialog } from "@/components/parametres/ChecklistItemDialog"
import { DomaineQuickEditDialog } from "@/components/parametres/DomaineQuickEditDialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { DomaineResponsableSelect } from "@/components/shared/DomaineResponsableSelect"

const NO_POLE = "__no_pole__"
const NONE = "__none__"

type Level = "pole" | "domaine" | "mission" | "checklist" | "item"

const TYPE_BADGES: Record<Level, { label: string; className: string }> = {
  pole: { label: "Pôle", className: "bg-bordeaux/10 text-bordeaux" },
  domaine: { label: "Domaine", className: "bg-dore/20 text-brun" },
  mission: { label: "Mission", className: "bg-vert-vegetal/15 text-vert-vegetal" },
  checklist: { label: "Checklist", className: "bg-muted text-muted-foreground" },
  item: { label: "Item", className: "bg-secondary text-secondary-foreground" },
}

function TypeBadge({ level }: { level: Level }) {
  const config = TYPE_BADGES[level]
  return <Badge className={config.className}>{config.label}</Badge>
}

function ConfirmDeleteButton({
  label,
  description,
  onConfirm,
}: {
  label: string
  description: string
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={label}>
              <Trash2 className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{label} ?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
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

function PoleResponsableSelect({ pole }: { pole: Pole }) {
  const { data: people } = usePeople()
  const updatePole = useUpdatePole()
  const fiances = (people ?? []).filter((p) => p.role === "admin")

  return (
    <Select
      value={pole.responsiblePersonId ?? NONE}
      onValueChange={(value) =>
        updatePole.mutate({ id: pole.id, patch: { responsiblePersonId: value === NONE ? null : value } })
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
  )
}

function SortableRow({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: (dragHandle: React.ReactNode) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      {children(
        <button
          type="button"
          aria-label={label}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
    </div>
  )
}

interface TreeRowProps {
  depth: number
  level: Level
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  label: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  dragHandle?: React.ReactNode
}

function TreeRow({ depth, level, expandable, expanded, onToggle, label, meta, actions, dragHandle }: TreeRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5 hover:bg-muted/50"
      style={{ marginLeft: depth * 20 }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {dragHandle}
        {expandable ? (
          <Button variant="ghost" size="icon-xs" aria-label={expanded ? "Réduire" : "Développer"} onClick={onToggle}>
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </Button>
        ) : (
          <span className="inline-block size-6" />
        )}
        <TypeBadge level={level} />
        <span className="text-sm text-foreground">{label}</span>
        {meta}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
    </div>
  )
}

export function ParametresTree() {
  const { data: poles, isLoading: polesLoading } = usePoles()
  const { data: domaines, isLoading: domainesLoading } = useDomaines()
  const { data: missions, isLoading: missionsLoading } = useMissions()
  const { data: checklists, isLoading: checklistsLoading } = useAllChecklists()
  const { data: items, isLoading: itemsLoading } = useAllChecklistItems()
  const { data: responsables, isLoading: responsablesLoading } = useDomaineResponsables()
  const { data: people } = usePeople()
  const { data: guests } = useGuests()

  const deletePole = useDeletePole()
  const reorderPoles = useReorderPoles()
  const reorderDomaines = useReorderDomaines()
  const deleteDomaine = useDeleteDomaine()
  const deleteMission = useDeleteMission()
  const reorderMissions = useReorderMissions()
  const createChecklist = useCreateChecklist()
  const deleteChecklist = useDeleteChecklist()
  const deleteItem = useDeleteChecklistItem()
  const reorderItems = useReorderChecklistItems()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [filterUnassignedPoles, setFilterUnassignedPoles] = useState(false)
  const [filterUnassignedDomaines, setFilterUnassignedDomaines] = useState(false)
  const [phaseFilter, setPhaseFilter] = useState<DomainePhase | typeof NONE>(NONE)

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** `expanded` ne stocke que les nœuds basculés hors de leur état par défaut (toggle = XOR). */
  function effectiveOpen(id: string, defaultOpen: boolean) {
    return expanded.has(id) ? !defaultOpen : defaultOpen
  }

  function expandAll() {
    const next = new Set<string>()
    for (const p of poles ?? []) next.add(p.id)
    next.add(NO_POLE)
    for (const d of domaines ?? []) next.add(d.id)
    for (const m of missions ?? []) next.add(m.id)
    // Checklists defaultent toutes à ouvert (defaultOpen=true) — ne pas les ajouter
    setExpanded(next)
  }

  function collapseAll() {
    const next = new Set<string>()
    // Toutes les checklists defaultent à ouvert, il faut les ajouter pour les fermer
    for (const c of checklists ?? []) next.add(c.id)
    setExpanded(next)
  }

  const search = searchQuery.trim().toLowerCase()
  const isSearching = search.length > 0
  const hasDomaineFilter = filterUnassignedDomaines || phaseFilter !== NONE
  const hasActiveFilter = isSearching || filterUnassignedPoles || hasDomaineFilter

  const isLoading =
    polesLoading || domainesLoading || missionsLoading || checklistsLoading || itemsLoading || responsablesLoading

  const domainesByPoleId = useMemo(() => {
    const map = new Map<string, Domaine[]>()
    for (const d of domaines ?? []) {
      const key = d.poleId ?? NO_POLE
      const list = map.get(key) ?? []
      list.push(d)
      map.set(key, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder)
    return map
  }, [domaines])

  const responsablesByDomaineId = useMemo(() => {
    const map = new Map<string, DomaineResponsable[]>()
    for (const r of responsables ?? []) {
      const list = map.get(r.domaineId) ?? []
      list.push(r)
      map.set(r.domaineId, list)
    }
    return map
  }, [responsables])

  const missionsByDomaineId = useMemo(() => {
    const map = new Map<string, Mission[]>()
    for (const m of missions ?? []) {
      if (!m.domaineId) continue
      const list = map.get(m.domaineId) ?? []
      list.push(m)
      map.set(m.domaineId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder)
    return map
  }, [missions])

  const checklistsByOwner = useMemo(() => {
    const map = new Map<string, Checklist[]>()
    for (const c of checklists ?? []) {
      if (!c.ownerId) continue
      const key = `${c.ownerType}:${c.ownerId}`
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return map
  }, [checklists])

  const itemsByChecklistId = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    for (const i of items ?? []) {
      const list = map.get(i.checklistId) ?? []
      list.push(i)
      map.set(i.checklistId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder)
    return map
  }, [items])

  function itemMatches(item: ChecklistItem) {
    if (!isSearching) return true
    return item.label.toLowerCase().includes(search)
  }

  function checklistMatches(checklist: Checklist) {
    if (!isSearching) return true
    if ((checklist.title ?? "").toLowerCase().includes(search)) return true
    return (itemsByChecklistId.get(checklist.id) ?? []).some(itemMatches)
  }

  function missionMatches(mission: Mission) {
    if (!isSearching) return true
    if (mission.title.toLowerCase().includes(search)) return true
    return (checklistsByOwner.get(`mission:${mission.id}`) ?? []).some(checklistMatches)
  }

  function responsableNameFor(r: DomaineResponsable) {
    if (r.personId) return people?.find((p) => p.id === r.personId)?.fullName ?? ""
    return guests?.find((g) => g.id === r.guestId)?.fullName ?? ""
  }

  function domaineMatches(domaine: Domaine) {
    if (filterUnassignedDomaines && (responsablesByDomaineId.get(domaine.id) ?? []).length > 0) return false
    if (phaseFilter !== NONE && domaine.phase !== phaseFilter) return false
    if (!isSearching) return true
    if (domaine.name.toLowerCase().includes(search)) return true
    if ((missionsByDomaineId.get(domaine.id) ?? []).some(missionMatches)) return true
    if ((checklistsByOwner.get(`domaine:${domaine.id}`) ?? []).some(checklistMatches)) return true
    return (responsablesByDomaineId.get(domaine.id) ?? []).some((r) =>
      responsableNameFor(r).toLowerCase().includes(search)
    )
  }

  function poleMatches(pole: Pole | { id: string; name: string }) {
    if (filterUnassignedPoles && "responsiblePersonId" in pole && pole.responsiblePersonId) return false
    if (!isSearching && !hasDomaineFilter) return true
    if (isSearching && pole.name.toLowerCase().includes(search)) return true
    return (domainesByPoleId.get(pole.id) ?? []).some(domaineMatches)
  }

  function renderChecklistNode(checklist: Checklist, depth: number) {
    const checklistItems = itemsByChecklistId.get(checklist.id) ?? []
    const visibleItems = checklistItems.filter(itemMatches)
    const isOpen = effectiveOpen(checklist.id, true) || hasActiveFilter
    return (
      <div key={checklist.id} className="space-y-1">
        <TreeRow
          depth={depth}
          level="checklist"
          expandable
          expanded={isOpen}
          onToggle={() => toggle(checklist.id)}
          label={checklist.title ?? null}
          meta={<span className="text-xs text-muted-foreground">{checklistItems.length} item(s)</span>}
          actions={
            <>
              <ChecklistItemDialog checklistId={checklist.id} />
              <ChecklistDialog checklist={checklist} />
              <ConfirmDeleteButton
                label="Supprimer la checklist"
                description="Cette action supprimera aussi tous les items de cette checklist. Elle est définitive."
                onConfirm={() => deleteChecklist.mutate(checklist.id)}
              />
            </>
          }
        />
        {isOpen ? (
          hasActiveFilter ? (
            visibleItems.map((item) => renderItemRow(item, checklist.id, depth + 1))
          ) : (
            <DndContext
              sensors={dragSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleItemDragEnd(checklist.id)}
            >
              <SortableContext items={checklistItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {checklistItems.map((item) => renderItemRow(item, checklist.id, depth + 1))}
              </SortableContext>
            </DndContext>
          )
        ) : null}
      </div>
    )
  }

  function renderItemRow(item: ChecklistItem, checklistId: string, depth: number) {
    const treeRow = (dragHandle?: React.ReactNode) => (
      <TreeRow
        depth={depth}
        level="item"
        label={item.label}
        dragHandle={dragHandle}
        meta={
          <span className="flex items-center gap-1">
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
          </span>
        }
        actions={
          <>
            <ChecklistItemDialog item={item} checklistId={checklistId} />
            <ConfirmDeleteButton
              label="Supprimer l'item"
              description="Cette action est définitive."
              onConfirm={() => deleteItem.mutate(item.id)}
            />
          </>
        }
      />
    )
    return hasActiveFilter ? (
      <div key={item.id}>{treeRow()}</div>
    ) : (
      <SortableRow key={item.id} id={item.id} label="Réordonner l'item">
        {(dragHandle) => treeRow(dragHandle)}
      </SortableRow>
    )
  }

  function renderMissionNode(mission: Mission, depth: number) {
    const missionChecklists = (checklistsByOwner.get(`mission:${mission.id}`) ?? []).filter(checklistMatches)
    const isOpen = effectiveOpen(mission.id, false) || hasActiveFilter
    const treeRow = (dragHandle?: React.ReactNode) => (
      <TreeRow
        depth={depth}
        level="mission"
        expandable
        expanded={isOpen}
        onToggle={() => toggle(mission.id)}
        label={mission.title}
        dragHandle={dragHandle}
        meta={<StatusBadge status={mission.status} />}
        actions={
          <>
            <ChecklistDialog ownerType="mission" ownerId={mission.id} />
            <MissionDialog mission={mission} />
            <ConfirmDeleteButton
              label="Supprimer la mission"
              description="Cette action supprimera aussi les checklists de cette mission. Elle est définitive."
              onConfirm={() => deleteMission.mutate(mission.id)}
            />
          </>
        }
      />
    )
    return (
      <div key={mission.id} className="space-y-1">
        {!hasActiveFilter ? (
          <SortableRow id={mission.id} label="Réordonner la mission">
            {(dragHandle) => treeRow(dragHandle)}
          </SortableRow>
        ) : (
          treeRow()
        )}
        {isOpen ? missionChecklists.map((c) => renderChecklistNode(c, depth + 1)) : null}
      </div>
    )
  }

  function renderDomaineNode(domaine: Domaine, depth: number) {
    const domaineMissions = (missionsByDomaineId.get(domaine.id) ?? []).filter(missionMatches)
    const allDomaineChecklists = checklistsByOwner.get(`domaine:${domaine.id}`) ?? []
    const domaineChecklists = allDomaineChecklists.filter(checklistMatches)
    const hasDodChecklist = allDomaineChecklists.length > 0
    const isOpen = effectiveOpen(domaine.id, false) || hasActiveFilter

    async function handleCreateDod() {
      await createChecklist.mutateAsync({ ownerType: "domaine", ownerId: domaine.id, title: "Definition of Done" })
      toast.success("Checklist Definition of Done créée.")
    }

    const treeRow = (dragHandle?: React.ReactNode) => (
      <TreeRow
        depth={depth}
        level="domaine"
        expandable
        expanded={isOpen}
        onToggle={() => toggle(domaine.id)}
        label={domaine.name}
        dragHandle={dragHandle}
        meta={
          domaine.phase ? (
            <Badge className="bg-muted text-muted-foreground">{DOMAINE_PHASE_LABELS[domaine.phase]}</Badge>
          ) : null
        }
        actions={
          <>
            <DomaineResponsableSelect domaine={domaine} />
            {!hasDodChecklist ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label="Créer la checklist Definition of Done" onClick={handleCreateDod}>
                    <ListChecks className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Créer la checklist Definition of Done</TooltipContent>
              </Tooltip>
            ) : null}
            <DomaineQuickEditDialog
              domaine={domaine}
              missions={missions ?? []}
              checklists={checklists ?? []}
              items={items ?? []}
            />
            <MissionDialog initialDomaineId={domaine.id} />
            <DomaineDialog domaine={domaine} />
            <ConfirmDeleteButton
              label="Supprimer le domaine"
              description="Cette action supprimera aussi ses missions et checklists. Elle est définitive."
              onConfirm={() => deleteDomaine.mutate(domaine.id)}
            />
          </>
        }
      />
    )
    return (
      <div key={domaine.id} className="space-y-1">
        {!hasActiveFilter ? (
          <SortableRow id={domaine.id} label="Réordonner le domaine">
            {(dragHandle) => treeRow(dragHandle)}
          </SortableRow>
        ) : (
          treeRow()
        )}
        {isOpen ? (
          <>
            {hasActiveFilter ? (
              domaineMissions.map((m) => renderMissionNode(m, depth + 1))
            ) : (
              <DndContext
                sensors={dragSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleMissionDragEnd(domaine.id)}
              >
                <SortableContext items={domaineMissions.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  {domaineMissions.map((m) => renderMissionNode(m, depth + 1))}
                </SortableContext>
              </DndContext>
            )}
            {/* La DoD n'est jamais réordonnable : toujours après les missions, position fixe. */}
            {domaineChecklists.map((c) => renderChecklistNode(c, depth + 1))}
          </>
        ) : null}
      </div>
    )
  }

  function renderPoleNode(pole: Pole | { id: string; name: string }, depth: number) {
    const poleDomaines = (domainesByPoleId.get(pole.id) ?? []).filter(domaineMatches)
    const isOpen = effectiveOpen(pole.id, false) || hasActiveFilter
    const isRealPole = "sortOrder" in pole
    const treeRow = (dragHandle?: React.ReactNode) => (
      <TreeRow
        depth={depth}
        level="pole"
        expandable
        expanded={isOpen}
        onToggle={() => toggle(pole.id)}
        label={pole.name}
        dragHandle={dragHandle}
        meta={<span className="text-xs text-muted-foreground">{poleDomaines.length} domaine(s)</span>}
        actions={
          <>
            {isRealPole ? <PoleResponsableSelect pole={pole} /> : null}
            <DomaineDialog initialPoleId={pole.id !== NO_POLE ? pole.id : undefined} />
            {isRealPole ? (
              <>
                <PoleDialog pole={pole} />
                <ConfirmDeleteButton
                  label="Supprimer le pôle"
                  description="Cette action supprimera aussi ses domaines, missions et checklists. Elle est définitive."
                  onConfirm={() => deletePole.mutate(pole.id)}
                />
              </>
            ) : null}
          </>
        }
      />
    )
    return (
      <div key={pole.id} className="space-y-1">
        {isRealPole && !hasActiveFilter ? (
          <SortableRow id={pole.id} label="Réordonner le pôle">
            {(dragHandle) => treeRow(dragHandle)}
          </SortableRow>
        ) : (
          treeRow()
        )}
        {isOpen ? (
          hasActiveFilter ? (
            poleDomaines.map((d) => renderDomaineNode(d, depth + 1))
          ) : (
            <DndContext
              sensors={dragSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDomaineDragEnd(pole.id)}
            >
              <SortableContext items={poleDomaines.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                {poleDomaines.map((d) => renderDomaineNode(d, depth + 1))}
              </SortableContext>
            </DndContext>
          )
        ) : null}
      </div>
    )
  }

  const sortedPoles = [...(poles ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).filter(poleMatches)
  const hasUnassignedDomaines = (domainesByPoleId.get(NO_POLE) ?? []).filter(domaineMatches).length > 0
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handlePoleDragEnd(event: DragEndEvent) {
    if (!poles) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ordered = [...poles].sort((a, b) => a.sortOrder - b.sortOrder)
    const oldIndex = ordered.findIndex((p) => p.id === active.id)
    const newIndex = ordered.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(ordered, oldIndex, newIndex).map((pole, index) => ({ ...pole, sortOrder: index }))
    reorderPoles.mutate(reordered)
  }

  function handleDomaineDragEnd(poleId: string) {
    return (event: DragEndEvent) => {
      const list = domainesByPoleId.get(poleId) ?? []
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = list.findIndex((d) => d.id === active.id)
      const newIndex = list.findIndex((d) => d.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(list, oldIndex, newIndex).map((domaine, index) => ({ ...domaine, sortOrder: index }))
      reorderDomaines.mutate(reordered)
    }
  }

  function handleItemDragEnd(checklistId: string) {
    return (event: DragEndEvent) => {
      const list = itemsByChecklistId.get(checklistId) ?? []
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = list.findIndex((i) => i.id === active.id)
      const newIndex = list.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(list, oldIndex, newIndex).map((item, index) => ({ ...item, sortOrder: index }))
      reorderItems.mutate(reordered)
    }
  }

  function handleMissionDragEnd(domaineId: string) {
    return (event: DragEndEvent) => {
      const list = missionsByDomaineId.get(domaineId) ?? []
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = list.findIndex((m) => m.id === active.id)
      const newIndex = list.findIndex((m) => m.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(list, oldIndex, newIndex).map((mission, index) => ({ ...mission, sortOrder: index }))
      reorderMissions.mutate(reordered)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="font-heading text-base">Pôles, domaines, missions &amp; checklists</CardTitle>
        <PoleDialog />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un pôle, un domaine, une mission, une checklist, un item, un responsable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="size-3.5" />
            Tout déplier
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="size-3.5" />
            Tout replier
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filterUnassignedPoles ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterUnassignedPoles((v) => !v)}
          >
            Pôles non assignés
          </Button>
          <Button
            variant={filterUnassignedDomaines ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterUnassignedDomaines((v) => !v)}
          >
            Domaines non assignés
          </Button>
          <Select value={phaseFilter} onValueChange={(v: DomainePhase | typeof NONE) => setPhaseFilter(v)}>
            <SelectTrigger size="sm" className={phaseFilter !== NONE ? "border-primary" : undefined}>
              <SelectValue placeholder="Toutes les phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Toutes les phases</SelectItem>
              {DOMAINE_PHASE_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {DOMAINE_PHASE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          {isLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : hasActiveFilter ? (
            <>
              {sortedPoles.map((pole) => renderPoleNode(pole, 0))}
              {hasUnassignedDomaines ? renderPoleNode({ id: NO_POLE, name: "Sans pôle" }, 0) : null}
            </>
          ) : (
            <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handlePoleDragEnd}>
              <SortableContext items={sortedPoles.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                {sortedPoles.map((pole) => renderPoleNode(pole, 0))}
              </SortableContext>
              {hasUnassignedDomaines ? renderPoleNode({ id: NO_POLE, name: "Sans pôle" }, 0) : null}
            </DndContext>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
