import type { RunOfShowStep } from "@/types/domain"
import type { RunOfShowService } from "@/services/run-of-show.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

function toStep(
  row: {
    id: string
    time_label: string
    starts_at: string | null
    label: string
    duration_minutes: number | null
    location: string | null
    phase: string | null
    music: string | null
    notes: string | null
    is_highlight: boolean
  },
  responsibleIds: string[]
): RunOfShowStep {
  return {
    id: row.id,
    timeLabel: row.time_label,
    startsAt: row.starts_at,
    label: row.label,
    durationMinutes: row.duration_minutes,
    location: row.location,
    phase: row.phase,
    music: row.music,
    notes: row.notes,
    isHighlight: row.is_highlight,
    responsibleIds,
  }
}

export const runOfShowSupabaseService: RunOfShowService = {
  async list() {
    const [stepsResult, responsiblesResult] = await Promise.all([
      (db as any).from(tbl("run_of_show_steps") as any).select("*"),
      (db as any).from(tbl("run_of_show_responsibles") as any).select("*"),
    ])
    if (stepsResult.error) throw stepsResult.error
    if (responsiblesResult.error) throw responsiblesResult.error

    const responsiblesByStep = new Map<string, string[]>()
    for (const link of responsiblesResult.data ?? []) {
      const list = responsiblesByStep.get(link.run_of_show_step_id) ?? []
      list.push(link.person_id)
      responsiblesByStep.set(link.run_of_show_step_id, list)
    }

    const steps = ((stepsResult.data ?? []) as any[]).map((row: any) => toStep(row, responsiblesByStep.get(row.id) ?? []))
    return steps.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))
  },
}
