import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { filmService, type FilmGroup, type FilmVideo } from "@/services/supabase/film"

const QK_CONFIG = ["film_config"] as const
const QK_VIDEOS = ["film_videos"] as const
const QK_GROUPS = ["film_groups"] as const
const QK_VIEWS  = ["film_views"]  as const

// ── Config ────────────────────────────────────────────────────────────────────

export function useFilmConfig() {
  return useQuery({ queryKey: QK_CONFIG, queryFn: () => filmService.getConfig() })
}

export function useSetFilmConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: filmService.setConfig,
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_CONFIG }),
  })
}

// ── Videos ────────────────────────────────────────────────────────────────────

export function useFilmVideos() {
  return useQuery({ queryKey: QK_VIDEOS, queryFn: () => filmService.listVideos() })
}

export function useCreateFilmVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (video: Omit<FilmVideo, "id">) => filmService.createVideo(video),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_VIDEOS }),
  })
}

export function useUpdateFilmVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<FilmVideo, "id">> }) =>
      filmService.updateVideo(id, patch),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_VIDEOS }),
  })
}

export function useDeleteFilmVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => filmService.deleteVideo(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_VIDEOS }),
  })
}

// ── Groups ────────────────────────────────────────────────────────────────────

export function useFilmGroups() {
  return useQuery({ queryKey: QK_GROUPS, queryFn: () => filmService.listGroups() })
}

export function useCreateFilmGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (group: Omit<FilmGroup, "id">) => filmService.createGroup(group),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_GROUPS }),
  })
}

export function useUpdateFilmGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<FilmGroup, "id">> }) =>
      filmService.updateGroup(id, patch),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_GROUPS }),
  })
}

export function useDeleteFilmGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => filmService.deleteGroup(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK_GROUPS }),
  })
}

// ── Views ─────────────────────────────────────────────────────────────────────

export function useFilmViews() {
  return useQuery({ queryKey: QK_VIEWS, queryFn: () => filmService.listViews(), staleTime: 0 })
}
