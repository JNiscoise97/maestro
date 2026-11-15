import { MATTE_GOLD } from "@/features/gallery/gilded"
import { MAP_BASE, MAP_PINS } from "./places-map-data"

/**
 * Plan des lieux (rubrique « Les lieux ») : communes autour de Montpellier et une épingle dorée par lieu.
 * Seuls les lieux de l'invité sont épinglés ; le numéro de l'épingle est celui affiché à côté du nom du lieu.
 */

const LABEL_POS = {
  top: { x: 0, y: -19, anchor: "middle" },
  bottom: { x: 0, y: 26, anchor: "middle" },
  left: { x: -17, y: 5, anchor: "end" },
  right: { x: 17, y: 5, anchor: "start" },
} as const

/** placeIds : lieux de l'invité, dans l'ordre ; number : numéro de chaque lieu. */
export function PlacesMap({ placeIds, number }: { placeIds: string[]; number: Map<string, number> }) {
  const pins = placeIds.flatMap((id) => (MAP_PINS[id] ?? []).map((p) => ({ ...p, id, n: number.get(id) ?? 0 })))
  if (pins.length === 0) return null
  return (
    <figure className="mx-auto mb-12 max-w-2xl">
      <svg viewBox="0 0 640 458" role="img" aria-label="Plan des lieux autour de Montpellier" className="h-auto w-full"
        style={{ maskImage: "radial-gradient(ellipse 72% 70% at 50% 50%, #000 62%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 72% 70% at 50% 50%, #000 62%, transparent 100%)" }}>
        <style>{`
          .sjmap .com { fill: #fbf9f5; stroke: #e6dfd2; stroke-width: 1; }
          .sjmap .mtp { fill: #f4eee3; stroke: #d9cdb8; stroke-width: 1.2; }
          .sjmap .lab { fill: #b4aa99; font-size: 11px; text-anchor: middle; font-family: 'Cormorant Garamond', serif; letter-spacing: .04em; }
          .sjmap .lab.big { fill: #9a8f7c; font-size: 17px; font-style: italic; }
        `}</style>
        <g className="sjmap" dangerouslySetInnerHTML={{ __html: MAP_BASE }} />
        {pins.map((p) => {
          const l = LABEL_POS[p.side]
          return (
            <g key={`${p.id}-${p.label}`} transform={`translate(${p.x} ${p.y})`}>
              <circle r={13} fill={MATTE_GOLD} stroke="#fff" strokeWidth={2} style={{ filter: "drop-shadow(0 2px 2px rgba(70,52,25,.3))" }} />
              <text y={4.5} textAnchor="middle" fill="#fff" fontSize={12} fontFamily="'Cormorant Garamond', serif" fontWeight={600}>{p.n}</text>
              <text x={l.x} y={l.y} textAnchor={l.anchor} fill="#2e2a25" fontSize={14} fontFamily="'Cormorant Garamond', serif"
                stroke="#fff" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{p.label}</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/** Pastille numérotée à côté du nom d'un lieu (même numéro que l'épingle du plan). */
export function PinNumber({ n }: { n: number }) {
  return (
    <span aria-hidden className="mr-2 inline-flex size-6 items-center justify-center rounded-full align-middle text-xs font-semibold text-white"
      style={{ background: MATTE_GOLD, fontFamily: "var(--p-heading)" }}>
      {n}
    </span>
  )
}
