import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Navigate } from "react-router-dom"
import { CalendarClock, CheckSquare, FolderX, Sparkles, TriangleAlert, Users } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatCard } from "@/components/shared/StatCard"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useIdentity } from "@/context/IdentityContext"
import { useEventConfig } from "@/context/EventConfigContext"
import { useDashboardSummary } from "@/hooks/queries/use-dashboard"
import { MILESTONE_LABELS } from "@/lib/constants"
import { formatWeeks } from "@/lib/date"

export function DashboardPage() {
  const { person } = useIdentity()
  const { daysUntilEvent, isDayOf } = useEventConfig()
  const { isLoading, summary } = useDashboardSummary()

  if (person?.assignable && isDayOf) {
    return <Navigate to="/ma-mission" replace />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'organisation des fiançailles."
      />

      {isLoading || !summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={CalendarClock}
              label="Jours avant les fiançailles"
              value={daysUntilEvent >= 0 ? daysUntilEvent : "Passé"}
              hint={daysUntilEvent > 0 ? `soit ${formatWeeks(daysUntilEvent)}` : undefined}
              accentClassName="bg-bordeaux/10 text-bordeaux"
            />
            <StatCard
              icon={CheckSquare}
              label="Items restants"
              value={`${summary.itemsRemaining} / ${summary.itemsTotal}`}
              accentClassName="bg-dore/20 text-brun"
            />
            <StatCard
              icon={Users}
              label="Référents prêts"
              value={`${summary.referentsReadiness.filter((r) => r.ready).length} / ${summary.referentsReadiness.length}`}
              accentClassName="bg-vert-vegetal/15 text-vert-vegetal"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-base">
                  <Sparkles className="size-4 text-dore" />
                  Prochains jalons
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.nextMilestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun jalon à venir.</p>
                ) : (
                  summary.nextMilestones.map((event) => (
                    <div key={event.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        {event.startsAt ? (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.startsAt), "d MMMM yyyy", { locale: fr })}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {MILESTONE_LABELS[event.milestone] ?? event.milestone}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-base">
                  <TriangleAlert className="size-4 text-bordeaux" />
                  Tâches en retard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.overdueItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun item en retard. 🎉</p>
                ) : (
                  summary.overdueItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <PriorityBadge priority={item.priority} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-base">
                  <FolderX className="size-4 text-muted-foreground" />
                  Documents manquants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.missingDocumentCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tout est à jour. 🎉</p>
                ) : (
                  summary.missingDocumentCategories.map((category) => (
                    <p key={category} className="text-sm text-foreground">
                      {category}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!isLoading && summary && summary.itemsTotal === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Aucun item pour l'instant"
          description="Les items créés apparaîtront ici."
        />
      ) : null}
    </div>
  )
}
