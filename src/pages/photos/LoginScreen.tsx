import { useState } from "react"

import { callGalleryFunction, galleryClient } from "@/features/gallery/client"
import type { ColorMode } from "@/features/gallery/theme"
import { Masthead, ModeToggle } from "./GalleryChrome"

type Step = "email" | "name" | "code" | "pending"

const input = "w-full border-b bg-transparent py-2 text-sm outline-none focus:border-[var(--p-accent)]"
const primary = "w-full py-3 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-40"

/**
 * Identification (CDCF ACC-01..03) : e-mail → (prénom/nom si inconnu) → code à 6 chiffres.
 * Aucun compte n'est créé par le navigateur (shouldCreateUser: false) : c'est gallery-identify qui décide.
 */
export function LoginScreen({ mode, onToggleMode }: { mode: ColorMode; onToggleMode: () => void }) {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode() {
    const { error: otpError } = await galleryClient!.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })
    if (otpError) {
      setError(otpError.status === 429
        ? "Trop de demandes. Patientez une minute avant de redemander un code."
        : "L'envoi du code a échoué. Réessayez dans un instant.")
      return
    }
    setStep("code")
  }

  async function identify(withName: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await callGalleryFunction<{ status: "ready" | "need_name" | "pending" }>("gallery-identify", {
        email, ...(withName ? { firstName, lastName } : {}),
      })
      if (res.status === "ready") await sendCode()
      else if (res.status === "need_name") setStep("name")
      else setStep("pending")
    } catch {
      setError("Une erreur est survenue. Vérifiez votre adresse et réessayez.")
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    setBusy(true)
    setError(null)
    const { error: verifyError } = await galleryClient!.auth.verifyOtp({
      email: email.trim().toLowerCase(), token: code.trim(), type: "email",
    })
    setBusy(false)
    if (verifyError) setError("Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.")
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-10">
      <ModeToggle mode={mode} onToggle={onToggleMode} className="absolute right-4 top-4" />
      <div className="w-full max-w-sm space-y-6">
        <Masthead compact />

        {step === "email" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void identify(false) }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              Indiquez votre adresse e-mail : nous vous envoyons un code de connexion.
            </p>
            <label className="block">
              <span className="sr-only">Adresse e-mail</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com" className={input} style={{ borderColor: "var(--p-line)" }} />
            </label>
            <button type="submit" disabled={busy || !email.trim()} className={primary}
              style={{ background: "var(--p-accent)", borderRadius: "var(--p-radius)" }}>
              {busy ? "Un instant…" : "Recevoir mon code"}
            </button>
          </form>
        )}

        {step === "name" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void identify(true) }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              Nous ne connaissons pas encore cette adresse. Indiquez votre prénom et votre nom.
            </p>
            <input required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom" aria-label="Prénom" className={input} style={{ borderColor: "var(--p-line)" }} />
            <input required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom" aria-label="Nom" className={input} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" disabled={busy || !firstName.trim() || !lastName.trim()} className={primary}
              style={{ background: "var(--p-accent)", borderRadius: "var(--p-radius)" }}>
              {busy ? "Un instant…" : "Continuer"}
            </button>
            <BackLink onClick={() => setStep("email")} />
          </form>
        )}

        {step === "pending" && (
          <div className="space-y-4 text-sm">
            <p>Votre demande a bien été transmise à Sarah et Jordan.</p>
            <p style={{ color: "var(--p-muted)" }}>
              Vous recevrez un e-mail dès qu'elle sera acceptée ; vous pourrez alors vous connecter avec cette adresse.
            </p>
            <BackLink onClick={() => setStep("email")} />
          </div>
        )}

        {step === "code" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void verify() }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              Saisissez le code envoyé à <b style={{ color: "var(--p-fg)" }}>{email}</b>. Il est valable 15 minutes.
            </p>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" aria-label="Code à 6 chiffres"
              className={`${input} text-center text-2xl tracking-[0.5em]`} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" disabled={busy || code.length !== 6} className={primary}
              style={{ background: "var(--p-accent)", borderRadius: "var(--p-radius)" }}>
              {busy ? "Vérification…" : "Se connecter"}
            </button>
            <div className="flex justify-between text-xs" style={{ color: "var(--p-muted)" }}>
              <button type="button" className="underline" onClick={() => { setCode(""); setStep("email") }}>Changer d'adresse</button>
              <button type="button" className="underline" disabled={busy} onClick={() => void sendCode()}>Renvoyer un code</button>
            </div>
          </form>
        )}

        {error && <p role="alert" className="text-sm" style={{ color: "var(--p-accent)" }}>{error}</p>}
      </div>
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs underline" style={{ color: "var(--p-muted)" }}>
      ← Revenir
    </button>
  )
}
