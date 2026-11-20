import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useLocation } from "react-router-dom"
import { HeartHandshake } from "lucide-react"

import { useIdentity } from "@/context/IdentityContext"
import { useDefaultLandingPath } from "@/hooks/use-default-landing-path"
import { EVENT_NAME } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"

const loginSchema = z.object({
  code: z.string().trim().min(1, "Merci de saisir votre code d'accès."),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { person, login } = useIdentity()
  const location = useLocation()
  const [authError, setAuthError] = useState<string | null>(null)
  const { path: defaultPath, isLoading: landingLoading } = useDefaultLandingPath(person)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { code: "" } })

  if (person) {
    const from = (location.state as { from?: Location })?.from?.pathname
    if (from) return <Navigate to={from} replace />
    // Pas de lien profond à restaurer : on attend de savoir s'il a une
    // mission assignée avant de choisir entre le tableau de bord et "Rôle"
    // (voir useDefaultLandingPath) plutôt que de deviner pendant le chargement.
    if (landingLoading) return null
    return <Navigate to={defaultPath} replace />
  }

  async function onSubmit(values: LoginValues) {
    setAuthError(null)
    const found = await login(values.code)
    if (!found) {
      setAuthError("Code d'accès invalide. Vérifiez auprès de Jordan ou Sarah.")
    }
    // En cas de succès, le changement de `person` dans IdentityContext fait
    // re-rendre ce composant et tombe dans la branche `if (person)` ci-dessus.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <HeartHandshake className="size-8 text-primary" />
          <h1 className="font-heading text-xl font-semibold text-foreground">{EVENT_NAME}</h1>
          <p className="text-sm text-muted-foreground">
            Entrez votre code d&apos;accès personnel pour continuer.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.code}>
                <FieldLabel htmlFor="code">Code d&apos;accès</FieldLabel>
                <Input
                  id="code"
                  autoFocus
                  autoComplete="off"
                  placeholder="Ex. SARAH2026"
                  {...register("code")}
                />
                <FieldError errors={[errors.code]} />
              </Field>
              {authError ? (
                <p className="text-sm font-medium text-destructive">{authError}</p>
              ) : null}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                Entrer
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
