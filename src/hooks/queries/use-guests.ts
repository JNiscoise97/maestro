import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { guestsService, type CreateGuestGroupInput, type CreateGuestInput } from "@/services/guests.service"
import type { Guest, GuestGroup } from "@/types/domain"
import { householdsService, type HouseholdPatch } from "@/services/households.service"

export function useGuestGroups() {
  return useQuery({
    queryKey: ["guest-groups"],
    queryFn: async () => {
      const groups = await guestsService.listGroups()
      return [...groups].sort((a, b) => a.sortOrder - b.sortOrder)
    },
  })
}

export function useCreateGuestGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGuestGroupInput) => guestsService.createGroup(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guest-groups"] }),
  })
}

export function useUpdateGuestGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GuestGroup> }) => guestsService.updateGroup(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guest-groups"] }),
  })
}

/** Réordonnement par drag-and-drop : optimiste pour un retour visuel immédiat — même pattern que useReorderPhotoGroups. */
export function useReorderGuestGroups() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groups: GuestGroup[]) =>
      Promise.all(groups.map((g) => guestsService.updateGroup(g.id, { sortOrder: g.sortOrder }))),
    onMutate: async (groups) => {
      await queryClient.cancelQueries({ queryKey: ["guest-groups"] })
      const previous = queryClient.getQueryData<GuestGroup[]>(["guest-groups"])
      const byId = new Map(groups.map((g) => [g.id, g]))
      queryClient.setQueryData<GuestGroup[]>(["guest-groups"], (current) =>
        (current ?? []).map((g) => byId.get(g.id) ?? g)
      )
      return { previous }
    },
    onError: (_err, _groups, context) => {
      if (context?.previous) queryClient.setQueryData(["guest-groups"], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["guest-groups"] }),
  })
}

/** Détache les invités du groupe (groupId -> null) avant de le supprimer — ils ne disparaissent pas. */
export function useDeleteGuestGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => guestsService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-groups"] })
      queryClient.invalidateQueries({ queryKey: ["guests"] })
    },
  })
}

export function useGuests() {
  return useQuery({ queryKey: ["guests"], queryFn: () => guestsService.listGuests() })
}

export function useCreateGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGuestInput) => guestsService.createGuest(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

export function useUpdateGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Guest> }) => guestsService.updateGuest(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

/** Lie deux invités comme "inséparables", en délink d'abord leur éventuel partenaire précédent — un invité n'a jamais plus d'un partenaire. */
export function usePairGuests() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ guestA, guestB }: { guestA: Guest; guestB: Guest }) => {
      const unlinks: Promise<Guest>[] = []
      if (guestA.pairedWithId && guestA.pairedWithId !== guestB.id) {
        unlinks.push(guestsService.updateGuest(guestA.pairedWithId, { pairedWithId: null }))
      }
      if (guestB.pairedWithId && guestB.pairedWithId !== guestA.id) {
        unlinks.push(guestsService.updateGuest(guestB.pairedWithId, { pairedWithId: null }))
      }
      await Promise.all(unlinks)
      await Promise.all([
        guestsService.updateGuest(guestA.id, { pairedWithId: guestB.id }),
        guestsService.updateGuest(guestB.id, { pairedWithId: guestA.id }),
      ])
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

/** Délie un invité de son partenaire (des deux côtés). */
export function useUnpairGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (guest: Guest) => {
      const updates = [guestsService.updateGuest(guest.id, { pairedWithId: null })]
      if (guest.pairedWithId) updates.push(guestsService.updateGuest(guest.pairedWithId, { pairedWithId: null }))
      await Promise.all(updates)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

/** Pointe/dépointe l'arrivée d'un invité à l'accueil — optimiste pour rester réactif en usage live le jour J. */
export function useCheckInGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, checkedInAt }: { id: string; checkedInAt: string | null }) =>
      guestsService.updateGuest(id, { checkedInAt }),
    onMutate: async ({ id, checkedInAt }) => {
      await queryClient.cancelQueries({ queryKey: ["guests"] })
      const previous = queryClient.getQueryData<Guest[]>(["guests"])
      queryClient.setQueryData<Guest[]>(["guests"], (current) =>
        (current ?? []).map((g) => (g.id === id ? { ...g, checkedInAt } : g))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["guests"], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

/** Crée un invité non prévu qui se présente à l'accueil, et le pointe arrivé immédiatement. */
export function useAddWalkInGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
      const created = await guestsService.createGuest({ firstName, lastName })
      return guestsService.updateGuest(created.id, {
        isUnexpected: true,
        rsvpStatus: "confirmed",
        checkedInAt: new Date().toISOString(),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

export function useDeleteGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => guestsService.deleteGuest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

export function useResetIntroductionSeenForAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => guestsService.resetIntroductionSeenForAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

export function useResetCheckInsForAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => guestsService.resetCheckInsForAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })
}

// ── Foyers (une invitation par foyer) ─────────────────────────────────────────

export function useHouseholds() {
  return useQuery({ queryKey: ["households"], queryFn: () => householdsService.list() })
}

function useInvalidateHouseholds() {
  const queryClient = useQueryClient()
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["households"] }),
    queryClient.invalidateQueries({ queryKey: ["guests"] }),
  ])
}

export function useCreateHousehold() {
  const invalidate = useInvalidateHouseholds()
  return useMutation({
    mutationFn: ({ groupId, label, sortOrder, memberIds }: { groupId: string | null; label?: string | null; sortOrder?: number; memberIds: string[] }) =>
      householdsService.create({ groupId, label, sortOrder }, memberIds),
    onSettled: invalidate,
  })
}

export function useUpdateHousehold() {
  const invalidate = useInvalidateHouseholds()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: HouseholdPatch }) => householdsService.update(id, patch),
    onSettled: invalidate,
  })
}

export function useDeleteHousehold() {
  const invalidate = useInvalidateHouseholds()
  return useMutation({ mutationFn: (id: string) => householdsService.remove(id), onSettled: invalidate })
}

/** Rattache des invités à un foyer, ou les en retire (householdId null). */
export function useSetGuestsHousehold() {
  const invalidate = useInvalidateHouseholds()
  return useMutation({
    mutationFn: ({ guestIds, householdId }: { guestIds: string[]; householdId: string | null }) =>
      householdsService.setGuestsHousehold(guestIds, householdId),
    onSettled: invalidate,
  })
}
