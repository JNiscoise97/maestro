import { toast } from "sonner"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useUpdateBudgetItem } from "@/hooks/queries/use-budget"
import { type BudgetModel, fmt } from "@/lib/budget-calc"
import type { BudgetItem } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"

type Seq = { id: string; name: string }

/**
 * Postes et sous-postes écartés (étudiés puis non retenus) : hors de tous les totaux, gardés pour
 * mémoire et réintégrables. Chiffrés sur le modèle complet (écartés compris).
 */
export function DiscardedSection({ lines, model, poles, sequences }: {
  lines: BudgetItem[]
  model: BudgetModel
  poles: Pole[]
  sequences: Seq[]
}) {
  const update = useUpdateBudgetItem()
  const estimateOf = (i: BudgetItem) => (model.children(i.id).length ? model.poste(i).estimated : model.line(i).estimated)
  const total = lines.reduce((t, i) => t + estimateOf(i), 0)
  const poleOf = (i: BudgetItem) => {
    const top = i.parentId ? model.itemsById.get(i.parentId) : i
    return poles.find((p) => p.id === top?.poleId)?.name ?? "Sans pôle"
  }
  const seqNames = (i: BudgetItem) => [...new Set(model.children(i.id).length ? model.sequencesOf(i) : [i.sequenceId])]
    .map((id) => sequences.find((s) => s.id === id)?.name ?? "Sans séquence").join(", ")

  async function reinstate(i: BudgetItem) {
    try {
      await update.mutateAsync({ id: i.id, patch: { discardedOn: null, discardedReason: null } })
      toast.success(`« ${i.label} » est de retour dans le budget.`)
    } catch (err) {
      console.error(err)
      toast.error("Réintégration impossible.")
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Écartés ({lines.length})</h3>
          <p className="text-xs text-muted-foreground">Étudiés puis non retenus : hors de tous les totaux et statistiques. Réintégrer les remet dans le budget tels qu'ils étaient.</p>
        </div>
        <span className="text-xs text-muted-foreground">Estimé écarté <b className="tabular-nums text-foreground">{fmt(total)}</b></span>
      </div>
      <ul className="divide-y divide-border/60">
        {[...lines].sort((a, b) => (b.discardedOn ?? "").localeCompare(a.discardedOn ?? "")).map((i) => (
          <li key={i.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              {/* Sous-poste : « Poste › Sous-poste » ; poste entier : signalé comme tel, avec ses sous-postes. */}
              <p className="text-sm">
                {i.parentId && <span className="text-muted-foreground">{model.itemsById.get(i.parentId)?.label} › </span>}
                <span className="font-medium">{i.label}</span>
                {model.children(i.id).length > 0 && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">poste entier</span>}
              </p>
              {model.children(i.id).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {model.children(i.id).length} sous-poste{model.children(i.id).length > 1 ? "s" : ""} : {model.children(i.id).map((k) => k.label).join(", ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {poleOf(i)} · {seqNames(i)}
                {i.discardedOn && ` · écarté le ${new Date(i.discardedOn + "T00:00:00").toLocaleDateString("fr-FR")}`}
              </p>
              {i.discardedReason && <p className="mt-0.5 text-xs italic text-muted-foreground">« {i.discardedReason} »</p>}
            </div>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{fmt(estimateOf(i))}</span>
            <Button size="sm" variant="outline" className="h-7 shrink-0" disabled={update.isPending} onClick={() => void reinstate(i)}>
              <RotateCcw className="size-3.5" /> Réintégrer
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
