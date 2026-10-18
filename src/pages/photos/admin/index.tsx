import { NavLink, Route, Routes } from "react-router-dom"
import { Bell, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useAccessRequests, useAdminUpdate, useDownloads, useMembers, useNotifications, usePhotos, useReports,
} from "@/features/gallery/api"
import { AccessAdmin } from "./AccessAdmin"
import { ExportAdmin } from "./ExportAdmin"
import { HomeSelectionAdmin } from "./HomeSelectionAdmin"
import { JournalAdmin } from "./JournalAdmin"
import { LegacyImportAdmin } from "./LegacyImportAdmin"
import { ModerationAdmin } from "./ModerationAdmin"
import { PhotosAdmin } from "./PhotosAdmin"
import { SettingsAdmin } from "./SettingsAdmin"
import { UploadAdmin } from "./UploadAdmin"
import { notificationText } from "./format"

const TABS = [
  { to: "", label: "Tableau de bord" },
  { to: "upload", label: "Importer" },
  { to: "reprise", label: "Reprise ancien album" },
  { to: "photos", label: "Photos" },
  { to: "accueil", label: "Accueil (50)" },
  { to: "acces", label: "Accès" },
  { to: "moderation", label: "Modération" },
  { to: "journal", label: "Journal" },
  { to: "reglages", label: "Réglages" },
  { to: "export", label: "Archive" },
]

/** Espace d'administration réservé à Sarah et Jordan (CDCF ADM-01). */
export function GalleryAdmin() {
  const { data: requests = [] } = useAccessRequests()
  const { data: reports = [] } = useReports()
  const pending = requests.filter((r) => r.status === "pending").length
  const open = reports.filter((r) => r.status === "open").length

  return (
    <div className="min-h-svh bg-background font-sans text-foreground">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <nav className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to ? `/photos/admin/${t.to}` : "/photos/admin"} end
              className={({ isActive }) => `rounded-full border px-3 py-1 text-sm transition-colors ${isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30"}`}>
              {t.label}
              {t.to === "acces" && pending > 0 && <span className="ml-1.5 rounded-full bg-corail px-1.5 text-xs text-white">{pending}</span>}
              {t.to === "moderation" && open > 0 && <span className="ml-1.5 rounded-full bg-bordeaux px-1.5 text-xs text-white">{open}</span>}
            </NavLink>
          ))}
        </nav>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<UploadAdmin />} />
          <Route path="reprise" element={<LegacyImportAdmin />} />
          <Route path="photos" element={<PhotosAdmin />} />
          <Route path="accueil" element={<HomeSelectionAdmin />} />
          <Route path="acces" element={<AccessAdmin />} />
          <Route path="moderation" element={<ModerationAdmin />} />
          <Route path="journal" element={<JournalAdmin />} />
          <Route path="reglages" element={<SettingsAdmin />} />
          <Route path="export" element={<ExportAdmin />} />
        </Routes>
      </div>
    </div>
  )
}

function Dashboard() {
  const { data: photos = [] } = usePhotos()
  const { data: members = [] } = useMembers()
  const { data: downloads = [] } = useDownloads()
  const { data: notifications = [] } = useNotifications()
  const markRead = useAdminUpdate("notifications")

  const unread = notifications.filter((n) => !n.read_at)
  const stats = [
    { label: "Photos visibles", value: photos.filter((p) => p.status === "visible").length },
    { label: "Photos masquées", value: photos.filter((p) => p.status === "hidden").length },
    { label: "Sélection d'accueil", value: `${photos.filter((p) => p.home_rank !== null && p.status === "visible").length} / 50` },
    { label: "Comptes actifs", value: members.filter((m) => m.status === "active").length },
    { label: "Téléchargements (normal / HD)", value: `${downloads.filter((d) => d.quality === "normal").length} / ${downloads.filter((d) => d.quality === "hd").length}` },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4" /> Alertes ({unread.length} non lues)</CardTitle>
          {unread.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => unread.forEach((n) => markRead.mutate({ match: { id: n.id }, patch: { read_at: new Date().toISOString() } }))}>
              Tout marquer comme lu
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte.</p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.slice(0, 50).map((n) => (
                <li key={n.id} className={`flex items-start justify-between gap-3 py-2 text-sm ${n.read_at ? "text-muted-foreground" : ""}`}>
                  <span>
                    <span className="mr-2 text-xs tabular-nums text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</span>
                    {notificationText(n)}
                  </span>
                  {!n.read_at && (
                    <button type="button" aria-label="Marquer comme lu" title="Marquer comme lu"
                      onClick={() => markRead.mutate({ match: { id: n.id }, patch: { read_at: new Date().toISOString() } })}>
                      <Check className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
