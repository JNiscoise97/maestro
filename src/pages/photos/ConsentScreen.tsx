import { useState } from "react"

import { useAcceptConsent } from "@/features/gallery/api"
import type { ConsentVersion } from "@/features/gallery/types"
import { Masthead } from "./GalleryChrome"

/**
 * Engagement de confidentialité (CDCF CONF-01/02) : fenêtre avec case à cocher, imposée à la
 * première connexion puis à chaque nouvelle version. Derrière, aucune photo n'est chargée : le
 * serveur les refuse tant que l'engagement en vigueur n'est pas accepté (acceptation horodatée en base).
 */
export function ConsentScreen({ memberId, consent, onSignOut }: {
  memberId: string
  consent: ConsentVersion
  onSignOut: () => void
}) {
  const [checked, setChecked] = useState(false)
  const accept = useAcceptConsent(memberId)

  return (
    <div className="relative min-h-svh">
      <div aria-hidden className="pointer-events-none select-none opacity-40 blur-[2px]"><Masthead /></div>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
        role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <div className="max-h-full w-full max-w-md space-y-5 overflow-y-auto p-6 shadow-2xl sm:p-8"
          style={{ background: "var(--p-surface)", color: "var(--p-fg)", border: "1px solid var(--p-line)" }}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: "var(--p-gold, var(--p-accent))" }}>
              {consent.version > 1 ? "Nos règles ont changé" : "Avant de commencer"}
            </p>
            <h2 id="consent-title" className="mt-2 text-2xl font-light uppercase tracking-[0.12em]" style={{ fontFamily: "var(--p-heading)" }}>
              Nos règles
            </h2>
          </div>
          <div className="max-h-[40svh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--p-muted)" }}>
            {consent.body}
          </div>
          <label className="flex cursor-pointer items-start gap-3 border p-3 text-sm transition-colors"
            style={{ borderColor: checked ? "var(--p-accent-2, var(--p-accent))" : "var(--p-line)" }}>
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4 shrink-0"
              style={{ accentColor: "var(--p-accent-2, var(--p-accent))" }} />
            <span>J'ai lu ces règles et je m'engage à les respecter.</span>
          </label>
          <button type="button" disabled={!checked || accept.isPending} onClick={() => accept.mutate(consent.version)}
            className="w-full py-3 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-40"
            style={{ background: "var(--p-accent)", borderRadius: "var(--p-radius)" }}>
            Voir les photos
          </button>
          {accept.isError && <p role="alert" className="text-sm" style={{ color: "var(--p-accent)" }}>L'enregistrement a échoué, réessayez.</p>}
          <button type="button" onClick={onSignOut} className="w-full text-xs underline" style={{ color: "var(--p-muted)" }}>
            Se déconnecter
          </button>
          <p className="text-center text-[10px]" style={{ color: "var(--p-muted)" }}>
            Version {consent.version} du {new Date(consent.published_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>
    </div>
  )
}
