import { useMemo, useState } from "react"
import { ListTree, LayoutGrid, FolderTree, UserX, TriangleAlert } from "lucide-react"

import type { Domaine, Mission, MissionAcceptanceStatus, Pole } from "@/types/domain"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatCard } from "@/components/shared/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DomaineResponsableSelect } from "@/components/shared/DomaineResponsableSelect"
import { usePoles } from "@/hooks/queries/use-poles"
import { useDomaines } from "@/hooks/queries/use-domaines"
import { useMissions } from "@/hooks/queries/use-missions"
import { useDomaineResponsables } from "@/hooks/queries/use-domaine-responsables"
import { useAllMissionAcceptances } from "@/hooks/queries/use-mission-acceptances"
import { usePeople } from "@/hooks/queries/use-people"
import { useGuests } from "@/hooks/queries/use-guests"
import { useIdentity } from "@/context/IdentityContext"
import { DOMAINE_PHASE_LABELS } from "@/lib/constants"
import { compareDomaines } from "@/lib/ordering"

const NO_POLE = "__no_pole__"

const ACCEPTANCE_CONFIG: Record<MissionAcceptanceStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-muted text-muted-foreground" },
  accepted: { label: "Acceptée", className: "bg-vert-vegetal/15 text-vert-vegetal" },
  declined: { label: "Déclinée", className: "bg-bordeaux/10 text-bordeaux" },
}

type Scope = "mine" | "all"

