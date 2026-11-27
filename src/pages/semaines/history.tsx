import { useState } from "react"
import { ChevronDown, Trophy } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Sprint, SprintTask } from "@/services/supabase/sprints"
import type { Pole } from "@/types/domain"
import { Stat } from "./backlog"
import { TaskLine } from "./components"
import { loadOf, rangeLabel, type Fiance } from "./lib"

/**
 * Historique : tout ce qui a été terminé, semaine par semaine (la plus récente en haut),
 * avec le total depuis le début — pour voir le chemin parcouru.
 */
export function History({ sprints, tasks, fiances, poles }: { sprints: Sprint[]; tasks: SprintTask[]; fiances: Fiance[]; poles: Pole[] }) {
  const done = tasks.filter((t) => t.status === "done" && t.sprintId)
  const weeks = sprints.map((s, i) => ({ s, n: i + 1, done: done.filter((t) => t.sprintId === s.id) }))
    .filter((w) => w.done.length > 0 || w.s.closedAt).reverse()
  const points = (list: SprintTask[]) => list.reduce((n, t) => n + (t.points ?? 0), 0)

  if (!weeks.length) return <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Rien de terminé pour l'instant : l'historique se remplit au fil des semaines.</p>

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tâches terminées" value={String(done.length)} sub={`en ${weeks.length} semaine${weeks.length > 1 ? "s" : ""}`} />
        <Stat label="Points terminés" value={String(points(done))} />
        <Stat label="Par personne" value={fiances.map((f) => `${f.name} ${loadOf(done, f.id)}`).join(" · ")} sub="une tâche à deux compte pour chacun" />
      </div>
      <div className="space-y-3">
        {weeks.map((w, i) => <Week key={w.s.id} n={w.n} sprint={w.s} done={w.done} fiances={fiances} poles={poles} defaultOpen={i === 0} />)}
      </div>
    </div>
  )
}

function Week({ n, sprint, done, fiances, poles, defaultOpen }: {
  n: number; sprint: Sprint; done: SprintTask[]; fiances: Fiance[]; poles: Pole[]; defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const pts = done.reduce((x, t) => x + (t.points ?? 0), 0)
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-muted/30">
        <Trophy className="size-4 text-amber-500" aria-hidden />
        <span className="text-sm font-semibold">Semaine {n}</span>
        <span className="text-xs text-muted-foreground">{rangeLabel(sprint)}{!sprint.closedAt && " · en cours"}</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {done.length} tâche{done.length > 1 ? "s" : ""} · {pts} pts · {fiances.map((f) => `${f.name} ${loadOf(done, f.id)}/${sprint.capacity[f.id] ?? 0}`).join(" · ")}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="divide-y border-t">
          {done.length === 0 && <li className="p-3 text-sm text-muted-foreground">Rien de terminé cette semaine-là.</li>}
          {done.map((t) => <li key={t.id} className="p-3"><TaskLine task={t} fiances={fiances} poles={poles} /></li>)}
        </ul>
      )}
    </section>
  )
}
