import { cn } from "@/lib/utils"
import { sequenceColor } from "@/lib/sequence-colors"

type SequenceLike = { name: string; color?: string | null; sortOrder?: number | null }

/** Pastille de couleur d'une séquence. */
export function SequenceDot({ sequence, className }: { sequence: Omit<SequenceLike, "name">; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: sequenceColor(sequence) }}
    />
  )
}

/** Nom d'une séquence précédé de sa pastille de couleur. */
export function SequenceName({ sequence, className, dotClassName }: {
  sequence: SequenceLike
  className?: string
  dotClassName?: string
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <SequenceDot sequence={sequence} className={dotClassName} />
      <span className="truncate">{sequence.name}</span>
    </span>
  )
}
