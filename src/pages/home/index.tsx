import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, HeartHandshake, XCircle } from "lucide-react"

import { useIdentity } from "@/context/IdentityContext"
import { useMissions } from "@/hooks/queries/use-missions"
import { useDomaines } from "@/hooks/queries/use-domaines"
import { useMissionAcceptancesForGuest, useRespondToMission } from "@/hooks/queries/use-mission-acceptances"
import { useResponsableEntries } from "@/hooks/use-responsable-entries"
import { DashboardPage } from "@/pages/dashboard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { EVENT_DATE, EVENT_NAME } from "@/lib/constants"
import type { Mission, MissionAcceptanceStatus } from "@/types/domain"

// ── Page d'accueil invité simple ──────────────────────────────────────────────

function GuestHomePage() {
  const { person } = useIdentity()
  const firstName = person?.fullName.split(" ")[0] ?? ""

  const eventDate = new Date(EVENT_DATE)
  const formattedDate = eventDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const now = new Date()
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isPast = daysUntil < 0

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Bonjour {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nous sommes impatients de te retrouver pour les {EVENT_NAME}.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4">
          <HeartHandshake className="size-8 shrink-0 text-primary" />
          <div className="space-y-0.5">
            <p className="font-heading text-sm font-semibold capitalize text-foreground">{formattedDate}</p>
            {!isPast && (
              <p className="text-sm text-muted-foreground">
                {daysUntil === 0
                  ? "C'est aujourd'hui !"
                  : daysUntil === 1
                  ? "Demain !"
                  : `Dans ${daysUntil} jours`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

// ── Carte mission en attente ───────────────────────────────────────────────────

function PendingMissionCard({
  mission,
  domaineName,
  isResponding,
  onAccept,
  onDecline,
}: {
  mission: Mission
  domaineName?: string
  isResponding: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-card p-5 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-heading text-sm font-semibold text-foreground leading-snug">{mission.title}</p>
          {domaineName && (
            <Badge variant="outline" className="shrink-0 text-xs">{domaineName}</Badge>
          )}
        </div>
        {mission.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{mission.description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="success" className="gap-1.5" disabled={isResponding} onClick={onAccept}>
          <CheckCircle2 className="size-3.5" />
          Je m'en charge
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" disabled={isResponding} onClick={onDecline}>
          <XCircle className="size-3.5" />
          Pas disponible
        </Button>
      </div>
    </div>
  )
}

// ── Ligne mission acceptée ─────────────────────────────────────────────────────

function AcceptedMissionRow({ mission, domaineName }: { mission: Mission; domaineName?: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-card px-5 py-4 flex items-center gap-3">
      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{mission.title}</p>
        {domaineName && <p className="text-xs text-muted-foreground">{domaineName}</p>}
      </div>
    </div>
  )
}

// ── Page d'accueil référent ───────────────────────────────────────────────────

function ReferentHomePage() {
  const { person } = useIdentity()
  const { data: missions, isLoading: missionsLoading } = useMissions()
  const { data: domaines } = useDomaines()
  const { data: acceptances } = useMissionAcceptancesForGuest(person?.id)
  const { isLoading: entriesLoading, entries } = useResponsableEntries()
  const respondToMission = useRespondToMission()
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const firstName = person?.fullName.split(" ")[0] ?? ""

  const statusMap = useMemo(() => {
    const map = new Map<string, MissionAcceptanceStatus>()
    for (const a of acceptances ?? []) map.set(a.missionId, a.status)
    return map
  }, [acceptances])

  const myMissions = useMemo(() => {
    if (!person || !missions) return []
    const entry = entries.find((e) => e.identity.id === person.id)
    const domaineIds = entry?.domaineIds ?? []
    return missions
      .filter((m) => m.domaineId && domaineIds.includes(m.domaineId))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [person, missions, entries])

  const pendingMissions = myMissions.filter((m) => {
    const s = statusMap.get(m.id)
    return s === undefined || s === "pending"
  })
  const acceptedMissions = myMissions.filter((m) => statusMap.get(m.id) === "accepted")
  const allDeclined = myMissions.length > 0 && pendingMissions.length === 0 && acceptedMissions.length === 0

  function domaineNameOf(domaineId?: string | null) {
    return domaines?.find((d) => d.id === domaineId)?.name
  }

  function respond(missionId: string, status: "accepted" | "declined") {
    setRespondingId(missionId)
    respondToMission.mutate(
      { missionId, guestId: person!.id, status },
      { onSettled: () => setRespondingId(null) }
    )
  }

  if (missionsLoading || entriesLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        {[1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Bonjour {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voici votre espace de coordination pour {EVENT_NAME}.
        </p>
      </div>

      {allDeclined && (
        <EmptyState
          icon={XCircle}
          title="Toutes les missions ont été déclinées"
          description="Si vous changez d'avis, vous pouvez reconsidérer vos réponses depuis l'onglet Mon rôle."
        />
      )}

      {pendingMissions.length > 0 && (
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <h2 className="font-heading text-sm font-semibold text-foreground">Missions à confirmer</h2>
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {pendingMissions.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sarah &amp; Jordan vous ont confié ces missions. Confirmez celles que vous êtes prêt·e à prendre en charge.
            </p>
          </div>
          <div className="space-y-3">
            {pendingMissions.map((mission) => (
              <PendingMissionCard
                key={mission.id}
                mission={mission}
                domaineName={domaineNameOf(mission.domaineId)}
                isResponding={respondingId === mission.id}
                onAccept={() => respond(mission.id, "accepted")}
                onDecline={() => respond(mission.id, "declined")}
              />
            ))}
          </div>
        </section>
      )}

      {acceptedMissions.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">Votre programme</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Les missions que vous avez acceptées de prendre en charge.
            </p>
          </div>
          <div className="space-y-2">
            {acceptedMissions.map((mission) => (
              <AcceptedMissionRow
                key={mission.id}
                mission={mission}
                domaineName={domaineNameOf(mission.domaineId)}
              />
            ))}
          </div>
        </section>
      )}

      {myMissions.length === 0 && (
        <EmptyState
          icon={Clock}
          title="Aucune mission assignée"
          description="Aucune mission ne vous a été confiée pour l'instant. Revenez plus tard."
        />
      )}
    </div>
  )
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function IndexPage() {
  const { person } = useIdentity()
  const { entries, isLoading } = useResponsableEntries()

  if (!person) return null
  if (person.role === "admin") return <DashboardPage />

  if (isLoading) return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
    </div>
  )

  const isReferent = entries.some((e) => e.identity.id === person.id)
  return isReferent ? <ReferentHomePage /> : <GuestHomePage />
}
