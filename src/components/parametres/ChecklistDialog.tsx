import { useState } from "react"
import { Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

import { useCreateChecklist, useUpdateChecklist } from "@/hooks/queries/use-checklists"
import { usePeople } from "@/hooks/queries/use-people"
import type { Checklist, ChecklistOwnerType } from "@/types/domain"
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

interface ChecklistDialogProps {
  checklist?: Checklist
  ownerType?: ChecklistOwnerType
  ownerId?: string
}

export function ChecklistDialog({ checklist, ownerType, ownerId }: ChecklistDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(checklist?.title ?? "")
  const [responsiblePersonId, setResponsiblePersonId] = useState(checklist?.responsiblePersonId ?? NONE)
  const { data: people } = usePeople()
  const fiances = (people ?? []).filter((p) => p.role === "admin")
  const createChecklist = useCreateChecklist()
  const updateChecklist = useUpdateChecklist()

  async function handleSubmit() {
    const patch = { responsiblePersonId: responsiblePersonId === NONE ? null : responsiblePersonId }
    if (checklist) {
      await updateChecklist.mutateAsync({ id: checklist.id, patch: { title: title.trim() || null, ...patch } })
      toast.success("Checklist mise à jour.")
    } else {
      if (!ownerType || !ownerId) return
      await createChecklist.mutateAsync({ ownerType, ownerId, title: title.trim() || null, ...patch })
      toast.success("Checklist créée.")
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            {checklist ? (
              <Button variant="ghost" size="icon-xs" aria-label="Modifier la checklist">
                <Pencil className="size-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon-xs" aria-label="Ajouter une checklist">
                <Plus className="size-3.5" />
              </Button>
            )}
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{checklist ? "Modifier la checklist" : "Ajouter une checklist"}</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{checklist ? "Modifier la checklist" : "Nouvelle checklist"}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="checklist-title">Titre</FieldLabel>
            <Input
              id="checklist-title"
              placeholder="Ex. Definition of Done"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Assigner à</FieldLabel>
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
          <Button onClick={handleSubmit}>{checklist ? "Enregistrer" : "Créer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
