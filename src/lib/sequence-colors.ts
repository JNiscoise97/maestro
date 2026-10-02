/**
 * Couleurs des séquences : une couleur par séquence (colonne `color`, configurable
 * dans Paramètres › Séquences), réutilisée partout où le nom de la séquence apparaît.
 */

/** Palette proposée dans les paramètres, et couleur de repli tant qu'aucune n'est choisie. */
export const SEQUENCE_PALETTE = [
  "#2563eb", "#ca8a04", "#16a34a", "#0891b2", "#ea580c", "#db2777", "#7c3aed", "#0d9488", "#64748b",
] as const

/** Couleur d'une séquence : la sienne, sinon une couleur de la palette selon son ordre. */
export function sequenceColor(seq: { color?: string | null; sortOrder?: number | null }): string {
  if (seq.color) return seq.color
  const i = Math.abs(seq.sortOrder ?? 0) % SEQUENCE_PALETTE.length
  return SEQUENCE_PALETTE[i]
}

/** Couleur #RRGGBB avec transparence (fonds teintés). */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
