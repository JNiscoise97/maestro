import { eachDayOfInterval, format, isSameDay, isWithinInterval, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { useEffect, useState } from "react"

import type { ChecklistItem, PlanningEvent, RosMessage, RunOfShowStep } from "@/types/domain"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

// ── Config ────────────────────────────────────────────────────────────────────

type Granularity = "1h" | "15min"

// ── Palette ───────────────────────────────────────────────────────────────────

type PhaseName = "Installation" | "Jour J" | "Désinstallation"

const PHASE: Record<PhaseName, { bg: string; badge: string; bar: string }> = {
  "Installation": {
    bg:    "bg-sky-50/60 dark:bg-sky-950/25",
    badge: "bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    bar:   "bg-sky-400 dark:bg-sky-500",
  },
  "Jour J": {
    bg:    "bg-rose-50/60 dark:bg-rose-950/25",
    badge: "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    bar:   "bg-rose-400 dark:bg-rose-500",
  },
  "Désinstallation": {
    bg:    "bg-amber-50/60 dark:bg-amber-950/25",
    badge: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    bar:   "bg-amber-400 dark:bg-amber-500",
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
    const match = label.match(/^(\d{1,2})[h:](\d{2})/)
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2])
  }
  return null
}

function phaseInterval(p: PhaseRange) {
  return { start: parseISO(p.startIso), end: parseISO(p.endIso ?? p.startIso) }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhaseBand {
  name: PhaseName
  startMin: number
  endMin: number
  transitionMin?: number
}

interface DayPhaseLabel {
  name: PhaseName
  fromLabel?: string
  untilLabel?: string
}

interface DayData {
  date: Date
  iso: string
  isToday: boolean
  phaseLabels: DayPhaseLabel[]
  bands: PhaseBand[]
}

interface TimedEvent {
  id: string
  kind: "step" | "jalon" | "message" | "task"
  title: string
  startMin: number
  duration: number
  isHighlight?: boolean
  raw: RunOfShowStep | PlanningEvent | RosMessage | ChecklistItem
  assigneeName?: string
  missionTitle?: string
  domaineName?: string
  poleName?: string
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

// ── Calcul par jour ───────────────────────────────────────────────────────────

type PhaseKey = "setup" | "main" | "cleanup"

const PHASE_DEFS: Array<{ name: PhaseName; key: PhaseKey }> = [
  { name: "Installation",    key: "setup"   },
  { name: "Jour J",          key: "main"    },
  { name: "Désinstallation", key: "cleanup" },
]


function hasOverlap(bands: PhaseBand[]): boolean {
  for (let i = 0; i < bands.length; i++)
    for (let j = i + 1; j < bands.length; j++)
      if (bands[i].startMin < bands[j].endMin && bands[j].startMin < bands[i].endMin)
        return true
  return false
}

function computeDayData(
  dayDate: Date,
  ranges: { setup: PhaseRange; main: PhaseRange; cleanup: PhaseRange }
): Pick<DayData, "bands" | "phaseLabels"> {
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
    const rawEnd   = isEndDay   && range.endTime ? hmToMin(range.endTime) : 24 * 60

    const startMin = Math.max(rawStart, 0)
    const endMin   = Math.min(rawEnd, 24 * 60)

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

// ── ListView ──────────────────────────────────────────────────────────────────

interface ListViewProps {
  dateRange?:     { start: Date; end: Date }
  phaseFilter?:   PhaseKey | null
  granularity?:   Granularity
  messageFilter?: boolean
}

export function ListView({ dateRange, phaseFilter, granularity = "1h", messageFilter = false }: ListViewProps) {
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

  const days: DayData[] = eachDayOfInterval({ start: calStart, end: safeEnd }).map((d) => {
    const iso = format(d, "yyyy-MM-dd")
    const { bands, phaseLabels } = computeDayData(d, ranges)
    return { date: d, iso, isToday: isSameDay(d, today), phaseLabels, bands }
  })

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
    const endDt    = new Date(`${item.estimatedEndDate}T${item.estimatedEndTime}`)
    const startDt  = new Date(`${dayIso}T${item.estimatedStartTime}`)
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

  if (isLoading) return <ListSkeleton />

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <DaySection
          key={day.iso}
          day={day}
          timedItems={timedByIso.get(day.iso) ?? []}
          displayPhaseName={displayPhaseName}
          slotMin={granularity === "15min" ? 15 : 60}
          messageFilter={messageFilter}
          guestMap={guestMap}
          personMap={personMap}
        />
      ))}
    </div>
  )
}

// ── DaySection ────────────────────────────────────────────────────────────────

interface DaySectionProps {
  day: DayData
  timedItems: TimedEvent[]
  displayPhaseName: (name: PhaseName) => string
  slotMin: 60 | 15
  messageFilter: boolean
  guestMap: Map<string, string>
  personMap: Map<string, string>
}

