import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"

type Sized = { id: string; width: number; height: number }
type Cell<T> = { item: T; index: number; width: number; height: number }

/**
 * Grille « justifiée » (comme Google Photos) : les photos se lisent ligne par ligne, de gauche à
 * droite, dans l'ordre donné. Chaque ligne a une hauteur commune et occupe toute la largeur ;
 * les proportions sont respectées, sans recadrage (CDCF IMG-01). Ajouter des photos à la fin ne
 * modifie que la dernière ligne : ce qui est déjà affiché ne bouge pas.
 */
export function JustifiedGrid<T extends Sized>({ items, render, gap = 4 }: {
  items: T[]
  render: (item: T, index: number) => ReactNode
  gap?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Hauteur cible des lignes selon la largeur disponible (mobile → grand écran).
  const target = width < 480 ? 130 : width < 900 ? 180 : width < 1400 ? 220 : 260
  const rows = useMemo(() => layoutRows(items, width, target, gap), [items, width, target, gap])

  return (
    <div ref={ref} className="flex w-full flex-col" style={{ gap }}>
      {width > 0 && rows.map((row) => (
        <div key={row[0].item.id} className="flex" style={{ gap }}>
          {row.map((cell) => (
            <div key={cell.item.id} className="relative shrink-0 overflow-hidden" style={{ width: cell.width, height: cell.height }}>
              {render(cell.item, cell.index)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function layoutRows<T extends Sized>(items: T[], width: number, target: number, gap: number): Cell<T>[][] {
  if (width <= 0) return []
  const rows: Cell<T>[][] = []
  let row: { item: T; index: number; ratio: number }[] = []
  let ratioSum = 0

  const flush = (height: number) => {
    rows.push(row.map(({ item, index, ratio }) => ({ item, index, width: ratio * height, height })))
    row = []
    ratioSum = 0
  }

  items.forEach((item, index) => {
    const ratio = item.width / item.height
    row.push({ item, index, ratio })
    ratioSum += ratio
    const gaps = gap * (row.length - 1)
    // La ligne est pleine dès qu'à la hauteur cible elle dépasse la largeur : on l'ajuste exactement.
    if (ratioSum * target + gaps >= width) flush((width - gaps) / ratioSum)
  })
  // Dernière ligne incomplète : hauteur cible, sans étirement (ni dépassement).
  if (row.length) flush(Math.min(target, (width - gap * (row.length - 1)) / ratioSum))
  return rows
}