export function AssignationsPage() {
  const { person } = useIdentity()
  const { data: poles, isLoading: polesLoading } = usePoles()
  const { data: domaines, isLoading: domainesLoading } = useDomaines()
  const { data: missions, isLoading: missionsLoading } = useMissions()
  const { data: responsables, isLoading: responsablesLoading } = useDomaineResponsables()
  const { data: acceptances, isLoading: acceptancesLoading } = useAllMissionAcceptances()
  const { data: people } = usePeople()
  const { data: guests } = useGuests()

  const [scope, setScope] = useState<Scope>("mine")

  const isLoading =
    polesLoading || domainesLoading || missionsLoading || responsablesLoading || acceptancesLoading

  const domaineResponsable = useMemo(() => {
    const map = new Map<string, { label: string; guestId?: string | null }>()
    for (const domaine of domaines ?? []) {
      const domaineResponsables = (responsables ?? []).filter((r) => r.domaineId === domaine.id)
      const current = domaineResponsables.find((r) => r.rank === "principal") ?? domaineResponsables[0]
      if (!current) continue
      const label = current.personId
        ? people?.find((p) => p.id === current.personId)?.fullName
        : guests?.find((g) => g.id === current.guestId)?.fullName
      if (label) map.set(domaine.id, { label, guestId: current.guestId })
    }
    return map
  }, [domaines, responsables, people, guests])

  const acceptanceStatusByMissionAndGuest = useMemo(() => {
    const map = new Map<string, MissionAcceptanceStatus>()
    for (const a of acceptances ?? []) map.set(`${a.missionId}:${a.guestId}`, a.status)
    return map
  }, [acceptances])

  const visiblePoles = useMemo(() => {
    const allPoles = poles ?? []
    if (scope === "all") return allPoles
    return allPoles.filter((p) => p.responsiblePersonId === person?.id)
  }, [poles, scope, person])

  const poleGroups = useMemo(() => {
    if (!domaines || !missions) return []

    const sortedPoles = [...visiblePoles].sort((a, b) => a.sortOrder - b.sortOrder)
    const poleList: { pole: Pole | null; id: string; name: string }[] = sortedPoles.map((p) => ({
      pole: p,
      id: p.id,
      name: p.name,
    }))
    if (scope === "all") {
      poleList.push({ pole: null, id: NO_POLE, name: "Sans pôle" })
    }

    return poleList
      .map(({ pole, id, name }) => {
        const poleDomaines = domaines
          .filter((d) => (id === NO_POLE ? !d.poleId : d.poleId === id))
          .sort(compareDomaines)
          .map((domaine) => ({
            domaine,
            missions: missions
              .filter((m) => m.domaineId === domaine.id)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          }))

        return {
          pole,
          id,
          name,
          domaineGroups: poleDomaines,
          unassignedDomaineCount: poleDomaines.filter((g) => !domaineResponsable.has(g.domaine.id)).length,
        }
      })
      .filter((group) => group.domaineGroups.length > 0)
  }, [visiblePoles, domaines, missions, scope, domaineResponsable])

  const scopedStats = useMemo(() => {
    const realPoles = visiblePoles
    const allDomaines = poleGroups.flatMap((g) => g.domaineGroups.map((dg) => dg.domaine))
    const allMissions = poleGroups.flatMap((g) => g.domaineGroups.flatMap((dg) => dg.missions))
    const unassignedPoleCount = realPoles.filter((p) => !p.responsiblePersonId).length
    const unassignedDomaines = allDomaines.filter((d) => !domaineResponsable.has(d.id))
    const unassignedDomaineIds = new Set(unassignedDomaines.map((d) => d.id))
    const missionsInUnassignedDomaines = allMissions.filter(
      (m) => m.domaineId && unassignedDomaineIds.has(m.domaineId)
    )
    return {
      poleCount: realPoles.length,
      unassignedPoleCount,
      domaineCount: allDomaines.length,
      unassignedDomaineCount: unassignedDomaines.length,
      missionsInUnassignedDomainesCount: missionsInUnassignedDomaines.length,
    }
  }, [visiblePoles, poleGroups, domaineResponsable])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignations"
        description="Vue d'ensemble des pôles, domaines et missions, pour repérer rapidement ce qui n'est pas encore assigné."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={scope === "mine" ? "default" : "outline"}
              size="sm"
              onClick={() => setScope("mine")}
            >
              Mes pôles
            </Button>
            <Button variant={scope === "all" ? "default" : "outline"} size="sm" onClick={() => setScope("all")}>
              Tous les pôles
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={LayoutGrid}
              label={scopedStats.unassignedPoleCount === 0 ? "Pôles assignés" : "Pôles non assignés"}
              value={
                scopedStats.unassignedPoleCount === 0
                  ? scopedStats.poleCount
                  : `${scopedStats.unassignedPoleCount} / ${scopedStats.poleCount}`
              }
              accentClassName="bg-bordeaux/10 text-bordeaux"
            />
            <StatCard
              icon={FolderTree}
              label={scopedStats.unassignedDomaineCount === 0 ? "Domaines assignés" : "Domaines non assignés"}
              value={
                scopedStats.unassignedDomaineCount === 0
                  ? scopedStats.domaineCount
                  : `${scopedStats.unassignedDomaineCount} / ${scopedStats.domaineCount}`
              }
              accentClassName="bg-dore/20 text-brun"
            />
            <StatCard
              icon={TriangleAlert}
              label="Missions concernées"
              value={scopedStats.missionsInUnassignedDomainesCount}
              hint="Missions dont le domaine n'a pas de responsable"
              accentClassName="bg-muted text-muted-foreground"
            />
          </div>

          {poleGroups.length === 0 ? (
            <EmptyState
              icon={ListTree}
              title={scope === "mine" ? "Vous n'avez aucun pôle assigné pour l'instant" : "Aucun pôle pour l'instant"}
              description={scope === "mine" ? "Vous pouvez consulter l'ensemble des pôles." : undefined}
              action={
                scope === "mine" ? (
                  <Button variant="outline" size="sm" onClick={() => setScope("all")}>
                    Voir tous les pôles
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {poleGroups.map(({ pole, id, name, domaineGroups, unassignedDomaineCount }) => (
                <Card key={id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="font-heading text-base">{name}</CardTitle>
                      {pole && !pole.responsiblePersonId ? (
                        <Badge variant="destructive">
                          <UserX className="size-3" />
                          Pôle non assigné
                        </Badge>
                      ) : null}
                      {unassignedDomaineCount > 0 ? (
                        <Badge variant="outline">
                          {unassignedDomaineCount} domaine{unassignedDomaineCount === 1 ? "" : "s"} non assigné
                          {unassignedDomaineCount === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {domaineGroups.map(({ domaine, missions: domaineMissions }) => (
                      <DomaineRow
                        key={domaine.id}
                        domaine={domaine}
                        responsableGuestId={domaineResponsable.get(domaine.id)?.guestId}
                        missions={domaineMissions}
                        acceptanceStatusByMissionAndGuest={acceptanceStatusByMissionAndGuest}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DomaineRow({
  domaine,
  responsableGuestId,
  missions,
  acceptanceStatusByMissionAndGuest,
}: {
  domaine: Domaine
  responsableGuestId?: string | null
  missions: Mission[]
  acceptanceStatusByMissionAndGuest: Map<string, MissionAcceptanceStatus>
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{domaine.name}</p>
          {domaine.phase ? (
            <Badge className="bg-muted text-muted-foreground">{DOMAINE_PHASE_LABELS[domaine.phase]}</Badge>
          ) : null}
        </div>
        <DomaineResponsableSelect domaine={domaine} />
      </div>
      {missions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {missions.map((mission) => {
            const acceptanceStatus = responsableGuestId
              ? acceptanceStatusByMissionAndGuest.get(`${mission.id}:${responsableGuestId}`) ?? "pending"
              : null
            return (
              <span
                key={mission.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 text-xs text-foreground"
              >
                {mission.title}
                <StatusBadge status={mission.status} />
                {acceptanceStatus ? <AcceptanceBadge status={acceptanceStatus} /> : null}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucune mission pour ce domaine.</p>
      )}
    </div>
  )
}

function AcceptanceBadge({ status }: { status: MissionAcceptanceStatus }) {
  const config = ACCEPTANCE_CONFIG[status]
  return <Badge className={config.className}>{config.label}</Badge>
}
