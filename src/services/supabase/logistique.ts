import type { LogistiqueItem } from "@/types/domain"
import type { LogistiqueService } from "@/services/logistique.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toLogistiqueItem(row: {
  id: string
  domaine_id: string | null
  name: string
  responsable_id: string | null
  quantity: number | null
  unit: string | null
  notes: string | null
}): LogistiqueItem {
  return {
    id: row.id,
    domaineId: row.domaine_id,
    name: row.name,
    responsableId: row.responsable_id,
    quantity: row.quantity,
    unit: row.unit,
    notes: row.notes,
  }
}

export const logistiqueSupabaseService: LogistiqueService = {
  async list() {
    const { data, error } = await db.from(tbl("logistique_items") as any).select("*")
    if (error) throw error
    return (data ?? []).map(toLogistiqueItem)
  },
}
