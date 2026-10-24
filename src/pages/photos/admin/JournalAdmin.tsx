import { useMemo, useState } from "react"

import { useAdminNav } from "@/context/GalleryAdminNavContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useActivity, useMembers, usePhotos } from "@/features/gallery/api"
import { downloadText, EVENT_LABELS, memberName, toCsv } from "./format"

const EVENT_GROUPS: { value: string; label: string }[] = [
  { value: "", label: "Tous les événements" },
  { value: "login", label: "Connexions" },
  { value: "visit", label: "Visites" },
  { value: "photo_open", label: "Ouvertures de photos" },
  { value: "reaction", label: "Réactions" },
  { value: "comment", label: "Commentaires" },
  { value: "favorite", label: "Favoris" },
  { value: "download", label: "Téléchargements" },
  { value: "report", label: "Signalements et décisions" },
  { value: "admin", label: "Actions d'administration" },
]

/** Journal d'activité filtrable par personne, période, photo et type (CDCF ADM-02). */
export function JournalAdmin() {
  const { params } = useAdminNav()
  const [memberId, setMemberId] = useState(params.get("membre") ?? "")
  const [photoCode, setPhotoCode] = useState("")
  const [event, setEvent] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const { data: members = [] } = useMembers()
  const { data: photos = [] } = usePhotos()
  const photoByCode = useMemo(() => new Map(photos.map((p) => [p.code, p])), [photos])
  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos])
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const code = photoCode.trim().toUpperCase()
  const photoId = code ? photoByCode.get(code.startsWith("SJ-") ? code : `SJ-${code.padStart(4, "0")}`)?.id ?? "00000000-0000-0000-0000-000000000000" : undefined

  const { data: rows = [], isLoading } = useActivity({ memberId: memberId || undefined, photoId, event: event || undefined, from: from || undefined, to: to || undefined })

  function exportCsv() {
    downloadText(`journal-galerie-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([
      ["Date", "Personne", "Événement", "Photo", "Détails"],
      ...rows.map((r) => [
        new Date(r.created_at).toLocaleString("fr-FR"),
        memberName(r.member_id ? memberById.get(r.member_id) : null),
        EVENT_LABELS[r.event] ?? r.event,
        r.photo_id ? photoById.get(r.photo_id)?.code ?? "" : "",
        JSON.stringify(r.details),
      ]),
    ]))
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Journal d'activité</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>Exporter (CSV)</Button>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <select className="rounded-md border border-input bg-background px-2 py-1.5" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Toutes les personnes</option>
            {members.map((m) => <option key={m.id} value={m.id}>{memberName(m)}</option>)}
          </select>
          <select className="rounded-md border border-input bg-background px-2 py-1.5" value={event} onChange={(e) => setEvent(e.target.value)}>
            {EVENT_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <Input className="h-8 w-32" placeholder="Photo SJ-…" value={photoCode} onChange={(e) => setPhotoCode(e.target.value)} />
          <label className="flex items-center gap-1 text-xs">Du <Input type="date" className="h-8 w-36" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="flex items-center gap-1 text-xs">au <Input type="date" className="h-8 w-36" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement pour ces filtres.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-1">Date</th><th>Personne</th><th>Événement</th><th>Photo</th><th>Détails</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap py-1.5 text-xs tabular-nums">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                  <td>{memberName(r.member_id ? memberById.get(r.member_id) : null)}</td>
                  <td>{EVENT_LABELS[r.event] ?? r.event}</td>
                  <td className="tabular-nums">{r.photo_id ? photoById.get(r.photo_id)?.code ?? "—" : ""}</td>
                  <td className="max-w-xs truncate text-xs text-muted-foreground" title={JSON.stringify(r.details)}>
                    {Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length === 500 && <p className="mt-2 text-xs text-muted-foreground">500 derniers événements affichés : affinez les filtres.</p>}
      </CardContent>
    </Card>
  )
}
