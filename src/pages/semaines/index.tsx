import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEventConfig } from "@/context/EventConfigContext"
import { useIdentity } from "@/context/IdentityContext"
import { usePeople } from "@/hooks/queries/use-people"
import { usePoles } from "@/hooks/queries/use-poles"
import { useSprintTasks, useSprints } from "@/hooks/queries/use-sprints"
import type { SprintTask } from "@/services/supabase/sprints"
import { Backlog } from "./backlog"
import { History } from "./history"
import { SprintBoard } from "./board"
import { SplitDialog, TaskDialog } from "./components"
import { daysUntil, fiancesOf, iso, rangeLabel, today } from "./lib"
import { WeeklyReview } from "./review"

type Tab = "semaine" | "backlog" | "point" | "historique"

/**
 * Semaines (fiancés seulement) : backlog estimé en points, une semaine de travail du jeudi au mercredi
 * avec une capacité par personne, et le point hebdo du mercredi qui clôture et lance la suivante.
 */
export function SemainesPage() {
  const { data: sprints = [], isLoading: lSprints, error } = useSprints()
  const { data: tasks = [], isLoading: lTasks } = useSprintTasks()
  const { data: people = [], isLoading: lPeople } = usePeople()
  const { data: poles = [] } = usePoles()
  const { realPerson } = useIdentity()
  const { eventDate } = useEventConfig()
  const fiances = useMemo(() => fiancesOf(people), [people])
  const me = realPerson && fiances.some((f) => f.id === realPerson.id) ? realPerson.id : null

  const current = sprints.filter((s) => !s.closedAt).at(-1) ?? null
  const weekNumber = current ? sprints.indexOf(current) + 1 : 0
  const inSprint = current ? tasks.filter((t) => t.sprintId === current.id) : []
  const backlog = tasks.filter((t) => !t.sprintId)
  const weddingDay = iso(eventDate)
  // Le point hebdo est dû le mercredi (dernier jour) ou si la semaine est finie.
  const reviewDue = !current || today() >= current.endDate

  const [tab, setTab] = useState<Tab | null>(null)
  const [reviewStart, setReviewStart] = useState(() => Date.now())
  const shown: Tab = tab ?? (current ? "semaine" : "point")
  const [open, setOpen] = useState<{ task: SprintTask | null; key: number } | null>(null)
  const [split, setSplit] = useState<SprintTask | null>(null)
  const nextOrder = backlog.reduce((m, t) => Math.max(m, t.sortOrder), 0) + 1

  if (lSprints || lTasks || lPeople) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semaines"
        description={current
          ? `Semaine ${weekNumber} · ${rangeLabel(current)} · J-${daysUntil(weddingDay)}`
          : `Une semaine à la fois jusqu'au mariage · J-${daysUntil(weddingDay)}`}
        actions={<Button onClick={() => setOpen({ task: null, key: Date.now() })}><Plus className="size-4" />Tâche</Button>}
      />

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Impossible de charger les semaines : {(error as Error).message}. La migration 0187 est-elle exécutée ?
        </p>
      )}

      <Tabs value={shown} onValueChange={(v) => { setTab(v as Tab); if (v === "point" && shown !== "point") setReviewStart(Date.now()) }}>
        <TabsList>
          <TabsTrigger value="semaine" disabled={!current}>Cette semaine{current ? ` (${inSprint.length})` : ""}</TabsTrigger>
          <TabsTrigger value="backlog">Backlog ({backlog.length})</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="point" className="relative">
            Point hebdo
            {reviewDue && current && <span aria-label="à faire" className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-500" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="semaine" className="mt-5">
          {current && <SprintBoard sprint={current} tasks={inSprint} fiances={fiances} poles={poles} me={me} onOpen={(t) => setOpen({ task: t, key: Date.now() })} />}
        </TabsContent>
        <TabsContent value="backlog" className="mt-5">
          <Backlog backlog={backlog} openSprintTasks={inSprint.filter((t) => t.status !== "done")} sprint={current} fiances={fiances} poles={poles}
            weddingDay={weddingDay} onOpen={(t) => setOpen({ task: t, key: Date.now() })} onSplit={setSplit} />
        </TabsContent>
        <TabsContent value="historique" className="mt-5">
          <History sprints={sprints} tasks={tasks} fiances={fiances} poles={poles} />
        </TabsContent>
        {/* Toujours monté : les choix du point hebdo ne sont pas perdus en allant voir un autre onglet. */}
        <TabsContent value="point" forceMount className="mt-5 data-[state=inactive]:hidden">
          <WeeklyReview key={current?.id ?? "first"} current={current} sprints={sprints} tasks={tasks} fiances={fiances} poles={poles} me={me}
            onLaunched={() => setTab("semaine")} startedAt={reviewStart} />
        </TabsContent>
      </Tabs>

      {open && (
        <TaskDialog key={open.key} open task={open.task} onClose={() => setOpen(null)} fiances={fiances} poles={poles} sprint={current}
          sprintTasks={inSprint} me={me} nextOrder={nextOrder} defaultDestination={shown === "semaine" ? "sprint" : "backlog"} onSplit={setSplit} />
      )}
      {split && <SplitDialog task={split} onClose={() => setSplit(null)} />}
    </div>
  )
}