function DaySection({ day, timedItems, displayPhaseName, slotMin, messageFilter, guestMap, personMap }: DaySectionProps) {
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    if (!day.isToday) return
    const id = setInterval(() => {
      const n = new Date()
      setNowMin(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [day.isToday])

  const parallel = hasOverlap(day.bands)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">

      {/* En-tête */}
      <div className={`flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 ${day.isToday ? "bg-primary/5" : "bg-muted/20"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`text-sm font-bold capitalize ${day.isToday ? "text-primary" : "text-foreground"}`}>
            {format(day.date, "EEEE d MMMM", { locale: fr })}
          </span>
          {day.isToday && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
              Auj.
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          {day.phaseLabels.map((pl) => {
            const annotation = [pl.fromLabel, pl.untilLabel].filter(Boolean).join(" · ")
            return (
              <span
                key={pl.name}
                className={`flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[10px] ${PHASE[pl.name].badge}`}
              >
                <span className="font-semibold">{displayPhaseName(pl.name)}</span>
                {annotation && <span className="font-normal opacity-70">{annotation}</span>}
              </span>
            )
          })}
          {parallel && (
            <span className="flex shrink-0 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
              <span className="font-bold">∥</span>
              <span className="font-medium">En parallèle</span>
            </span>
          )}
        </div>
      </div>

      {/* Plages horaires */}
      <div className="divide-y divide-border/20">
        {Array.from({ length: 24 * 60 / slotMin }, (_, i) => i * slotMin).map((sMin) => {
          const sEnd        = sMin + slotMin
          const h           = Math.floor(sMin / 60)
          const m           = sMin % 60
          const isHourMark  = m === 0
          const activeBands = day.bands.filter((b) => b.startMin < sEnd && b.endMin > sMin)
          const events      = timedItems
            .filter((e) => e.startMin >= sMin && e.startMin < sEnd && (!messageFilter || e.kind === "message"))
            .sort((a, b) => a.startMin - b.startMin)
          const transitions = day.bands.filter(
            (b) => b.transitionMin != null && b.transitionMin >= sMin && b.transitionMin < sEnd
          )
          const isNowHere   = day.isToday && nowMin >= sMin && nowMin < sEnd
          const primaryBand = activeBands[0]
          const hasContent  = events.length > 0 || transitions.length > 0

          // En mode 15min : slots vides très compacts, slots avec contenu et marques d'heure normaux
          const minH = slotMin === 15 && !hasContent && !isHourMark && !isNowHere
            ? "min-h-[8px]"
            : "min-h-[30px]"

          return (
            <div
              key={sMin}
              className={`relative flex ${minH} items-stretch ${isNowHere ? "bg-red-50/60 dark:bg-red-950/20" : primaryBand ? PHASE[primaryBand.name].bg : ""}`}
            >
              {/* Barre colorée gauche */}
              <div className="flex w-1.5 shrink-0 flex-col">
                {activeBands.length > 0
                  ? activeBands.map((b) => <div key={b.name} className={`flex-1 ${PHASE[b.name].bar}`} />)
                  : <div className="flex-1 bg-border/25" />
                }
              </div>

              {/* Label horaire */}
              <div className="flex w-10 shrink-0 items-start justify-end pr-2.5 pt-[8px]">
                {isHourMark ? (
                  <span className={`tabular-nums text-[11px] leading-none ${isNowHere ? "font-bold text-red-500" : "text-muted-foreground"}`}>
                    {h.toString().padStart(2, "0")}h
                  </span>
                ) : hasContent || isNowHere ? (
                  <span className={`tabular-nums text-[9px] leading-none ${isNowHere ? "font-bold text-red-400" : "text-muted-foreground/50"}`}>
                    :{m.toString().padStart(2, "0")}
                  </span>
                ) : null}
              </div>

              {/* Indicateur "maintenant" */}
              {isNowHere && (
                <div
                  className="absolute left-1.5 right-0 flex items-center"
                  style={{ top: `${((nowMin - sMin) / slotMin) * 100}%` }}
                >
                  <div className="-ml-0.5 size-1.5 shrink-0 rounded-full bg-red-500" />
                  <div className="h-px flex-1 bg-red-400/60" />
                </div>
              )}

              {/* Contenu */}
              {hasContent && (
                <div className="flex flex-1 flex-col gap-1 py-1.5 pr-3">
                  {transitions.map((t) => (
                    <span
                      key={t.name}
                      className={`inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${PHASE[t.name].badge}`}
                    >
                      ↓ {displayPhaseName(t.name)} · {minToLabel(t.transitionMin!)}
                    </span>
                  ))}
                  {events.map((ev) => (
                    <EventRow key={ev.id} ev={ev} guestMap={guestMap} personMap={personMap} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ── EventRow ──────────────────────────────────────────────────────────────────

function EventRow({ ev, guestMap, personMap }: { ev: TimedEvent; guestMap: Map<string, string>; personMap: Map<string, string> }) {
  const [open, setOpen] = useState(false)
  const endMin    = ev.startMin + ev.duration
  const timeRange = `${minToLabel(ev.startMin)} – ${minToLabel(endMin)}`

  let chipCls: string
  if (ev.kind === "task") {
    chipCls = "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
  } else if (ev.kind === "jalon") {
    chipCls = "border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
  } else if (ev.kind === "message") {
    chipCls = "border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
  } else if (ev.isHighlight) {
    chipCls = "bg-rose-500 text-white"
  } else {
    chipCls = "border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-opacity hover:opacity-80 ${chipCls}`}
        >
          <span className="shrink-0 text-[10px] font-bold tabular-nums opacity-60">
            {minToLabel(ev.startMin)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight">
            {ev.title}
          </span>
          <span className="shrink-0 text-[10px] opacity-40">{ev.duration}min</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm" side="right" align="start">
        <EventDetail ev={ev} timeRange={timeRange} guestMap={guestMap} personMap={personMap} />
      </PopoverContent>
    </Popover>
  )
}

// ── EventDetail ───────────────────────────────────────────────────────────────

function EventDetail({ ev, timeRange, guestMap, personMap }: { ev: TimedEvent; timeRange: string; guestMap: Map<string, string>; personMap: Map<string, string> }) {
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

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/20 px-4 py-3">
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="divide-y divide-border/20">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="flex min-h-[30px] items-center gap-3 pl-5 pr-4">
                <Skeleton className="h-2.5 w-6" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
