import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"
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

export function SyncFromFiancaillesButton() {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const queryClient = useQueryClient()

  async function handleConfirm() {
    setIsPending(true)
    try {
      const db = supabase as any
      const { data, error } = await db.rpc(tbl("sync_from_fiancailles") as any)
      if (error) throw error
      const { new_groups, new_guests } = data as { new_groups: number; new_guests: number }
      await queryClient.invalidateQueries({ queryKey: ["guests"] })
      await queryClient.invalidateQueries({ queryKey: ["guest-groups"] })
      const parts: string[] = []
      if (new_guests > 0)  parts.push(`${new_guests} invité${new_guests > 1 ? "s" : ""}`)
      if (new_groups > 0)  parts.push(`${new_groups} groupe${new_groups > 1 ? "s" : ""}`)
      toast.success(parts.length > 0 ? `Synchronisé : ${parts.join(" et ")}.` : "Aucune nouveauté à importer.")
      setOpen(false)
    } catch (err) {
      toast.error("Erreur lors de la synchronisation.")
      console.error(err)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="size-4" />
          Synchroniser depuis les fiançailles
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Synchroniser depuis les fiançailles ?</DialogTitle>
          <DialogDescription>
            Les groupes et invités ajoutés aux fiançailles mais absents du mariage seront copiés ici.
            Les invités déjà présents ne sont pas modifiés.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Synchronisation…" : "Synchroniser"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
