import type { GuestMealChoice, MealChoice } from "@/types/domain"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

type MealChoiceRow = {
  guest_id: string
  sequence_id: string
  meal_choice: MealChoice | null
}

function toMealChoice(r: MealChoiceRow): GuestMealChoice {
  return {
    guestId: r.guest_id,
    sequenceId: r.sequence_id,
    mealChoice: r.meal_choice,
  }
}

export const guestMealChoicesService = {
  async listBySequence(sequenceId: string): Promise<GuestMealChoice[]> {
    const { data, error } = await db
      .from(tbl("guest_meal_choices") as any)
      .select("*")
      .eq("sequence_id", sequenceId)
    if (error) throw error
    return ((data ?? []) as MealChoiceRow[]).map(toMealChoice)
  },

  async set(guestId: string, sequenceId: string, mealChoice: MealChoice | null): Promise<GuestMealChoice> {
    const { data, error } = await db
      .from(tbl("guest_meal_choices") as any)
      .upsert({ guest_id: guestId, sequence_id: sequenceId, meal_choice: mealChoice })
      .select("*")
      .single()
    if (error) throw error
    return toMealChoice(data as MealChoiceRow)
  },
}
