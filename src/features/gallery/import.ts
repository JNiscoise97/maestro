import { galleryClient, gt, GALLERY_BUCKET } from "./client"

/**
 * Import en lot (CDCF IMG-04, IMG-06) dans le bucket privé « gallery-private » :
 *   · full-size/   — original du photographe, envoyé tel quel (téléchargement HD) ;
 *   · medium-size/ — version de consultation (2048 px), générée sans métadonnées ;
 *   · mini-size/   — miniature légère (480 px), générée sans métadonnées.
 * Doublons détectés par empreinte SHA-256 de l'original.
 */
const THUMB_PX = 480
const DISPLAY_PX = 2048

export type ImportResult = { file: string; status: "imported" | "duplicate" | "error"; code?: string; message?: string }

export async function sha256(file: Blob): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function resized(bitmap: ImageBitmap, maxPx: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion impossible"))), "image/jpeg", quality))
}

/** Date de prise de vue (EXIF DateTimeOriginal) d'un JPEG, sinon null. Lecture minimale, sans dépendance. */
export async function exifDate(file: Blob): Promise<string | null> {
  try {
    const view = new DataView(await file.slice(0, 256 * 1024).arrayBuffer())
    if (view.getUint16(0) !== 0xffd8) return null
    let offset = 2
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset)
      const size = view.getUint16(offset + 2)
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
        const tiff = offset + 10
        const little = view.getUint16(tiff) === 0x4949
        const u16 = (o: number) => view.getUint16(o, little)
        const u32 = (o: number) => view.getUint32(o, little)
        const readTag = (ifd: number, tag: number): number | null => {
          const n = u16(ifd)
          for (let i = 0; i < n; i++) {
            const e = ifd + 2 + i * 12
            if (u16(e) === tag) return e
          }
          return null
        }
        const ifd0 = tiff + u32(tiff + 4)
        const exifPtr = readTag(ifd0, 0x8769)
        if (exifPtr === null) return null
        const exifIfd = tiff + u32(exifPtr + 8)
        const dt = readTag(exifIfd, 0x9003) ?? readTag(exifIfd, 0x9004)
        if (dt === null) return null
        const start = tiff + u32(dt + 8)
        let s = ""
        for (let i = 0; i < 19; i++) s += String.fromCharCode(view.getUint8(start + i))
        const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
        // Heure locale de l'appareil, considérée comme heure de Guadeloupe/Paris indifféremment : sert à l'ordre.
        return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null
      }
      if ((marker & 0xff00) !== 0xff00) return null
      offset += 2 + size
    }
  } catch { /* EXIF illisible */ }
  return null
}

function safeName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120)
}

export type ImportStage = "analyse" | "generation" | "envoi" | "enregistrement"

/** Importe une photo : empreinte, versions réduites, envoi des 3 fichiers, ligne en base. */
export async function importOne(file: File, albumId: string, onStage: (stage: ImportStage) => void = () => {}): Promise<ImportResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = galleryClient! as any
  const storage = galleryClient!.storage.from(GALLERY_BUCKET)
  try {
    onStage("analyse")
    const checksum = await sha256(file)
    const { data: dup } = await db.from(gt("photos")).select("code").eq("checksum", checksum).maybeSingle()
    if (dup) return { file: file.name, status: "duplicate", code: dup.code }

    // Orientation EXIF appliquée : largeur/hauteur réelles d'affichage, sans recadrage.
    onStage("generation")
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    const [thumb, display] = await Promise.all([resized(bitmap, THUMB_PX, 0.78), resized(bitmap, DISPLAY_PX, 0.86)])
    const { width, height } = bitmap
    bitmap.close()

    onStage("envoi")
    const id = crypto.randomUUID()
    const paths = {
      thumb: `mini-size/${id}.jpg`,
      display: `medium-size/${id}.jpg`,
      original: `full-size/${id}/${safeName(file.name)}`,
    }
    const uploads = await Promise.all([
      storage.upload(paths.thumb, thumb, { contentType: "image/jpeg", upsert: false }),
      storage.upload(paths.display, display, { contentType: "image/jpeg", upsert: false }),
      storage.upload(paths.original, file, { contentType: file.type || "image/jpeg", upsert: false }),
    ])
    const failed = uploads.find((u) => u.error)
    if (failed?.error) {
      await storage.remove([paths.thumb, paths.display, paths.original])
      throw failed.error
    }

    onStage("enregistrement")
    const { data: row, error } = await db.from(gt("photos")).insert({
      id, album_id: albumId, taken_at: await exifDate(file), original_filename: file.name, checksum,
      width, height, thumb_path: paths.thumb, display_path: paths.display, original_path: paths.original,
    }).select("code").single()
    if (error) {
      await storage.remove([paths.thumb, paths.display, paths.original])
      throw error
    }
    return { file: file.name, status: "imported", code: row.code }
  } catch (err) {
    console.error("[importOne]", file.name, err)
    return { file: file.name, status: "error", message: err instanceof Error ? err.message : String(err) }
  }
}

export async function importPhotos(
  files: File[],
  albumId: string,
  onProgress: (done: number, total: number, current: string) => void,
): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  for (let i = 0; i < files.length; i++) {
    onProgress(i, files.length, files[i].name)
    results.push(await importOne(files[i], albumId))
  }
  onProgress(files.length, files.length, "")
  return results
}

