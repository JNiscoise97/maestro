import { useMemo, useState } from "react"
import { ChevronDown, GripVertical, Minus, Plus, Trash2, X } from "lucide-react"
import {
  DndContext, PointerSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, arrayMove, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  FIXED_ROLES, CATEGORY_LABELS, allRoles,
  cavalierRoles, demoiselleRoles,
  temoinsMarieRoles, temoinsMarieeRoles,
  type RoleCategory, type CortegeGroupRecord,
} from "@/lib/cortege"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import {
  useCortegeConfig, useSaveCortegeConfig,
  useCortegeGroups,
  useCreateCortegeGroup, useUpdateCortegeGroup,
  useDeleteCortegeGroup, useReorderCortegeGroups,
  useDuplicateCortegeConfig,
} from "@/hooks/queries/use-cortege"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── Compteur (+/-) ────────────────────────────────────────────────────────────

function Counter({
  value, min = 0, max = 8, onChange,
}: { value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="rounded-lg border border-border p-1 hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="rounded-lg border border-border p-1 hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

// ── Sélection des rôles (panneau gauche) ──────────────────────────────────────

function DynamicCounter({
  label, count, roleList, allGroupRoleKeys, onChange,
}: {
  label: string
  count: number
  roleList: { key: string; label: string }[]
  allGroupRoleKeys: Set<string>
  onChange: (n: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-sm">{label}</span>
        <Counter value={count} max={4} onChange={onChange} />
      </div>
      {count > 0 && (
        <div className="pl-3 space-y-1">
          {roleList.map((r) => (
            <div key={r.key} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
              <span className="size-1.5 rounded-full bg-primary/40 shrink-0" />
              {r.label}
              {allGroupRoleKeys.has(r.key) && <span className="text-muted-foreground/60">(dans un groupe)</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoleSelector({
  enabledRoles,
  cavalierCount,
  demoiselleCount,
  temoinsMarieCount,
  temoinsMarieeCount,
  allGroupRoleKeys,
  onToggle,
  onCavalierChange,
  onDemoiselleChange,
  onTemoinsMarieChange,
  onTemoinsMarieeChange,
}: {
  enabledRoles: Set<string>
  cavalierCount: number
  demoiselleCount: number
  temoinsMarieCount: number
  temoinsMarieeCount: number
  allGroupRoleKeys: Set<string>
  onToggle: (key: string, enabled: boolean) => void
  onCavalierChange: (n: number) => void
  onDemoiselleChange: (n: number) => void
  onTemoinsMarieChange: (n: number) => void
  onTemoinsMarieeChange: (n: number) => void
}) {
  const categories: RoleCategory[] = ["marie", "mariee", "autre"]

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const fixed = FIXED_ROLES.filter((r) => r.category === cat)
        return (
          <div key={cat}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="space-y-1.5">
              {fixed.map((role) => (
                <label
                  key={role.key}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <span className="text-sm">{role.label}</span>
                    {allGroupRoleKeys.has(role.key) && (
                      <span className="ml-2 text-[10px] text-muted-foreground">(dans un groupe)</span>
                    )}
                  </div>
                  <Switch
                    checked={enabledRoles.has(role.key)}
                    onCheckedChange={(v) => onToggle(role.key, v)}
                  />
                </label>
              ))}

              {cat === "marie" && (
                <DynamicCounter
                  label="Témoins du marié"
                  count={temoinsMarieCount}
                  roleList={temoinsMarieRoles(temoinsMarieCount)}
                  allGroupRoleKeys={allGroupRoleKeys}
                  onChange={onTemoinsMarieChange}
                />
              )}

              {cat === "mariee" && (
                <DynamicCounter
                  label="Témoins de la mariée"
                  count={temoinsMarieeCount}
                  roleList={temoinsMarieeRoles(temoinsMarieeCount)}
                  allGroupRoleKeys={allGroupRoleKeys}
                  onChange={onTemoinsMarieeChange}
                />
              )}

              {cat === "autre" && (
                <div className="space-y-1.5 pt-1">
                  <DynamicCounter
                    label="Cavaliers d'honneur"
                    count={cavalierCount}
                    roleList={cavalierRoles(cavalierCount)}
                    allGroupRoleKeys={allGroupRoleKeys}
                    onChange={onCavalierChange}
                  />
                  <DynamicCounter
                    label="Demoiselles d'honneur"
                    count={demoiselleCount}
                    roleList={demoiselleRoles(demoiselleCount)}
                    allGroupRoleKeys={allGroupRoleKeys}
                    onChange={onDemoiselleChange}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Groupe sortable (panneau droit) ───────────────────────────────────────────

function SortableGroup({
  group,
  enabledRoles,
  cavalierCount,
  demoiselleCount,
  temoinsMarieCount,
  temoinsMarieeCount,
  allGroupRoleKeys,
  sequenceId,
}: {
  group: CortegeGroupRecord
  enabledRoles: Set<string>
  cavalierCount: number
  demoiselleCount: number
  temoinsMarieCount: number
  temoinsMarieeCount: number
  allGroupRoleKeys: Set<string>
  sequenceId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const update = useUpdateCortegeGroup()
  const del    = useDeleteCortegeGroup()

  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(group.label)
  const [popOpen, setPopOpen] = useState(false)

  const roles = allRoles({ cavalierCount, demoiselleCount, temoinsMarieCount, temoinsMarieeCount })
  const roleLabel = (key: string) => roles.find((r) => r.key === key)?.label ?? key

  // Rôles actifs non encore dans un groupe
  const availableToAdd = useMemo(() => {
    const inThisGroup = new Set(group.roleKeys)
    return roles.filter(
      (r) => (enabledRoles.has(r.key) && !allGroupRoleKeys.has(r.key)) || inThisGroup.has(r.key)
    ).filter((r) => !inThisGroup.has(r.key))
  }, [roles, enabledRoles, allGroupRoleKeys, group.roleKeys])

  function removeRole(key: string) {
    update.mutate({
      id: group.id, sequenceId,
      patch: { roleKeys: group.roleKeys.filter((k) => k !== key) },
    })
  }

  function addRole(key: string) {
    update.mutate({
      id: group.id, sequenceId,
      patch: { roleKeys: [...group.roleKeys, key] },
    })
    setPopOpen(false)
  }

  function saveLabel() {
    const v = draft.trim()
    if (v && v !== group.label) update.mutate({ id: group.id, sequenceId, patch: { label: v } })
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-card p-3 space-y-2"
    >
      {/* En-tête */}
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners}
          className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="size-4" />
        </button>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => { if (e.key === "Enter") saveLabel() }}
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(group.label); setEditing(true) }}
            className="flex-1 text-left text-sm font-semibold hover:text-primary transition-colors"
          >
            {group.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => del.mutate({ id: group.id, sequenceId })}
          className="text-muted-foreground/40 hover:text-destructive transition-colors"
          title="Supprimer le groupe"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Rôles du groupe */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {group.roleKeys.map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
          >
            {roleLabel(key)}
            <button
              type="button"
              onClick={() => removeRole(key)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {group.roleKeys.length === 0 && (
          <span className="text-xs text-muted-foreground/50 py-1">Aucun rôle assigné</span>
        )}
      </div>

      {/* Ajouter des rôles */}
      <Popover open={popOpen} onOpenChange={setPopOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={availableToAdd.length === 0}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-30 disabled:no-underline"
          >
            <Plus className="size-3" /> Ajouter un rôle
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-2 max-h-56 overflow-y-auto">
          <div className="space-y-0.5">
            {availableToAdd.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => addRole(r.key)}
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60 transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── Builder de groupes (panneau droit) ────────────────────────────────────────

function GroupBuilder({
  sequenceId,
  enabledRoles,
  cavalierCount,
  demoiselleCount,
  temoinsMarieCount,
  temoinsMarieeCount,
}: {
  sequenceId: string
  enabledRoles: Set<string>
  cavalierCount: number
  demoiselleCount: number
  temoinsMarieCount: number
  temoinsMarieeCount: number
}) {
  const { data: groups = [], isLoading } = useCortegeGroups(sequenceId)
  const create  = useCreateCortegeGroup()
  const reorder = useReorderCortegeGroups()

  const [localOrder, setLocalOrder] = useState<CortegeGroupRecord[]>([])
  const sorted = localOrder.length > 0 ? localOrder : [...groups].sort((a, b) => a.sortOrder - b.sortOrder)

  // Tous les role_keys déjà dans un groupe
  const allGroupRoleKeys = useMemo(
    () => new Set(groups.flatMap((g) => g.roleKeys)),
    [groups]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = sorted.findIndex((g) => g.id === active.id)
    const newIdx = sorted.findIndex((g) => g.id === over.id)
    const next   = arrayMove(sorted, oldIdx, newIdx)
    setLocalOrder(next)
    reorder.mutate({ groups: next.map((g, i) => ({ id: g.id, sortOrder: i })), sequenceId })
  }

  async function handleCreate() {
    await create.mutateAsync({ sequenceId, label: "Nouveau groupe", sortOrder: sorted.length })
    setLocalOrder([])
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map((group) => (
              <SortableGroup
                key={group.id}
                group={group}
                enabledRoles={enabledRoles}
                cavalierCount={cavalierCount}
                demoiselleCount={demoiselleCount}
                temoinsMarieCount={temoinsMarieCount}
                temoinsMarieeCount={temoinsMarieeCount}
                allGroupRoleKeys={allGroupRoleKeys}
                sequenceId={sequenceId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun groupe. Créez un groupe puis ajoutez-y des rôles actifs.
        </p>
      )}

      <button
        type="button"
        onClick={handleCreate}
        disabled={create.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
      >
        <Plus className="size-4" /> Créer un groupe
      </button>
    </div>
  )
}

// ── Manager principal ──────────────────────────────────────────────────────────

function SequenceEditor({
  sequenceId,
  otherSequences,
}: {
  sequenceId: string
  otherSequences: { id: string; name: string }[]
}) {
  const { data: config, isLoading } = useCortegeConfig(sequenceId)
  const save      = useSaveCortegeConfig()
  const duplicate = useDuplicateCortegeConfig()
  const [, setDupOpen] = useState(false)

  const enabledRoles      = useMemo(() => new Set(config?.enabledRoles ?? []), [config])
  const cavalierCount     = config?.cavalierCount     ?? 0
  const demoiselleCount   = config?.demoiselleCount   ?? 0
  const temoinsMarieCount  = config?.temoinsMarieCount  ?? 0
  const temoinsMarieeCount = config?.temoinsMarieeCount ?? 0

  const baseConfig = { cavalierCount, demoiselleCount, temoinsMarieCount, temoinsMarieeCount }

  function toggleRole(key: string, enabled: boolean) {
    const next = new Set(enabledRoles)
    if (enabled) next.add(key)
    else         next.delete(key)
    save.mutate({ sequenceId, config: { enabledRoles: [...next], ...baseConfig } })
  }

  function handleCavalierChange(n: number) {
    const next = new Set(enabledRoles)
    for (let i = 1; i <= n; i++) next.add(`cavalier_${i}`)
    for (let i = n + 1; i <= cavalierCount; i++) next.delete(`cavalier_${i}`)
    save.mutate({ sequenceId, config: { enabledRoles: [...next], ...baseConfig, cavalierCount: n } })
  }

  function handleDemoiselleChange(n: number) {
    const next = new Set(enabledRoles)
    for (let i = 1; i <= n; i++) next.add(`demoiselle_${i}`)
    for (let i = n + 1; i <= demoiselleCount; i++) next.delete(`demoiselle_${i}`)
    save.mutate({ sequenceId, config: { enabledRoles: [...next], ...baseConfig, demoiselleCount: n } })
  }

  function handleTemoinsMarieChange(n: number) {
    const next = new Set(enabledRoles)
    for (let i = 1; i <= n; i++) next.add(`temoin_marie_${i}`)
    for (let i = n + 1; i <= temoinsMarieCount; i++) next.delete(`temoin_marie_${i}`)
    save.mutate({ sequenceId, config: { enabledRoles: [...next], ...baseConfig, temoinsMarieCount: n } })
  }

  function handleTemoinsMarieeChange(n: number) {
    const next = new Set(enabledRoles)
    for (let i = 1; i <= n; i++) next.add(`temoin_mariee_${i}`)
    for (let i = n + 1; i <= temoinsMarieeCount; i++) next.delete(`temoin_mariee_${i}`)
    save.mutate({ sequenceId, config: { enabledRoles: [...next], ...baseConfig, temoinsMarieeCount: n } })
  }

  const { data: groups = [] } = useCortegeGroups(sequenceId)
  const allGroupRoleKeys = useMemo(() => new Set(groups.flatMap((g) => g.roleKeys)), [groups])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Duplication */}
      {otherSequences.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Copier depuis :</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={duplicate.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {duplicate.isPending ? "Copie en cours…" : "Choisir une séquence"}
                <ChevronDown className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {otherSequences.map((seq) => (
                <DropdownMenuItem
                  key={seq.id}
                  onSelect={() => {
                    setDupOpen(true)
                    duplicate.mutate(
                      { sourceId: seq.id, targetId: sequenceId },
                      { onSettled: () => setDupOpen(false) }
                    )
                  }}
                >
                  {seq.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <h3 className="text-sm font-semibold mb-3">Rôles actifs</h3>
        <RoleSelector
          enabledRoles={enabledRoles}
          cavalierCount={cavalierCount}
          demoiselleCount={demoiselleCount}
          temoinsMarieCount={temoinsMarieCount}
          temoinsMarieeCount={temoinsMarieeCount}
          allGroupRoleKeys={allGroupRoleKeys}
          onToggle={toggleRole}
          onCavalierChange={handleCavalierChange}
          onDemoiselleChange={handleDemoiselleChange}
          onTemoinsMarieChange={handleTemoinsMarieChange}
          onTemoinsMarieeChange={handleTemoinsMarieeChange}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Groupes du cortège</h3>
        <GroupBuilder
          sequenceId={sequenceId}
          enabledRoles={enabledRoles}
          cavalierCount={cavalierCount}
          demoiselleCount={demoiselleCount}
          temoinsMarieCount={temoinsMarieCount}
          temoinsMarieeCount={temoinsMarieeCount}
        />
      </div>
    </div>
    </div>
  )
}

export function CortegeSettingsManager() {
  const { data: sequences = [], isLoading } = useEventSequences()
  const sorted = useMemo(
    () => [...sequences].sort((a, b) => a.sortOrder - b.sortOrder),
    [sequences]
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const seqId = activeId ?? sorted[0]?.id ?? null

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    )
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune séquence définie.</p>
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Pour chaque séquence, activez les rôles présents puis organisez-les en groupes qui apparaîtront dans le schéma du cortège.
      </p>

      {/* Sélecteur séquence */}
      <div className="flex gap-2 flex-wrap">
        {sorted.map((seq) => {
          const active = seqId === seq.id
          return (
            <button
              key={seq.id}
              onClick={() => setActiveId(seq.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {seq.name}
            </button>
          )
        })}
      </div>

      {seqId && (
        <SequenceEditor
          sequenceId={seqId}
          otherSequences={sorted.filter((s) => s.id !== seqId)}
        />
      )}
    </div>
  )
}
