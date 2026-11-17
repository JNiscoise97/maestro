import { useInvitationLang } from "@/context/InvitationLangContext"
import { MATTE_GOLD } from "@/features/gallery/gilded"

/**
 * Sélecteur FR | EN de l'invitation. Le choix est mémorisé sur l'appareil et l'emporte sur la langue
 * réglée dans la fiche de l'invité. tone : "dark" sur fond clair, "light" sur photo (texte blanc).
 */
export function LangSwitch({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const { lang, choose } = useInvitationLang()
  const idle = tone === "light" ? "rgba(255,255,255,.75)" : "var(--p-muted)"
  const active = tone === "light" ? "#fff" : MATTE_GOLD
  return (
    <div role="radiogroup" aria-label={lang === "en" ? "Language" : "Langue"}
      className={`flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] ${className}`}>
      {(["fr", "en"] as const).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden style={{ color: idle }}>|</span>}
          <button type="button" role="radio" aria-checked={lang === l} lang={l} onClick={() => choose(l)}
            aria-label={l === "fr" ? "Français" : "English"}
            className="px-1 py-0.5 transition-colors"
            style={{ color: lang === l ? active : idle, fontWeight: lang === l ? 600 : 400, borderBottom: `1px solid ${lang === l ? active : "transparent"}` }}>
            {l}
          </button>
        </span>
      ))}
    </div>
  )
}
