import { Phone } from "lucide-react"

import { useEventConfig } from "@/context/EventConfigContext"
import { usePeople } from "@/hooks/queries/use-people"
import { Button } from "@/components/ui/button"
import { telLink } from "@/lib/links"

export function DayOfBanner() {
  const { isDayOf, phase } = useEventConfig()
  const { data: people } = usePeople()

  if (!isDayOf) return null

  const jordan = people?.find((p) => p.fullName === "Jordan" && p.role === "admin")

  const PHASE_LABELS: Record<string, string> = {
    "j-1": "J-1 — installation",
    "jour-j": "Jour J 🎉",
    "j+1": "J+1 — rangement",
    post: "Après l'événement",
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-bordeaux/20 bg-bordeaux px-4 py-2 text-primary-foreground sm:px-6 lg:px-8">
      <span className="text-sm font-medium">{PHASE_LABELS[phase] ?? phase}</span>
      {jordan?.phone ? (
        <Button asChild size="sm" variant="secondary">
          <a href={telLink(jordan.phone)}>
            <Phone className="size-3.5" />
            Appeler Jordan
          </a>
        </Button>
      ) : null}
    </div>
  )
}
