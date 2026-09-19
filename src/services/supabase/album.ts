import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export type AlbumPhoto = {
  id: string
  sequenceId: string
  filename: string
  storagePath: string
  sortOrder: number
  url: string
}

export type AlbumVote = {
  photoId: string
  voterId: string
  voterName: string
  rating: 1 | 2 | 3 | 4
  votedAt: string
}

function photoUrl(path: string): string {
  const { data } = supabase!.storage.from("album-photos").getPublicUrl(path)
  return data.publicUrl
}

function fromPhotoRow(r: any): AlbumPhoto {
  return {
    id:          r.id,
    sequenceId:  r.sequence_id,
    filename:    r.filename,
    storagePath: r.storage_path,
    sortOrder:   r.sort_order,
    url:         photoUrl(r.storage_path),
  }
}

export const albumService = {
  async listPhotos(sequenceId: string): Promise<AlbumPhoto[]> {
    const { data, error } = await db
      .from(tbl("album_photos"))
      .select("*")
      .eq("sequence_id", sequenceId)
      .order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromPhotoRow)
  },

  async insertPhoto(
    sequenceId: string,
    filename: string,
    storagePath: string,
    sortOrder: number,
  ): Promise<AlbumPhoto> {
    const { data, error } = await db
      .from(tbl("album_photos"))
      .insert({ sequence_id: sequenceId, filename, storage_path: storagePath, sort_order: sortOrder })
      .select()
      .single()
    if (error) throw error
    return fromPhotoRow(data)
  },

  async deletePhoto(id: string, storagePath: string): Promise<void> {
    await supabase!.storage.from("album-photos").remove([storagePath])
    const { error } = await db.from(tbl("album_photos")).delete().eq("id", id)
    if (error) throw error
  },

  async listVotes(sequenceId: string): Promise<AlbumVote[]> {
    const { data: photos, error: pErr } = await db
      .from(tbl("album_photos"))
      .select("id")
      .eq("sequence_id", sequenceId)
    if (pErr) throw pErr
    const ids: string[] = (photos ?? []).map((p: any) => p.id)
    if (ids.length === 0) return []

    // Chunk to avoid URL length overflow (~8 KB limit with 850 UUIDs)
    const CHUNK = 100
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK))

    const rows = await Promise.all(
      chunks.map(chunk =>
        db.from(tbl("album_votes")).select("*").in("photo_id", chunk)
          .then(({ data, error }: { data: any; error: any }) => { if (error) throw error; return data ?? [] }),
      ),
    )
    return rows.flat().map((r: any) => ({
      photoId:   r.photo_id,
      voterId:   r.voter_id,
      voterName: r.voter_name,
      rating:    r.rating as 1 | 2 | 3 | 4,
      votedAt:   r.voted_at,
    }))
  },

  async vote(
    photoId: string,
    voterId: string,
    voterName: string,
    rating: 1 | 2 | 3 | 4,
  ): Promise<void> {
    const { error } = await db
      .from(tbl("album_votes"))
      .upsert(
        { photo_id: photoId, voter_id: voterId, voter_name: voterName, rating },
        { onConflict: "photo_id,voter_id" },
      )
    if (error) throw error
  },
}

export async function compressImage(file: File, maxPx = 1500, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null"))),
        "image/jpeg",
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Image load failed")) }
    img.src = objUrl
  })
}
