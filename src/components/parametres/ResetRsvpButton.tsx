import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { useResetRsvp } from "@/hooks/queries/use-rsvp"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ResetRsvpButton() {
  const [open, setOpen] = useState(false)
  const reset = useResetRsvp()

  async function handleConfirm() {
    await reset.mutateAsync()
    toast.success("Toutes les réponses RSVP ont été supprimées.")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RotateCcw className="size-4" />
          Réinitialiser les RSVP
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Réinitialiser les réponses RSVP ?</DialogTitle>
          <DialogDescription>
            Toutes les réponses reçues via les formulaires seront définitivement supprimées.
            Les fiches invités ne sont pas affectées.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={reset.isPending}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
