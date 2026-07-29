import { useMemo, useState } from "react"
import { Users } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIdentity } from "@/context/IdentityContext"
import { useResponsableEntries } from "@/hooks/use-responsable-entries"
import { useDomaines } from "@/hooks/queries/use-domaines"
import { useMissions } from "@/hooks/queries/use-missions"
import { usePeople } from "@/hooks/queries/use-people"
import { useDocuments } from "@/hooks/queries/use-documents"
import { useAllChecklistItems, useAllChecklists } from "@/hooks/queries/use-checklists"
import { ReferentCard } from "@/components/referents/ReferentCard"
import { AssignationsPage } from "@/pages/assignations"

function ReferentsTab() {
  const { person } = useIdentity()
  const { isLoading: entriesLoading, entries } = useResponsableEntries()
  const { data: domaines, isLoading: domainesLoading } = useDomaines()
  const { data: missions, isLoading: missionsLoading } = useMissions()
  const { data: people, isLoading: peopleLoading } = usePeople()
  const { data: documents, isLoading: documentsLoading } = useDocuments()
  const { data: checklists, isLoading: checklistsLoading } = useAllChecklists()
  const { data: items, isLoading: itemsLoading } = useAllChecklistItems()

  const isLoading =
    entriesLoading ||
    domainesLoading ||
    missionsLoading ||
    peopleLoading ||
    documentsLoading ||
    checklistsLoading ||
    itemsLoading

  const checklistIdsByMissionId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const checklist of checklists ?? []) {
      if (checklist.ownerType !== "mission" || !checklist.ownerId) continue
      const ids = map.get(checklist.ownerId) ?? []
      ids.push(checklist.id)
      map.set(checklist.ownerId, ids)
    }
    return map
  }, [checklists])

  // Les fiancés ne sont pas des référents : on les exclut même s'ils sont responsables d'un domaine.
  // Tout référent connecté voit désormais tous les référents (titre/statut de mission uniquement,
  // sans description ni checklist — voir showMissionDetails), pas seulement sa propre fiche.
  const visibleEntries = useMemo(() => entries.filter((entry) => entry.identity.role !== "admin"), [entries])

  const fiances = useMemo(() => (people ?? []).filter((p) => p.role === "admin"), [people])
  const showMissionDetails = person?.role === "admin"

  return (
    <div className="space-y-6">
      <PageHeader title="Référents" description="Les personnes qui pilotent chaque domaine." />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : visibleEntries.length === 0 ? (
        <EmptyState icon={Users} title="Aucun référent" description="Ajoutez des responsables depuis Paramètres." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEntries.map((entry) => {
            const entryDomaines = (domaines ?? []).filter((d) => entry.domaineIds.includes(d.id))
            const domaineNames = entryDomaines.map((d) => d.name)
            const entryMissions = (missions ?? []).filter(
              (m) => m.domaineId != null && entry.domaineIds.includes(m.domaineId)
            )
            const entryDocuments = (documents ?? []).filter(
              (doc) => doc.category != null && domaineNames.includes(doc.category)
            )
            const entryChecklistIds = new Set(
              entryMissions.flatMap((m) => checklistIdsByMissionId.get(m.id) ?? [])
            )
            const openItemCount = (items ?? []).filter(
              (item) => entryChecklistIds.has(item.checklistId) && item.status !== "done"
            ).length

            return (
              <ReferentCard
                key={entry.identity.id}
                identity={entry.identity}
                domaines={entryDomaines}
                missions={entryMissions}
                contacts={fiances}
                documents={entryDocuments}
                openItemCount={openItemCount}
                showMissionDetails={showMissionDetails}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page composite ─────────────────────────────────────────────────────────────

type EquipeTab = "referents" | "assignations"

export function ReferentsPage() {
  const [tab, setTab] = useState<EquipeTab>("referents")
  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as EquipeTab)}>
        <TabsList>
          <TabsTrigger value="referents">Référents</TabsTrigger>
          <TabsTrigger value="assignations">Assignations</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "referents" && <ReferentsTab />}
      {tab === "assignations" && <AssignationsPage />}
    </div>
  )
}
