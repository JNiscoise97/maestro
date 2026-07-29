import type { RosLaunch } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { supabase, USE_SUPABASE } from "@/supabase/client"
import { tbl, mockKey } from "@/lib/event"

const mock = createMockTable<RosLaunch>(mockKey("ros-launches"), [])

function rowToLaunch(r: {
  id: string; step_id: string; mission_id: string | null; label: string | null
  scheduled_time: string | null; launched_at: string | null; sort_order: number
}): RosLaunch {
  return {
    id: r.id,
    stepId: r.step_id,
    missionId: r.mission_id,
    label: r.label,
    scheduledTime: r.scheduled_time,
    launchedAt: r.launched_at,
    sortOrder: r.sort_order,
  }
}

export interface RosLaunchInput {
  stepId: string
  missionId?: string | null
  label?: string | null
  scheduledTime?: string | null
  sortOrder?: number
}

export interface RosLaunchPatch {
  missionId?: string | null
  label?: string | null
  scheduledTime?: string | null
  launchedAt?: string | null
  sortOrder?: number
}

export const rosLaunchesService = {
  async list(): Promise<RosLaunch[]> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("ros_launches") as any)
        .select("*")
        .order("sort_order")
      if (error) throw error
      return (data ?? []).map(rowToLaunch)
    }
    return mock.getAll()
  },

  async create(input: RosLaunchInput): Promise<RosLaunch> {
    if (USE_SUPABASE) {
      const { data, error } = await (supabase! as any)
        .from(tbl("ros_launches") as any)
        .insert({
          step_id: input.stepId,
          mission_id: input.missionId ?? null,
          label: input.label ?? null,
          scheduled_time: input.scheduledTime ?? null,
          sort_order: input.sortOrder ?? 0,
        })
        .select()
        .single()
      if (error) throw error
      return rowToLaunch(data)
    }
    const launch: RosLaunch = {
      id: crypto.randomUUID(),
      stepId: input.stepId,
      missionId: input.missionId ?? null,
      label: input.label ?? null,
      scheduledTime: input.scheduledTime ?? null,
      launchedAt: null,
      sortOrder: input.sortOrder ?? 0,
    }
    return mock.insert(launch)
  },

  async update(id: string, patch: RosLaunchPatch): Promise<void> {
    if (USE_SUPABASE) {
      const row: {
        mission_id?: string | null; label?: string | null; scheduled_time?: string | null
        launched_at?: string | null; sort_order?: number
      } = {}
      if ("missionId" in patch) row.mission_id = patch.missionId
      if ("label" in patch) row.label = patch.label
      if ("scheduledTime" in patch) row.scheduled_time = patch.scheduledTime
      if ("launchedAt" in patch) row.launched_at = patch.launchedAt
      if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
      const { error } = await (supabase! as any).from(tbl("ros_launches") as any).update(row).eq("id", id)
      if (error) throw error
      return
    }
    const mockPatch: Partial<RosLaunch> = {}
    if ("missionId" in patch) mockPatch.missionId = patch.missionId ?? null
    if ("label" in patch) mockPatch.label = patch.label ?? null
    if ("scheduledTime" in patch) mockPatch.scheduledTime = patch.scheduledTime ?? null
    if ("launchedAt" in patch) mockPatch.launchedAt = patch.launchedAt ?? null
    if (patch.sortOrder !== undefined) mockPatch.sortOrder = patch.sortOrder
    await mock.update(id, mockPatch)
  },

  async remove(id: string): Promise<void> {
    if (USE_SUPABASE) {
      const { error } = await (supabase! as any).from(tbl("ros_launches") as any).delete().eq("id", id)
      if (error) throw error
      return
    }
    await mock.remove(id)
  },
}
