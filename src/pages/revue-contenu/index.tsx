import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useDomaines, useUpdateDomaine } from "@/hooks/queries/use-domaines"
import { useMissions, useCreateMission, useUpdateMission, useDeleteMission } from "@/hooks/queries/use-missions"
import { usePoles } from "@/hooks/queries/use-poles"
import {
  useAllChecklists,
  useAllChecklistItems,
  useCreateChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/queries/use-checklists"
import type { Checklist, ChecklistItem, Domaine, Mission, Pole, Priority } from "@/types/domain"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const NO_POLE = "__no_pole__"

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
}

interface DraftItem {
  id: string
  label: string
  priority: Priority
  isNew: boolean
  removed: boolean
  /** Rang en base (items existants uniquement). */
  sortOrder?: number
}

interface DraftChecklist {
  checklistId: string | null
  items: DraftItem[]
}

interface DraftMission {
  id: string
  title: string
  description: string
  prerequisites: string
  isNew: boolean
  removed: boolean
  checklist: DraftChecklist
}

interface DraftDomaine {
  id: string
  poleId: string | null
  name: string
  description: string
  dod: DraftChecklist
  missions: DraftMission[]
}

function toDraftItems(items: ChecklistItem[]): DraftItem[] {
  return items
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({ id: i.id, label: i.label, priority: i.priority, isNew: false, removed: false, sortOrder: i.sortOrder }))
}

function buildDraft(domaines: Domaine[], missions: Mission[], checklists: Checklist[], items: ChecklistItem[]): DraftDomaine[] {
  const itemsByChecklistId = new Map<string, ChecklistItem[]>()
  for (const i of items) {
    const list = itemsByChecklistId.get(i.checklistId) ?? []
    list.push(i)
    itemsByChecklistId.set(i.checklistId, list)
  }
  const checklistsByOwner = new Map<string, Checklist>()
  for (const c of checklists) {
    if (!c.ownerId) continue
    checklistsByOwner.set(`${c.ownerType}:${c.ownerId}`, c)
  }
  const missionsByDomaineId = new Map<string, Mission[]>()
  for (const m of missions) {
    if (!m.domaineId) continue
    const list = missionsByDomaineId.get(m.domaineId) ?? []
    list.push(m)
    missionsByDomaineId.set(m.domaineId, list)
  }

  function draftChecklistFor(ownerType: "domaine" | "mission", ownerId: string): DraftChecklist {
    const checklist = checklistsByOwner.get(`${ownerType}:${ownerId}`)
    if (!checklist) return { checklistId: null, items: [] }
    return { checklistId: checklist.id, items: toDraftItems(itemsByChecklistId.get(checklist.id) ?? []) }
  }

  return [...domaines]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({
      id: d.id,
      poleId: d.poleId ?? null,
      name: d.name,
      description: d.description ?? "",
      dod: draftChecklistFor("domaine", d.id),
      missions: (missionsByDomaineId.get(d.id) ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? "",
        prerequisites: m.prerequisites ?? "",
        isNew: false,
        removed: false,
        checklist: draftChecklistFor("mission", m.id),
      })),
    }))
}

