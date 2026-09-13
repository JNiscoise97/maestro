import type { CortegeGroupRecord } from "@/lib/cortege"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export type CortegeConfig = {
  enabledRoles: string[]
  cavalierCount: number
  demoiselleCount: number
  temoinsMarieCount: number
  temoinsMarieeCount: number
}

export const cortegeService = {
  // ── Config (rôles actifs + compteurs) ──

  async getConfig(sequenceId: string): Promise<CortegeConfig> {
    const { data, error } = await db
      .from(tbl("cortege_config"))
      .select("enabled_roles, cavalier_count, demoiselle_count, temoins_marie_count, temoins_mariee_count")
      .eq("sequence_id", sequenceId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { enabledRoles: [], cavalierCount: 0, demoiselleCount: 0, temoinsMarieCount: 0, temoinsMarieeCount: 0 }
    return {
      enabledRoles:       data.enabled_roles        ?? [],
      cavalierCount:      data.cavalier_count        ?? 0,
      demoiselleCount:    data.demoiselle_count      ?? 0,
      temoinsMarieCount:  data.temoins_marie_count   ?? 0,
      temoinsMarieeCount: data.temoins_mariee_count  ?? 0,
    }
  },

  async saveConfig(sequenceId: string, config: CortegeConfig): Promise<void> {
    const { error } = await db
      .from(tbl("cortege_config"))
      .upsert(
        {
          sequence_id:          sequenceId,
          enabled_roles:        config.enabledRoles,
          cavalier_count:       config.cavalierCount,
          demoiselle_count:     config.demoiselleCount,
          temoins_marie_count:  config.temoinsMarieCount,
          temoins_mariee_count: config.temoinsMarieeCount,
        },
        { onConflict: "sequence_id" }
      )
    if (error) throw error
  },

  // ── Groupes ──

  async listGroups(sequenceId: string): Promise<CortegeGroupRecord[]> {
    const { data, error } = await db
      .from(tbl("cortege_groups"))
      .select("id, sequence_id, label, role_keys, sort_order")
      .eq("sequence_id", sequenceId)
      .order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map((r: any) => ({
      id:         r.id,
      sequenceId: r.sequence_id,
      label:      r.label,
      roleKeys:   r.role_keys ?? [],
      sortOrder:  r.sort_order,
    }))
  },

  async createGroup(sequenceId: string, label: string, sortOrder: number): Promise<CortegeGroupRecord> {
    const { data, error } = await db
      .from(tbl("cortege_groups"))
      .insert({ sequence_id: sequenceId, label, role_keys: [], sort_order: sortOrder })
      .select()
      .single()
    if (error) throw error
    return {
      id:         data.id,
      sequenceId: data.sequence_id,
      label:      data.label,
      roleKeys:   data.role_keys ?? [],
      sortOrder:  data.sort_order,
    }
  },

  async updateGroup(
    id: string,
    patch: Partial<{ label: string; roleKeys: string[]; sortOrder: number }>
  ): Promise<void> {
    const row: Record<string, unknown> = {}
    if (patch.label     !== undefined) row.label      = patch.label
    if (patch.roleKeys  !== undefined) row.role_keys  = patch.roleKeys
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
    const { error } = await db.from(tbl("cortege_groups")).update(row).eq("id", id)
    if (error) throw error
  },

  async deleteGroup(id: string): Promise<void> {
    const { error } = await db.from(tbl("cortege_groups")).delete().eq("id", id)
    if (error) throw error
  },

  async listConfiguredSequenceIds(): Promise<string[]> {
    const { data, error } = await db
      .from(tbl("cortege_config"))
      .select("sequence_id, enabled_roles")
    if (error) throw error
    return (data ?? [])
      .filter((r: any) => (r.enabled_roles ?? []).length > 0)
      .map((r: any) => r.sequence_id as string)
  },

  async duplicateFrom(sourceId: string, targetId: string): Promise<void> {
    // 1. Copie la config
    const config = await cortegeService.getConfig(sourceId)
    await cortegeService.saveConfig(targetId, config)

    // 2. Supprime les groupes existants de la cible
    const { error: delErr } = await db
      .from(tbl("cortege_groups"))
      .delete()
      .eq("sequence_id", targetId)
    if (delErr) throw delErr

    // 3. Copie les groupes source → cible
    const groups = await cortegeService.listGroups(sourceId)
    if (groups.length > 0) {
      const { error: insErr } = await db
        .from(tbl("cortege_groups"))
        .insert(
          groups.map((g) => ({
            sequence_id: targetId,
            label:       g.label,
            role_keys:   g.roleKeys,
            sort_order:  g.sortOrder,
          }))
        )
      if (insErr) throw insErr
    }
  },

  async reorderGroups(groups: { id: string; sortOrder: number }[]): Promise<void> {
    await Promise.all(
      groups.map(({ id, sortOrder }) =>
        db.from(tbl("cortege_groups")).update({ sort_order: sortOrder }).eq("id", id)
      )
    )
  },

  // ── Assignations invité → rôle ──

  async listAssignments(sequenceId: string): Promise<{ roleKey: string; guestId: string }[]> {
    const { data, error } = await db
      .from(tbl("cortege_assignments"))
      .select("role_key, guest_id")
      .eq("sequence_id", sequenceId)
      .not("guest_id", "is", null)
    if (error) throw error
    return (data ?? []).map((r: any) => ({ roleKey: r.role_key, guestId: r.guest_id }))
  },

  async assignGuest(sequenceId: string, roleKey: string, guestId: string): Promise<void> {
    const { error } = await db
      .from(tbl("cortege_assignments"))
      .upsert(
        { sequence_id: sequenceId, role_key: roleKey, guest_id: guestId },
        { onConflict: "sequence_id,role_key" }
      )
    if (error) throw error
  },

  async unassignGuest(sequenceId: string, roleKey: string): Promise<void> {
    const { error } = await db
      .from(tbl("cortege_assignments"))
      .delete()
      .eq("sequence_id", sequenceId)
      .eq("role_key", roleKey)
    if (error) throw error
  },
}
