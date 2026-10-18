import { useEffect } from "react"

/**
 * Remet le zoom de la page à 100 % (Safari iOS ne dézoome pas seul après la saisie dans un champ).
 * Le zoom est bloqué un court instant (maximum-scale=1), ce qui force le retour à l'échelle 1,
 * puis libéré : l'invité peut toujours zoomer volontairement ensuite.
 */
export function resetZoom(): void {
  if (typeof document === "undefined") return
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!meta) return
  const original = meta.content
  meta.content = `${original.replace(/,?\s*maximum-scale=[^,]*/g, "")}, maximum-scale=1`
  window.setTimeout(() => { meta.content = original }, 400)
}

/** Remet le zoom à 100 % chaque fois que `screenKey` change (changement d'écran ou d'étape). */
export function useResetZoomOn(screenKey: string): void {
  useEffect(() => { resetZoom() }, [screenKey])
}
