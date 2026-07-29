import { useMemo, useState } from "react"
import {
  ListChecks, LayoutGrid, FolderTree, CheckCircle2, TriangleAlert,
  Clock, Ban, ArrowRight, Calendar, RefreshCw, UserPlus, History,
} from "lucide-react"

import { toast } from "sonner"

import type { ChecklistItem, Domaine, Guest, Mission, MissionAcceptance, ProgressStatus } from "@/types/domain"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatCard } from "@/components/shared/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { ChecklistWidget } from "@/components/shared/ChecklistWidget"
import { ChecklistItemCard } from "@/components/checklist-items/ChecklistItemCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMissions, useUpdateMission } from "@/hooks/queries/use-missions"
import { useRosLaunches } from "@/hooks/queries/use-ros-launches"
import { useDomaines } from "@/hooks/queries/use-domaines"
import { usePoles } from "@/hooks/queries/use-poles"
import { useAllChecklists, useAllChecklistItems, useUpdateChecklistItem } from "@/hooks/queries/use-checklists"
import { useDomaineResponsables } from "@/hooks/queries/use-domaine-responsables"
import { useAllMissionAcceptances, useRespondToMission } from "@/hooks/queries/use-mission-acceptances"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { useIdentity } from "@/context/IdentityContext"
import { useResponsableEntries } from "@/hooks/use-responsable-entries"
import { useAssigneeHistory } from "@/hooks/queries/use-assignee-history"
import { MissionEditDialog } from "@/components/missions/MissionEditDialog"
import { MissionResponsableSelect } from "@/components/missions/MissionResponsableSelect"
import { DomaineResponsableSelect } from "@/components/shared/DomaineResponsableSelect"
import { DOMAINE_PHASE_LABELS, DOMAINE_PHASE_ORDER } from "@/lib/constants"
import { resolveEffectiveMissionResponsable, type EffectiveResponsable } from "@/lib/responsible"
import { cn } from "@/lib/utils"

const NO_POLE = "__no_pole__"
const DASHBOARD_TAB = "__dashboard__"

type MissionWithContext = {
  mission: Mission
  context: string | undefined
}

function itemStats(items: ChecklistItem[]) {
  const total = items.length
  const done = items.filter((item) => item.isDone).length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, percent }
}

function effectiveDueDate(item: ChecklistItem) {
  return item.estimatedEndDate ?? item.estimatedStartDate ?? null
}

function contextLabel(mission?: Mission, domaine?: Domaine) {
  return [domaine?.name, mission?.title].filter(Boolean).join(" · ") || undefined
}

const SCHEDULABLE_PHASES = new Set(["installation", "jour_j", "desinstallation"])

