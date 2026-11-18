import { useState } from "react"

import { callGalleryFunction, galleryClient } from "@/features/gallery/client"
import { useResetZoomOn } from "@/features/gallery/zoom"
import type { ColorMode } from "@/features/gallery/theme"
import { Masthead, ModeToggle } from "./GalleryChrome"
import { INVITATION_SUBTITLE } from "@/pages/sj-invitation/paths"

type Step = "email" | "name" | "year" | "code" | "pending"

type IdentifyResult =
  | { status: "ready"; yearLogin?: boolean; yearKind?: "birth" | "meeting" }
  | { status: "need_name" | "pending" | "locked" }
  | { status: "signed"; tokenHash: string }
  | { status: "wrong_year"; remaining: number }

/** Textes de la connexion : français (galerie et invitation) ou anglais (invitation des invités anglophones). */
const TEXTS = {
  fr: {
    tooMany: "Trop de demandes. Patientez une minute avant de redemander un code.",
    sendFailed: "L'envoi du code a échoué. Réessayez dans un instant.",
    errorAddress: "Une erreur est survenue. Vérifiez votre adresse et réessayez.",
    loginFailed: "La connexion a échoué. Réessayez dans un instant.",
    wrongYear: (n: number) => `Année incorrecte. Il vous reste ${n} essai${n > 1 ? "s" : ""}.`,
    yearLocked: "Pour votre sécurité, la connexion par année est suspendue. Un code vous a été envoyé par e-mail.",
    error: "Une erreur est survenue. Réessayez dans un instant.",
    badCode: "Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.",
    emailIntro: "Indiquez votre adresse e-mail : nous vous envoyons un code de connexion.",
    emailLabel: "Adresse e-mail",
    emailPlaceholder: "vous@exemple.com",
    wait: "Un instant…",
    getCode: "Recevoir mon code",
    unknown: "Nous ne connaissons pas encore cette adresse. Indiquez votre prénom et votre nom.",
    firstName: "Prénom",
    lastName: "Nom",
    continue: "Continuer",
    yearBefore: "Saisissez votre ",
    yearStrong: "année de naissance",
    meetingStrong: "année de rencontre",
    yearAfter: " pour vous connecter.",
    yearPlaceholder: "AAAA",
    yearLabel: "Année de naissance",
    meetingLabel: "Année de rencontre",
    checking: "Vérification…",
    signIn: "Se connecter",
    changeAddress: "Changer d'adresse",
    codeInstead: "Recevoir plutôt un code par mail",
    pending1: "Votre demande a bien été transmise à Sarah et Jordan.",
    pending2: "Vous recevrez un e-mail dès qu'elle sera acceptée ; vous pourrez alors vous connecter avec cette adresse.",
    codeBefore: "Saisissez le code envoyé à ",
    codeAfter: ". Il est valable 15 minutes.",
    codeLabel: "Code à 6 chiffres",
    resend: "Renvoyer un code",
    back: "← Revenir",
  },
  en: {
    tooMany: "Too many requests. Please wait a minute before asking for a new code.",
    sendFailed: "The code could not be sent. Please try again in a moment.",
    errorAddress: "Something went wrong. Please check your address and try again.",
    loginFailed: "Sign-in failed. Please try again in a moment.",
    wrongYear: (n: number) => `Incorrect year. You have ${n} attempt${n > 1 ? "s" : ""} left.`,
    yearLocked: "For your security, signing in with a year is suspended. A code has been sent to you by email.",
    error: "Something went wrong. Please try again in a moment.",
    badCode: "Incorrect or expired code. Please check it or ask for a new one.",
    emailIntro: "Enter your email address: we will send you a sign-in code.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    wait: "One moment…",
    getCode: "Get my code",
    unknown: "We don't know this address yet. Please enter your first name and surname.",
    firstName: "First name",
    lastName: "Surname",
    continue: "Continue",
    yearBefore: "Enter your ",
    yearStrong: "year of birth",
    meetingStrong: "year you met",
    yearAfter: " to sign in.",
    yearPlaceholder: "YYYY",
    yearLabel: "Year of birth",
    meetingLabel: "Year you met",
    checking: "Checking…",
    signIn: "Sign in",
    changeAddress: "Change address",
    codeInstead: "Get a code by email instead",
    pending1: "Your request has been sent to Sarah and Jordan.",
    pending2: "You will receive an email as soon as it is accepted; you can then sign in with this address.",
    codeBefore: "Enter the code sent to ",
    codeAfter: ". It is valid for 15 minutes.",
    codeLabel: "6-digit code",
    resend: "Send a new code",
    back: "← Back",
  },
}

