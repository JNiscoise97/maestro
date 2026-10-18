import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  KEYS, updatePhoto, useAdminComments, useAdminDelete, useAdminUpdate, useMembers, usePhotos, useReports, useSignedUrls,
} from "@/features/gallery/api"
import type { GalleryReport } from "@/features/gallery/types"
import { memberName } from "./format"

/**
 * Modération (CDCF MOD-03..06, SOC-02) : signalements (maintenir le retrait, restaurer, supprimer
 * → corbeille) et commentaires (masquer / supprimer sans toucher à la photo).
 */
export function ModerationAdmin() {
  const qc = useQueryClient()
  const { data: reports = [] } = useReports()
  const { data: photos = [] } = usePhotos()
  const { data: members = [] } = useMembers()
  const { data: comments = [] } = useAdminComments()
  const updateReport = useAdminUpdate("reports", [[...KEYS.photos]])
  const updateComment = useAdminUpdate("comments")
  const deleteComment = useAdminDelete("comments")

  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos])
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const open = reports.filter((r) => r.status === "open")
  const { data: urls } = useSignedUrls(open.map((r) => photoById.get(r.photo_id)?.thumb_path).filter((p): p is string => !!p))

  async function decide(report: GalleryReport, decision: "maintained" | "restored" | "deleted") {
    try {
      const status = decision === "restored" ? "visible" : decision === "deleted" ? "trashed" : "hidden"
      await updatePhoto(report.photo_id, { status, ...(decision === "deleted" ? { home_rank: null } : {}) })
      // Tous les signalements ouverts de la photo reçoivent la même décision.
      for (const r of open.filter((x) => x.photo_id === report.photo_id)) {
        await updateReport.mutateAsync({ match: { id: r.id }, patch: { status: decision, decided_at: new Date().toISOString() } })
      }
      await qc.invalidateQueries({ queryKey: KEYS.photos })
      toast.success(decision === "restored" ? "Photo restaurée avec ses réactions et commentaires." : decision === "deleted" ? "Photo placée dans la corbeille." : "Retrait maintenu.")
    } catch {
      toast.error("Décision non enregistrée.")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Signalements ouverts ({open.length})</CardTitle></CardHeader>
        <CardContent>
          {open.length === 0 ? <p className="text-sm text-muted-foreground">Aucun signalement en attente.</p> : (
            <ul className="divide-y divide-border">
              {open.map((r) => {
                const photo = photoById.get(r.photo_id)
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <div className="flex size-16 items-center justify-center overflow-hidden rounded bg-muted">
                      {photo && urls?.get(photo.thumb_path) && <img src={urls.get(photo.thumb_path)} alt={photo.code} className="max-h-full max-w-full object-contain" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <b>{photo?.code ?? "?"}</b> — {r.reasons.join(", ")}{!r.for_self && " (pour autrui)"}
                      <div className="text-xs text-muted-foreground">
                        par {memberName(memberById.get(r.reporter_id))} · {new Date(r.created_at).toLocaleString("fr-FR")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => void decide(r, "maintained")}>Maintenir le retrait</Button>
                      <Button size="sm" variant="outline" onClick={() => void decide(r, "restored")}>Restaurer</Button>
                      <Button size="sm" variant="destructive" onClick={() => void decide(r, "deleted")}>Supprimer</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {reports.some((r) => r.status !== "open") && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">Historique des décisions</summary>
              <ul className="mt-2 space-y-1 text-xs">
                {reports.filter((r) => r.status !== "open").map((r) => (
                  <li key={r.id}>
                    {photoById.get(r.photo_id)?.code ?? "?"} — {r.reasons.join(", ")} — <b>{{ maintained: "retrait maintenu", restored: "restaurée", deleted: "supprimée", open: "" }[r.status]}</b>
                    {r.decided_at && ` le ${new Date(r.decided_at).toLocaleDateString("fr-FR")}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Commentaires ({comments.length})</CardTitle></CardHeader>
        <CardContent>
          {comments.length === 0 ? <p className="text-sm text-muted-foreground">Aucun commentaire.</p> : (
            <ul className="divide-y divide-border">
              {comments.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {photoById.get(c.photo_id)?.code ?? "?"} · {memberName(memberById.get(c.member_id))} · {new Date(c.created_at).toLocaleString("fr-FR")}
                      {c.updated_at !== c.created_at && " · modifié"}
                      {c.hidden && <Badge className="ml-2 bg-bordeaux/10 text-bordeaux">masqué</Badge>}
                    </div>
                    <p className="whitespace-pre-line">{c.body}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="xs" variant="outline" onClick={() => updateComment.mutate({ match: { id: c.id }, patch: { hidden: !c.hidden } })}>
                      {c.hidden ? "Réafficher" : "Masquer"}
                    </Button>
                    <Button size="xs" variant="ghost" className="text-bordeaux" onClick={() => { if (window.confirm("Supprimer ce commentaire ?")) deleteComment.mutate({ id: c.id }) }}>
                      Supprimer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
