import type { RsvpStatus } from "@/types/domain"
import { Badge } from "@/components/ui/badge"

const RSVP_CONFIG: Record<RsvpStatus, { label: string; className: string }> = {
  pending:  { label: "En attente", className: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmé",  className: "bg-vert-vegetal/15 text-vert-vegetal" },
  declined: { label: "Décliné",   className: "bg-bordeaux/10 text-bordeaux" },
  no_show:  { label: "No show",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
}

export function RsvpBadge({ status }: { status: RsvpStatus }) {
  const config = RSVP_CONFIG[status]
  return <Badge className={config.className}>{config.label}</Badge>
}
