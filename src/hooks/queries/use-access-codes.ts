import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { accessCodesService, type AccessCodeEntry } from "@/services/access-codes.service"
import { peopleService } from "@/services/people.service"
import { guestsService } from "@/services/guests.service"

const KEY = ["access-codes"] as const
const PEOPLE_KEY = ["people"] as const
const GUESTS_KEY = ["guests"] as const

export function useAccessCodes() {
  return useQuery({ queryKey: KEY, queryFn: () => accessCodesService.list() })
}

function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: KEY })
    queryClient.invalidateQueries({ queryKey: PEOPLE_KEY })
    queryClient.invalidateQueries({ queryKey: GUESTS_KEY })
  }
}

export interface CreateAccountInput {
  kind: "fiance" | "guest"
  /** Fiancés uniquement — nom complet */
  fullName?: string
  /** Invités uniquement — ID d'un invité existant */
  guestId?: string
  accessCode: string
}

export function useCreateAccount() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const code = input.accessCode.trim().toUpperCase()
      if (input.kind === "fiance") {
        await peopleService.create({
          id: crypto.randomUUID(),
          fullName: (input.fullName ?? "").trim(),
          role: "admin",
          accessCode: code,
          isActive: true,
        })
      } else {
        if (!input.guestId) throw new Error("guestId requis pour un compte invité")
        await guestsService.updateGuest(input.guestId, { accessCode: code, isActive: true })
      }
    },
    onSuccess: invalidate,
  })
}

export interface UpdateAccountInput {
  /** Fiancés uniquement */
  fullName?: string
  accessCode?: string
  isActive?: boolean
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async ({ entry, patch }: { entry: AccessCodeEntry; patch: UpdateAccountInput }) => {
      if (entry.kind === "fiance") {
        await peopleService.update(entry.id, {
          ...(patch.fullName !== undefined ? { fullName: patch.fullName.trim() } : {}),
          ...(patch.accessCode !== undefined ? { accessCode: patch.accessCode.trim().toUpperCase() } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        })
      } else {
        await guestsService.updateGuest(entry.id, {
          ...(patch.accessCode !== undefined ? { accessCode: patch.accessCode.trim().toUpperCase() } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        })
      }
    },
    onSuccess: invalidate,
  })
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (entry: AccessCodeEntry) => {
      if (entry.kind === "fiance") {
        await peopleService.remove(entry.id)
      } else {
        // Pour les invités : on retire juste le code (ne supprime pas l'invité)
        await guestsService.updateGuest(entry.id, { accessCode: null, isActive: false })
      }
    },
    onSuccess: invalidate,
  })
}
