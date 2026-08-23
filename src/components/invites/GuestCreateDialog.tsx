import { useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useCreateGuest } from "@/hooks/queries/use-guests"
import type { GuestGroup } from "@/types/domain"
import { groupLabel } from "@/lib/groups"
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

const NONE = "__none__"

interface GuestCreateDialogProps {
  groups: GuestGroup[]
}

export function GuestCreateDialog({ groups }: GuestCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [groupId, setGroupId] = useState(NONE)
  const createGuest = useCreateGuest()
  const navigate = useNavigate()

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) return
    const guest = await createGuest.mutateAsync({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      groupId: groupId === NONE ? null : groupId,
    })
    toast.success("Invité ajouté.")
    setFirstName("")
    setLastName("")
    setGroupId(NONE)
    setOpen(false)
    navigate(`/invites/${guest.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Ajouter un invité
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Nouvel invité</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="guest-first-name">Prénom</FieldLabel>
            <Input id="guest-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="guest-last-name">Nom</FieldLabel>
            <Input id="guest-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Groupe</FieldLabel>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sans groupe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sans groupe</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {groupLabel(group, groups)}
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
          <Button onClick={handleSubmit}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
