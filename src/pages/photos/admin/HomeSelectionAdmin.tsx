import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { X } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KEYS, setHomeSelection, usePhotos, useSignedUrls } from "@/features/gallery/api"
import type { GalleryPhoto } from "@/features/gallery/types"

/**
 * Sélection d'accueil (CDCF NAV-02) : jusqu'à 50 photos, ordre libre par glisser-déposer.
 * Les photos s'ajoutent depuis l'onglet Photos (étoile). Une photo masquée reste dans la liste
 * mais n'apparaît pas aux invités : la sélection peut donc compter moins de 50 photos visibles.
 */
export function HomeSelectionAdmin() {
  const qc = useQueryClient()
  const { data: photos = [] } = usePhotos()
  const selection = useMemo(
    () => photos.filter((p) => p.home_rank !== null).sort((a, b) => a.home_rank! - b.home_rank!),
    [photos],
  )
  const { data: urls } = useSignedUrls(selection.map((p) => p.thumb_path))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  async function save(ids: string[]) {
    // Affichage immédiat du nouvel ordre, puis enregistrement atomique.
    qc.setQueryData<GalleryPhoto[]>(KEYS.photos, (prev) => (prev ?? []).map((p) => {
      const i = ids.indexOf(p.id)
      return { ...p, home_rank: i === -1 ? null : i + 1 }
    }))
    try { await setHomeSelection(ids) } catch { toast.error("Enregistrement impossible.") }
    await qc.invalidateQueries({ queryKey: KEYS.photos })
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const ids = selection.map((p) => p.id)
    void save(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))))
  }

  const visibleCount = selection.filter((p) => p.status === "visible").length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sélection d'accueil — {visibleCount} visible{visibleCount > 1 ? "s" : ""} / {selection.length} (max. 50)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Glissez pour réordonner. Ajoutez des photos avec l'étoile dans l'onglet Photos.
          Les comptes en « accès limité » (onglet Accès) ne voient que ces photos.
        </p>
      </CardHeader>
      <CardContent>
        {selection.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune photo sélectionnée.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={selection.map((p) => p.id)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                {selection.map((p, i) => (
                  <Tile key={p.id} photo={p} rank={i + 1} url={urls?.get(p.thumb_path)}
                    onRemove={() => void save(selection.filter((x) => x.id !== p.id).map((x) => x.id))} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}

function Tile({ photo, rank, url, onRemove }: { photo: GalleryPhoto; rank: number; url?: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="relative cursor-grab touch-none rounded border border-border bg-card p-1 text-[10px]" {...attributes} {...listeners}>
      <div className={`flex aspect-square items-center justify-center overflow-hidden rounded bg-muted ${photo.status !== "visible" ? "opacity-40" : ""}`}>
        {url && <img src={url} alt={photo.code} className="max-h-full max-w-full object-contain" draggable={false} />}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="tabular-nums">#{rank} · {photo.code}</span>
        <button type="button" aria-label="Retirer de l'accueil" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}>
          <X className="size-3" />
        </button>
      </div>
      {photo.status !== "visible" && <span className="absolute left-1 top-1 rounded bg-bordeaux px-1 text-white">masquée</span>}
    </li>
  )
}
