import { useMilestones } from "@/hooks/queries/use-milestones"
import { CRITICALITY_LABELS, formatDate } from "@/lib/retroplanning"
import type { Criticality } from "@/types/domain"
import { RETRO_KEEP, RETRO_NONE, retroDatesError, type RetroValues } from "@/lib/retroplanning-values"
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

  // Date limite = échéance du jalon choisi (inconnue en lot si le jalon n'est pas modifié).
  const milestone = milestones.find((m) => m.id === value.milestoneId)
  const error = retroDatesError(value, milestone?.targetDate)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field className="min-w-0">
          <FieldLabel>Jalon</FieldLabel>
          <Select value={value.milestoneId} onValueChange={(id) => set({ milestoneId: id })}>
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
          <FieldLabel htmlFor={`${idPrefix}-ideal`}>Début idéal <span className="font-normal text-muted-foreground">(facultatif)</span></FieldLabel>
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
          {/* Lecture seule : c'est l'échéance du jalon. */}
          <p id={`${idPrefix}-deadline`}
            className="flex h-8 items-center rounded-lg border border-dashed border-input px-2.5 text-sm text-muted-foreground"
            title="La date limite est l'échéance du jalon"
          >
            {milestone
              ? formatDate(milestone.targetDate, { day: "numeric", month: "short", year: "numeric" })
              : value.milestoneId === RETRO_KEEP ? "Selon le jalon" : "Aucune (sans jalon)"}
          </p>
        </Field>
      </div>
      {error ? (
        <p className="text-xs text-bordeaux">{error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {bulk
            ? "Seuls les champs renseignés sont appliqués ; les dates laissées vides ne changent pas."
            : "Date limite = échéance du jalon. Cible dépassée → « À rattraper » · limite dépassée → « En retard »."}
        </p>
      )}
    </div>
  )
}
