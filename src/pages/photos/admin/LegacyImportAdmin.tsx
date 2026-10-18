import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, Pause, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { KEYS, useAlbums } from "@/features/gallery/api"
import { importLegacyOriginal, type ImportResult } from "@/features/gallery/import"
import { albumService } from "@/services/supabase/album"
import { supabase } from "@/supabase/client"

/** Ancien album : originaux dans album-photos/full-size/, versions 1500 px de la séquence « Fiançailles ». */
const LEGACY_BUCKET = "album-photos"
const LEGACY_FOLDER = "full-size"
const LEGACY_SEQUENCE_ID = "1a2e3bdf-ec22-4263-9bf8-8fe9de5fb576"
const PARALLEL = 3

type Legacy = { filename: string; path: string; size: number; originalUrl: string; baseUrl?: string; num: number | null }

/** Plages par défaut (données par Sarah et Jordan le 18/10/2026), modifiables à l'écran. */
const DEFAULT_RANGES: Record<string, string> = {
  "Préparation": "1-30",
  "Cérémonie": "31-45",
  "Les fiancés": "46-54, 87-101",
  "Photos de groupe": "55-86, 102, 111-120",
  "Soirée": "103-110, 120-800",
}
const RANGES_KEY = "sj-galerie-reprise-plages"

/** « 46-54, 87-101, 102 » → [[46, 54], [87, 101], [102, 102]] ; les morceaux illisibles sont signalés. */
function parseRanges(text: string): { ranges: [number, number][]; invalid: string[] } {
  const ranges: [number, number][] = []
  const invalid: string[] = []
  for (const part of text.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*(?:[-–à]\s*(\d+))?$/)
    if (!m) { invalid.push(part); continue }
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    ranges.push([Math.min(a, b), Math.max(a, b)])
  }
  return { ranges, invalid }
}

function loadSavedRanges(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(RANGES_KEY) ?? "{}") } catch { return {} }
}

/** Numéro du photographe dans le nom de fichier (« S&J685.jpg » → 685). */
function photographerNumber(filename: string): number | null {
  const m = filename.match(/(\d+)(?!.*\d)/)
  return m ? Number(m[1]) : null
}

/**
 * Reprise de l'ancien album : les originaux de « album-photos/full-size/ » sont copiés côté serveur
 * dans la galerie privée (medium-size et mini-size générés), dans l'ordre du photographe, et réparties en catégories par plages de numéros.
 * Réexécutable : les photos déjà reprises sont reconnues (même fichier) et ignorées.
 */
