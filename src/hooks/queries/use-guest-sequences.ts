import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { guestSequencesService } from "@/services/supabase/guest-sequences"

/** Un échec d'écriture était muet : on le signale et on resynchronise l'affichage. */
function reportError(action: string) {
  return (err: unknown) => {
    console.error(`[guest-sequences] ${action}:`, err)
    toast.error(`Impossible de ${action}. Réessayez.`)
  }
}

const KEY = ["guest-sequences"]

export function useGuestSequences() {
  return useQuery({ queryKey: KEY, queryFn: () => guestSequencesService.listByGuest() })
}

export function useAssignGuestToSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceId }: { guestId: string; sequenceId: string }) =>
      guestSequencesService.assign(guestId, sequenceId),
    onError: reportError("ajouter l'invité à la séquence"),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUnassignGuestFromSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceId }: { guestId: string; sequenceId: string }) =>
      guestSequencesService.unassign(guestId, sequenceId),
    onError: reportError("retirer l'invité de la séquence"),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSetGuestSequences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ guestId, sequenceIds }: { guestId: string; sequenceIds: string[] }) =>
      guestSequencesService.setForGuest(guestId, sequenceIds),
    onError: reportError("enregistrer les séquences de l'invité"),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
