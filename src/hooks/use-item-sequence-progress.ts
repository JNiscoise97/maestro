import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useAllChecklists, useToggleChecklistItem } from "@/hooks/queries/use-checklists"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useAllMissionSequences } from "@/hooks/queries/use-mission-sequences"
import { useItemSequenceStatuses, useSetItemSequenceStatuses } from "@/hooks/queries/use-item-sequences"
import { isComplete } from "@/lib/retroplanning"
import type { ChecklistItem, EventSequence, ItemSequenceStatusValue } from "@/types/domain"

// Index dérivés partagés entre toutes les instances du hook (une par checklist dans la
// vue pilotage) : recalculés une seule fois par version des données React Query.
const statusIndexCache = new WeakMap<object, Map<string, ItemSequenceStatusValue>>()
const missionIndexCache = new WeakMap<object, { sequences: object; map: Map<string, EventSequence[]> }>()

export type SequenceChange = { item: ChecklistItem; sequenceId: string; status: ItemSequenceStatusValue }

/**
 * Avancement des items par séquence, partagé par le rétroplanning et la vue pilotage.
 *
 * Les séquences d'un item sont celles de sa mission (_mission_sequences). Le statut
 * item × séquence est stocké dans _checklist_item_sequences ; sans ligne, il suit la
 * case de l'item. La case de l'item (is_done) est tenue à jour : cochée quand toutes
 * ses séquences sont faites ou non concernées.
 */
export function useItemSequenceProgress() {
  const queryClient = useQueryClient()
  const { data: sequences = [] } = useEventSequences()
  const { data: missionSequences = [] } = useAllMissionSequences()
  const { data: statuses = [] } = useItemSequenceStatuses()
  const { data: checklists = [] } = useAllChecklists()
  const toggle = useToggleChecklistItem()
  const setStatuses = useSetItemSequenceStatuses()

  const sequencesByMission = useMemo(() => {
    const cached = missionIndexCache.get(missionSequences)
    if (cached && cached.sequences === sequences) return cached.map
    const byId = new Map(sequences.map((s) => [s.id, s]))
    const map = new Map<string, EventSequence[]>()
    for (const ms of missionSequences) {
      const seq = byId.get(ms.sequenceId)
      if (!seq) continue
      const list = map.get(ms.missionId) ?? []
      list.push(seq)
      map.set(ms.missionId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder)
    missionIndexCache.set(missionSequences, { sequences, map })
    return map
  }, [sequences, missionSequences])

  const missionByChecklist = useMemo(
    () => new Map(checklists.filter((c) => c.ownerType === "mission" && c.ownerId).map((c) => [c.id, c.ownerId as string])),
    [checklists],
  )

  const statusByKey = useMemo(() => {
    const cached = statusIndexCache.get(statuses)
    if (cached) return cached
    const map = new Map(statuses.map((r) => [`${r.itemId}:${r.sequenceId}`, r.status]))
    statusIndexCache.set(statuses, map)
    return map
  }, [statuses])

  function sequencesForMission(missionId: string): EventSequence[] {
    return sequencesByMission.get(missionId) ?? []
  }

  function sequencesForItem(item: ChecklistItem): EventSequence[] {
    const missionId = missionByChecklist.get(item.checklistId)
    return missionId ? sequencesForMission(missionId) : []
  }

  function statusOf(item: ChecklistItem, sequenceId: string): ItemSequenceStatusValue {
    return statusByKey.get(`${item.id}:${sequenceId}`) ?? (item.isDone ? "done" : "todo")
  }

  function setItemDone(item: ChecklistItem, isDone: boolean) {
    if (isDone === item.isDone) return
    // Mise à jour immédiate des caches (liste globale et checklist) : la synchro
    // du statut de mission prend un aller-retour réseau.
    const patch = (cur: ChecklistItem[] | undefined) =>
      (cur ?? []).map((i) => (i.id === item.id ? { ...i, isDone } : i))
    queryClient.setQueryData<ChecklistItem[]>(["checklist-items", "all"], patch)
    queryClient.setQueryData<ChecklistItem[]>(["checklist-items", item.checklistId], patch)
    toggle.mutate({ itemId: item.id, isDone })
  }

  /** Enregistre des statuts item × séquence puis recalcule la case de chaque item touché. */
  function setSequenceStatuses(changes: SequenceChange[]) {
    if (changes.length === 0) return
    setStatuses.mutate(changes.map((c) => ({ itemId: c.item.id, sequenceId: c.sequenceId, status: c.status })))
    const byItem = new Map<string, { item: ChecklistItem; next: Map<string, ItemSequenceStatusValue> }>()
    for (const c of changes) {
      const e = byItem.get(c.item.id) ?? { item: c.item, next: new Map() }
      e.next.set(c.sequenceId, c.status)
      byItem.set(c.item.id, e)
    }
    for (const { item, next } of byItem.values()) {
      const seqs = sequencesForItem(item)
      if (seqs.length === 0) continue
      setItemDone(item, isComplete(seqs.map((s) => next.get(s.id) ?? statusOf(item, s.id))))
    }
  }

  /**
   * Case principale d'un item : coche / décoche l'item et, s'il a plusieurs séquences,
   * toutes ses séquences concernées — les deux vues restent ainsi cohérentes.
   */
  function setItemAll(item: ChecklistItem, isDone: boolean) {
    const seqs = sequencesForItem(item)
    if (seqs.length > 1) {
      setSequenceStatuses(seqs
        .filter((s) => statusOf(item, s.id) !== "na")
        .map((s) => ({ item, sequenceId: s.id, status: isDone ? "done" : "todo" })))
      // Toutes non concernées : rien à cocher, mais la case suit la demande.
      if (seqs.every((s) => statusOf(item, s.id) === "na")) setItemDone(item, isDone)
      return
    }
    if (seqs.length === 1) {
      setStatuses.mutate([{ itemId: item.id, sequenceId: seqs[0].id, status: isDone ? "done" : "todo" }])
    }
    setItemDone(item, isDone)
  }

  return { sequencesForMission, sequencesForItem, statusOf, setItemDone, setSequenceStatuses, setItemAll }
}
