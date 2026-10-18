import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  KEYS, useAdminDelete, useAdminInsert, useAdminUpdate, useAlbums, useConsentVersions, useGallerySettings, useReportReasons,
} from "@/features/gallery/api"
import { SCROLL_MODE_LABELS, THEME_LABELS } from "@/features/gallery/theme"
import type { GalleryScrollMode, GallerySettings, GalleryTheme } from "@/features/gallery/types"

/** Réglages et interrupteurs (CDCF ADM-04, DL-04, ARC-01, CONF-01, MOD-02, NAV-04). */
export function SettingsAdmin() {
  const { data: settings } = useGallerySettings()
  if (!settings) return <p className="text-sm text-muted-foreground">Chargement…</p>
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SwitchesCard settings={settings} />
      <PresentationCard key={settings.updated_at} settings={settings} />
      <ConsentCard />
      <ReasonsCard />
      <AlbumsCard />
    </div>
  )
}

function useSaveSettings() {
  const update = useAdminUpdate("settings", [[...KEYS.settings]])
  return (patch: Partial<GallerySettings>) =>
    update.mutate({ match: { id: 1 }, patch: { ...patch, updated_at: new Date().toISOString() } }, {
      onError: () => toast.error("Réglage non enregistré."),
    })
}

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "")
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null)

function SwitchesCard({ settings }: { settings: GallerySettings }) {
  const save = useSaveSettings()
  const rows: { key: keyof GallerySettings; label: string; hint?: string }[] = [
    { key: "gallery_open", label: "Galerie ouverte aux invités", hint: "Fermée : plus aucune photo n'est accessible aux invités." },
    { key: "download_normal_enabled", label: "Téléchargement qualité normale" },
    { key: "download_hd_enabled", label: "Téléchargement HD (original)" },
    { key: "reactions_enabled", label: "Réactions" },
    { key: "comments_enabled", label: "Commentaires" },
    { key: "auto_link_known_names", label: "Rattachement automatique par nom/prénom", hint: "Ouvre l'accès sans validation quand le nom correspond à un invité (alerte envoyée). Risque : un nom se devine." },
  ]
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Accès et fonctions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <label key={r.key} className="flex items-start justify-between gap-3 text-sm">
            <span>{r.label}{r.hint && <span className="block text-xs text-muted-foreground">{r.hint}</span>}</span>
            <Switch checked={Boolean(settings[r.key])} onCheckedChange={(v) => save({ [r.key]: v })} />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">Ces interrupteurs sont appliqués par le serveur, pas seulement à l'affichage.</p>
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
          <label className="space-y-1">Ouverture le
            <Input type="datetime-local" defaultValue={toLocal(settings.opens_at)} onBlur={(e) => save({ opens_at: fromLocal(e.target.value) })} />
          </label>
          <label className="space-y-1">Fermeture le
            <Input type="datetime-local" defaultValue={toLocal(settings.closes_at)} onBlur={(e) => save({ closes_at: fromLocal(e.target.value) })} />
          </label>
          <label className="space-y-1">Alerte téléchargements / 24 h
            <Input type="number" min={1} defaultValue={settings.download_alert_threshold}
              onBlur={(e) => save({ download_alert_threshold: Math.max(1, Number(e.target.value) || 60) })} />
          </label>
          <label className="space-y-1">Alerte appareils / 24 h
            <Input type="number" min={2} defaultValue={settings.unusual_login_devices}
              onBlur={(e) => save({ unusual_login_devices: Math.max(2, Number(e.target.value) || 4) })} />
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

function PresentationCard({ settings }: { settings: GallerySettings }) {
  const save = useSaveSettings()
  const [welcome, setWelcome] = useState(settings.welcome_text)
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Présentation</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <label className="block space-y-1">Direction artistique
          <select className="w-full rounded-md border border-input bg-background px-2 py-1.5" value={settings.theme}
            onChange={(e) => save({ theme: e.target.value as GalleryTheme })}>
            {(Object.keys(THEME_LABELS) as GalleryTheme[]).map((k) => <option key={k} value={k}>{THEME_LABELS[k]}</option>)}
          </select>
        </label>
        <label className="block space-y-1">Défilement de l'accueil
          <select className="w-full rounded-md border border-input bg-background px-2 py-1.5" value={settings.scroll_mode}
            onChange={(e) => save({ scroll_mode: e.target.value as GalleryScrollMode })}>
            {(Object.keys(SCROLL_MODE_LABELS) as GalleryScrollMode[]).map((k) => <option key={k} value={k}>{SCROLL_MODE_LABELS[k]}</option>)}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">Comparez d'abord les combinaisons sur <a className="underline" href="/photos/prototype" target="_blank" rel="noreferrer">le prototype</a>.</p>
        <label className="block space-y-1">Texte d'accueil
          <Textarea rows={5} value={welcome} onChange={(e) => setWelcome(e.target.value)} />
        </label>
        <Button size="sm" onClick={() => save({ welcome_text: welcome })} disabled={welcome === settings.welcome_text}>Enregistrer le texte</Button>
      </CardContent>
    </Card>
  )
}

