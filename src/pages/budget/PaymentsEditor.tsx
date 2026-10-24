import { Plus, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ACCOUNT_SUGGESTIONS, amountInput, fmt, parseAmount } from "@/lib/budget-calc"
import type { PaymentDraft, PaymentKind } from "@/services/supabase/budget"

const KIND_LABELS: Record<PaymentKind, string> = { acompte: "Acompte", solde: "Solde", paiement: "Paiement" }

/**
 * Échéancier : liste de versements (acompte, solde, paiement) avec montant, date prévue,
 * payé oui / non, date de paiement et compte. Contrôlé par le parent (brouillon non enregistré).
 */
export function PaymentsEditor({ value, onChange, due, idPrefix }: {
  value: PaymentDraft[]
  onChange: (next: PaymentDraft[]) => void
  /** Montant attendu (réel sinon estimé), pour afficher le reste à payer. */
  due?: number | null
  idPrefix: string
}) {
  const set = (i: number, patch: Partial<PaymentDraft>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const add = () => {
    const hasDeposit = value.some((p) => p.kind === "acompte")
    onChange([...value, {
      kind: value.length === 0 ? "acompte" : hasDeposit ? "solde" : "paiement",
      label: null, amount: null, dueDate: null, paid: false, paidDate: null, account: null,
    }])
  }
  const paid = value.filter((p) => p.paid).reduce((t, p) => t + (p.amount ?? 0), 0)
  const planned = value.reduce((t, p) => t + (p.amount ?? 0), 0)

  return (
    <div className="space-y-2">
      <datalist id={`${idPrefix}-accounts`}>{ACCOUNT_SUGGESTIONS.map((a) => <option key={a} value={a} />)}</datalist>
      {value.length === 0 && <p className="text-xs text-muted-foreground">Aucun versement prévu.</p>}
      {value.map((p, i) => (
        <div key={i} className={`grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-[7rem_1fr_7rem_8.5rem_auto] ${p.paid ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}>
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={p.kind}
            onChange={(e) => set(i, { kind: e.target.value as PaymentKind })} aria-label="Type de versement">
            {(Object.keys(KIND_LABELS) as PaymentKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </select>
          <Input className="h-8" placeholder="Libellé (facultatif)" value={p.label ?? ""} onChange={(e) => set(i, { label: e.target.value || null })} />
          <Input className="h-8 font-mono" placeholder="Montant" inputMode="decimal" value={amountInput(p.amount)}
            onChange={(e) => set(i, { amount: parseAmount(e.target.value) })} />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Prévu
            <Input type="date" className="h-8" value={p.dueDate ?? ""} onChange={(e) => set(i, { dueDate: e.target.value || null })} />
          </label>
          <button type="button" aria-label="Supprimer le versement" onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="justify-self-end rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
            <Trash2 className="size-3.5" />
          </button>
          <label className="col-span-2 flex flex-wrap items-center gap-2 text-xs sm:col-span-5">
            <input type="checkbox" checked={p.paid}
              onChange={(e) => set(i, { paid: e.target.checked, paidDate: e.target.checked ? (p.paidDate ?? new Date().toISOString().slice(0, 10)) : p.paidDate })} />
            Payé
            {p.paid && (
              <>
                <span className="text-muted-foreground">le</span>
                <Input type="date" className="h-7 w-36" value={p.paidDate ?? ""} onChange={(e) => set(i, { paidDate: e.target.value || null })} />
              </>
            )}
            <span className="text-muted-foreground">compte</span>
            <Input className="h-7 w-40" list={`${idPrefix}-accounts`} value={p.account ?? ""} onChange={(e) => set(i, { account: e.target.value || null })} />
          </label>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Plus className="size-3.5" /> Ajouter un versement
        </button>
        {value.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            Payé <b className="text-foreground">{fmt(paid)}</b> / prévu {fmt(planned)}
            {due != null && due > 0 && <> · reste <b className={due - paid > 0.005 ? "text-foreground" : "text-emerald-600"}>{fmt(Math.max(0, due - paid))}</b></>}
          </span>
        )}
      </div>
    </div>
  )
}
