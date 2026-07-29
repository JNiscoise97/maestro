import type { EquipmentItem, FabricationStatut } from "@/types/domain"
import type { EquipmentService } from "@/services/equipment.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

type EquipmentRow = {
  id: string
  category: string
  label: string
  status: EquipmentItem["status"] | null
  guest_name: string | null
  notes: string | null
  sort_order: number
  demande_au_lieu_faite: boolean | null
  location_reserve: boolean | null
  location_fournisseur: string | null
  location_entree_at: string | null
  location_entree_lieu: string | null
  location_sortie_at: string | null
  location_sortie_lieu: string | null
  location_caution: string | null
  location_livraison: boolean | null
  achat_receptionne: boolean | null
  fabrication_statut: string | null
}

function toEquipmentItem(row: EquipmentRow): EquipmentItem {
  return {
    id: row.id,
    category: row.category,
    label: row.label,
    status: row.status,
    guestName: row.guest_name,
    notes: row.notes,
    sortOrder: row.sort_order,
    demandeAuLieuFaite: row.demande_au_lieu_faite,
    locationReserve: row.location_reserve,
    locationFournisseur: row.location_fournisseur,
    locationEntreeAt: row.location_entree_at,
    locationEntreeLieu: row.location_entree_lieu,
    locationSortieAt: row.location_sortie_at,
    locationSortieLieu: row.location_sortie_lieu,
    locationCaution: row.location_caution,
    locationLivraison: row.location_livraison,
    achatReceptionne: row.achat_receptionne,
    fabricationStatut: row.fabrication_statut as FabricationStatut | null,
  }
}

type RowPatch = Partial<{
  status: EquipmentItem["status"] | null
  guest_name: string | null
  notes: string | null
  demande_au_lieu_faite: boolean | null
  location_reserve: boolean | null
  location_fournisseur: string | null
  location_entree_at: string | null
  location_entree_lieu: string | null
  location_sortie_at: string | null
  location_sortie_lieu: string | null
  location_caution: string | null
  location_livraison: boolean | null
  achat_receptionne: boolean | null
  fabrication_statut: string | null
}>

export const equipmentSupabaseService: EquipmentService = {
  async createItem(input) {
    const { data, error } = await db
      .from(tbl("equipment") as any)
      .insert({
        category: input.category,
        label: input.label,
        notes: input.notes ?? null,
        sort_order: input.sortOrder,
        demande_au_lieu_faite: null,
        location_reserve: null,
        location_fournisseur: null,
        location_entree_at: null,
        location_entree_lieu: null,
        location_sortie_at: null,
        location_sortie_lieu: null,
        location_caution: null,
        location_livraison: null,
        achat_receptionne: null,
        fabrication_statut: null,
      })
      .select("*")
      .single()
    if (error) throw error
    return toEquipmentItem(data as EquipmentRow)
  },

  async removeItem(id) {
    const { error } = await db.from(tbl("equipment") as any).delete().eq("id", id)
    if (error) throw error
  },

  async listItems() {
    const { data, error } = await db.from(tbl("equipment") as any).select("*").order("category").order("sort_order")
    if (error) throw error
    return ((data ?? []) as any[]).map((r) => toEquipmentItem(r as EquipmentRow))
  },

  async updateItem(id, patch) {
    const row: RowPatch = {}
    if (patch.status !== undefined) row.status = patch.status ?? null
    if (patch.guestName !== undefined) row.guest_name = patch.guestName ?? null
    if (patch.notes !== undefined) row.notes = patch.notes ?? null
    if (patch.demandeAuLieuFaite !== undefined) row.demande_au_lieu_faite = patch.demandeAuLieuFaite ?? null
    if (patch.locationReserve !== undefined) row.location_reserve = patch.locationReserve ?? null
    if (patch.locationFournisseur !== undefined) row.location_fournisseur = patch.locationFournisseur ?? null
    if (patch.locationEntreeAt !== undefined) row.location_entree_at = patch.locationEntreeAt ?? null
    if (patch.locationEntreeLieu !== undefined) row.location_entree_lieu = patch.locationEntreeLieu ?? null
    if (patch.locationSortieAt !== undefined) row.location_sortie_at = patch.locationSortieAt ?? null
    if (patch.locationSortieLieu !== undefined) row.location_sortie_lieu = patch.locationSortieLieu ?? null
    if (patch.locationCaution !== undefined) row.location_caution = patch.locationCaution ?? null
    if (patch.locationLivraison !== undefined) row.location_livraison = patch.locationLivraison ?? null
    if (patch.achatReceptionne !== undefined) row.achat_receptionne = patch.achatReceptionne ?? null
    if (patch.fabricationStatut !== undefined) row.fabrication_statut = patch.fabricationStatut ?? null

    const { data, error } = await db
      .from(tbl("equipment") as any)
      .update(row)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toEquipmentItem(data as EquipmentRow)
  },
}
