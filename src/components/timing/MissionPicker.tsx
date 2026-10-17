import { useState } from "react"
import { Check, ChevronRight, ListChecks, X } from "lucide-react"

import type { DomainePhase, Mission } from "@/types/domain"
import { DOMAINE_PHASE_LABELS } from "@/lib/constants"
import { usePoles } from "@/hooks/queries/use-poles"
import { useDomaines } from "@/hooks/queries/use-domaines"
import { useAllChecklists, useAllChecklistItems } from "@/hooks/queries/use-checklists"
import { cn } from "@/lib/utils"
import { compareChecklistItems, compareDomaines, compareMissions } from "@/lib/ordering"

type Level = "pole" | "domaine" | "mission" | "item"

export interface MissionPickerValue {
  missionId: string
  label: string
}

interface Props {
  value: MissionPickerValue
  onChange: (v: MissionPickerValue) => void
  missions: Mission[]
}

// ── Pastilles de phase domaine ─────────────────────────────────────────────

const DOMAINE_PHASE_BADGE: Record<DomainePhase, string> = {
  avant:          "bg-lagon/15 text-lagon",
  installation:   "bg-brun/15 text-brun",
  jour_j:         "bg-bordeaux/15 text-bordeaux",
  desinstallation:"bg-corail/15 text-corail",
  apres:          "bg-muted text-muted-foreground",
}

function PhaseBadge({ phase }: { phase?: DomainePhase | null }) {
  if (!phase) return null
  return (
    <span className={cn(
      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
      DOMAINE_PHASE_BADGE[phase]
    )}>
      {DOMAINE_PHASE_LABELS[phase]}
    </span>
  )
}

// ── Ligne générique ────────────────────────────────────────────────────────

