import { useUpdateMission } from "@/hooks/queries/use-missions"
import { usePeople } from "@/hooks/queries/use-people"
import { useGuests } from "@/hooks/queries/use-guests"
import { useLogAssigneeChange } from "@/hooks/queries/use-assignee-history"
import type { Mission } from "@/types/domain"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const NONE = "__none__"

interface Props {
  mission: Mission
  /** Nom hérité du domaine/pôle — affiché en placeholder quand rien n'est affecté. */
  inheritedName?: string
  className?: string
}

export function MissionResponsableSelect({ mission, inheritedName, className }: Props) {
  const { data: people } = usePeople()
  const { data: guests  } = useGuests()
  const updateMission   = useUpdateMission()
  const logChange       = useLogAssigneeChange()

  const fiances  = people ?? []
  const referents = (guests ?? []).filter((g) => g.assignable).sort((a, b) => a.fullName.localeCompare(b.fullName))

  const currentValue = mission.responsiblePersonId
    ? `person:${mission.responsiblePersonId}`
    : mission.responsibleGuestId
    ? `guest:${mission.responsibleGuestId}`
    : NONE

  const hasOwn = currentValue !== NONE

  async function handleChange(value: string) {
    const previousName = hasOwn
      ? (mission.responsiblePersonId
          ? fiances.find((p) => p.id === mission.responsiblePersonId)?.fullName
          : referents.find((g) => g.id === mission.responsibleGuestId)?.fullName) ?? null
      : null
    const [kind, id] = value.split(":")
    const newName = value === NONE ? null
      : (kind === "person"
          ? fiances.find((p) => p.id === id)?.fullName
          : referents.find((g) => g.id === id)?.fullName) ?? null
    logChange({ entityType: "mission", entityId: mission.id, entityLabel: mission.title, previousName, newName })

    if (value === NONE) {
      updateMission.mutate({ id: mission.id, patch: { responsiblePersonId: null, responsibleGuestId: null } })
    } else {
      updateMission.mutate({
        id: mission.id,
        patch: kind === "person"
          ? { responsiblePersonId: id, responsibleGuestId: null }
          : { responsiblePersonId: null, responsibleGuestId: id },
      })
    }
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          "h-6 w-auto max-w-44 shrink-0 border-dashed text-xs",
          !hasOwn && "text-muted-foreground/60",
          className,
        )}
      >
        <SelectValue placeholder={inheritedName ? `↑ ${inheritedName}` : "Assigner…"}>
          {hasOwn
            ? currentValue.startsWith("person:")
              ? fiances.find((p) => p.id === mission.responsiblePersonId)?.fullName ?? "…"
              : referents.find((g) => g.id === mission.responsibleGuestId)?.fullName ?? "…"
            : inheritedName
            ? `↑ ${inheritedName}`
            : "—"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>
          {inheritedName ? `— (hérite : ${inheritedName})` : "Non assigné"}
        </SelectItem>
        {fiances.length > 0 && (
          <SelectGroup>
            <SelectLabel>Fiancés</SelectLabel>
            {fiances.map((p) => (
              <SelectItem key={p.id} value={`person:${p.id}`}>{p.fullName}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {referents.length > 0 && (
          <SelectGroup>
            <SelectLabel>Référents</SelectLabel>
            {referents.map((g) => (
              <SelectItem key={g.id} value={`guest:${g.id}`}>{g.fullName}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
