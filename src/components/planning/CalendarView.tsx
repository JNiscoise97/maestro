import { eachDayOfInterval, format, isSameDay, isWithinInterval, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { useEffect, useRef, useState } from "react"

import type { ChecklistItem, EventSequence, PlanningEvent, RosMessage, RunOfShowStep } from "@/types/domain"
import type { PhaseRange } from "@/context/EventConfigContext"
import { useEventConfig } from "@/context/EventConfigContext"
import { EVENT_TYPE_LABELS } from "@/services/settings.service"
import { useAllChecklistItems, useAllChecklists } from "@/hooks/queries/use-checklists"
import { useMissions } from "@/hooks/queries/use-missions"
import { useDomaines } from "@/hooks/queries/use-domaines"
import { usePoles } from "@/hooks/queries/use-poles"
import { usePlanningEvents } from "@/hooks/queries/use-planning-events"
import { useRosMessages } from "@/hooks/queries/use-ros-messages"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { useRunOfShow } from "@/hooks/queries/use-run-of-show"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

// ── Config ────────────────────────────────────────────────────────────────────

// Plage 0h–24h pour couvrir les événements nocturnes et les transitions de minuit
const HOUR_START    = 0
const HOUR_END      = 24
const HOURS         = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const CELL_H_COMPACT = 56   // px / heure — vue condensée
const CELL_H_EXPANDED = 96  // px / heure — vue détendue (≈ 24px par 15 min)

// ── Palette ───────────────────────────────────────────────────────────────────

type PhaseName = "Installation" | "Jour J" | "Désinstallation"

const PHASE: Record<PhaseName, {
  bg: string; badge: string; line: string; label: string; legend: string
}> = {
  "Installation": {
    bg:     "bg-sky-100/70 dark:bg-sky-950/40",
    badge:  "bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    line:   "bg-sky-300/70 dark:bg-sky-600/60",
    label:  "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950",
    legend: "bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800",
  },
  "Jour J": {
    bg:     "bg-rose-100/70 dark:bg-rose-950/40",
    badge:  "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    line:   "bg-rose-300/70 dark:bg-rose-600/60",
    label:  "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950",
    legend: "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
  },
  "Désinstallation": {
    bg:     "bg-amber-100/70 dark:bg-amber-950/40",
    badge:  "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    line:   "bg-amber-300/70 dark:bg-amber-600/60",
    label:  "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950",
    legend: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  },
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number)
  return h * 60 + (m ?? 0)
}

function minToLabel(m: number) {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}h${(m % 60).toString().padStart(2, "0")}`
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, "0")}`
}

function parseToMinutes(dt?: string | null, label?: string | null): number | null {
  if (dt) {
    const d = new Date(dt)
    if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes()
  }
  if (label) {
    const m = label.match(/^(\d{1,2})[h:](\d{2})/)
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
  }
  return null
}

function phaseInterval(p: PhaseRange) {
  return { start: parseISO(p.startIso), end: parseISO(p.endIso ?? p.startIso) }
}

// ── Types internes ────────────────────────────────────────────────────────────

interface PhaseBand {
  name: PhaseName
  startMin: number      // minutes depuis minuit (0–1440)
  endMin: number
  transitionMin?: number // marqueur de transition si phase commence avec une heure explicite
}

/** Segment de fond sans chevauchement — calcul des plages simultanées. */
interface PhaseSegment {
  name: PhaseName
  startMin: number
  endMin: number
  leftPct: number   // 0–100
  widthPct: number  // 0–100
}

interface DayPhaseLabel {
  name: PhaseName
  fromLabel?: string
  untilLabel?: string
}

interface DayCol {
  date: Date
  iso: string
  isToday: boolean
  phaseLabels: DayPhaseLabel[]
  bands: PhaseBand[]
}