function Row({ children, onClick, active, chevron }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; chevron?: boolean
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-muted",
        active && "bg-bordeaux/10 text-bordeaux font-medium"
      )}>
      <span className="flex items-center gap-2">
        {active && <Check className="size-3.5 shrink-0" />}
        <span>{children}</span>
      </span>
      {chevron && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </button>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

export function MissionPicker({ value, onChange, missions }: Props) {
  const [level, setLevel] = useState<Level>("pole")
  const [poleId, setPoleId] = useState<string | null>(null)
  const [domaineId, setDomaineId] = useState<string | null>(null)
  const [missionId, setMissionId] = useState<string | null>(null)

  const { data: poles = [] } = usePoles()
  const { data: domaines = [] } = useDomaines()
  const { data: checklists = [] } = useAllChecklists()
  const { data: items = [] } = useAllChecklistItems()

  const poleName = poleId ? poles.find((p) => p.id === poleId)?.name : "Sans pôle"
  const domaineName = domaineId ? domaines.find((d) => d.id === domaineId)?.name : null
  const missionName = missionId ? missions.find((m) => m.id === missionId)?.title : null

  function goToPole() { setLevel("pole"); setPoleId(null); setDomaineId(null); setMissionId(null) }
  function goToDomaine() { setLevel("domaine"); setDomaineId(null); setMissionId(null) }
  function goToMission() { setLevel("mission"); setMissionId(null) }

  // ── Données filtrées ──
  const isPickable = (m: Mission) => m.schedulingType !== "en_continu"

  const polesWithDomaines = poles
    .filter((p) => domaines.some((d) => d.phase !== "avant" && d.poleId === p.id && missions.some((m) => m.domaineId === d.id && isPickable(m))))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const sansPole = domaines.filter(
    (d) => d.phase !== "avant" && !d.poleId && missions.some((m) => m.domaineId === d.id && isPickable(m))
  ).sort((a, b) => a.sortOrder - b.sortOrder)

  const domainesForPole = domaines
    .filter((d) => d.phase !== "avant" && (poleId ? d.poleId === poleId : !d.poleId) && missions.some((m) => m.domaineId === d.id && isPickable(m)))
    .sort(compareDomaines)

  const missionsForDomaine = missions
    .filter((m) => m.domaineId === domaineId && m.schedulingType !== "en_continu")
    .sort(compareMissions)

  const currentDomaine = domaines.find((d) => d.id === domaineId)

  const missionChecklists = checklists.filter(
    (c) => c.ownerType === "mission" && c.ownerId === missionId
  )
  const missionItems = items
    .filter((i) => missionChecklists.some((c) => c.id === i.checklistId))
    .sort(compareChecklistItems)

  // ── Rendu par niveau ──
  const list = (() => {
    if (level === "pole") {
      // Au niveau pôle : pas de phase (les pôles couvrent plusieurs phases)
      return (
        <>
          {polesWithDomaines.map((p) => (
            <Row key={p.id} onClick={() => { setPoleId(p.id); setLevel("domaine") }} chevron>
              {p.name}
            </Row>
          ))}
          {sansPole.length > 0 && (
            <Row onClick={() => { setPoleId(null); setLevel("domaine") }} chevron>
              <span className="text-muted-foreground">Sans pôle</span>
            </Row>
          )}
        </>
      )
    }

    if (level === "domaine") {
      // Phase sur chaque domaine
      return domainesForPole.map((d) => (
        <button key={d.id} type="button"
          onClick={() => { setDomaineId(d.id); setLevel("mission") }}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-muted">
          <span>{d.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <PhaseBadge phase={d.phase} />
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </button>
      ))
    }

    if (level === "mission") {
      // Phase héritée du domaine courant — affichée sur chaque ligne de mission
      return missionsForDomaine.map((m) => {
        const mChecklists = checklists.filter((c) => c.ownerType === "mission" && c.ownerId === m.id)
        const hasTasks = mChecklists.some((c) => items.some((i) => i.checklistId === c.id))
        const isActive = value.missionId === m.id && !value.label

        return (
          <div key={m.id} className="flex items-center gap-1">
            <button type="button"
              onClick={() => onChange({ missionId: m.id, label: "" })}
              className={cn(
                "flex-1 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-muted",
                isActive && "bg-bordeaux/10 text-bordeaux font-medium"
              )}>
              <span className="flex items-center gap-2">
                {isActive && <Check className="size-3.5 shrink-0" />}
                <span>{m.title}</span>
              </span>
              <PhaseBadge phase={currentDomaine?.phase} />
            </button>
            {hasTasks && (
              <button type="button"
                onClick={() => { setMissionId(m.id); setLevel("item") }}
                title="Voir les tâches"
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <ListChecks className="size-4" />
              </button>
            )}
          </div>
        )
      })
    }

    if (level === "item") {
      if (missionItems.length === 0) {
        return <p className="px-3 py-4 text-sm text-muted-foreground text-center">Aucune tâche dans cette mission.</p>
      }
      return missionItems.map((item) => {
        const isActive = value.missionId === missionId && value.label === item.label
        return (
          <Row key={item.id} active={isActive}
            onClick={() => onChange({ missionId: missionId ?? "", label: item.label })}>
            {item.label}
          </Row>
        )
      })
    }
  })()

  // ── Chip sélection courante ──
  const hasSelection = value.missionId || value.label
  const selectionText = value.label
    ? value.label
    : value.missionId
      ? missions.find((m) => m.id === value.missionId)?.title ?? "Mission"
      : null

  return (
    <div className="space-y-2">
      {hasSelection && (
        <div className="flex items-center gap-2 rounded-lg border border-bordeaux/30 bg-bordeaux/5 px-3 py-1.5">
          <Check className="size-3.5 shrink-0 text-bordeaux" />
          <span className="flex-1 text-sm font-medium text-bordeaux">{selectionText}</span>
          <button type="button" onClick={() => onChange({ missionId: "", label: "" })}
            className="shrink-0 text-bordeaux/60 hover:text-bordeaux transition-colors">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="rounded-lg border border-input overflow-hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground bg-muted/40 border-b border-input flex-wrap">
          <button type="button" onClick={goToPole}
            className={cn("hover:text-foreground transition-colors", level === "pole" && "text-foreground font-semibold")}>
            Pôles
          </button>
          {level !== "pole" && (
            <>
              <ChevronRight className="size-3 shrink-0" />
              <button type="button" onClick={goToDomaine}
                className={cn("hover:text-foreground transition-colors", level === "domaine" && "text-foreground font-semibold")}>
                {poleName}
              </button>
            </>
          )}
          {(level === "mission" || level === "item") && domaineName && (
            <>
              <ChevronRight className="size-3 shrink-0" />
              <button type="button" onClick={goToMission}
                className={cn("hover:text-foreground transition-colors", level === "mission" && "text-foreground font-semibold")}>
                {domaineName}
              </button>
            </>
          )}
          {level === "item" && missionName && (
            <>
              <ChevronRight className="size-3 shrink-0" />
              <span className="text-foreground font-semibold">{missionName}</span>
            </>
          )}
        </div>

        {/* Liste */}
        <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
          {list}
        </div>
      </div>
    </div>
  )
}
