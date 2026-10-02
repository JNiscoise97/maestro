import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMilestones } from "@/hooks/queries/use-milestones"
import { useAllChecklists, useAllChecklistItems } from "@/hooks/queries/use-checklists"
import { useMissions } from "@/hooks/queries/use-missions"
import { useDomaines } from "@/hooks/queries/use-domaines"
import { usePoles } from "@/hooks/queries/use-poles"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useAllMissionSequences } from "@/hooks/queries/use-mission-sequences"
import { useItemSequenceStatuses } from "@/hooks/queries/use-item-sequences"
import { useItemSequenceProgress } from "@/hooks/use-item-sequence-progress"
import {
  ITEM_STATE_LABELS, ITEM_STATE_ORDER, dateState, formatDate, toIso, type ItemState,
} from "@/lib/retroplanning"
import { sequenceColor, withAlpha } from "@/lib/sequence-colors"
import { SequenceDot } from "@/components/shared/SequenceName"
import type { ChecklistItem, ItemSequenceStatusValue, Milestone } from "@/types/domain"

const WEDDING_DATE = new Date("2027-06-25")
const OPEN_KEY = "sj_retro_open_v2"
const FILTER_KEY = "sj_retro_sequence_filter"

/** Filtre de séquence : toutes, missions sans séquence, ou une séquence précise (id). */
const ALL = "all"
const NONE = "none"

type MilestoneStatus = "done" | "late" | "behind" | "curr" | "fut" | "empty"

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  done: "Validé", late: "En retard", behind: "À rattraper", curr: "Maintenant", fut: "Planifié", empty: "Aucun item",
}
/** Pastille de statut d'un jalon (frise et légende). */
const MILESTONE_DOT: Record<MilestoneStatus, string> = {
  late: "bg-bordeaux border-bordeaux",
  behind: "bg-corail border-corail",
  curr: "bg-lagon border-lagon ring-2 ring-lagon/25",
  done: "bg-vert-vegetal border-vert-vegetal",
  fut: "bg-card border-border",
  empty: "bg-card border-border",
}
const MILESTONE_TEXT: Record<MilestoneStatus, string> = {
  late: "text-bordeaux", behind: "text-corail", curr: "text-lagon", done: "text-vert-vegetal", fut: "text-muted-foreground", empty: "text-muted-foreground",
}

type RetroSequence = { id: string; name: string; order: number; color: string; status: ItemSequenceStatusValue }
type RetroItem = ChecklistItem & {
  missionId: string
  missionTitle: string
  missionOrder: number
  domaineName: string
  poleName: string
  poleOrder: number
  /** Séquences de la mission, avec l'avancement de l'item pour chacune. */
  sequences: RetroSequence[]
}

/**
 * Unité de suivi du rétroplanning : un item pour une séquence donnée
 * (ou l'item seul si sa mission n'a pas de séquence). Une mission à N séquences
 * compte donc N fois chacun de ses items.
 */
type RetroRow = {
  item: RetroItem
  sequenceId: string | null
  sequenceName: string | null
  sequenceColor: string | null
  sequenceOrder: number
  status: ItemSequenceStatusValue
  state: ItemState
}

/** Carte « mission × séquence ». */
type RetroBlock = {
  key: string
  missionId: string
  title: string
  domaineName: string
  missionOrder: number
  poleName: string
  poleOrder: number
  /** Séquence de la carte (null : mission sans séquence). */
  sequenceName: string | null
  sequenceColor: string | null
  sequenceOrder: number
  /** Toutes les lignes de la carte (compteurs). */
  rows: RetroRow[]
  /** Lignes affichées. */
  visible: RetroRow[]
  /** État le plus urgent parmi les lignes affichées. */
  worst: number
}

/** Totaux d'un ensemble de lignes, hors lignes « non concernées ». */
type Totals = {
  rowsDone: number
  rowsTotal: number
  blocksDone: number
  blocksTotal: number
  late: number
  behind: number
  blocking: number
}

function blockKey(row: RetroRow) {
  return `${row.item.missionId}:${row.sequenceId ?? "-"}`
}

