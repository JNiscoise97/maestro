// export_galerie.mjs — archive privée de la galerie (CDCF ARC-03, NF-09), indépendante du site.
//
// Usage (Node 18+, depuis le dossier du projet) :
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/export_galerie.mjs ./archive-galerie
//
// Produit :
//   <dossier>/<Album>/SJ-0001_<fichier original>   (originaux intacts, toutes photos sauf corbeille)
//   <dossier>/catalogue.json                        (identifiants, albums, ordre, accueil, statut)
// La clé service donne tous les droits : ne jamais la committer ni la partager.
import fs from "node:fs/promises"
import path from "node:path"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const out = process.argv[2] ?? "./archive-galerie"
if (!url || !key) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.")
  process.exit(1)
}
const headers = { apikey: key, Authorization: `Bearer ${key}` }

async function rest(table, query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: { ...headers, Range: `${from}-${from + 999}` } })
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < 1000) break
  }
  return rows
}

const albums = await rest("_20260725_gal_albums", "select=*&order=sort_order")
const photos = await rest("_20260725_gal_photos", "select=*&order=number&status=neq.trashed")
const albumName = new Map(albums.map((a) => [a.id, a.name]))
const safe = (s) => s.replace(/[\\/:*?"<>|]+/g, "_")

await fs.mkdir(out, { recursive: true })
let done = 0
for (const p of photos) {
  const dir = path.join(out, safe(albumName.get(p.album_id) ?? "Sans album"))
  await fs.mkdir(dir, { recursive: true })
  const target = path.join(dir, `${p.code}_${safe(p.original_filename)}`)
  try {
    await fs.access(target)
  } catch {
    const res = await fetch(`${url}/storage/v1/object/gallery-private/${p.original_path.split("/").map(encodeURIComponent).join("/")}`, { headers })
    if (!res.ok) { console.error(`✗ ${p.code} : ${res.status}`); continue }
    await fs.writeFile(target, Buffer.from(await res.arrayBuffer()))
  }
  done++
  if (done % 25 === 0) console.log(`${done} / ${photos.length}`)
}

await fs.writeFile(path.join(out, "catalogue.json"), JSON.stringify({
  exported_at: new Date().toISOString(),
  albums: albums.map((a) => ({ name: a.name, order: a.sort_order })),
  photos: photos.map((p) => ({
    code: p.code, album: albumName.get(p.album_id), taken_at: p.taken_at, original_filename: p.original_filename,
    width: p.width, height: p.height, status: p.status, home_rank: p.home_rank,
  })),
}, null, 2))
console.log(`Terminé : ${done} originaux dans ${out}`)
