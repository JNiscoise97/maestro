import { useMilestones } from "@/hooks/queries/use-milestones"
import { CRITICALITY_LABELS, formatDate } from "@/lib/retroplanning"
import type { Criticality } from "@/types/domain"
import { RETRO_KEEP, RETRO_NONE, retroDatesInvalid, type RetroValues } from "@/lib/retroplanning-values"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RetroFields({ value, onChange, bulk = false, idPrefix = "retro" }: {
  value: RetroValues
  onChange: (next: RetroValues) => void
  /** Mode lot : propose « ne pas modifier » et laisse les dates vides inchangées. */
  bulk?: boolean
  idPrefix?: string
}) {
  const { data: milestones = [] } = useMilestones()
  const set = (patch: Partial<RetroValues>) => onChange({ ...value, ...patch })

  function setMilestone(id: string) {
    const m = milestones.find((x) => x.id === id)
    // Sans date limite, on propose l'échéance du jalon comme date limite.
    set({ milestoneId: id, ...(m && !value.deadlineDate ? { deadlineDate: m.targetDate } : {}) })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field className="min-w-0">
          <FieldLabel>Jalon</FieldLabel>
          <Select value={value.milestoneId} onValueChange={setMilestone}>
            {/* Libellé de jalon long : tronqué dans le champ, complet dans la liste. */}
            <SelectTrigger className="w-full min-w-0 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:overflow-hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bulk && <SelectItem value={RETRO_KEEP}>— Ne pas modifier —</SelectItem>}
              <SelectItem value={RETRO_NONE}>Aucun jalon</SelectItem>
              {milestones.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  J{m.sortOrder} · {m.name} ({formatDate(m.targetDate, { day: "numeric", month: "short", year: "2-digit" })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="min-w-0">
          <FieldLabel>Criticité</FieldLabel>
          <Select value={value.criticality} onValueChange={(v) => set({ criticality: v as RetroValues["criticality"] })}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bulk && <SelectItem value={RETRO_KEEP}>— Ne pas modifier —</SelectItem>}
              {(Object.keys(CRITICALITY_LABELS) as Criticality[]).map((c) => (
                <SelectItem key={c} value={c}>{CRITICALITY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field className="min-w-0">
          <FieldLabel htmlFor={`${idPrefix}-ideal`}>Début idéal</FieldLabel>
          <Input id={`${idPrefix}-ideal`} type="date" value={value.idealStartDate}
            onChange={(e) => set({ idealStartDate: e.target.value })} />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor={`${idPrefix}-target`}>Date cible</FieldLabel>
          <Input id={`${idPrefix}-target`} type="date" value={value.targetDate}
            onChange={(e) => set({ targetDate: e.target.value })} />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor={`${idPrefix}-deadline`}>Date limite</FieldLabel>
          <Input id={`${idPrefix}-deadline`} type="date" value={value.deadlineDate}
            onChange={(e) => set({ deadlineDate: e.target.value })} />
        </Field>
      </div>
      {retroDatesInvalid(value) ? (
        <p className="text-xs text-bordeaux">Les dates doivent se suivre : début idéal ≤ date cible ≤ date limite.</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {bulk
            ? "Seuls les champs renseignés sont appliqués ; les dates laissées vides ne changent pas."
            : "Date cible dépassée → « À rattraper » · date limite dépassée → « En retard »."}
        </p>
      )}
    </div>
  )
}