function computeTotals(rows: RetroRow[]): Totals {
  const concerned = rows.filter((r) => r.status !== "na")
  const blocks = new Map<string, { done: number; total: number }>()
  for (const r of concerned) {
    const b = blocks.get(blockKey(r)) ?? { done: 0, total: 0 }
    b.total++
    if (r.status === "done") b.done++
    blocks.set(blockKey(r), b)
  }
  const todo = concerned.filter((r) => r.status === "todo")
  return {
    rowsDone: concerned.length - todo.length,
    rowsTotal: concerned.length,
    blocksDone: [...blocks.values()].filter((b) => b.done === b.total).length,
    blocksTotal: blocks.size,
    late: todo.filter((r) => r.state === "late").length,
    behind: todo.filter((r) => r.state === "behind").length,
    blocking: todo.filter((r) => r.item.criticality === "blocking").length,
  }
}

function milestoneStatus(rows: RetroRow[]): MilestoneStatus {
  const todo = rows.filter((r) => r.status === "todo")
  if (rows.every((r) => r.status === "na")) return "empty"
  if (todo.length === 0) return "done"
  if (todo.some((r) => r.state === "late")) return "late"
  if (todo.some((r) => r.state === "behind")) return "behind"
  if (todo.some((r) => r.state === "now")) return "curr"
  return "fut"
}

function loadOpen(): Set<string> | null {
  try {
    const saved = JSON.parse(localStorage.getItem(OPEN_KEY) || "null")
    if (Array.isArray(saved)) return new Set(saved as string[])
  } catch { /* ignore */ }
  return null
}
function saveOpen(open: Set<string>) {
  try { localStorage.setItem(OPEN_KEY, JSON.stringify([...open])) } catch { /* ignore */ }
}
function loadFilter(): string {
  try { return localStorage.getItem(FILTER_KEY) || ALL } catch { return ALL }
}