function ItemsEditor({
  items,
  onChangeLabel,
  onChangePriority,
  onRemove,
  onAdd,
}: {
  items: DraftItem[]
  onChangeLabel: (id: string, value: string) => void
  onChangePriority: (id: string, value: Priority) => void
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  const visible = items.filter((i) => !i.removed)
  return (
    <div className="space-y-1.5 pl-3">
      {visible.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <Input
            value={item.label}
            onChange={(e) => onChangeLabel(item.id, e.target.value)}
            placeholder="Libellé de l'item"
            className="h-8 text-sm"
          />
          <Select value={item.priority} onValueChange={(v: Priority) => onChangePriority(item.id, v)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon-xs" aria-label="Retirer l'item" onClick={() => onRemove(item.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}>
        <Plus className="size-3.5" />
        Ajouter un item
      </Button>
    </div>
  )
}

export function RevueContenuPage() {
  const { data: poles, isLoading: polesLoading } = usePoles()
  const { data: domaines, isLoading: domainesLoading, refetch: refetchDomaines } = useDomaines()
  const { data: missions, isLoading: missionsLoading, refetch: refetchMissions } = useMissions()
  const { data: checklists, isLoading: checklistsLoading, refetch: refetchChecklists } = useAllChecklists()
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useAllChecklistItems()

  const updateDomaine = useUpdateDomaine()
  const createMission = useCreateMission()
  const updateMission = useUpdateMission()
  const deleteMission = useDeleteMission()
  const createChecklist = useCreateChecklist()
  const createItem = useCreateChecklistItem()
  const updateItem = useUpdateChecklistItem()
  const deleteItem = useDeleteChecklistItem()

  const isLoading = polesLoading || domainesLoading || missionsLoading || checklistsLoading || itemsLoading
  const initializedRef = useRef(false)

  const [draft, setDraft] = useState<DraftDomaine[]>([])
  const [dirtyDomaineIds, setDirtyDomaineIds] = useState<Set<string>>(new Set())
  const [dirtyMissionIds, setDirtyMissionIds] = useState<Set<string>>(new Set())
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initializedRef.current || isLoading) return
    initializedRef.current = true
    setDraft(buildDraft(domaines ?? [], missions ?? [], checklists ?? [], items ?? []))
  }, [isLoading, domaines, missions, checklists, items])

  const dirtyCount = dirtyDomaineIds.size + dirtyMissionIds.size + dirtyItemIds.size +
    draft.reduce((acc, d) => acc + d.missions.filter((m) => m.isNew || m.removed).length, 0) +
    draft.reduce(
      (acc, d) =>
        acc +
        d.dod.items.filter((i) => i.isNew || i.removed).length +
        d.missions.reduce((mAcc, m) => mAcc + m.checklist.items.filter((i) => i.isNew || i.removed).length, 0),
      0
    )

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDomaineField(domaineId: string, field: "name" | "description", value: string) {
    setDraft((prev) => prev.map((d) => (d.id === domaineId ? { ...d, [field]: value } : d)))
    setDirtyDomaineIds((prev) => new Set(prev).add(domaineId))
  }

  function handleMissionField(
    domaineId: string,
    missionId: string,
    field: "title" | "description" | "prerequisites",
    value: string
  ) {
    setDraft((prev) =>
      prev.map((d) =>
        d.id !== domaineId
          ? d
          : { ...d, missions: d.missions.map((m) => (m.id === missionId ? { ...m, [field]: value } : m)) }
      )
    )
    setDirtyMissionIds((prev) => new Set(prev).add(missionId))
  }

  function handleAddMission(domaineId: string) {
    setDraft((prev) =>
      prev.map((d) =>
        d.id !== domaineId
          ? d
          : {
              ...d,
              missions: [
                ...d.missions,
                {
                  id: crypto.randomUUID(),
                  title: "",
                  description: "",
                  prerequisites: "",
                  isNew: true,
                  removed: false,
                  checklist: { checklistId: null, items: [] },
                },
              ],
            }
      )
    )
  }

  function handleRemoveMission(domaineId: string, missionId: string) {
    setDraft((prev) =>
      prev.map((d) => {
        if (d.id !== domaineId) return d
        return {
          ...d,
          missions: d.missions.flatMap((m) => {
            if (m.id !== missionId) return [m]
            if (m.isNew) return []
            return [{ ...m, removed: true }]
          }),
        }
      })
    )
    setDirtyMissionIds((prev) => {
      const next = new Set(prev)
      next.delete(missionId)
      return next
    })
  }

  function updateChecklistItems(
    domaineId: string,
    missionId: string | null,
    updater: (items: DraftItem[]) => DraftItem[]
  ) {
    setDraft((prev) =>
      prev.map((d) => {
        if (d.id !== domaineId) return d
        if (missionId === null) return { ...d, dod: { ...d.dod, items: updater(d.dod.items) } }
        return {
          ...d,
          missions: d.missions.map((m) =>
            m.id === missionId ? { ...m, checklist: { ...m.checklist, items: updater(m.checklist.items) } } : m
          ),
        }
      })
    )
  }

  function handleAddItem(domaineId: string, missionId: string | null) {
    updateChecklistItems(domaineId, missionId, (its) => [
      ...its,
      { id: crypto.randomUUID(), label: "", priority: "normal", isNew: true, removed: false },
    ])
  }

  function handleRemoveItem(domaineId: string, missionId: string | null, itemId: string) {
    updateChecklistItems(domaineId, missionId, (its) =>
      its.flatMap((i) => {
        if (i.id !== itemId) return [i]
        if (i.isNew) return []
        return [{ ...i, removed: true }]
      })
    )
    setDirtyItemIds((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  function handleItemLabel(domaineId: string, missionId: string | null, itemId: string, value: string) {
    updateChecklistItems(domaineId, missionId, (its) => its.map((i) => (i.id === itemId ? { ...i, label: value } : i)))
    setDirtyItemIds((prev) => new Set(prev).add(itemId))
  }

  function handleItemPriority(domaineId: string, missionId: string | null, itemId: string, value: Priority) {
    updateChecklistItems(domaineId, missionId, (its) =>
      its.map((i) => (i.id === itemId ? { ...i, priority: value } : i))
    )
    setDirtyItemIds((prev) => new Set(prev).add(itemId))
  }

  async function persistChecklistItems(checklist: DraftChecklist, ownerType: "domaine" | "mission", ownerId: string) {
    let checklistId = checklist.checklistId
    const toCreate = checklist.items.filter((i) => i.isNew && !i.removed)
    const toUpdate = checklist.items.filter((i) => !i.isNew && !i.removed && dirtyItemIds.has(i.id))
    const toDelete = checklist.items.filter((i) => !i.isNew && i.removed)

    for (const item of toUpdate) {
      await updateItem.mutateAsync({ id: item.id, patch: { label: item.label, priority: item.priority } })
    }
    for (const item of toDelete) {
      await deleteItem.mutateAsync(item.id)
    }
    if (toCreate.length > 0) {
      if (!checklistId) {
        const created = await createChecklist.mutateAsync({ ownerType, ownerId, title: null })
        checklistId = created.id
      }
      // Les nouveaux items se rangent après les existants, dans l'ordre de saisie.
      let nextSortOrder = checklist.items
        .filter((i) => !i.isNew)
        .reduce((max, i) => Math.max(max, i.sortOrder ?? -1), -1) + 1
      for (const item of toCreate) {
        await createItem.mutateAsync({
          checklistId,
          label: item.label,
          isDone: false,
          sortOrder: nextSortOrder++,
          priority: item.priority,
          status: "todo",
        })
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      for (const d of draft) {
        if (dirtyDomaineIds.has(d.id)) {
          await updateDomaine.mutateAsync({ id: d.id, patch: { name: d.name, description: d.description || null } })
        }
        await persistChecklistItems(d.dod, "domaine", d.id)

        for (const [missionIndex, m] of d.missions.entries()) {
          if (m.removed && !m.isNew) {
            await deleteMission.mutateAsync(m.id)
            continue
          }
          if (m.isNew) {
            const created = await createMission.mutateAsync({
              domaineId: d.id,
              title: m.title,
              description: m.description || null,
              prerequisites: m.prerequisites || null,
              status: "todo",
              sortOrder: missionIndex,
            })
            await persistChecklistItems(m.checklist, "mission", created.id)
            continue
          }
          if (dirtyMissionIds.has(m.id)) {
            await updateMission.mutateAsync({
              id: m.id,
              patch: { title: m.title, description: m.description || null, prerequisites: m.prerequisites || null },
            })
          }
          await persistChecklistItems(m.checklist, "mission", m.id)
        }
      }

      const [domainesRes, missionsRes, checklistsRes, itemsRes] = await Promise.all([
        refetchDomaines(),
        refetchMissions(),
        refetchChecklists(),
        refetchItems(),
      ])
      setDraft(buildDraft(domainesRes.data ?? [], missionsRes.data ?? [], checklistsRes.data ?? [], itemsRes.data ?? []))
      setDirtyDomaineIds(new Set())
      setDirtyMissionIds(new Set())
      setDirtyItemIds(new Set())
      toast.success("Modifications enregistrées.")
    } catch (err) {
      console.error(err)
      toast.error("Erreur pendant l'enregistrement, voir la console.")
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setDraft(buildDraft(domaines ?? [], missions ?? [], checklists ?? [], items ?? []))
    setDirtyDomaineIds(new Set())
    setDirtyMissionIds(new Set())
    setDirtyItemIds(new Set())
    toast.info("Modifications locales annulées.")
  }

  const visibleDomaines = draft.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()))

  const domainesByPoleId = new Map<string, DraftDomaine[]>()
  for (const d of visibleDomaines) {
    const key = d.poleId ?? NO_POLE
    const list = domainesByPoleId.get(key) ?? []
    list.push(d)
    domainesByPoleId.set(key, list)
  }
  const sortedPoles = [...(poles ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const hasUnassigned = (domainesByPoleId.get(NO_POLE) ?? []).length > 0

  function renderDomaineCard(d: DraftDomaine) {
    const isOpen = expanded.has(d.id)
    return (
      <Card key={d.id}>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <button type="button" onClick={() => toggle(d.id)} className="flex flex-1 items-center gap-2 text-left">
            <CardTitle className="font-heading text-base">{d.name || "(sans nom)"}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {d.missions.filter((m) => !m.removed).length} mission(s)
            </span>
          </button>
        </CardHeader>
        {isOpen ? (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                value={d.name}
                onChange={(e) => handleDomaineField(d.id, "name", e.target.value)}
                placeholder="Nom du domaine"
              />
              <Textarea
                value={d.description}
                onChange={(e) => handleDomaineField(d.id, "description", e.target.value)}
                rows={2}
                placeholder="Description du domaine"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Definition of Done</p>
              <ItemsEditor
                items={d.dod.items}
                onChangeLabel={(itemId, value) => handleItemLabel(d.id, null, itemId, value)}
                onChangePriority={(itemId, value) => handleItemPriority(d.id, null, itemId, value)}
                onRemove={(itemId) => handleRemoveItem(d.id, null, itemId)}
                onAdd={() => handleAddItem(d.id, null)}
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Missions</p>
              {d.missions
                .filter((m) => !m.removed)
                .map((m) => (
                  <div key={m.id} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={m.title}
                        onChange={(e) => handleMissionField(d.id, m.id, "title", e.target.value)}
                        placeholder="Titre de la mission"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Retirer la mission"
                        onClick={() => handleRemoveMission(d.id, m.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={m.description}
                      onChange={(e) => handleMissionField(d.id, m.id, "description", e.target.value)}
                      rows={2}
                      placeholder="Description (brief de la mission)"
                    />
                    <Textarea
                      value={m.prerequisites}
                      onChange={(e) => handleMissionField(d.id, m.id, "prerequisites", e.target.value)}
                      rows={2}
                      placeholder="Prérequis"
                    />
                    <ItemsEditor
                      items={m.checklist.items}
                      onChangeLabel={(itemId, value) => handleItemLabel(d.id, m.id, itemId, value)}
                      onChangePriority={(itemId, value) => handleItemPriority(d.id, m.id, itemId, value)}
                      onRemove={(itemId) => handleRemoveItem(d.id, m.id, itemId)}
                      onAdd={() => handleAddItem(d.id, m.id)}
                    />
                  </div>
                ))}
              <Button variant="outline" size="sm" onClick={() => handleAddMission(d.id)}>
                <Plus className="size-4" />
                Ajouter une mission
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>
    )
  }

  function renderPoleSection(pole: Pole | { id: string; name: string }) {
    const poleDomaines = domainesByPoleId.get(pole.id) ?? []
    if (poleDomaines.length === 0) return null
    return (
      <div key={pole.id} className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">{pole.name}</h2>
        {poleDomaines.map(renderDomaineCard)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revue de contenu"
        description="Écran temporaire pour réviser domaines, DoD, missions et checklists avant validation finale."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/parametres">
                <ArrowLeft className="size-4" />
                Retour
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDiscard} disabled={dirtyCount === 0 || saving}>
              Annuler les modifications
            </Button>
            <Button size="sm" onClick={handleSave} disabled={dirtyCount === 0 || saving}>
              {saving ? "Enregistrement..." : `Enregistrer${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
            </Button>
          </>
        }
      />

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filtrer par nom de domaine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="space-y-6">
          {sortedPoles.map(renderPoleSection)}
          {hasUnassigned ? renderPoleSection({ id: NO_POLE, name: "Sans pôle" }) : null}
        </div>
      )}
    </div>
  )
}
