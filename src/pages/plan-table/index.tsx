import { useMemo, useState } from "react"
import { Armchair } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { usePrestataires } from "@/hooks/queries/use-prestataires"
import { useAssignSeat, useTableAssignments, useTables, useUnassignSeat, useUpdateTable } from "@/hooks/queries/use-seating"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { SeatingPlanBoard } from "@/components/plan-table/SeatingPlanBoard"
import { SeatingPlanCanvas } from "@/components/plan-table/SeatingPlanCanvas"

type View = "placement" | "espace"

export function PlanTablePage() {
  const [view, setView] = useState<View>("placement")
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null)
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: people, isLoading: peopleLoading } = usePeople()
  const { data: prestataires, isLoading: prestatairesLoading } = usePrestataires()
  const { data: tables, isLoading: tablesLoading } = useTables()
  const { data: assignments, isLoading: assignmentsLoading } = useTableAssignments()
  const { data: sequences = [] } = useEventSequences()
  const assignSeat = useAssignSeat()
  const unassignSeat = useUnassignSeat()
  const updateTable = useUpdateTable()

  const isLoading = guestsLoading || peopleLoading || prestatairesLoading || tablesLoading || assignmentsLoading

  const sortedSequences = useMemo(
    () => [...sequences].sort((a, b) => a.sortOrder - b.sortOrder),
    [sequences]
  )
  const hasMultipleSequences = sortedSequences.length > 1
  const activeSequenceId = hasMultipleSequences ? selectedSequenceId ?? sortedSequences[0]?.id ?? null : null

  const filteredTables = useMemo(() => {
    if (!tables) return []
    if (!activeSequenceId) return tables
    return tables.filter((t) => !t.sequenceId || t.sequenceId === activeSequenceId)
  }, [tables, activeSequenceId])

  return (
    <div className="space-y-6">
      <PageHeader title="Plan de table" description="Placement des invités, des fiancés et des prestataires." />

      {/* Sélecteur de séquence */}
      {hasMultipleSequences && (
        <div className="flex flex-wrap gap-2">
          {sortedSequences.map((seq) => (
            <Button
              key={seq.id}
              size="sm"
              variant={activeSequenceId === seq.id ? "default" : "outline"}
              onClick={() => setSelectedSequenceId(seq.id)}
            >
              {seq.name}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !filteredTables || filteredTables.length === 0 ? (
        <EmptyState
          icon={Armchair}
          title="Aucune table configurée"
          description="Configurez le nombre de tables et leur capacité depuis Paramètres."
        />
      ) : (
        <>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="placement">Placement</TabsTrigger>
              <TabsTrigger value="espace">Espace</TabsTrigger>
            </TabsList>
          </Tabs>

          {view === "placement" ? (
            <SeatingPlanBoard
              tables={filteredTables}
              guests={guests ?? []}
              people={people ?? []}
              prestataires={prestataires ?? []}
              assignments={assignments ?? []}
              onAssign={(tableId, target) => assignSeat.mutate({ tableId, target })}
              onUnassign={(assignmentId) => unassignSeat.mutate(assignmentId)}
            />
          ) : (
            <SeatingPlanCanvas
              tables={filteredTables}
              assignments={assignments ?? []}
              guests={guests ?? []}
              people={people ?? []}
              prestataires={prestataires ?? []}
              onMoveTable={(id, posX, posY) => updateTable.mutate({ id, patch: { posX, posY } })}
            />
          )}
        </>
      )}
    </div>
  )
}
