import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { albumService } from "@/services/supabase/album"

const photosKey = (seqId: string) => ["album_photos", seqId]
const votesKey  = (seqId: string) => ["album_votes",  seqId]

export function useAlbumPhotos(sequenceId: string | null) {
  return useQuery({
    queryKey: photosKey(sequenceId ?? ""),
    queryFn:  () => albumService.listPhotos(sequenceId!),
    enabled:  !!sequenceId,
    staleTime: 5 * 60_000,
  })
}

export function useAlbumVotes(sequenceId: string | null) {
  return useQuery({
    queryKey: votesKey(sequenceId ?? ""),
    queryFn:  () => albumService.listVotes(sequenceId!),
    enabled:  !!sequenceId,
    refetchInterval: 30_000,
  })
}

export function useAlbumVote(sequenceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      photoId,
      voterId,
      voterName,
      rating,
    }: {
      photoId: string
      voterId: string
      voterName: string
      rating: 1 | 2 | 3 | 4
    }) => albumService.vote(photoId, voterId, voterName, rating),
    onSuccess: () => {
      if (sequenceId) qc.invalidateQueries({ queryKey: votesKey(sequenceId) })
    },
  })
}

export function useDeleteAlbumPhoto(sequenceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
      albumService.deletePhoto(id, storagePath),
    onSuccess: () => {
      if (sequenceId) qc.invalidateQueries({ queryKey: photosKey(sequenceId) })
    },
  })
}