function DomaineMissionsCard({
  domaine,
  missions,
  effectiveByMissionId,
}: {
  domaine: Domaine
  missions: Mission[]
  effectiveByMissionId?: Map<string, EffectiveResponsable | null>
}) {
  const schedulable = SCHEDULABLE_PHASES.has(domaine.phase ?? "")
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-heading text-base">{domaine.name}</CardTitle>
            {domaine.phase ? (
              <Badge className="bg-muted text-muted-foreground">{DOMAINE_PHASE_LABELS[domaine.phase]}</Badge>
            ) : null}
          </div>
          <DomaineResponsableSelect domaine={domaine} />
        </div>
        {domaine.description ? <p className="text-xs text-muted-foreground">{domaine.description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {missions.map((mission) => {
          const effective = effectiveByMissionId?.get(mission.id)
          // Héritage visible dans le ChecklistWidget seulement si la source n'est pas l'item lui-même
          const inheritedForItems = effective?.name
          // Pour le select mission : on transmet le nom du parent uniquement si la mission n'a pas de responsable propre
          const missionParentName = (!mission.responsiblePersonId && !mission.responsibleGuestId)
            ? effective?.name
            : undefined
          return (
            <div key={mission.id} className="space-y-2 rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{mission.title}</p>
                  <StatusBadge status={mission.status} />
                </div>
                {schedulable && (
                  <MissionResponsableSelect mission={mission} inheritedName={missionParentName} />
                )}
                <MissionEditDialog mission={mission} />
              </div>
              {mission.description ? <p className="text-xs text-muted-foreground">{mission.description}</p> : null}
              <ChecklistWidget
                ownerType="mission"
                ownerId={mission.id}
                allowAssignment={false}
                schedulable={schedulable}
                inheritedResponsable={inheritedForItems}
              />
            </div>
          )
        })}
        <div className="space-y-1.5 rounded-xl border border-dashed border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Definition of Done du domaine</p>
          <ChecklistWidget ownerType="domaine" ownerId={domaine.id} allowAssignment={false} />
        </div>
      </CardContent>
    </Card>
  )
}

function QuickScheduleCard({ mission, context }: MissionWithContext) {
  const updateMission = useUpdateMission()

  async function handleEnContinu() {
    const { mutate } = updateMission
    await updateMission.mutateAsync({ id: mission.id, patch: { schedulingType: "en_continu" } })
    toast.success(`${mission.title} · En continu`, {
      action: {
        label: "Annuler",
        onClick: () => mutate({ id: mission.id, patch: { schedulingType: null } }),
      },
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{mission.title}</p>
        {context && <p className="text-xs text-muted-foreground">{context}</p>}
      </div>
      <button
        type="button"
        onClick={handleEnContinu}
        disabled={updateMission.isPending}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
      >
        <RefreshCw className="size-3 shrink-0" />
        En continu
      </button>
    </div>
  )
}

function QuickAssignCard({
  mission,
  context,
  assignableGuests,
  assignedGuest,
}: MissionWithContext & { assignableGuests: Guest[]; assignedGuest?: Guest }) {
  const respondToMission = useRespondToMission()

  // Include assignedGuest in options even if not globally assignable
  const options = useMemo(() => {
    if (!assignedGuest || assignableGuests.some((g) => g.id === assignedGuest.id)) return assignableGuests
    return [...assignableGuests, assignedGuest].sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
  }, [assignableGuests, assignedGuest])

  function handleAssign(guestId: string) {
    if (assignedGuest && assignedGuest.id !== guestId) {
      respondToMission.mutate(
        { missionId: mission.id, guestId: assignedGuest.id, status: "declined" },
        { onSuccess: () => respondToMission.mutate({ missionId: mission.id, guestId, status: "accepted" }) }
      )
    } else {
      respondToMission.mutate({ missionId: mission.id, guestId, status: "accepted" })
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{mission.title}</p>
        {context && <p className="text-xs text-muted-foreground">{context}</p>}
      </div>
      <Select
        value={assignedGuest?.id ?? ""}
        onValueChange={handleAssign}
        disabled={respondToMission.isPending}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Assigner un référent…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((g) => (
            <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function MissionsPage() {
  const { data: missions, isLoading: missionsLoading } = useMissions()
  const { data: domaines, isLoading: domainesLoading } = useDomaines()
  const { data: poles, isLoading: polesLoading } = usePoles()
  const { data: checklists, isLoading: checklistsLoading } = useAllChecklists()
  const { data: checklistItems, isLoading: itemsLoading } = useAllChecklistItems()
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: people, isLoading: peopleLoading } = usePeople()
  const { data: acceptances, isLoading: acceptancesLoading } = useAllMissionAcceptances()
  const { data: domaineResponsables = [] } = useDomaineResponsables()
  const { data: rosLaunches = [] } = useRosLaunches()
  const updateItem = useUpdateChecklistItem()
  const { person } = useIdentity()
  const { isLoading: entriesLoading, entries } = useResponsableEntries()

  const isLoading =
    missionsLoading || domainesLoading || polesLoading || checklistsLoading ||
    itemsLoading || entriesLoading || guestsLoading || acceptancesLoading || peopleLoading

  const myDomaineIds = useMemo(() => {
    if (!person || person.role === "admin") return null
    return entries.find((e) => e.identity.id === person.id)?.domaineIds ?? []
  }, [person, entries])

  const effectiveByMissionId = useMemo(() => {
    const map = new Map<string, EffectiveResponsable | null>()
    for (const mission of missions ?? []) {
      const domaine = (domaines ?? []).find((d) => d.id === mission.domaineId)
      map.set(mission.id, resolveEffectiveMissionResponsable(
        mission, domaine, domaineResponsables, poles ?? [], people ?? [], guests ?? []
      ))
    }
    return map
  }, [missions, domaines, domaineResponsables, poles, people, guests])

  const visibleMissions = useMemo(() => {
    if (!missions) return undefined
    if (myDomaineIds === null) return missions
    return missions.filter((m) => m.domaineId && myDomaineIds.includes(m.domaineId))
  }, [missions, myDomaineIds])

  const itemsByMissionId = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    if (!checklists || !checklistItems) return map
    const checklistsByMissionId = new Map<string, string[]>()
    for (const checklist of checklists) {
      if (checklist.ownerType !== "mission" || !checklist.ownerId) continue
      const ids = checklistsByMissionId.get(checklist.ownerId) ?? []
      ids.push(checklist.id)
      checklistsByMissionId.set(checklist.ownerId, ids)
    }
    for (const [missionId, checklistIds] of checklistsByMissionId) {
      map.set(
        missionId,
        checklistItems.filter((item) => checklistIds.includes(item.checklistId))
      )
    }
    return map
  }, [checklists, checklistItems])

  const myDomaineGroups = useMemo(() => {
    if (!missions || !domaines || !person) return []
    const myResponsableDomaineIds = entries.find((e) => e.identity.id === person.id)?.domaineIds ?? []
    return domaines
      .filter((d) => myResponsableDomaineIds.includes(d.id))
      .sort((a, b) => {
        const phaseDiff =
          DOMAINE_PHASE_ORDER.indexOf(a.phase ?? DOMAINE_PHASE_ORDER[0]) -
          DOMAINE_PHASE_ORDER.indexOf(b.phase ?? DOMAINE_PHASE_ORDER[0])
        return phaseDiff !== 0 ? phaseDiff : a.sortOrder - b.sortOrder
      })
      .map((domaine) => ({
        domaine,
        missions: missions.filter((m) => m.domaineId === domaine.id).sort((a, b) => a.sortOrder - b.sortOrder),
      }))
  }, [missions, domaines, entries, person])

  const myOperationalStats = useMemo(() => {
    const myMissions = myDomaineGroups.flatMap((g) => g.missions)
    const myItems = myMissions.flatMap((m) => itemsByMissionId.get(m.id) ?? [])
    return { missionCount: myMissions.length, ...itemStats(myItems) }
  }, [myDomaineGroups, itemsByMissionId])

  const poleGroups = useMemo(() => {
    if (!visibleMissions || !domaines || !poles) return []

    const sortedPoles = [...poles].sort((a, b) => a.sortOrder - b.sortOrder)
    const poleList: { id: string; name: string; responsiblePersonId?: string | null }[] = [
      ...sortedPoles.map((p) => ({ id: p.id, name: p.name, responsiblePersonId: p.responsiblePersonId })),
      { id: NO_POLE, name: "Sans pôle" },
    ]

    return poleList
      .map((pole) => {
        const poleDomaines = domaines
          .filter((d) => (pole.id === NO_POLE ? !d.poleId : d.poleId === pole.id))
          .sort((a, b) => {
            const phaseDiff =
              DOMAINE_PHASE_ORDER.indexOf(a.phase ?? DOMAINE_PHASE_ORDER[0]) -
              DOMAINE_PHASE_ORDER.indexOf(b.phase ?? DOMAINE_PHASE_ORDER[0])
            return phaseDiff !== 0 ? phaseDiff : a.sortOrder - b.sortOrder
          })
          .map((domaine) => ({
            domaine,
            missions: visibleMissions.filter((m) => m.domaineId === domaine.id).sort((a, b) => a.sortOrder - b.sortOrder),
          }))
          .filter((group) => group.missions.length > 0)

        const poleMissions = poleDomaines.flatMap((g) => g.missions)
        const poleItems = poleMissions.flatMap((m) => itemsByMissionId.get(m.id) ?? [])

        return {
          pole,
          domaineGroups: poleDomaines,
          stats: {
            domaineCount: poleDomaines.length,
            missionCount: poleMissions.length,
            ...itemStats(poleItems),
          },
        }
      })
      .filter((group) => group.domaineGroups.length > 0)
  }, [visibleMissions, domaines, poles, itemsByMissionId])

  const globalStats = useMemo(() => {
    const allItems = [...itemsByMissionId.values()].flat()
    return {
      poleCount: poleGroups.length,
      domaineCount: poleGroups.reduce((sum, g) => sum + g.domaineGroups.length, 0),
      missionCount: (visibleMissions ?? []).length,
      ...itemStats(allItems),
    }
  }, [poleGroups, visibleMissions, itemsByMissionId])

  const itemsWithContext = useMemo(() => {
    if (!visibleMissions || !domaines) return []
    const missionById = new Map(visibleMissions.map((m) => [m.id, m]))
    const domaineById = new Map(domaines.map((d) => [d.id, d]))
    const visibleMissionIds = new Set(visibleMissions.map((m) => m.id))
    const result: { item: ChecklistItem; mission?: Mission; domaine?: Domaine }[] = []
    for (const [missionId, items] of itemsByMissionId) {
      if (!visibleMissionIds.has(missionId)) continue
      const mission = missionById.get(missionId)
      const domaine = mission?.domaineId ? domaineById.get(mission.domaineId) : undefined
      for (const item of items) result.push({ item, mission, domaine })
    }
    return result
  }, [itemsByMissionId, visibleMissions, domaines])

  const dashboard = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const notDone = itemsWithContext.filter(({ item }) => item.status !== "done")
    const urgent = notDone
      .filter(({ item }) => item.priority === "urgent")
      .sort((a, b) => (effectiveDueDate(a.item) ?? "9999").localeCompare(effectiveDueDate(b.item) ?? "9999"))
    const overdue = notDone
      .filter(({ item }) => {
        const due = effectiveDueDate(item)
        return due && new Date(due) < startOfToday
      })
      .sort((a, b) => (effectiveDueDate(a.item) ?? "9999").localeCompare(effectiveDueDate(b.item) ?? "9999"))
    const blocked = notDone.filter(({ item }) => item.status === "blocked")

    return { urgent, overdue, blocked }
  }, [itemsWithContext])

  const assignableGuests = useMemo(
    () => (guests ?? []).filter((g) => g.assignable).sort((a, b) => a.fullName.localeCompare(b.fullName, "fr")),
    [guests]
  )

  const unscheduledMissions = useMemo<MissionWithContext[]>(() => {
    if (!visibleMissions || !domaines || !acceptances) return []
    const domaineById = new Map(domaines.map((d) => [d.id, d]))
    const poleById = new Map((poles ?? []).map((p) => [p.id, p]))
    const launchedMissionIds = new Set(rosLaunches.map((l) => l.missionId).filter(Boolean))
    const phaseIdx = (phase?: string | null) => {
      const i = DOMAINE_PHASE_ORDER.findIndex((p) => p === phase)
      return i >= 0 ? i : 99
    }
    return visibleMissions
      .filter((m) => {
        const d = m.domaineId ? domaineById.get(m.domaineId) : undefined
        return d?.phase !== "avant"
          && d?.phase !== "apres"
          && m.schedulingType !== "en_continu"
          && !launchedMissionIds.has(m.id)
      })
      .sort((a, b) => {
        const dA = a.domaineId ? domaineById.get(a.domaineId) : undefined
        const dB = b.domaineId ? domaineById.get(b.domaineId) : undefined
        const diff = phaseIdx(dA?.phase) - phaseIdx(dB?.phase)
        return diff !== 0 ? diff : a.title.localeCompare(b.title, "fr")
      })
      .map((m) => {
        const d = m.domaineId ? domaineById.get(m.domaineId) : undefined
        const p = d?.poleId ? poleById.get(d.poleId) : undefined
        return { mission: m, context: [p?.name, d?.name].filter(Boolean).join(" · ") || undefined }
      })
  }, [visibleMissions, domaines, poles, acceptances, rosLaunches])

  const allMissionsForAssignment = useMemo<(MissionWithContext & { assignedGuest?: Guest })[]>(() => {
    if (!visibleMissions || !domaines || !acceptances || !guests) return []
    const domaineById = new Map(domaines.map((d) => [d.id, d]))
    const poleById = new Map((poles ?? []).map((p) => [p.id, p]))
    const guestById = new Map((guests ?? []).map((g) => [g.id, g]))
    return visibleMissions
      .map((m) => {
        const d = m.domaineId ? domaineById.get(m.domaineId) : undefined
        const p = d?.poleId ? poleById.get(d.poleId) : undefined
        const context = [p?.name, d?.name].filter(Boolean).join(" · ") || undefined
        const acceptedAcc = acceptances.find((a: MissionAcceptance) => a.missionId === m.id && a.status === "accepted")
        const assignedGuest = acceptedAcc ? guestById.get(acceptedAcc.guestId) : undefined
        return { mission: m, context, assignedGuest }
      })
      .sort((a, b) => {
        const ctxA = a.context ?? ""
        const ctxB = b.context ?? ""
        return ctxA !== ctxB ? ctxA.localeCompare(ctxB, "fr") : a.mission.title.localeCompare(b.mission.title, "fr")
      })
  }, [visibleMissions, domaines, poles, acceptances, guests])

  const unassignedCount = allMissionsForAssignment.filter((m) => !m.assignedGuest).length

  function handleStatusChange(item: ChecklistItem, status: ProgressStatus) {
    updateItem.mutate({ id: item.id, patch: { status, isDone: status === "done" } })
  }

  const isFiance = person?.role === "admin"
  const { data: assigneeHistory = [] } = useAssigneeHistory()
  const [activeTab, setActiveTab] = useState(DASHBOARD_TAB)
  const [fianceView, setFianceView] = useState<"pilotage" | "operationnelle">("pilotage")
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null)

  function switchTab(tab: string) {
    setActiveTab(tab)
    setPhaseFilter(null)
  }

  function goToPole(poleId: string) {
    switchTab(poleId)
  }

  const dashboardContent = (
    <>
      {/* Checklist alerts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={TriangleAlert}
          label="Urgents"
          value={dashboard.urgent.length}
          accentClassName="bg-bordeaux/10 text-bordeaux"
        />
        <StatCard
          icon={Clock}
          label="En retard"
          value={dashboard.overdue.length}
          accentClassName="bg-dore/20 text-brun"
        />
        <StatCard
          icon={Ban}
          label="Bloqués"
          value={dashboard.blocked.length}
          accentClassName="bg-muted text-muted-foreground"
        />
      </div>

      {/* Organisation des missions */}
      {(unscheduledMissions.length > 0 || unassignedCount > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            icon={Calendar}
            label="Non planifiées"
            value={unscheduledMissions.length}
            hint="Missions sans type de planification"
            accentClassName="bg-lagon/10 text-lagon"
          />
          <StatCard
            icon={UserPlus}
            label="Non assignées"
            value={unassignedCount}
            hint="Missions sans référent accepté"
            accentClassName="bg-dore/20 text-brun"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Avancement par pôle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {poleGroups.map(({ pole, stats }) => (
            <div key={pole.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{pole.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {stats.done} / {stats.total} ({stats.percent}%)
                  </span>
                </div>
                <Progress value={stats.percent} />
                <p className="text-xs text-muted-foreground">
                  {stats.domaineCount} domaine{stats.domaineCount === 1 ? "" : "s"} ·{" "}
                  {stats.missionCount} mission{stats.missionCount === 1 ? "" : "s"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => goToPole(pole.id)}>
                Voir
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Missions à planifier */}
      {unscheduledMissions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="font-heading text-base">Sans planification</CardTitle>
              <Badge className="bg-lagon/10 text-lagon">{unscheduledMissions.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Ni dans le timing ni en continu. Ajoutez-les dans le timing ou marquez-les en continu.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unscheduledMissions.map(({ mission, context }) => (
                <QuickScheduleCard key={mission.id} mission={mission} context={context} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Référents des missions */}
      {allMissionsForAssignment.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="font-heading text-base">Référents</CardTitle>
              {unassignedCount > 0 && (
                <Badge className="bg-dore/20 text-brun">{unassignedCount} sans référent</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Assignez ou modifiez le référent de chaque mission.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allMissionsForAssignment.map(({ mission, context, assignedGuest }) => (
                <QuickAssignCard
                  key={mission.id}
                  mission={mission}
                  context={context}
                  assignableGuests={assignableGuests}
                  assignedGuest={assignedGuest}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="font-heading text-base">Urgents</CardTitle>
            <Badge className="bg-bordeaux/10 text-bordeaux">{dashboard.urgent.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.urgent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien d&apos;urgent. 🎉</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboard.urgent.map(({ item, mission, domaine }) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  context={contextLabel(mission, domaine)}
                  onStatusChange={(status) => handleStatusChange(item, status)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">En retard</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien en retard. 🎉</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboard.overdue.map(({ item, mission, domaine }) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  context={contextLabel(mission, domaine)}
                  onStatusChange={(status) => handleStatusChange(item, status)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Bloqués</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun item bloqué.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboard.blocked.map(({ item, mission, domaine }) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  context={contextLabel(mission, domaine)}
                  onStatusChange={(status) => handleStatusChange(item, status)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isFiance && assigneeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <CardTitle className="font-heading text-base">Historique des responsables</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Par</th>
                  <th className="px-4 py-2 text-left font-medium">Niveau</th>
                  <th className="px-4 py-2 text-left font-medium">Élément</th>
                  <th className="px-4 py-2 text-left font-medium">Avant</th>
                  <th className="px-4 py-2 text-left font-medium">Après</th>
                </tr>
              </thead>
              <tbody>
                {assigneeHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2 font-medium">{entry.actorName}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground capitalize">
                        {{ pole: "Pôle", domaine: "Domaine", mission: "Mission", checklist_item: "Tâche" }[entry.entityType]}
                      </span>
                    </td>
                    <td className="px-4 py-2 max-w-48 truncate">{entry.entityLabel}</td>
                    <td className="px-4 py-2 text-muted-foreground">{entry.previousName ?? "—"}</td>
                    <td className="px-4 py-2">{entry.newName ?? <span className="text-muted-foreground">Retiré</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  )

  const poleTabsContents = poleGroups.map(({ pole, domaineGroups, stats }) => {
    const responsiblePerson = pole.responsiblePersonId
      ? (people ?? []).find((p) => p.id === pole.responsiblePersonId)
      : undefined
    return (
    <TabsContent key={pole.id} value={pole.id} className="space-y-4">
      <Card>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {stats.domaineCount} domaine{stats.domaineCount === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>
              {stats.missionCount} mission{stats.missionCount === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>
              {stats.done} / {stats.total} items terminés ({stats.percent}%)
            </span>
            {responsiblePerson && (
              <>
                <span aria-hidden>·</span>
                <span>
                  Responsable : <span className="font-medium text-foreground">{responsiblePerson.fullName}</span>
                </span>
              </>
            )}
          </div>
          <Progress value={stats.percent} />
        </CardContent>
      </Card>
      {(() => {
        const SCHEDULABLE = new Set(["installation", "jour_j", "desinstallation"])
        const byPhase = new Map<string, { done: number; total: number; unscheduled: number }>()
        for (const { domaine, missions: dm } of domaineGroups) {
          const phase = domaine.phase ?? "__none__"
          const items = dm.flatMap((m) => itemsByMissionId.get(m.id) ?? [])
          const ds = itemStats(items)
          const unscheduled = SCHEDULABLE.has(phase) ? items.filter((i) => !i.taskSchedulingType).length : 0
          const prev = byPhase.get(phase) ?? { done: 0, total: 0, unscheduled: 0 }
          byPhase.set(phase, { done: prev.done + ds.done, total: prev.total + ds.total, unscheduled: prev.unscheduled + unscheduled })
        }
        const rows: Array<{ phase: string; label: string; done: number; total: number; unscheduled: number }> = DOMAINE_PHASE_ORDER
          .filter((p) => byPhase.has(p))
          .map((p) => ({ phase: p, label: DOMAINE_PHASE_LABELS[p], ...byPhase.get(p)! }))
        if (byPhase.has("__none__")) rows.push({ phase: "__none__", label: "Sans phase", ...byPhase.get("__none__")!, unscheduled: 0 })
        if (rows.length === 0) return null
        return (
          <Card className="w-fit">
            <CardContent className="space-y-1">
              {rows.map(({ phase, label, done, total, unscheduled }) => {
                const isFiltered = phaseFilter === phase
                return (
                  <div key={phase} className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className={cn("w-28", isFiltered && "font-medium text-foreground")}>{label}</span>
                    <span className="tabular-nums">{done} / {total}</span>
                    {SCHEDULABLE.has(phase) && unscheduled > 0 && (
                      <button
                        type="button"
                        onClick={() => setPhaseFilter(isFiltered ? null : phase)}
                        className={cn(
                          "tabular-nums font-medium transition-colors",
                          isFiltered ? "text-foreground underline" : "text-red-500 hover:text-red-600"
                        )}
                      >
                        {unscheduled} sans temporalité
                      </button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })()}
      {domaineGroups
        .filter(({ domaine }) => phaseFilter === null || domaine.phase === phaseFilter)
        .map(({ domaine, missions: domaineMissions }) => {
          return (
            <DomaineMissionsCard
              key={domaine.id}
              domaine={domaine}
              missions={domaineMissions}
              effectiveByMissionId={effectiveByMissionId}
            />
          )
        })}
    </TabsContent>
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Les missions"
        description={
          myDomaineIds === null
            ? "Toutes les missions, regroupées par pôle et domaine, avec leurs checklists."
            : "Les missions qui vous ont été confiées, avec leurs checklists."
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : poleGroups.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={myDomaineIds === null ? "Aucune mission pour l'instant" : "Aucune mission ne vous a été confiée pour le moment"}
        />
      ) : (
        <>
          {isFiance ? (
            <div className="flex items-center gap-2">
              <Button
                variant={fianceView === "pilotage" ? "default" : "outline"}
                size="sm"
                onClick={() => setFianceView("pilotage")}
              >
                Vue pilotage
              </Button>
              <Button
                variant={fianceView === "operationnelle" ? "default" : "outline"}
                size="sm"
                onClick={() => setFianceView("operationnelle")}
              >
                Vue opérationnelle
              </Button>
            </div>
          ) : null}

          {isFiance && fianceView === "operationnelle" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={FolderTree}
                label="Missions assignées"
                value={myOperationalStats.missionCount}
                hint="Missions des domaines dont vous êtes responsable"
                accentClassName="bg-bordeaux/10 text-bordeaux"
              />
              <StatCard
                icon={CheckCircle2}
                label="Items"
                value={`${myOperationalStats.done} / ${myOperationalStats.total}`}
                hint={`${myOperationalStats.percent}% complété`}
                accentClassName="bg-vert-vegetal/15 text-vert-vegetal"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={LayoutGrid}
                label="Pôles"
                value={globalStats.poleCount}
                hint={`${globalStats.domaineCount} domaines`}
                accentClassName="bg-dore/20 text-brun"
              />
              <StatCard
                icon={FolderTree}
                label="Missions"
                value={globalStats.missionCount}
                accentClassName="bg-bordeaux/10 text-bordeaux"
              />
              <StatCard
                icon={CheckCircle2}
                label="Items terminés"
                value={`${globalStats.done} / ${globalStats.total}`}
                hint={`${globalStats.percent}% complété`}
                accentClassName="bg-vert-vegetal/15 text-vert-vegetal"
              />
              <Card>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Avancement global</p>
                  <Progress value={globalStats.percent} />
                  <p className="text-xs text-muted-foreground">{globalStats.percent}%</p>
                </CardContent>
              </Card>
            </div>
          )}

          {isFiance && fianceView === "operationnelle" ? (
            myDomaineGroups.length === 0 ? (
              <EmptyState icon={ListChecks} title="Aucune mission ne vous a été confiée pour le moment" />
            ) : (
              <div className="space-y-4">
                {myDomaineGroups.map(({ domaine, missions: domaineMissions }) => (
                  <DomaineMissionsCard
                    key={domaine.id}
                    domaine={domaine}
                    missions={domaineMissions}
                    effectiveByMissionId={effectiveByMissionId}
                  />
                ))}
              </div>
            )
          ) : (
            <Tabs value={activeTab} onValueChange={switchTab} className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => switchTab(DASHBOARD_TAB)}
                  className={cn(
                    "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors",
                    activeTab === DASHBOARD_TAB
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  Dashboard
                </button>
                {poleGroups.map(({ pole }) => (
                  <button
                    key={pole.id}
                    type="button"
                    onClick={() => switchTab(pole.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors",
                      activeTab === pole.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    {pole.name}
                  </button>
                ))}
              </div>

              <TabsContent value={DASHBOARD_TAB} className="space-y-4">
                {dashboardContent}
              </TabsContent>

              {poleTabsContents}
            </Tabs>
          )}
        </>
      )}
    </div>
  )
}
