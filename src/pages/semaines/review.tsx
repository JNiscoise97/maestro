import { useEffect, useMemo, useState } from "react"
import { addDays, parseISO } from "date-fns"
import { ArrowLeft, Check, CheckCircle2, RotateCcw, Timer, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDeleteTask, useLaunchSprint, useUpdateTasks } from "@/hooks/queries/use-sprints"
import { cn } from "@/lib/utils"
import type { Sprint, SprintTask } from "@/services/supabase/sprints"
import type { Pole } from "@/types/domain"
import { useTaskStatus } from "./actions"
import { Gauge, PointsChip, TaskLine, selectClass } from "./components"
import {
  MAX_POINTS, POINTS, STATUS_LABEL, dayLabel, deadlineState, iso, loadOf, nextSprintDates, rangeLabel, sprintBlock, today,
  velocity, wednesdayOnOrAfter, type Fiance,
} from "./lib"

const DEFAULT_CAPACITY = 10
/**
 * Convertisseur heures → points. Échelle : 1 pt ≈ une petite heure, 8 pts ≈ une grosse demi-journée,
 * soit environ 1,5 pt par heure de travail. On retire une part d'imprévus (fatigue, interruptions, retards).
 */
const POINTS_PER_HOUR = 1.5
const UNPLANNED = 0.2
const hoursToPoints = (h: number) => Math.round(h * POINTS_PER_HOUR * (1 - UNPLANNED))

/** Durée visée du point hebdo, en minutes. */
const REVIEW_MINUTES = 20

/**
 * Point hebdo (mercredi) : 1. valider ce qui est « À valider » (par l'autre), 2. trancher ce qui est « À discuter »,
 * 3. reporter ou renvoyer au backlog ce qui n'est pas terminé, 4. capacité de chacun, 5. remplir la semaine.
 * « Lancer la semaine » fait tout en une opération (fonction 0188). Sans semaine : premier lancement (étapes 4 et 5).
 * Le composant reste monté quand on change d'onglet : les choix en cours ne sont pas perdus.
 */