interface TimedEvent {
  id: string
  kind: "step" | "jalon" | "message" | "task" | "sequence"
  title: string
  startMin: number
  duration: number
  isHighlight?: boolean
  raw: RunOfShowStep | PlanningEvent | RosMessage | ChecklistItem | EventSequence
  assigneeName?: string
  missionTitle?: string
  domaineName?: string
  poleName?: string
}

// ── Segments (gestion chevauchements) ────────────────────────────────────────

function hasOverlap(bands: PhaseBand[]): boolean {
  for (let i = 0; i < bands.length; i++)
    for (let j = i + 1; j < bands.length; j++)
      if (bands[i].startMin < bands[j].endMin && bands[j].startMin < bands[i].endMin)
        return true
  return false
}

/**
 * Transforme un tableau de bandes en segments sans chevauchement.
 * Quand plusieurs phases se superposent, elles sont affichées côte à côte
 * (chaque phase occupe une fraction égale de la largeur de colonne).
 */
function bandsToSegments(bands: PhaseBand[]): PhaseSegment[] {
  if (bands.length === 0) return []

  const times = [...new Set(bands.flatMap((b) => [b.startMin, b.endMin]))].sort((a, b) => a - b)
  const segments: PhaseSegment[] = []

  for (let i = 0; i < times.length - 1; i++) {
    const t0     = times[i]
    const t1     = times[i + 1]
    const active = bands.filter((b) => b.startMin <= t0 && b.endMin >= t1)
    if (active.length === 0) continue
    const w = 100 / active.length
    active.forEach((b, idx) => {
      segments.push({ name: b.name, startMin: t0, endMin: t1, leftPct: w * idx, widthPct: w })
    })
  }

  return segments
}

// ── Calcul données par jour ───────────────────────────────────────────────────

type PhaseKey = "setup" | "main" | "cleanup"

const PHASE_DEFS: Array<{ name: PhaseName; key: PhaseKey }> = [
  { name: "Installation",    key: "setup"   },
  { name: "Jour J",          key: "main"    },
  { name: "Désinstallation", key: "cleanup" },
]



function computeDayData(
  dayDate: Date,
  ranges: { setup: PhaseRange; main: PhaseRange; cleanup: PhaseRange }
): Pick<DayCol, "bands" | "phaseLabels"> {
  const bands: PhaseBand[]           = []
  const phaseLabels: DayPhaseLabel[] = []

  for (const def of PHASE_DEFS) {
    const range     = ranges[def.key]
    const startDate = parseISO(range.startIso)
    const endDate   = parseISO(range.endIso ?? range.startIso)

    if (!isWithinInterval(dayDate, { start: startDate, end: endDate })) continue

    const isStartDay = isSameDay(dayDate, startDate)
    const isEndDay   = isSameDay(dayDate, endDate)

    const rawStart = isStartDay && range.time    ? hmToMin(range.time)    : 0
    const rawEnd   = isEndDay   && range.endTime ? hmToMin(range.endTime) : HOUR_END * 60

    const startMin = Math.max(rawStart, 0)
    const endMin   = Math.min(rawEnd, HOUR_END * 60)

    if (startMin < endMin) {
      bands.push({
        name: def.name,
        startMin,
        endMin,
        transitionMin: isStartDay && !!range.time ? rawStart : undefined,
      })
    }

    const label: DayPhaseLabel = { name: def.name }
    if (isStartDay && range.time)    label.fromLabel  = `dès ${minToLabel(hmToMin(range.time))}`
    if (isEndDay   && range.endTime) label.untilLabel = `jusqu'à ${minToLabel(hmToMin(range.endTime))}`
    phaseLabels.push(label)
  }

  return { bands, phaseLabels }
}

// ── Helpers messages ─────────────────────────────────────────────────────────

function resolveDeliverer(msg: RosMessage, guestMap: Map<string, string>, personMap: Map<string, string>): string | null {
  if (!msg.delivererType) return null
  if (msg.delivererType === "both_fiances") return "Les deux fiancé·e·s"
  if (msg.delivererType === "fiance") return msg.delivererPersonId ? (personMap.get(msg.delivererPersonId) ?? "Fiancé·e") : "Fiancé·e"
  if (msg.delivererType === "guest")  return msg.delivererGuestId  ? (guestMap.get(msg.delivererGuestId)  ?? "Invité·e")  : "Invité·e"
  return null
}

