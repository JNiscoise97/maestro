import { Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"

import type { RosDelay, RunOfShowStep } from "@/types/domain"
import { useDeleteRosDelay } from "@/hooks/queries/use-ros-delays"
import { useIdentity } from "@/context/IdentityContext"
import { Button } from "@/components/ui/button"

interface Props {
  delays: RosDelay[]
  steps: RunOfShowStep[]
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export function DelayJournal({ delays, steps }: Props) {
  const deleteDelay = useDeleteRosDelay()
  const { realPerson } = useIdentity()
  const isFiance = realPerson?.role === "admin"
  const stepsById = new Map(steps.map((s) => [s.id, s]))

  const total = delays.reduce((acc, d) => acc + d.delayMinutes, 0)

  if (delays.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
        <Clock className="mx-auto mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucun retard signalé.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-bordeaux/30 bg-bordeaux/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">Retards signalés</p>
          <p className="text-2xl font-bold tabular-nums text-bordeaux">{delays.length}</p>
        </div>
        <div className="rounded-xl border border-bordeaux/30 bg-bordeaux/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">Retard cumulé</p>
          <p className="text-2xl font-bold tabular-nums text-bordeaux">+{total} min</p>
        </div>
      </div>

      {/* Liste */}
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {delays.map((delay) => {
          const step = delay.stepId ? stepsById.get(delay.stepId) : null
          return (
            <div key={delay.id} className="flex items-start gap-4 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-bordeaux">+{delay.delayMinutes} min</span>
                  {step && <span className="text-sm text-foreground">{step.label}</span>}
                  {!step && <span className="text-sm text-muted-foreground italic">étape inconnue</span>}
                </div>
                {delay.reason && <p className="text-xs text-muted-foreground">{delay.reason}</p>}
                <p className="text-xs text-muted-foreground/60">Signalé à {fmt(delay.loggedAt)}</p>
              </div>
              {isFiance && (
                <Button variant="ghost" size="icon-xs"
                  onClick={async () => { await deleteDelay.mutateAsync(delay.id); toast.success("Retard supprimé.") }}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