const input = "w-full border-b bg-transparent py-2 text-base outline-none sm:text-sm focus:border-[var(--p-accent)]"
const primary = "w-full py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-40"

/**
 * Identification (CDCF ACC-01..03) : e-mail → (prénom/nom si inconnu) → code à 6 chiffres.
 * Liste blanche : e-mail → année de naissance au lieu du code (2 erreurs → code par mail).
 * Aucun compte n'est créé par le navigateur (shouldCreateUser: false) : c'est gallery-identify qui décide.
 */
export function LoginScreen({ mode, onToggleMode, compact = false, source = "photos", lang = "fr", subtitle }: {
  mode: ColorMode
  onToggleMode: () => void
  /** Langue des textes (anglais : invitation des invités anglophones). */
  lang?: "fr" | "en"
  /** Sous-titre au-dessus des prénoms (invitation) ; sinon celui de l'interface. */
  subtitle?: string
  /**
   * Interface d'où l'invité se connecte (mêmes comptes) : adapte l'e-mail du code
   * et les e-mails envoyés aux administrateurs (gallery-identify).
   */
  source?: "photos" | "invitation"
  /** Encart (Paramètres) : hauteur réduite, sans bascule clair / sombre. */
  compact?: boolean
}) {
  // Invitation : bouton à contour or mat (rempli au survol), comme les autres écrans ; galerie : bouton plein.
  const t = TEXTS[lang]
  const outlined = source === "invitation"
  const btnClass = outlined ? `${primary} border transition-colors hover:bg-[var(--p-accent)]! hover:text-white!` : `${primary} text-white`
  const btnStyle: React.CSSProperties = outlined
    ? { border: "1px solid var(--p-accent)", color: "var(--p-accent)", background: "transparent", borderRadius: "var(--p-radius)" }
    : { background: "var(--p-accent)", borderRadius: "var(--p-radius)" }
  const [step, setStep] = useState<Step>("email")
  // Retour au zoom normal à chaque étape (e-mail → nom → code), après la saisie au clavier.
  useResetZoomOn(step)
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [code, setCode] = useState("")
  const [year, setYear] = useState("")
  // Année demandée : de naissance (invités) ou de rencontre (dérogation administrateur).
  const [yearKind, setYearKind] = useState<"birth" | "meeting">("birth")
  // Message affiché au-dessus du code (ex. bascule sur le mail après 2 années incorrectes).
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode() {
    const { error: otpError } = await galleryClient!.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })
    if (otpError) {
      setError(otpError.status === 429
        ? t.tooMany
        : t.sendFailed)
      return
    }
    setStep("code")
  }

  async function identify(withName: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await callGalleryFunction<IdentifyResult>("gallery-identify", {
        email, source, ...(withName ? { firstName, lastName } : {}),
      })
      if (res.status === "ready" && res.yearLogin) { setYear(""); setYearKind(res.yearKind ?? "birth"); setStep("year") }
      else if (res.status === "ready") await sendCode()
      else if (res.status === "need_name") setStep("name")
      else setStep("pending")
    } catch {
      setError(t.errorAddress)
    } finally {
      setBusy(false)
    }
  }

  async function verifyYear() {
    setBusy(true)
    setError(null)
    try {
      const res = await callGalleryFunction<IdentifyResult>("gallery-identify", { email, birthYear: Number(year), source })
      if (res.status === "signed") {
        const { error: verifyError } = await galleryClient!.auth.verifyOtp({ token_hash: res.tokenHash, type: "magiclink" })
        if (verifyError) setError(t.loginFailed)
      } else if (res.status === "wrong_year") {
        setYear("")
        setError(t.wrongYear(res.remaining))
      } else {
        // Bloqué (2 erreurs) ou plus sur liste blanche : code par mail.
        setNotice(res.status === "locked" ? t.yearLocked : null)
        await sendCode()
      }
    } catch {
      setError(t.error)
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
    if (verifyError) setError(t.badCode)
  }

  return (
    <div className={`relative flex flex-col items-center justify-center px-6 py-10 ${compact ? "min-h-[26rem]" : "min-h-svh"}`}>
      {!compact && source !== "invitation" && <ModeToggle mode={mode} onToggle={onToggleMode} className="absolute right-4 top-4" />}
      <div className="w-full max-w-sm space-y-6">
        <Masthead compact subtitle={source === "invitation" ? subtitle ?? INVITATION_SUBTITLE : undefined} gilded={source === "invitation"} />

        {step === "email" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void identify(false) }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              {t.emailIntro}
            </p>
            <label className="block">
              <span className="sr-only">{t.emailLabel}</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder} className={input} style={{ borderColor: "var(--p-line)" }} />
            </label>
            <button type="submit" disabled={busy || !email.trim()} className={btnClass}
              style={btnStyle}>
              {busy ? t.wait : t.getCode}
            </button>
          </form>
        )}

        {step === "name" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void identify(true) }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              {t.unknown}
            </p>
            <input required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              placeholder={t.firstName} aria-label={t.firstName} className={input} style={{ borderColor: "var(--p-line)" }} />
            <input required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)}
              placeholder={t.lastName} aria-label={t.lastName} className={input} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" disabled={busy || !firstName.trim() || !lastName.trim()} className={btnClass}
              style={btnStyle}>
              {busy ? t.wait : t.continue}
            </button>
            <BackLink onClick={() => setStep("email")} label={t.back} />
          </form>
        )}

        {step === "year" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void verifyYear() }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              {t.yearBefore}<b style={{ color: "var(--p-fg)" }}>{yearKind === "meeting" ? t.meetingStrong : t.yearStrong}</b>{t.yearAfter}
            </p>
            <input inputMode="numeric" autoComplete="off" maxLength={4} required value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder={t.yearPlaceholder} aria-label={yearKind === "meeting" ? t.meetingLabel : t.yearLabel}
              className={`${input} text-center text-2xl tracking-[0.5em]`} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" disabled={busy || year.length !== 4} className={btnClass}
              style={btnStyle}>
              {busy ? t.checking : t.signIn}
            </button>
            <div className="flex justify-between text-xs" style={{ color: "var(--p-muted)" }}>
              <button type="button" className="underline" onClick={() => { setError(null); setStep("email") }}>{t.changeAddress}</button>
              <button type="button" className="underline" disabled={busy} onClick={() => { setError(null); setNotice(null); void sendCode() }}>
                {t.codeInstead}
              </button>
            </div>
          </form>
        )}

        {step === "pending" && (
          <div className="space-y-4 text-sm">
            <p>{t.pending1}</p>
            <p style={{ color: "var(--p-muted)" }}>
              {t.pending2}
            </p>
            <BackLink onClick={() => setStep("email")} label={t.back} />
          </div>
        )}

        {step === "code" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void verify() }}>
            {notice && <p className="text-sm">{notice}</p>}
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              {t.codeBefore}<b style={{ color: "var(--p-fg)" }}>{email}</b>{t.codeAfter}
            </p>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" aria-label={t.codeLabel}
              className={`${input} text-center text-2xl tracking-[0.5em]`} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" disabled={busy || code.length !== 6} className={btnClass}
              style={btnStyle}>
              {busy ? t.checking : t.signIn}
            </button>
            <div className="flex justify-between text-xs" style={{ color: "var(--p-muted)" }}>
              <button type="button" className="underline" onClick={() => { setCode(""); setNotice(null); setStep("email") }}>{t.changeAddress}</button>
              <button type="button" className="underline" disabled={busy} onClick={() => void sendCode()}>{t.resend}</button>
            </div>
          </form>
        )}

        {error && <p role="alert" className="text-sm" style={{ color: "var(--p-accent)" }}>{error}</p>}
      </div>
    </div>
  )
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="text-xs underline" style={{ color: "var(--p-muted)" }}>
      {label}
    </button>
  )
}
