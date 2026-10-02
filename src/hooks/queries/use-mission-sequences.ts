import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { missionSequencesService } from "@/services/supabase/mission-sequences"

function key(missionId: string) {
  return ["mission-sequences", missionId]
}

export function useAllMissionSequences() {
  return useQuery({
    queryKey: ["mission-sequences", "all"],
    queryFn: () => missionSequencesService.listAll(),
  })
}

export function useMissionSequences(missionId: string, enabled = true) {
  return useQuery({
    queryKey: key(missionId),
    queryFn: () => missionSequencesService.listByMission(missionId),
    enabled: enabled && !!missionId,
    retry: false,
  })
}

export function useSetMissionSequences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ missionId, sequenceIds }: { missionId: string; sequenceIds: string[] }) =>
      missionSequencesService.setForMission(missionId, sequenceIds),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key(vars.missionId) })
      qc.invalidateQueries({ queryKey: ["mission-sequences", "all"] })
    },
  })
}
