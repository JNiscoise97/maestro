import { useState } from "react"
import { Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

import { useCreatePole, useUpdatePole } from "@/hooks/queries/use-poles"
import { usePeople } from "@/hooks/queries/use-people"
import type { Pole } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const NONE = "__none__"

export function PoleDialog({ pole }: { pole?: Pole }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(pole?.name ?? "")
  const [responsiblePersonId, setResponsiblePersonId] = useState(pole?.responsiblePersonId ?? NONE)
  const { data: people } = usePeople()
  const fiances = (people ?? []).filter((p) => p.role === "admin")
  const createPole = useCreatePole()
  const updatePole = useUpdatePole()

  async function handleSubmit() {
    if (!name.trim()) return
    const patch = { responsiblePersonId: responsiblePersonId === NONE ? null : responsiblePersonId }
    if (pole) {
      await updatePole.mutateAsync({ id: pole.id, patch: { name, ...patch } })
      toast.success("Pôle mis à jour.")
    } else {
      await createPole.mutateAsync({ name, sortOrder: 99, ...patch })
      toast.success("Pôle créé.")
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {pole ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="Modifier">
                <Pencil className="size-3.5" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Modifier</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-4" />
            Nouveau pôle
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{pole ? "Modifier le pôle" : "Nouveau pôle"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="pole-name">Nom</FieldLabel>
            <Input
              id="pole-name"
              placeholder="Ex. Logistique"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Responsable global</FieldLabel>
            <Select value={responsiblePersonId} onValueChange={setResponsiblePersonId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non assigné</SelectItem>
                {fiances.map((fiance) => (
                  <SelectItem key={fiance.id} value={fiance.id}>
                    {fiance.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>{pole ? "Enregistrer" : "Créer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
