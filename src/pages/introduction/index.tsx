import { useNavigate } from "react-router-dom"
import { HeartHandshake } from "lucide-react"

import { useIdentity } from "@/context/IdentityContext"
import { useUpdateGuest } from "@/hooks/queries/use-guests"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const PARAGRAPHS = [
  "Nous avons choisi de te confier un rôle particulier lors de nos fiançailles.",
  "Cette soirée représente beaucoup pour nous et nous ne pourrons pas être partout à la fois. Si nous avons pensé à toi, c'est parce que nous avons confiance en toi et que nous savons que nous pouvons compter sur toi.",
  "Merci d'avance pour ton aide et ta présence à nos côtés ❤️",
]

export function IntroductionPage() {
  const { person, patchPerson, isImpersonating } = useIdentity()
  const firstName = person?.fullName.split(" ")[0] ?? ""
  const updateGuest = useUpdateGuest()
  const navigate = useNavigate()

  function handleAcknowledge() {
    if (!person || person.role === "admin" || isImpersonating) {
      navigate("/")
      return
    }
    updateGuest.mutate(
      { id: person.id, patch: { introductionSeen: true } },
      {
        onSuccess: () => {
          patchPerson({ introductionSeen: true })
          navigate("/")
        },
      }
    )
  }

return (
    <div className="space-y-6">
      <PageHeader title="Introduction" />

      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-4">
          <HeartHandshake className="size-8 text-primary" />
          <p className="font-heading text-lg font-semibold text-foreground">Bonjour {firstName},</p>
          {PARAGRAPHS.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-foreground">
              {paragraph}
            </p>
          ))}
          <p className="font-heading text-base font-semibold text-foreground">Sarah &amp; Jordan</p>

          {!isImpersonating && !person?.introductionSeen && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleAcknowledge} disabled={updateGuest.isPending}>
                Découvre comment tu peux nous aider
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