export function WeeklyReview({ current, sprints, tasks, fiances, poles, me, onLaunched, startedAt }: {
  current: Sprint | null; sprints: Sprint[]; tasks: SprintTask[]; fiances: Fiance[]; poles: Pole[]; me: string | null
  onLaunched: () => void
  /** Ouverture de l'onglet Point hebdo (repère de durée). */
  startedAt: number
}) {
  const inSprint = current ? tasks.filter((t) => t.sprintId === current.id) : []
  const status = useTaskStatus(me, fiances, inSprint)
  const update = useUpdateTasks()
  const remove = useDeleteTask()
  const launchSprint = useLaunchSprint()

  const toValidate = inSprint.filter((t) => t.status === "review")
  const toDiscuss = inSprint.filter((t) => t.status === "discuss")
  const doneNow = inSprint.filter((t) => t.status === "done")
  const unfinished = inSprint.filter((t) => t.status !== "done")
  const backlog = useMemo(() => tasks.filter((t) => !t.sprintId)
    // Échéances proches d'abord, puis l'ordre du backlog.
    .sort((a, b) => rank(a) - rank(b) || a.sortOrder - b.sortOrder), [tasks])

  const proposed = nextSprintDates(current, today())
  const [start, setStart] = useState(proposed.startDate)
  const dates = current ? proposed : { startDate: start, endDate: wednesdayOnOrAfter(iso(addDays(parseISO(start), 1))) }

  const [carry, setCarry] = useState<Record<string, boolean>>({})
  const carried = unfinished.filter((t) => carry[t.id] !== false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [capacity, setCapacity] = useState<Record<string, string>>({})
  const [hours, setHours] = useState<Record<string, string>>({})
  const suggested = (id: string) => velocity(id, sprints, tasks) ?? current?.capacity[id] ?? DEFAULT_CAPACITY
  const cap = (id: string) => Math.max(0, Number(capacity[id] ?? suggested(id)) || 0)
  const pickedTasks = backlog.filter((t) => picked.has(t.id))
  const next = [...carried, ...pickedTasks]

  // Repère de durée : depuis l'ouverture de l'onglet Point hebdo.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  const minutes = Math.max(0, Math.floor((now - startedAt) / 60_000))

  async function launch() {
    try {
      await launchSprint.mutateAsync({
        currentId: current?.id ?? null, ...dates,
        capacity: Object.fromEntries(fiances.map((f) => [f.id, cap(f.id)])),
        carry: carried.map((t) => t.id),
        toBacklog: unfinished.filter((t) => carry[t.id] === false).map((t) => t.id),
        picked: pickedTasks.map((t) => t.id),
      })
      toast.success(`Semaine lancée ${rangeLabel(dates)}`)
      setPicked(new Set()); setCarry({}); setCapacity({}); setHours({})
      onLaunched()
    } catch (e) {
      const msg = (e as Error).message ?? ""
      if (/already_(closed|open)/.test(msg)) toast.error("Le point hebdo vient d'être fait (sur l'autre téléphone ?) : la page est à jour.")
      else if (/sprint_launch|function/i.test(msg)) toast.error("Migration 0188 à exécuter pour lancer la semaine.")
      else toast.error("Lancement impossible. Rien n'a été modifié : réessaie dans un instant.")
    }
  }

  let step = 0
  const heading = (title: string, hint?: string) => (
    <div className="space-y-0.5">
      <h3 className="flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{++step}</span>{title}
      </h3>
      {hint && <p className="pl-8 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-8">
      <p className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs tabular-nums",
        minutes >= REVIEW_MINUTES ? "border-amber-400 text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
        <Timer className="size-3.5" aria-hidden />{minutes} / {REVIEW_MINUTES} min
        {minutes >= REVIEW_MINUTES && " · on garde le reste pour la semaine prochaine ?"}
      </p>

      {!current && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <p className="font-semibold">Démarrer le premier sprint</p>
          <p className="text-sm text-muted-foreground">Les semaines vont du jeudi au mercredi, avec le point hebdo le mercredi soir. Le premier peut être plus court.</p>
          <label className="flex flex-wrap items-center gap-2 text-sm">Début
            <Input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} className="h-9 w-auto" />
            <span className="text-muted-foreground">→ fin le {dayLabel(dates.endDate)}</span>
          </label>
        </div>
      )}

      {current && (
        <section className="space-y-3">
          {heading("Valider", `${doneNow.length} tâche${doneNow.length > 1 ? "s" : ""} terminée${doneNow.length > 1 ? "s" : ""} cette semaine. Ce qui est « À valider » se valide par l'autre.`)}
          {toValidate.length === 0 ? (
            <p className="pl-8 text-sm text-muted-foreground">Rien à valider.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {toValidate.map((t) => {
                const no = status.refusal(t, "done")
                return (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <TaskLine task={t} fiances={fiances} poles={poles} />
                    <div className="flex flex-wrap items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => status.setStatus(t, "todo")}>
                        <RotateCcw className="size-3.5" />À reprendre
                      </Button>
                      {no ? <span className="text-xs text-muted-foreground">{no}</span> : (
                        <Button size="sm" className="h-8" onClick={() => status.setStatus(t, "done")}><Check className="size-3.5" />Valider</Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {current && (
        <section className="space-y-3">
          {heading("Trancher", "Chaque tâche « À discuter » repart avec une décision.")}
          {toDiscuss.length === 0 ? (
            <p className="pl-8 text-sm text-muted-foreground">Rien à discuter.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {toDiscuss.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <TaskLine task={t} fiances={fiances} poles={poles} />
                  <div className="flex flex-wrap items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => status.setStatus(t, "todo")}>À faire</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setCarry((c) => ({ ...c, [t.id]: false }))}
                      disabled={carry[t.id] === false}>
                      <ArrowLeft className="size-3.5" />{carry[t.id] === false ? "Au backlog" : "Backlog"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-destructive"
                      onClick={() => { if (confirm(`Abandonner « ${t.title} » ?`)) remove.mutate(t.id) }}>
                      <Trash2 className="size-3.5" />Abandonner
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {current && (
        <section className="space-y-3">
          {heading("Reporter", "Ce qui n'est pas terminé passe dans la semaine suivante. Décoche pour le renvoyer dans le backlog.")}
          {unfinished.length === 0 ? (
            <p className="pl-8 text-sm text-muted-foreground">Tout est terminé, bravo !</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {unfinished.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-3 p-3">
                    <input type="checkbox" className="size-4 accent-primary" checked={carry[t.id] !== false}
                      onChange={(e) => setCarry((c) => ({ ...c, [t.id]: e.target.checked }))} />
                    <TaskLine task={t} fiances={fiances} poles={poles} />
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[t.status]}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3">
        {heading("Disponibilités", `Combien de points chacun peut-il faire ${rangeLabel(dates)} ? Proposé : la moyenne réellement terminée sur les 3 dernières semaines.`)}
        <div className="space-y-3 pl-8">
          {fiances.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="w-16 font-medium">{f.name}</span>
              {/* Convertisseur : heures disponibles → points (remplit la capacité, modifiable ensuite). */}
              <label className="flex items-center gap-1.5">
                <Input type="number" min={0} step={0.5} inputMode="decimal" value={hours[f.id] ?? ""} placeholder="?" className="h-9 w-16"
                  aria-label={`Heures disponibles de ${f.name}`}
                  onChange={(e) => {
                    const h = e.target.value
                    setHours((x) => ({ ...x, [f.id]: h }))
                    if (h !== "" && Number(h) >= 0) setCapacity((c) => ({ ...c, [f.id]: String(hoursToPoints(Number(h))) }))
                  }} />
                <span className="text-muted-foreground">h dispo</span>
              </label>
              <span className="text-muted-foreground" aria-hidden>→</span>
              <label className="flex items-center gap-1.5">
                <Input type="number" min={0} inputMode="numeric" value={capacity[f.id] ?? String(suggested(f.id))} className="h-9 w-16"
                  aria-label={`Capacité de ${f.name} en points`}
                  onChange={(e) => setCapacity((c) => ({ ...c, [f.id]: e.target.value }))} />
                <span className="text-muted-foreground">pts</span>
              </label>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Heures → points : {POINTS_PER_HOUR.toLocaleString("fr-FR")} pt par heure, moins {Math.round(UNPLANNED * 100)} % d'imprévus
            (ex. 10 h → {hoursToPoints(10)} pts). Tu peux corriger le résultat à la main.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {heading("Remplir la semaine", "Coche les tâches du backlog à faire cette semaine, jusqu'à la capacité. Les dates limites proches sont en haut.")}
        <div className="sticky top-14 z-10 flex flex-col gap-3 rounded-xl border bg-card/95 p-3 backdrop-blur sm:flex-row sm:gap-6">
          {fiances.map((f) => <Gauge key={f.id} name={f.name} used={loadOf(next, f.id)} capacity={cap(f.id)} />)}
        </div>
        {backlog.length === 0 ? (
          <p className="pl-8 text-sm text-muted-foreground">Le backlog est vide.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {backlog.map((t) => {
              const block = sprintBlock(t)
              return (
                <li key={t.id} className={cn("flex flex-wrap items-center gap-3 p-3", block && "bg-muted/30")}>
                  <input type="checkbox" className="size-4 accent-primary" disabled={!!block} checked={picked.has(t.id)} aria-label={`Ajouter ${t.title}`}
                    onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(t.id); else n.delete(t.id); return n })} />
                  <TaskLine task={t} fiances={fiances} poles={poles} />
                  {/* Compléter sur place ce qui manque : points, porteur. */}
                  <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1">
                    {t.points == null && POINTS.map((p) => (
                      <button key={p} type="button" onClick={() => update.mutate([{ id: t.id, patch: { points: p } }])}
                        className="rounded-full border px-1.5 text-[11px] tabular-nums hover:border-primary">{p > MAX_POINTS ? "13+" : p}</button>
                    ))}
                    {t.points != null && t.points > MAX_POINTS && <span className="text-xs text-rose-600">à découper</span>}
                    {t.points != null && t.points <= MAX_POINTS && !t.owner && (
                      <select aria-label={`Porteur de ${t.title}`} className={cn(selectClass, "h-7 w-auto text-xs")} value=""
                        onChange={(e) => e.target.value && update.mutate([{ id: t.id, patch: { owner: e.target.value } }])}>
                        <option value="">Qui ?</option>
                        {fiances.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        <option value="both">À deux</option>
                      </select>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-col items-start gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {next.length} tâche{next.length > 1 ? "s" : ""} · {next.reduce((n, t) => n + (t.points ?? 0), 0)} points pour la semaine {rangeLabel(dates)}.
        </p>
        <Button onClick={launch} disabled={launchSprint.isPending} size="lg">
          <CheckCircle2 className="size-4" />{current ? "Clôturer et lancer la semaine" : "Lancer la première semaine"}
        </Button>
      </div>
      <PointsLegend />
    </div>
  )
}

function rank(t: SprintTask): number {
  const s = deadlineState(t)
  return s === "late" ? 0 : s === "soon" ? 1 : 2
}

function PointsLegend() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <PointsChip points={1} /> ≈ une petite heure <PointsChip points={8} /> ≈ une grosse demi-journée <PointsChip points={13} /> à découper
      <PointsChip points={null} /> pas encore estimée
    </p>
  )
}
