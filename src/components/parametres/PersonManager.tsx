import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import type { Person } from "@/types/domain"
import { useDeletePerson, usePeople, useUpdatePerson } from "@/hooks/queries/use-people"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"

interface PersonFormState {
  fullName: string
  nickname: string
  phone: string
  accessCode: string
}

// Réservé à Jordan & Sarah (voir types/domain.ts : Person.role = "fiance") —
// toujours les deux mêmes, jamais de création depuis l'UI (voir lib/constants.ts
// et les nombreuses références à leurs ids ailleurs dans l'app).
// Les référents sont gérés comme des invités depuis DomaineManager.
function PersonDialog({ person }: { person: Person }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PersonFormState>({
    fullName: person.fullName,
    nickname: person.nickname ?? "",
    phone: person.phone ?? "",
    accessCode: person.accessCode,
  })
  const updatePerson = useUpdatePerson()

  async function handleSubmit() {
    if (!form.fullName.trim()) return

    const patch: Partial<Person> & { accessCode?: string } = {
      fullName: form.fullName,
      nickname: form.nickname.trim() || null,
      phone: form.phone || undefined,
    }
    // Code laissé vide en modification = on ne le change pas (le code existant
    // n'est jamais relisible côté client, voir peopleSupabaseService).
    if (form.accessCode.trim()) patch.accessCode = form.accessCode
    await updatePerson.mutateAsync({ id: person.id, patch })
    toast.success("Personne mise à jour.")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Modifier">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Modifier</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="person-name">Nom</FieldLabel>
            <Input
              id="person-name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="person-nickname">Surnom</FieldLabel>
            <Input
              id="person-nickname"
              placeholder="Optionnel — affiché à la place du nom"
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="person-phone">Téléphone</FieldLabel>
            <Input
              id="person-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="person-code">Code d&apos;accès</FieldLabel>
            <Input
              id="person-code"
              placeholder="Laisser vide pour ne pas changer le code"
              value={form.accessCode}
              onChange={(e) => setForm((f) => ({ ...f, accessCode: e.target.value.toUpperCase() }))}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PersonManager() {
  const { data: people, isLoading } = usePeople()
  const deletePerson = useDeletePerson()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">Fiancés &amp; codes d&apos;accès</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          people?.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{person.fullName}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {person.accessCode || "Code défini (masqué)"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <PersonDialog person={person} />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Supprimer"
                  onClick={() => deletePerson.mutate(person.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
