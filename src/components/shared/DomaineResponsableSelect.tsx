import { toast } from "sonner"

import { useCreateDomaineResponsable, useDeleteDomaineResponsable, useDomaineResponsables } from "@/hooks/queries/use-domaine-responsables"
import { usePeople } from "@/hooks/queries/use-people"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePoles } from "@/hooks/queries/use-poles"
import { useLogAssigneeChange } from "@/hooks/queries/use-assignee-history"
import type { Domaine } from "@/types/domain"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const NONE = "__none__"

export function DomaineResponsableSelect({ domaine, className }: { domaine: Domaine; className?: string }) {
  const { data: people }      = usePeople()
  const { data: guests }      = useGuests()
  const { data: responsables} = useDomaineResponsables()
  const { data: poles }       = usePoles()
  const createResponsable     = useCreateDomaineResponsable()
  const deleteResponsable     = useDeleteDomaineResponsable()
  const logChange             = useLogAssigneeChange()

  const domaineResponsables = (responsables ?? []).filter((r) => r.domaineId === domaine.id)
  const current      = domaineResponsables.find((r) => r.rank === "principal") ?? domaineResponsables[0]
  const currentValue = current ? `${current.personId ? "person" : "guest"}:${current.personId ?? current.guestId}` : NONE
  const hasOwn       = currentValue !== NONE

  const fianceOnly = domaine.phase === "avant" || domaine.phase === "apres"
  const fiances    = people ?? []
  const referents  = fianceOnly ? [] : (guests ?? []).filter((g) => g.assignable).sort((a, b) => a.fullName.localeCompare(b.fullName))

  // Responsable hérité du pôle parent
  const inheritedName = (() => {
    if (hasOwn || !domaine.poleId) return undefined
    const pole = (poles ?? []).find((p) => p.id === domaine.poleId)
    if (!pole?.responsiblePersonId) return undefined
    return (people ?? []).find((p) => p.id === pole.responsiblePersonId)?.fullName
  })()

  async function handleChange(value: string) {
    const previousName = hasOwn
      ? ((current?.personId
          ? fiances.find((p) => p.id === current.personId)?.fullName
          : referents.find((g) => g.id === current?.guestId)?.fullName) ?? null)
      : null
    const [kind, id] = value.split(":")
    const newName = value === NONE ? null
      : (kind === "person"
          ? fiances.find((p) => p.id === id)?.fullName
          : referents.find((g) => g.id === id)?.fullName) ?? null
    logChange({ entityType: "domaine", entityId: domaine.id, entityLabel: domaine.name, previousName, newName })

    await Promise.all(domaineResponsables.map((r) => deleteResponsable.mutateAsync(r.id)))
    if (value === NONE) return
    await createResponsable.mutateAsync({
      domaineId: domaine.id,
      rank: "principal",
      ...(kind === "guest" ? { guestId: id } : { personId: id }),
    })
    toast.success("Responsable mis à jour.")
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className={cn("h-6 w-44 border-dashed text-xs", !hasOwn && "text-muted-foreground/60", className)}
      >
        <SelectValue placeholder={inheritedName ? `↑ ${inheritedName}` : "Assigner…"}>
          {hasOwn
            ? (current?.personId
                ? fiances.find((p) => p.id === current.personId)?.fullName
                : referents.find((g) => g.id === current?.guestId)?.fullName) ?? "…"
            : inheritedName
            ? `↑ ${inheritedName}`
            : "Non assigné"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>
          {inheritedName ? `— (hérite : ${inheritedName})` : "Non assigné"}
        </SelectItem>
        {fiances.length > 0 ? (
          <SelectGroup>
            <SelectLabel>Fiancés</SelectLabel>
            {fiances.map((person) => (
              <SelectItem key={person.id} value={`person:${person.id}`}>
                {person.fullName}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        {referents.length > 0 ? (
          <SelectGroup>
            <SelectLabel>Référents</SelectLabel>
            {referents.map((g) => (
              <SelectItem key={g.id} value={`guest:${g.id}`}>
                {g.fullName}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
      </SelectContent>
    </Select>
  )
}