export function LegacyImportAdmin() {
  const qc = useQueryClient()
  const { data: albums = [] } = useAlbums()
  const { data: legacy = [], isLoading } = useQuery({
    queryKey: ["gal", "legacy", LEGACY_BUCKET, LEGACY_FOLDER],
    queryFn: async (): Promise<Legacy[]> => {
      // Originaux du photographe.
      const bucket = supabase!.storage.from(LEGACY_BUCKET)
      const objects: { name: string; id: string | null; metadata: { size?: number } | null }[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await bucket.list(LEGACY_FOLDER, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } })
        if (error) throw error
        objects.push(...(data ?? []))
        if ((data?.length ?? 0) < 1000) break
      }
      // Versions déjà compressées (1500 px) : base légère pour générer medium et mini.
      const compressed = new Map((await albumService.listPhotos(LEGACY_SEQUENCE_ID)).map((r) => [r.filename, r.url]))
      return objects
        .filter((o) => o.id && /\.(jpe?g|png|webp)$/i.test(o.name))
        .map((o) => {
          const path = `${LEGACY_FOLDER}/${o.name}`
          return {
            filename: o.name, path, size: o.metadata?.size ?? 0,
            originalUrl: bucket.getPublicUrl(path).data.publicUrl,
            baseUrl: compressed.get(o.name),
            num: photographerNumber(o.name),
          }
        })
        .sort((a, b) => (a.num ?? Infinity) - (b.num ?? Infinity) || a.filename.localeCompare(b.filename, undefined, { numeric: true }))
    },
    enabled: !!supabase,
  })

  // Plages saisies, par nom de catégorie (mémorisées sur cet appareil).
  const [rangeText, setRangeText] = useState<Record<string, string>>(loadSavedRanges)
  const textFor = (name: string) => rangeText[name] ?? DEFAULT_RANGES[name] ?? ""
  function setText(name: string, value: string) {
    setRangeText((prev) => {
      const next = { ...prev, [name]: value }
      try { localStorage.setItem(RANGES_KEY, JSON.stringify(next)) } catch { /* stockage indisponible */ }
      return next
    })
  }
  const [fallback, setFallback] = useState("")
  const fallbackAlbum = fallback || albums[0]?.id || ""
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const [stats, setStats] = useState({ done: 0, imported: 0, duplicate: 0, error: 0 })
  const [errors, setErrors] = useState<{ file: string; message?: string }[]>([])
  const cursor = useRef(0)

  const parsed = useMemo(
    () => albums.map((a) => ({ id: a.id, name: a.name, ...parseRanges(rangeText[a.name] ?? DEFAULT_RANGES[a.name] ?? "") })),
    [albums, rangeText],
  )
  const inRanges = (num: number, ranges: [number, number][]) => ranges.some(([a, b]) => num >= a && num <= b)

  // Catégorie de chaque photo : la première catégorie (dans l'ordre) dont une plage contient son numéro,
  // sinon la catégorie « hors plages ».
  const albumFor = useMemo(() => (num: number | null) => {
    if (num !== null) {
      const hit = parsed.find((p) => inRanges(num, p.ranges))
      if (hit) return hit.id
    }
    return fallbackAlbum
  }, [parsed, fallbackAlbum])

  // Numéros présents dans plusieurs catégories : signalés, attribués à la première.
  const conflicts = useMemo(() => {
    const out: { num: number; names: string[] }[] = []
    for (const p of legacy) {
      if (p.num === null) continue
      const names = parsed.filter((c) => inRanges(p.num!, c.ranges)).map((c) => c.name)
      if (names.length > 1) out.push({ num: p.num, names })
    }
    return out
  }, [legacy, parsed])
  const outside = legacy.filter((p) => p.num === null || !parsed.some((c) => inRanges(p.num!, c.ranges)))

  const preview = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of legacy) counts.set(albumFor(p.num), (counts.get(albumFor(p.num)) ?? 0) + 1)
    return counts
  }, [legacy, albumFor])

  useEffect(() => {
    if (!running) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [running])

  async function lane() {
    while (runningRef.current && cursor.current < legacy.length) {
      const item = legacy[cursor.current++]
      const result: ImportResult = await importLegacyOriginal({
        bucket: LEGACY_BUCKET, path: item.path, filename: item.filename, size: item.size,
        originalUrl: item.originalUrl, baseUrl: item.baseUrl, albumId: albumFor(item.num),
      })
      setStats((s) => ({
        done: s.done + 1,
        imported: s.imported + (result.status === "imported" ? 1 : 0),
        duplicate: s.duplicate + (result.status === "duplicate" ? 1 : 0),
        error: s.error + (result.status === "error" ? 1 : 0),
      }))
      if (result.status === "error") setErrors((e) => [...e, { file: item.filename, message: result.message }])
    }
  }

  async function start() {
    if (cursor.current >= legacy.length) {
      // Relance complète : les photos déjà reprises seront reconnues comme doublons.
      cursor.current = 0
      setStats({ done: 0, imported: 0, duplicate: 0, error: 0 })
      setErrors([])
    }
    setRunning(true)
    runningRef.current = true
    await Promise.all(Array.from({ length: PARALLEL }, () => lane()))
    runningRef.current = false
    setRunning(false)
    await qc.invalidateQueries({ queryKey: KEYS.photos })
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Lecture de l'ancien album…</p>
  const nums = legacy.map((p) => p.num).filter((n): n is number => n !== null)
  const finished = stats.done === legacy.length && legacy.length > 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Reprise de l'ancien album</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <b>{legacy.length} originaux</b> trouvés dans <code>album-photos/full-size/</code>
            {nums.length > 0 && <>, numérotés de <b>{Math.min(...nums)}</b> à <b>{Math.max(...nums)}</b> par le photographe</>}
            {" "}({(legacy.reduce((s, p) => s + p.size, 0) / 1024 ** 3).toFixed(1)} Go).
          </p>
          <p className="text-xs text-muted-foreground">
            Les originaux sont copiés par le serveur, sans passer par votre connexion. Les versions medium et mini sont générées
            à partir des versions 1500 px de l'ancien album ({legacy.filter((p) => p.baseUrl).length} disponibles) ; pour les
            autres, l'original est téléchargé (environ 15 Mo chacun).
          </p>
          {legacy.some((p) => !p.baseUrl) && (
            <p className="flex items-start gap-1.5 rounded-lg bg-dore/15 p-2 text-xs text-brun">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
              {legacy.filter((p) => !p.baseUrl).length} original(aux) sans version compressée : {legacy.filter((p) => !p.baseUrl).map((p) => p.filename).slice(0, 12).join(", ")}
              {legacy.filter((p) => !p.baseUrl).length > 12 && "…"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Répartition par numéro du photographe</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            Une ou plusieurs plages par catégorie, séparées par des virgules : <code>46-54, 87-101</code> ou un numéro seul <code>102</code>.
          </p>
          {parsed.map((c) => (
            <div key={c.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-36 font-medium">{c.name}</span>
                <Input className="h-8 min-w-0 flex-1 font-mono" placeholder="ex. 1-30, 45" value={textFor(c.name)} disabled={running}
                  onChange={(e) => setText(c.name, e.target.value)} aria-label={`Plages de numéros pour ${c.name}`} />
                <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">→ {preview.get(c.id) ?? 0} photo(s)</span>
              </div>
              {c.invalid.length > 0 && (
                <p className="pl-38 text-xs text-bordeaux">Illisible : {c.invalid.join(", ")}</p>
              )}
            </div>
          ))}
          {conflicts.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg bg-bordeaux/10 p-2 text-xs text-bordeaux">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Numéro(s) dans plusieurs catégories, attribué(s) à la première de la liste :{" "}
                {conflicts.slice(0, 10).map((c) => `n°${c.num} (${c.names.join(" / ")} → ${c.names[0]})`).join(" ; ")}
                {conflicts.length > 10 && "…"}
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {outside.length} photo(s) hors plages
              {outside.length > 0 && outside.length <= 12 && ` (${outside.map((p) => p.num ?? p.filename).join(", ")})`}
              {outside.length > 12 && ` (n°${outside[0].num ?? "?"} … n°${outside[outside.length - 1].num ?? "?"})`} →
            </span>
            <select className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={fallbackAlbum} disabled={running}
              onChange={(e) => setFallback(e.target.value)}>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Les catégories restent modifiables photo par photo ensuite (onglet Photos).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Copie vers la galerie privée — {stats.done} / {legacy.length}</CardTitle>
            {running ? (
              <Button size="sm" variant="outline" onClick={() => { runningRef.current = false; setRunning(false) }}>
                <Pause className="size-3.5" /> Pause
              </Button>
            ) : (
              <Button size="sm" onClick={() => void start()} disabled={legacy.length === 0 || !fallbackAlbum}>
                <Play className="size-3.5" /> {stats.done > 0 && !finished ? "Reprendre" : finished ? "Relancer (vérification)" : "Lancer la reprise"}
              </Button>
            )}
          </div>
          <Progress value={legacy.length ? (stats.done / legacy.length) * 100 : 0} />
          <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
            <span className="text-vert-vegetal">{stats.imported} copiée(s)</span>
            <span>{stats.duplicate} déjà présente(s)</span>
            <span className="text-bordeaux">{stats.error} erreur(s)</span>
            {finished && <Link to="/photos/admin/photos" className="ml-auto underline">Voir les photos et choisir les couvertures →</Link>}
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">
            Pour chaque photo : l'original est copié dans <b>full-size/</b>, puis <b>medium-size/</b> et <b>mini-size/</b> sont
            générés. Gardez cette page ouverte pendant la copie. L'ancien album n'est pas modifié.
          </p>
          {errors.length > 0 && (
            <details>
              <summary className="cursor-pointer text-bordeaux">{errors.length} erreur(s) — relancez pour réessayer</summary>
              <ul className="mt-1 max-h-40 overflow-y-auto">
                {errors.map((e, i) => <li key={i}>{e.file} — {e.message}</li>)}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