function resolveRecipient(msg: RosMessage, guestMap: Map<string, string>, personMap: Map<string, string>): string | null {
  if (!msg.recipientType) return msg.recipientLabel
  if (msg.recipientType === "all_guests")   return "Tous les invités"
  if (msg.recipientType === "both_fiances") return "Les deux fiancé·e·s"
  if (msg.recipientType === "fiance")  return msg.recipientPersonId ? (personMap.get(msg.recipientPersonId) ?? "Fiancé·e") : "Fiancé·e"
  if (msg.recipientType === "guest")   return msg.recipientGuestId  ? (guestMap.get(msg.recipientGuestId)  ?? "Invité·e")  : "Invité·e"
  if (msg.recipientType === "other")   return msg.recipientLabel
  return msg.recipientLabel
}

const DELIVERER_STATUS_LABEL: Record<string, string> = {
  pending:  "En attente de confirmation",
  accepted: "Accepté",
  declined:  "Refusé",
}

// ── CalendarView ──────────────────────────────────────────────────────────────

type Granularity = "1h" | "15min"

interface CalendarViewProps {
  dateRange?:     { start: Date; end: Date }
  phaseFilter?:   PhaseKey | null
  granularity?:   Granularity
  messageFilter?: boolean
}

export function CalendarView({ dateRange, phaseFilter, granularity = "1h", messageFilter = false }: CalendarViewProps) {
  const CELL_H = granularity === "15min" ? CELL_H_EXPANDED : CELL_H_COMPACT
  const [taskFilter, setTaskFilter] = useState(false)
  const { phaseSetup, phaseMain, phaseCleanup, eventType } = useEventConfig()
  const displayPhaseName = (name: PhaseName) =>
    name === "Jour J" ? EVENT_TYPE_LABELS[eventType] : name
  const { data: steps          = [], isLoading: l1 } = useRunOfShow()
  const { data: planEvts       = [], isLoading: l4 } = usePlanningEvents()
  const { data: messages       = [], isLoading: l5 } = useRosMessages()
  const { data: guests         = [], isLoading: l6 } = useGuests()
  const { data: people         = [], isLoading: l7 } = usePeople()
  const { data: allItems       = [], isLoading: l8 } = useAllChecklistItems()
  const { data: allChecklists  = []                } = useAllChecklists()
  const { data: missions       = []                } = useMissions()
  const { data: domaines       = []                } = useDomaines()
  const { data: poles          = []                } = usePoles()
  const { data: sequences      = []                } = useEventSequences()
  const isLoading = l1 || l4 || l5 || l6 || l7 || l8

  const guestMap   = new Map(guests.map((g)   => [g.id, g.fullName]))
  const personMap  = new Map(people.map((p)   => [p.id, p.fullName]))
  const missionMap = new Map(missions.map((m)  => [m.id, m]))
  const domaineMap = new Map(domaines.map((d)  => [d.id, d]))
  const poleMap    = new Map(poles.map((p)     => [p.id, p]))
  const checklistMissionMap = new Map<string, string>()
  for (const c of allChecklists) {
    if (c.ownerType === "mission" && c.ownerId) checklistMissionMap.set(c.id, c.ownerId)
  }

  const today    = new Date()
  const calStart = dateRange?.start ?? parseISO(phaseSetup.startIso)
  const calEnd   = dateRange?.end   ?? parseISO(phaseCleanup.endIso ?? phaseCleanup.startIso)
  const safeEnd  = calEnd >= calStart ? calEnd : calStart
  const ranges   = { setup: phaseSetup, main: phaseMain, cleanup: phaseCleanup }

  const days: DayCol[] = eachDayOfInterval({ start: calStart, end: safeEnd }).map((d) => {
    const iso = format(d, "yyyy-MM-dd")
    const { bands, phaseLabels } = computeDayData(d, ranges)
    return { date: d, iso, isToday: isSameDay(d, today), phaseLabels, bands }
  })

  // Événements horaires
  const timedByIso = new Map<string, TimedEvent[]>(days.map((d) => [d.iso, []]))

  // Steps + messages = programme Jour J → masqués si filtre sur autre phase
  if (!phaseFilter || phaseFilter === "main") {
    const stepPosMap = new Map<string, { startMin: number; dayIso: string }>()
    for (const s of steps) {
      const startMin = parseToMinutes(s.startsAt, s.timeLabel)
      if (startMin == null) continue
      const dayIso = s.startsAt ? format(new Date(s.startsAt), "yyyy-MM-dd") : phaseMain.startIso
      stepPosMap.set(s.id, { startMin, dayIso })
      timedByIso.get(dayIso)?.push({
        id: s.id, kind: "step", title: s.label, startMin,
        duration: s.durationMinutes ?? 30, isHighlight: s.isHighlight, raw: s,
      })
    }
    for (const msg of messages) {
      const pos = stepPosMap.get(msg.stepId)
      if (!pos) continue
      const startMin = parseToMinutes(null, msg.scheduledTime) ?? pos.startMin
      timedByIso.get(pos.dayIso)?.push({
        id: `msg-${msg.id}`,
        kind: "message",
        title: msg.subject ?? msg.content.slice(0, 60),
        startMin,
        duration: 5,
        raw: msg,
      })
    }
  }

  for (const ev of planEvts) {
    if (!ev.startsAt) continue
    const startMin = parseToMinutes(ev.startsAt, null)
    if (startMin == null) continue
    const dayIso = format(new Date(ev.startsAt), "yyyy-MM-dd")
    if (!timedByIso.has(dayIso)) continue
    const startMs = new Date(ev.startsAt).getTime()
    const endMs   = ev.endsAt ? new Date(ev.endsAt).getTime() : startMs + 3600000
    timedByIso.get(dayIso)!.push({
      id: ev.id, kind: "jalon", title: ev.title, startMin,
      duration: Math.max(15, Math.round((endMs - startMs) / 60000)), raw: ev,
    })
  }

  // Checklist items ponctuel avec début et fin complets
  for (const item of allItems) {
    if (
      item.taskSchedulingType !== "periode" ||
      !item.estimatedStartDate || !item.estimatedStartTime ||
      !item.estimatedEndDate   || !item.estimatedEndTime
    ) continue
    const dayIso = item.estimatedStartDate
    if (!timedByIso.has(dayIso)) continue
    if (phaseFilter) {
      const range = { setup: phaseSetup, main: phaseMain, cleanup: phaseCleanup }[phaseFilter]
      if (!isWithinInterval(parseISO(dayIso), phaseInterval(range))) continue
    }
    const startMin = hmToMin(item.estimatedStartTime)
    const startDt  = new Date(`${dayIso}T${item.estimatedStartTime}`)
    const endDt    = new Date(`${item.estimatedEndDate}T${item.estimatedEndTime}`)
    const duration = Math.max(15, Math.round((endDt.getTime() - startDt.getTime()) / 60000))
    const assigneeName = item.assigneeGuestId
      ? (guestMap.get(item.assigneeGuestId) ?? personMap.get(item.assigneeGuestId))
      : undefined
    const missionId   = checklistMissionMap.get(item.checklistId)
    const mission     = missionId ? missionMap.get(missionId) : undefined
    const domaine     = mission?.domaineId ? domaineMap.get(mission.domaineId) : undefined
    const pole        = domaine?.poleId    ? poleMap.get(domaine.poleId)       : undefined
    timedByIso.get(dayIso)!.push({
      id: item.id, kind: "task", title: item.label,
      startMin, duration, raw: item, assigneeName,
      missionTitle: mission?.title,
      domaineName:  domaine?.name,
      poleName:     pole?.name,
    })
  }

  // Séquences d'événement
  for (const seq of sequences) {
    if (!seq.eventDate || !seq.startTime) continue
    if (!timedByIso.has(seq.eventDate)) continue
    const startMin = hmToMin(seq.startTime)
    // Si la séquence finit un autre jour, on l'étend jusqu'à minuit sur le jour de début
    const crossDay = seq.endDate && seq.endDate !== seq.eventDate
    const endMin   = crossDay
      ? HOUR_END * 60
      : seq.endTime ? hmToMin(seq.endTime) : startMin + 60
    const duration = Math.max(30, endMin - startMin)
    timedByIso.get(seq.eventDate)!.push({
      id: `seq-${seq.id}`,
      kind: "sequence",
      title: seq.name + (crossDay ? " →" : ""),
      startMin,
      duration,
      raw: seq,
    })
    // Continuation sur le jour de fin si présente dans la grille
    if (crossDay && seq.endDate && timedByIso.has(seq.endDate)) {
      const endMin2 = seq.endTime ? hmToMin(seq.endTime) : 60
      timedByIso.get(seq.endDate)!.push({
        id: `seq-${seq.id}-end`,
        kind: "sequence",
        title: "← " + seq.name,
        startMin: 0,
        duration: endMin2,
        raw: seq,
      })
    }
  }

  // Scroll initial : 8h pour avoir le début de matinée visible en haut
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * CELL_H
    }
  }, [isLoading])

  if (isLoading) return <CalendarSkeleton cols={days.length || 3} />

  const gridH     = HOUR_END * CELL_H  // hauteur totale de la grille horaire (0h–24h)
  const colDef    = `52px repeat(${days.length}, minmax(160px, 1fr))`
  return (
    <div className="flex flex-col gap-3">

      {/* Légende événements */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setTaskFilter((v) => !v)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
            taskFilter
              ? "border-emerald-500 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400/40 ring-offset-1 dark:border-emerald-400 dark:bg-emerald-900 dark:text-emerald-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          }`}
        >
          Tâche
        </button>
        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-600 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400">
          Jalon
        </span>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400">
          Programme
        </span>
        <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[11px] font-medium text-fuchsia-600 dark:border-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-400">
          Séquence
        </span>
      </div>

      {/* Calendrier — scroll unique (x + y) */}
      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl border border-border bg-card"
        style={{ maxHeight: "74vh" }}
      >
        <div className="grid" style={{ gridTemplateColumns: colDef }}>

          {/* ── En-têtes sticky top ──────────────────────────────────── */}

          <div className="sticky left-0 top-0 z-30 border-b border-r border-border bg-card" />

          {days.map((d) => {
            const parallel = hasOverlap(d.bands)
            return (
              <div
                key={`hd-${d.iso}`}
                className={`sticky top-0 z-20 flex flex-col gap-1 border-b border-r border-border bg-card px-2 py-2 last:border-r-0 ${d.isToday ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold capitalize ${d.isToday ? "text-primary" : "text-foreground"}`}>
                    {format(d.date, "EEE", { locale: fr })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(d.date, "d MMM", { locale: fr })}
                  </span>
                  {d.isToday && (
                    <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                      Auj.
                    </span>
                  )}
                </div>
                {d.phaseLabels.map((pl) => {
                  const annotation = [pl.fromLabel, pl.untilLabel].filter(Boolean).join(" · ")
                  return (
                    <div
                      key={pl.name}
                      className={`flex items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] ${PHASE[pl.name].badge}`}
                    >
                      <span className="font-semibold">{displayPhaseName(pl.name)}</span>
                      {annotation && <span className="font-normal opacity-70">{annotation}</span>}
                    </div>
                  )
                })}
                {parallel && (
                  <div className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                    <span className="font-bold">∥</span>
                    <span className="font-medium">En parallèle</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Grille horaire 0h–24h ────────────────────────────────── */}

          {/* Gouttière heures sticky left */}
          <div
            className="sticky left-0 z-10 border-r border-border bg-card"
            style={{ height: gridH }}
          >
            {granularity === "15min"
              ? Array.from({ length: 24 * 4 }, (_, i) => i * 15).map((min) => {
                  const h = Math.floor(min / 60)
                  const m = min % 60
                  return (
                    <div
                      key={min}
                      className={`relative ${m === 0 ? "border-b border-border/30" : "border-b border-border/10"}`}
                      style={{ height: CELL_H / 4 }}
                    >
                      {m === 0 && (
                        <span className={`absolute right-2 tabular-nums text-[10px] text-muted-foreground ${min === 0 ? "top-0.5" : "-top-2"}`}>
                          {h}h
                        </span>
                      )}
                      {m === 30 && (
                        <span className="absolute -top-1.5 right-2 tabular-nums text-[8px] text-muted-foreground/45">
                          :30
                        </span>
                      )}
                    </div>
                  )
                })
              : HOURS.map((h) => (
                  <div key={h} className="relative border-b border-border/30" style={{ height: CELL_H }}>
                    <span className={`absolute right-2 tabular-nums text-[10px] text-muted-foreground ${h === 0 ? "top-1" : "-top-2"}`}>
                      {h}h
                    </span>
                  </div>
                ))
            }
          </div>

          {/* Colonnes jours */}
          {days.map((d) => {
            const segments = bandsToSegments(d.bands)
            return (
              <div
                key={`tg-${d.iso}`}
                className={`relative border-r border-border last:border-r-0 ${d.isToday ? "bg-primary/[0.015]" : ""}`}
                style={{ height: gridH }}
              >
                {/* Segments de phase (gestion chevauchements avec split côte à côte) */}
                {segments.map((seg, i) => {
                  const top    = (seg.startMin / 60) * CELL_H
                  const height = ((seg.endMin - seg.startMin) / 60) * CELL_H
                  return (
                    <div
                      key={`seg-${i}`}
                      className={`absolute ${PHASE[seg.name].bg}`}
                      style={{
                        top,
                        height,
                        left:  `${seg.leftPct}%`,
                        width: `${seg.widthPct}%`,
                      }}
                    />
                  )
                })}

                {/* Marqueurs de transition de phase */}
                {d.bands.filter((b) => b.transitionMin != null).map((band) => {
                  const top = (band.transitionMin! / 60) * CELL_H
                  return (
                    <div
                      key={`trans-${band.name}`}
                      className="absolute inset-x-0 z-[3] flex items-center gap-1"
                      style={{ top: top - 7 }}
                    >
                      <div className={`h-px flex-1 ${PHASE[band.name].line}`} />
                      <span className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold ${PHASE[band.name].label}`}>
                        {displayPhaseName(band.name)} · {minToLabel(band.transitionMin!)}
                      </span>
                      <div className={`h-px flex-1 ${PHASE[band.name].line}`} />
                    </div>
                  )
                })}

                {/* Lignes de grille */}
                {granularity === "15min"
                  ? Array.from({ length: 24 * 4 }, (_, i) => i * 15).map((min) => {
                      const m = min % 60
                      return (
                        <div
                          key={min}
                          className={`absolute inset-x-0 ${
                            m === 0  ? "border-b border-border/20"
                            : m === 30 ? "border-b border-dashed border-border/15"
                            : "border-b border-dashed border-border/8"
                          }`}
                          style={{ top: (min / 60) * CELL_H }}
                        />
                      )
                    })
                  : <>
                      {HOURS.map((_, i) => (
                        <div key={i} className="absolute inset-x-0 border-b border-border/20" style={{ top: i * CELL_H }} />
                      ))}
                      {HOURS.map((_, i) => (
                        <div key={`hh-${i}`} className="absolute inset-x-0 border-b border-dashed border-border/10" style={{ top: i * CELL_H + CELL_H / 2 }} />
                      ))}
                    </>
                }

                {/* Indicateur "maintenant" */}
                {d.isToday && <NowIndicator cellH={CELL_H} />}

                {/* Événements */}
                {timedByIso.get(d.iso)
                  ?.filter((ev) => (!messageFilter || ev.kind === "message") && (!taskFilter || ev.kind === "task"))
                  .map((ev) => <TimedBlock key={ev.id} ev={ev} cellH={CELL_H} guestMap={guestMap} personMap={personMap} />)
                }
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}

// ── NowIndicator ──────────────────────────────────────────────────────────────

function NowIndicator({ cellH }: { cellH: number }) {
  const [, rerender] = useState(0)
  useEffect(() => {
    const id = setInterval(() => rerender((v) => v + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const now    = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const top    = (nowMin / 60) * cellH

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[5] flex items-center"
      style={{ top }}
    >
      <div className="-ml-1 size-2 shrink-0 rounded-full bg-red-500 shadow-sm" />
      <div className="h-px flex-1 bg-red-500/60" />
    </div>
  )
}


// ── TimedBlock ────────────────────────────────────────────────────────────────

function TimedBlock({ ev, cellH, guestMap, personMap }: { ev: TimedEvent; cellH: number; guestMap: Map<string, string>; personMap: Map<string, string> }) {
  const [open, setOpen] = useState(false)

  // Filtre : événements hors de la plage 0h–24h
  if (ev.startMin < 0 || ev.startMin >= HOUR_END * 60) return null

  const top     = (ev.startMin / 60) * cellH
  const height  = Math.max(22, (ev.duration / 60) * cellH)
  const compact = height < 38

  let blockCls: string
  if (ev.kind === "sequence") {
    blockCls = "border-2 border-fuchsia-400 dark:border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/70 text-fuchsia-800 dark:text-fuchsia-200 font-semibold shadow-sm"
  } else if (ev.kind === "task") {
    blockCls = "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
  } else if (ev.kind === "jalon") {
    blockCls = "border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
  } else if (ev.kind === "message") {
    blockCls = "border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
  } else if (ev.isHighlight) {
    blockCls = "bg-rose-500 text-white shadow-sm ring-2 ring-rose-300/30 dark:ring-rose-700/30"
  } else {
    blockCls = "border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`absolute inset-x-1 z-[4] overflow-hidden rounded px-1.5 text-left transition-opacity hover:opacity-90 ${blockCls}`}
          style={{ top, height, paddingTop: compact ? 2 : 4, paddingBottom: compact ? 2 : 4 }}
        >
          {compact ? (
            <div className="flex items-center gap-1 text-[10px] leading-none">
              <span className="shrink-0 font-semibold">{minToLabel(ev.startMin)}</span>
              <span className="truncate opacity-90">{ev.title}</span>
            </div>
          ) : (
            <>
              <div className="text-[10px] font-semibold leading-tight">{minToLabel(ev.startMin)}</div>
              <div className="mt-0.5 truncate text-[10px] leading-tight opacity-90">{ev.title}</div>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm" side="right" align="start">
        <TimedDetail ev={ev} guestMap={guestMap} personMap={personMap} />
      </PopoverContent>
    </Popover>
  )
}

// ── TimedDetail ───────────────────────────────────────────────────────────────

function TimedDetail({ ev, guestMap, personMap }: { ev: TimedEvent; guestMap: Map<string, string>; personMap: Map<string, string> }) {
  const endMin    = ev.startMin + ev.duration
  const timeRange = `${minToLabel(ev.startMin)} – ${minToLabel(endMin)}`

  if (ev.kind === "sequence") {
    const seq = ev.raw as EventSequence
    const endMin = ev.startMin + ev.duration
    return (
      <div className="space-y-1.5">
        <p className="font-semibold text-fuchsia-700 dark:text-fuchsia-300">{seq.name}</p>
        <p className="text-xs text-muted-foreground">
          {minToLabel(ev.startMin)}{seq.endTime ? ` – ${minToLabel(endMin)}` : ""} · {fmtDuration(ev.duration)}
        </p>
        {seq.description && <p className="text-xs">{seq.description}</p>}
        {seq.eventDate && (
          <p className="text-xs text-muted-foreground">
            {new Date(seq.eventDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        )}
      </div>
    )
  }

  if (ev.kind === "task") {
    return (
      <div className="space-y-2">
        <p className="font-semibold">{ev.title}</p>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {ev.missionTitle && <p>Mission · {ev.missionTitle}</p>}
          {ev.domaineName  && <p>Domaine · {ev.domaineName}</p>}
          {ev.poleName     && <p>Pôle · {ev.poleName}</p>}
          <p className="font-semibold text-foreground">{timeRange} · {fmtDuration(ev.duration)}</p>
          {ev.assigneeName && <p>👤 {ev.assigneeName}</p>}
        </div>
      </div>
    )
  }
  if (ev.kind === "message") {
    const msg       = ev.raw as RosMessage
    const deliverer = resolveDeliverer(msg, guestMap, personMap)
    const recipient = resolveRecipient(msg, guestMap, personMap)
    return (
      <div className="space-y-2">
        {msg.subject && <p className="font-semibold">{msg.subject}</p>}
        <p className={msg.subject ? "text-xs" : "font-medium text-sm"}>{msg.content}</p>
        <div className="space-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground">
          <p>{minToLabel(ev.startMin)}</p>
          {msg.deliveryMode && (
            <p>{msg.deliveryMode === "micro" ? "🎤 Au micro" : "🤫 Discret"}</p>
          )}
          {deliverer && <p>Porteur : {deliverer}</p>}
          {recipient && <p>→ {recipient}</p>}
          {msg.delivererStatus && (
            <p className={
              msg.delivererStatus === "accepted" ? "text-green-600 dark:text-green-400"
              : msg.delivererStatus === "declined" ? "text-red-600 dark:text-red-400"
              : ""
            }>
              Statut : {DELIVERER_STATUS_LABEL[msg.delivererStatus]}
            </p>
          )}
          {msg.sentAt && (
            <p className="text-green-600 dark:text-green-400">
              ✓ Transmis le {format(new Date(msg.sentAt), "d MMM à HH'h'mm", { locale: fr })}
            </p>
          )}
          {msg.notDelivered && (
            <p className="text-red-600 dark:text-red-400">✗ Non transmis</p>
          )}
        </div>
      </div>
    )
  }

  if (ev.kind === "step") {
    const s = ev.raw as RunOfShowStep
    return (
      <div className="space-y-1.5">
        <p className="font-semibold">{s.label}</p>
        <p className="text-xs text-muted-foreground">{timeRange}</p>
        {s.location && <p className="text-xs text-muted-foreground">📍 {s.location}</p>}
        {s.music    && <p className="text-xs text-muted-foreground">🎵 {s.music}</p>}
        {s.notes    && <p className="mt-1 text-xs">{s.notes}</p>}
      </div>
    )
  }

  const e = ev.raw as PlanningEvent
  return (
    <div className="space-y-1.5">
      <p className="font-semibold">{e.title}</p>
      <p className="text-xs text-muted-foreground">{timeRange}</p>
      {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
      {e.location    && <p className="text-xs text-muted-foreground">📍 {e.location}</p>}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CalendarSkeleton({ cols }: { cols: number }) {
  const colDef = `52px repeat(${cols}, minmax(160px, 1fr))`
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid border-b border-border" style={{ gridTemplateColumns: colDef }}>
        <div className="border-r border-border" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 border-r border-border p-2 last:border-r-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: colDef, height: 6 * CELL_H_COMPACT }}>
        <div className="border-r border-border bg-muted/20" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="border-r border-border last:border-r-0" />
        ))}
      </div>
    </div>
  )
}
