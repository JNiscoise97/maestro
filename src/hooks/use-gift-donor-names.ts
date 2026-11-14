import { useMemo } from "react"
import { useGifts } from "@/hooks/queries/use-gifts"
import { useGuests } from "@/hooks/queries/use-guests"
import { giftDonors } from "@/lib/budget-gifts"

/** Noms des donateurs de chaque cadeau (id du cadeau → « Prénom Nom, … »). */
export function useGiftDonorNames(): Map<string, string> {
  const { data: gifts = [] } = useGifts()
  const { data: guests = [] } = useGuests()
  return useMemo(() => {
    const guestsById = new Map(guests.map((g) => [g.id, g]))
    return new Map(gifts.map((g) => [g.id, giftDonors(g, guestsById)]))
  }, [gifts, guests])
}
