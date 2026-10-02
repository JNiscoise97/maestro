import { cn } from "@/lib/utils"
import { SequenceDot } from "@/components/shared/SequenceName"
import { useItemSequenceProgress } from "@/hooks/use-item-sequence-progress"
import type { ChecklistItem } from "@/types/domain"

/**
 * Séquences d'une mission (_mission_sequences) avec, pour chacune, le nombre
 * d'items faits sur les items concernés — même calcul que les cartes du rétroplanning.
 */
export function MissionSequenceProgress({ missionId, items, highlightSequenceId }: {
  missionId: string
  /** Items de la mission (toutes checklists confondues). */
  items: ChecklistItem[]
  /** Séquence mise en avant par le filtre de la vue. */
  highlightSequenceId?: string | null
}) {
  const progress = useItemSequenceProgress()
  const sequences = progress.sequencesForMission(missionId)

  if (sequences.length === 0) {
    return <p className="text-[11px] italic text-muted-foreground">Aucune séquence liée à cette mission</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="Séquences de la mission">
      {sequences.map((seq) => {
        const statuses = items.map((i) => progress.statusOf(i, seq.id))
        const concerned = statuses.filter((s) => s !== "na").length
        const done = statuses.filter((s) => s === "done").length
        const complete = concerned > 0 && done === concerned
        const dimmed = !!highlightSequenceId && highlightSequenceId !== seq.id
        return (
          <span key={seq.id}
            title={concerned === 0
              ? `${seq.name} : non concernée`
              : `${seq.name} : ${done} / ${concerned} item(s) faits`}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] tabular-nums",
              concerned === 0 && "text-muted-foreground/60 line-through",
              concerned > 0 && complete && "bg-vert-vegetal/15 text-vert-vegetal",
              concerned > 0 && !complete && "bg-lagon/10 text-lagon",
              dimmed && "opacity-40",
              highlightSequenceId === seq.id && "ring-1 ring-lagon",
            )}
          >
            <SequenceDot sequence={seq} className="size-1.5" />
            {seq.name}
            {sequences.length > 1 && concerned > 0 ? ` ${done}/${concerned}` : ""}
          </span>
        )
      })}
    </div>
  )
}