const CONSENT_TEMPLATE = `— Ces photos sont privées : elles sont partagées avec nos proches uniquement.
— Merci de ne pas les diffuser ni les repartager (réseaux sociaux, messageries…) sans notre accord.
— Les téléchargements se font une photo à la fois, pour votre usage personnel.
— Si une photo vous concerne et vous dérange, signalez-la : elle sera masquée aussitôt.
— Vos actions utiles (connexions, réactions, commentaires, téléchargements) sont enregistrées.

[À compléter : finalités, durées de conservation et droits sur vos données.]`

function ConsentCard() {
  const { data: versions = [] } = useConsentVersions()
  const publish = useAdminInsert("consent_versions", [["gal"]])
  const current = versions[0]
  const [body, setBody] = useState("")
  const text = body || current?.body || CONSENT_TEMPLATE
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Engagement de confidentialité</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">
          {current ? `Version ${current.version} en vigueur depuis le ${new Date(current.published_at).toLocaleDateString("fr-FR")}.` : "Aucune version publiée : les invités ne peuvent pas encore voir les photos."}
          {" "}Publier une nouvelle version oblige chaque invité à l'accepter de nouveau.
        </p>
        <Textarea rows={10} value={text} onChange={(e) => setBody(e.target.value)} />
        <Button size="sm" disabled={publish.isPending || !text.trim() || text === current?.body} onClick={() => {
          if (!window.confirm("Publier cette version ? Tous les invités devront l'accepter à leur prochaine visite.")) return
          publish.mutate({ version: (current?.version ?? 0) + 1, body: text.trim() }, {
            onSuccess: () => { setBody(""); toast.success("Nouvelle version publiée.") },
            onError: () => toast.error("Publication impossible."),
          })
        }}>Publier la version {(current?.version ?? 0) + 1}</Button>
      </CardContent>
    </Card>
  )
}

function ReasonsCard() {
  const { data: reasons = [] } = useReportReasons()
  const update = useAdminUpdate("report_reasons", [[...KEYS.reasons]])
  const insert = useAdminInsert("report_reasons", [[...KEYS.reasons]])
  const remove = useAdminDelete("report_reasons", [[...KEYS.reasons]])
  const [label, setLabel] = useState("")
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Motifs de signalement</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {reasons.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <Input defaultValue={r.label} onBlur={(e) => e.target.value.trim() && e.target.value !== r.label && update.mutate({ match: { id: r.id }, patch: { label: e.target.value.trim() } })} />
            <Switch checked={r.active} onCheckedChange={(v) => update.mutate({ match: { id: r.id }, patch: { active: v } })} title="Proposé aux invités" />
            <Button size="xs" variant="ghost" onClick={() => remove.mutate({ id: r.id })}>Retirer</Button>
          </div>
        ))}
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (!label.trim()) return
          insert.mutate({ label: label.trim(), sort_order: reasons.length })
          setLabel("")
        }}>
          <Input placeholder="Nouveau motif" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Button type="submit" size="sm" variant="outline">Ajouter</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AlbumsCard() {
  const { data: albums = [] } = useAlbums()
  const update = useAdminUpdate("albums", [[...KEYS.albums]])
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Albums</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {albums.map((a, i) => (
          <div key={a.id} className="flex items-center gap-2">
            <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
            <Input defaultValue={a.name} onBlur={(e) => e.target.value.trim() && e.target.value !== a.name && update.mutate({ match: { id: a.id }, patch: { name: e.target.value.trim() } })} />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" title="Visible des invités">
              <Switch checked={!a.hidden} onCheckedChange={(v) => update.mutate({ match: { id: a.id }, patch: { hidden: !v } }, {
                onSuccess: () => toast.success(v ? `« ${a.name} » est visible des invités.` : `« ${a.name} » est masquée aux invités.`),
              })} />
              {a.hidden ? "Masquée" : "Visible"}
            </label>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Chaque photo appartient à un seul album ; l'ordre interne suit la date de prise de vue. Une catégorie masquée disparaît
          pour les invités (accueil, albums, recherche, favoris, téléchargements) ; vous continuez à la voir.
        </p>
      </CardContent>
    </Card>
  )
}