export function RetroplanningView() {
  const { data: milestones = [], isLoading: msLoading } = useMilestones()
  const { data: items = [], isLoading: itemsLoading } = useAllChecklistItems()
  const { data: checklists = [] } = useAllChecklists()
  const { data: missions = [] } = useMissions()
  const { data: domaines = [] } = useDomaines()
  const { data: poles = [] } = usePoles()
  const { data: sequences = [] } = useEventSequences()
  const { data: missionSequences = [] } = useAllMissionSequences()
  const { data: seqStatuses = [] } = useItemSequenceStatuses()
  const progress = useItemSequenceProgress()

  const [savedOpen, setSavedOpen] = useState<Set<string> | null>(loadOpen)
  const [showDone, setShowDone] = useState(false)
  const [seqFilter, setSeqFilterState] = useState<string>(loadFilter)
  // Figé au montage : les états (en retard, à faire maintenant…) se calculent par rapport au jour.
  const [now] = useState(() => new Date())
  const today = toIso(now)

  function setSeqFilter(value: string) {
    setSeqFilterState(value)
    try { localStorage.setItem(FILTER_KEY, value) } catch { /* ignore */ }
  }

  // Lignes (item × séquence) par jalon, enrichies du contexte mission / pôle.
  const allRowsByMilestone = useMemo(() => {
    const clById = new Map(checklists.map((c) => [c.id, c]))
    const missionById = new Map(missions.map((m) => [m.id, m]))
    const domaineById = new Map(domaines.map((d) => [d.id, d]))
    const poleById = new Map(poles.map((p) => [p.id, p]))
    const seqById = new Map(sequences.map((s) => [s.id, s]))
    const seqIdsByMission = new Map<string, string[]>()
    for (const ms of missionSequences) {
      const list = seqIdsByMission.get(ms.missionId) ?? []
      list.push(ms.sequenceId)
      seqIdsByMission.set(ms.missionId, list)
    }
    const statusByKey = new Map(seqStatuses.map((r) => [`${r.itemId}:${r.sequenceId}`, r.status]))
    const map = new Map<string, RetroRow[]>()
    for (const raw of items) {
      if (!raw.milestoneId) continue
      const cl = clById.get(raw.checklistId)
      const mission = cl?.ownerType === "mission" && cl.ownerId ? missionById.get(cl.ownerId) : undefined
      const domaine = mission?.domaineId ? domaineById.get(mission.domaineId) : undefined
      const pole = domaine?.poleId ? poleById.get(domaine.poleId) : undefined
      const item: RetroItem = {
        ...raw,
        missionId: mission?.id ?? `checklist:${raw.checklistId}`,
        missionTitle: mission?.title ?? "Sans mission",
        missionOrder: mission?.sortOrder ?? 999,
        domaineName: domaine?.name ?? "",
        poleName: pole?.name ?? "Sans pôle",
        poleOrder: pole?.sortOrder ?? 999,
        sequences: (mission ? seqIdsByMission.get(mission.id) ?? [] : [])
          .map((id) => seqById.get(id))
          .filter((seq) => seq !== undefined)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((seq) => ({
            id: seq.id,
            name: seq.name,
            order: seq.sortOrder,
            color: sequenceColor(seq),
            // Sans ligne enregistrée, la séquence suit la case de l'item (cochée ailleurs, p. ex.).
            status: statusByKey.get(`${raw.id}:${seq.id}`) ?? (raw.isDone ? "done" : "todo"),
          })),
      }
      const st = dateState(item, today)
      const list = map.get(raw.milestoneId) ?? []
      if (item.sequences.length === 0) {
        const status = item.isDone ? "done" : "todo"
        list.push({ item, sequenceId: null, sequenceName: null, sequenceColor: null, sequenceOrder: -1, status, state: status === "todo" ? st : "done" })
      } else {
        for (const seq of item.sequences) {
          list.push({
            item, sequenceId: seq.id, sequenceName: seq.name, sequenceColor: seq.color, sequenceOrder: seq.order,
            status: seq.status, state: seq.status === "todo" ? st : "done",
          })
        }
      }
      map.set(raw.milestoneId, list)
    }
    return map
  }, [items, checklists, missions, domaines, poles, sequences, missionSequences, seqStatuses, today])

  // Application du filtre de séquence : tout le reste (statuts, totaux, cartes) en découle.
  const rowsByMilestone = useMemo(() => {
    if (seqFilter === ALL) return allRowsByMilestone
    const map = new Map<string, RetroRow[]>()
    for (const [id, rows] of allRowsByMilestone) {
      map.set(id, rows.filter((r) => (seqFilter === NONE ? r.sequenceId === null : r.sequenceId === seqFilter)))
    }
    return map
  }, [allRowsByMilestone, seqFilter])

  const statusById = useMemo(
    () => new Map(milestones.map((m) => [m.id, milestoneStatus(rowsByMilestone.get(m.id) ?? [])])),
    [milestones, rowsByMilestone],
  )

  // Séquences proposées dans le filtre : celles réellement utilisées par une mission.
  const filterOptions = useMemo(() => {
    const used = new Set(missionSequences.map((ms) => ms.sequenceId))
    return sequences.filter((s) => used.has(s.id)).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [sequences, missionSequences])

  // Par défaut : jalons en retard ou en cours dépliés.
  const open = savedOpen ?? new Set(milestones.filter((m) => {
    const s = statusById.get(m.id)
    return s === "late" || s === "behind" || s === "curr"
  }).map((m) => m.id))

  function setOpen(next: Set<string>) {
    setSavedOpen(next)
    saveOpen(next)
  }
  function toggleOpen(id: string) {
    const next = new Set(open)
    if (next.has(id)) next.delete(id); else next.add(id)
    setOpen(next)
  }
  function scrollToMilestone(id: string) {
    if (!open.has(id)) setOpen(new Set(open).add(id))
    setTimeout(() => document.getElementById(`retro-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  /** Case d'une ligne : item seul (mission sans séquence) ou item pour une séquence donnée. */
  function toggleRow(row: RetroRow) {
    if (row.sequenceId === null) {
      progress.setItemDone(row.item, !row.item.isDone)
      return
    }
    progress.setSequenceStatuses([{ item: row.item, sequenceId: row.sequenceId, status: row.status === "done" ? "todo" : "done" }])
  }

  /** Marque toute une carte mission × séquence comme non concernée (ou la réactive). */
  function setBlockNotConcerned(rows: RetroRow[], notConcerned: boolean) {
    progress.setSequenceStatuses(rows
      .filter((r): r is RetroRow & { sequenceId: string } => r.sequenceId !== null)
      .map((r) => ({ item: r.item, sequenceId: r.sequenceId, status: notConcerned ? "na" : "todo" })))
  }

  if (msLoading || itemsLoading) {
    return <p className="text-sm text-muted-foreground">Chargement du rétroplanning…</p>
  }
  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun jalon défini pour le moment.</p>
  }

  const daysLeft = Math.ceil((WEDDING_DATE.getTime() - now.getTime()) / 86400000)
  const lateCount = milestones.filter((m) => statusById.get(m.id) === "late").length
  const behindCount = milestones.filter((m) => statusById.get(m.id) === "behind").length
  const totals = computeTotals([...rowsByMilestone.values()].flat())
  const filterLabel = seqFilter === ALL
    ? null
    : seqFilter === NONE ? "Missions sans séquence" : sequences.find((s) => s.id === seqFilter)?.name ?? null

  return (
    <div className="space-y-4">
      {/* Compte à rebours + totaux */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            25–28 juin 2027{filterLabel ? ` · ${filterLabel}` : ""}
          </p>
          {lateCount === 0 && behindCount === 0 ? (
            <p className="text-sm font-medium text-foreground">Tous les jalons sont à jour ✓</p>
          ) : (
            <p className="text-sm font-semibold">
              {lateCount > 0 && (
                <span className="text-bordeaux">{lateCount} jalon{lateCount > 1 ? "s" : ""} en retard</span>
              )}
              {lateCount > 0 && behindCount > 0 && <span className="text-muted-foreground"> · </span>}
              {behindCount > 0 && (
                <span className="text-corail">{behindCount} jalon{behindCount > 1 ? "s" : ""} à rattraper</span>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground tabular-nums">
            Missions × séquences : {totals.blocksDone} / {totals.blocksTotal} terminées
            {" · "}Items × séquences : {totals.rowsDone} / {totals.rowsTotal} faits
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-heading text-4xl font-semibold leading-none text-dore tabular-nums">
            {daysLeft > 0 ? daysLeft : "🎉"}
          </p>
          <p className="text-xs text-muted-foreground">jours</p>
        </div>
      </div>

      {/* Légende des jalons */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jalons</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground"
            title="À rattraper : date cible dépassée, date limite pas encore atteinte. En retard : date limite dépassée."
          >
            {(["late", "behind", "curr", "fut", "done"] as const).map((st) => (
              <span key={st} className="inline-flex items-center gap-1">
                <span className={cn("w-2.5 h-2.5 rounded-full border-2", MILESTONE_DOT[st])} />
                {MILESTONE_STATUS_LABELS[st]}
              </span>
            ))}
          </div>
        </div>
        <ol className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
          {milestones.map((m) => {
            const s = statusById.get(m.id) ?? "empty"
            return (
              <li key={m.id}>
                <button type="button" onClick={() => scrollToMilestone(m.id)}
                  className="w-full flex items-baseline gap-2 rounded px-1 py-0.5 text-left hover:bg-muted/50"
                >
                  <span className={cn("w-2 h-2 rounded-full border-2 flex-shrink-0 self-center", MILESTONE_DOT[s])} />
                  <span className={cn("text-[11px] font-semibold tabular-nums w-7 flex-shrink-0", MILESTONE_TEXT[s])}>
                    J{m.sortOrder}
                  </span>
                  <span className="text-[11px] text-foreground flex-1 min-w-0 truncate" title={m.description ?? m.name}>
                    {m.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                    {formatDate(m.targetDate, { day: "numeric", month: "short", year: "2-digit" })}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Frise */}
      <div className="overflow-x-auto -mx-4 px-4 pb-1">
        <div className="flex items-start min-w-max">
          {milestones.map((m, i) => {
            const s = statusById.get(m.id) ?? "empty"
            return (
              <button key={m.id} type="button" onClick={() => scrollToMilestone(m.id)}
                className="flex flex-col items-center gap-1 group" title={m.name}
              >
                <div className="flex items-center">
                  {i > 0 && <div className="h-px w-3.5 bg-border" />}
                  <div className={cn("w-3 h-3 rounded-full border-2 transition-all", MILESTONE_DOT[s])} />
                  <div className="h-px w-3.5 bg-border" />
                </div>
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-tight whitespace-nowrap px-0.5",
                  s === "late" || s === "behind" || s === "curr" ? MILESTONE_TEXT[s] : "text-muted-foreground",
                )}>
                  J{m.sortOrder}
                </span>
              </button>
            )
          })}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center">
              <div className="h-px w-3.5 bg-border" />
              <div className="w-4 h-4 rounded-full border-2 bg-dore border-dore" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-tight whitespace-nowrap px-0.5 text-brun">
              25–28 juin
            </span>
          </div>
        </div>
      </div>

      {/* Filtre par séquence */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par séquence">
          {[
            { value: ALL, label: "Toutes les séquences", color: null as string | null },
            ...filterOptions.map((s) => ({ value: s.id, label: s.name, color: sequenceColor(s) })),
            { value: NONE, label: "Sans séquence", color: null },
          ].map((opt) => {
            const active = seqFilter === opt.value
            return (
              <button key={opt.value} type="button" onClick={() => setSeqFilter(opt.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active && !opt.color && "border-lagon bg-lagon text-white",
                  !active && "border-border bg-card text-foreground hover:border-foreground/30",
                )}
                style={active && opt.color ? { backgroundColor: opt.color, borderColor: opt.color, color: "#fff" } : undefined}
              >
                {opt.color && (
                  <span aria-hidden className="size-2 rounded-full"
                    style={{ backgroundColor: active ? "#fff" : opt.color }} />
                )}
                {opt.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <label className="flex items-center gap-2 text-xs text-muted-foreground w-fit cursor-pointer">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Afficher les items déjà faits
          </label>
          <p className="text-[11px] text-muted-foreground">
            Une carte par mission et par séquence : chaque item se coche indépendamment pour chaque séquence.
          </p>
        </div>
      </div>

      {/* Jalons */}
      <div className="space-y-3">
        {milestones.map((m) => (
          <MilestoneCard
            key={m.id}
            milestone={m}
            rows={rowsByMilestone.get(m.id) ?? []}
            status={statusById.get(m.id) ?? "empty"}
            isOpen={open.has(m.id)}
            showDone={showDone}
            onToggleOpen={() => toggleOpen(m.id)}
            onToggleRow={toggleRow}
            onSetNotConcerned={setBlockNotConcerned}
          />
        ))}
      </div>
    </div>
  )
}

function MilestoneCard({ milestone: m, rows, status: s, isOpen, showDone, onToggleOpen, onToggleRow, onSetNotConcerned }: {
  milestone: Milestone
  rows: RetroRow[]
  status: MilestoneStatus
  isOpen: boolean
  showDone: boolean
  onToggleOpen: () => void
  onToggleRow: (row: RetroRow) => void
  onSetNotConcerned: (rows: RetroRow[], notConcerned: boolean) => void
}) {
  const t = useMemo(() => computeTotals(rows), [rows])
  const pct = t.rowsTotal ? Math.round((t.rowsDone / t.rowsTotal) * 100) : 0

  // Pôle → cartes « mission × séquence » → lignes. Les cartes d'une même mission restent groupées.
  const groups = useMemo(() => {
    if (!isOpen) return []
    const blocks = new Map<string, RetroBlock>()
    for (const row of rows) {
      const key = blockKey(row)
      const b = blocks.get(key) ?? {
        key, missionId: row.item.missionId, title: row.item.missionTitle, domaineName: row.item.domaineName,
        missionOrder: row.item.missionOrder, poleName: row.item.poleName, poleOrder: row.item.poleOrder,
        sequenceName: row.sequenceName, sequenceColor: row.sequenceColor, sequenceOrder: row.sequenceOrder,
        rows: [], visible: [], worst: ITEM_STATE_ORDER.done,
      }
      b.rows.push(row)
      if (showDone || row.status === "todo") {
        b.visible.push(row)
        b.worst = Math.min(b.worst, ITEM_STATE_ORDER[row.state])
      }
      blocks.set(key, b)
    }
    const missionWorst = new Map<string, number>()
    for (const b of blocks.values()) {
      if (b.visible.length === 0) continue
      missionWorst.set(b.missionId, Math.min(missionWorst.get(b.missionId) ?? ITEM_STATE_ORDER.done, b.worst))
    }
    const byPole = new Map<string, { order: number; blocks: RetroBlock[] }>()
    for (const b of blocks.values()) {
      if (b.visible.length === 0) continue
      b.visible.sort((a, c) =>
        ITEM_STATE_ORDER[a.state] - ITEM_STATE_ORDER[c.state]
        || (a.item.targetDate ?? "").localeCompare(c.item.targetDate ?? "")
        || a.item.sortOrder - c.item.sortOrder)
      const p = byPole.get(b.poleName) ?? { order: b.poleOrder, blocks: [] }
      p.blocks.push(b)
      byPole.set(b.poleName, p)
    }
    for (const p of byPole.values()) {
      p.blocks.sort((a, c) =>
        (missionWorst.get(a.missionId) ?? 9) - (missionWorst.get(c.missionId) ?? 9)
        || a.missionOrder - c.missionOrder
        || a.title.localeCompare(c.title)
        || a.sequenceOrder - c.sequenceOrder)
    }
    return [...byPole.entries()].sort((a, c) => a[1].order - c[1].order)
  }, [rows, isOpen, showDone])

  return (
    <div id={`retro-${m.id}`}
      className={cn(
        "rounded-xl border bg-card overflow-hidden scroll-mt-28",
        s === "curr" && "border-lagon ring-1 ring-lagon",
        s === "late" && "border-bordeaux",
        s === "behind" && "border-corail",
        !["curr", "late", "behind"].includes(s) && "border-border",
      )}
    >
      <button type="button" onClick={onToggleOpen}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={cn("font-heading text-xl font-semibold min-w-[44px] text-center pt-0.5 flex-shrink-0", MILESTONE_TEXT[s])}>
          J{m.sortOrder}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {formatDate(m.targetDate, { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="text-sm font-semibold text-foreground">{m.name}</p>
          {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
          <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground tabular-nums">
            <span>Missions × séquences : {t.blocksDone} / {t.blocksTotal}</span>
            <span>Items × séquences : {t.rowsDone} / {t.rowsTotal}</span>
            {t.late > 0 && <span className="font-medium text-bordeaux">{t.late} en retard</span>}
            {t.behind > 0 && <span className="font-medium text-corail">{t.behind} à rattraper</span>}
            {t.blocking > 0 && <span className="font-medium text-bordeaux">{t.blocking} bloquant{t.blocking > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full",
            s === "late" && "bg-bordeaux/10 text-bordeaux",
            s === "behind" && "bg-corail/10 text-corail",
            s === "curr" && "bg-lagon/10 text-lagon",
            s === "done" && "bg-vert-vegetal/15 text-vert-vegetal",
            (s === "fut" || s === "empty") && "bg-muted text-muted-foreground",
          )}>
            {MILESTONE_STATUS_LABELS[s]}
          </span>
          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
            <div className={cn(
              "h-full rounded-full transition-all",
              s === "late" && "bg-bordeaux",
              s === "behind" && "bg-corail",
              s === "curr" && "bg-lagon",
              s === "done" && "bg-vert-vegetal",
              (s === "fut" || s === "empty") && "bg-muted-foreground/40",
            )} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{pct} %</span>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground flex-shrink-0 self-center transition-transform ml-1", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="border-t border-border px-3 py-2 space-y-3">
          {groups.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {rows.length === 0 ? "Aucun item pour ce jalon avec ce filtre." : "Tout est fait pour ce jalon ✓"}
            </p>
          ) : groups.map(([poleName, p]) => (
            <div key={poleName} className="space-y-2">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-dore/80">
                {poleName}
              </p>
              {p.blocks.map((block) => (
                <MissionSequenceBlock
                  key={block.key}
                  block={block}
                  onToggleRow={onToggleRow}
                  onSetNotConcerned={onSetNotConcerned}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MissionSequenceBlock({ block, onToggleRow, onSetNotConcerned }: {
  block: RetroBlock
  onToggleRow: (row: RetroRow) => void
  onSetNotConcerned: (rows: RetroRow[], notConcerned: boolean) => void
}) {
  const concerned = block.rows.filter((r) => r.status !== "na")
  const doneN = concerned.filter((r) => r.status === "done").length
  const allNa = block.sequenceName !== null && concerned.length === 0
  return (
    <div
      className={cn("rounded-lg border border-border/70 bg-background/40", allNa && "opacity-60")}
      style={block.sequenceColor ? { borderLeft: `3px solid ${block.sequenceColor}` } : undefined}
    >
      <div className="flex items-start gap-2 px-3 py-2 border-b border-border/60">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-snug">
            {block.title}
            {block.sequenceName && (
              <span
                className={cn(
                  "ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium align-middle text-foreground",
                  allNa && "bg-muted text-muted-foreground line-through",
                )}
                style={!allNa && block.sequenceColor ? { backgroundColor: withAlpha(block.sequenceColor, 0.14) } : undefined}
              >
                {block.sequenceColor && <SequenceDot sequence={{ color: block.sequenceColor }} />}
                {block.sequenceName}
              </span>
            )}
          </p>
          {block.domaineName && <p className="text-[10px] text-muted-foreground">{block.domaineName}</p>}
          {block.sequenceName === null && (
            <p className="text-[10px] italic text-muted-foreground">Aucune séquence liée à cette mission</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {allNa ? "Non concernée" : `${doneN} / ${concerned.length}`}
          </span>
          {block.sequenceName !== null && (
            <button type="button" onClick={() => onSetNotConcerned(block.rows, !allNa)}
              className="text-[10px] text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
              title={allNa ? "Réactiver cette séquence pour la mission" : "Aucun item de cette mission ne s'applique à cette séquence"}
            >
              {allNa ? "Réactiver" : "Non concernée"}
            </button>
          )}
        </div>
      </div>
      <div className="px-1 py-1 space-y-0.5">
        {block.visible.map((row) => (
          <RetroItemRow key={`${row.item.id}:${row.sequenceId ?? "-"}`} row={row} onToggle={() => onToggleRow(row)} />
        ))}
      </div>
    </div>
  )
}

function RetroItemRow({ row, onToggle }: { row: RetroRow; onToggle: () => void }) {
  const { item, state: st } = row
  const checked = row.status === "done"
  const na = row.status === "na"
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
    >
      <div className={cn(
        "w-4 h-4 rounded border-[1.5px] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all",
        checked ? "bg-vert-vegetal border-vert-vegetal" : na ? "bg-muted border-dashed border-border" : "bg-card border-border",
      )}>
        {checked && (
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <p className={cn("flex-1 min-w-0 text-xs leading-snug", checked || na ? "line-through text-muted-foreground" : "text-foreground")}>
        {item.label}
      </p>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap",
          st === "late" && "text-bordeaux",
          st === "behind" && "text-corail",
          st === "now" && "text-lagon",
          st === "done" && (na ? "text-muted-foreground" : "text-vert-vegetal"),
          st === "upcoming" && "text-muted-foreground",
        )}>
          {na ? "Non concerné" : ITEM_STATE_LABELS[st]}
        </span>
        {(item.targetDate || item.deadlineDate) && (
          <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap"
            title={[
              item.idealStartDate && `Début idéal : ${formatDate(item.idealStartDate)}`,
              item.targetDate && `Cible : ${formatDate(item.targetDate)}`,
              item.deadlineDate && `Limite : ${formatDate(item.deadlineDate)}`,
            ].filter(Boolean).join(" · ")}
          >
            {item.targetDate ? `cible ${formatDate(item.targetDate)}` : ""}
            {item.deadlineDate ? ` · limite ${formatDate(item.deadlineDate)}` : ""}
          </span>
        )}
        {row.status === "todo" && item.criticality === "blocking" && (
          <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-px rounded-full bg-bordeaux/10 text-bordeaux">
            Bloquant
          </span>
        )}
      </div>
    </button>
  )
}
