import { useState } from "react"
import { ExternalLink, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { fmt, type BudgetModel } from "@/lib/budget-calc"
import type { BudgetDevis, BudgetItem, DevisStatus } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"
import { DevisSheet } from "./DevisSheet"

const GROUPS: { status: DevisStatus; label: string }[] = [
  { status: "retenu", label: "Retenus" },
  { status: "en_cours", label: "En cours" },
  { status: "refuse", label: "Refusés" },
]

/**
 * Onglet Devis : tous les devis par statut. C'est ici qu'on crée un devis groupé couvrant des lignes
 * de plusieurs postes ou pôles (ex. décoratrice : fleurs de la réception + arche + centres de table).
 */
export function DevisTab({ devis, model, items, poles, sequences }: {
  devis: BudgetDevis[]
  model: BudgetModel
  items: BudgetItem[]
  poles: Pole[]
  sequences: { id: string; name: string }[]
}) {
  const [sheet, setSheet] = useState<BudgetDevis | "new" | null>(null)
  const lineLabel = (itemId: string) => {
    const item = model.itemsById.get(itemId)
    if (!item) return "?"
    const parent = item.parentId ? model.itemsById.get(item.parentId) : undefined
    return parent ? `${parent.label} › ${item.label}` : item.label
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Un devis peut couvrir plusieurs postes ou sous-postes, même de pôles différents. Une fois « Retenu », il porte l'échéancier.
        </p>
        <Button size="sm" onClick={() => setSheet("new")}><Plus className="size-4" /> Nouveau devis</Button>
      </div>

      {devis.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Aucun devis pour l'instant.</div>
      )}

      {GROUPS.map(({ status, label }) => {
        const list = devis.filter((d) => d.status === status)
          .sort((a, b) => (a.vendor ?? "").localeCompare(b.vendor ?? "", "fr"))
        if (!list.length) return null
        return (
          <section key={status} className="space-y-2">
            <h3 className="text-sm font-semibold">{label} <span className="font-normal text-muted-foreground">({list.length})</span></h3>
            <div className="grid gap-2 md:grid-cols-2">
              {list.map((d) => {
                const lines = model.linesByDevis.get(d.id) ?? []
                const paid = model.devisPaid(d.id)
                const total = d.totalAmount ?? model.devisLinesTotal(d.id)
                return (
                  <button key={d.id} type="button" onClick={() => setSheet(d)}
                    className={`space-y-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30 ${status === "refuse" ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{d.vendor ?? "Fournisseur ?"}</p>
                        {d.title && <p className="truncate text-xs text-muted-foreground">{d.title}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">{fmt(total)}</p>
                        {status === "retenu" && <p className="text-[11px] tabular-nums text-muted-foreground">payé {fmt(paid)}</p>}
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {lines.length === 0 ? "Aucune ligne couverte" : `${lines.length} ligne${lines.length > 1 ? "s" : ""} : ${lines.map((l) => lineLabel(l.itemId)).join(", ")}`}
                    </p>
                    {(d.validUntil || d.url) && (
                      <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {d.validUntil && <span>valable jusqu'au {new Date(d.validUntil).toLocaleDateString("fr-FR")}</span>}
                        {d.url && <ExternalLink className="size-3" />}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      {sheet && (
        <DevisSheet devis={sheet === "new" ? null : sheet} model={model} items={items} poles={poles} sequences={sequences} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}
