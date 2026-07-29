import { useState } from "react"
import { toast } from "sonner"

import { useCreateDocument } from "@/hooks/queries/use-documents"
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

export function DocumentUploadDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const createDocument = useCreateDocument()

  function reset() {
    setFile(null)
    setTitle("")
    setCategory("")
  }

  async function handleSubmit() {
    if (!file) return
    await createDocument.mutateAsync({
      title: title || file.name,
      category: category || null,
      fileName: file.name,
      filePath: URL.createObjectURL(file),
      visibleToRoles: ["admin", "referent"],
    })
    toast.success("Document ajouté.")
    setOpen(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>Ajouter un document</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Ajouter un document</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="file">Fichier</FieldLabel>
            <Input
              id="file"
              type="file"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null
                setFile(selected)
                if (selected && !title) setTitle(selected.name)
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="doc-title">Titre</FieldLabel>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="doc-category">Catégorie</FieldLabel>
            <Input
              id="doc-category"
              placeholder="Ex. Planning, Boissons..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!file || createDocument.isPending}>
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
