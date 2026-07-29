import { useEffect, useMemo, useState } from "react"
import {
  CheckCheck, CheckCircle2, Circle, Clock, EarOff, MessageSquare,
  Mic, Swords, User, Users, XCircle,
} from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { useIdentity } from "@/context/IdentityContext"
import {
  useRosMessages,
  useRespondToMessage,
  useMarkMessageSent,
  useUpdateRosMessage,
} from "@/hooks/queries/use-ros-messages"
import { useRosLaunches } from "@/hooks/queries/use-ros-launches"
import { useMissions } from "@/hooks/queries/use-missions"
import { useGuests } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import { useMissionAcceptancesForGuest, useRespondToMission } from "@/hooks/queries/use-mission-acceptances"
import { useResponsableEntries } from "@/hooks/use-responsable-entries"
import { sortableTime } from "@/lib/run-of-show"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Guest, MissionAcceptanceStatus, Person, RosMessage } from "@/types/domain"

// ── Helpers ────────────────────────────────────────────────────────────────────

function resolveRecipient(msg: RosMessage, guests: Guest[], people: Person[]): string | null {
  if (!msg.recipientType) return null
  switch (msg.recipientType) {
    case "guest":        return guests.find(x => x.id === msg.recipientGuestId)?.fullName ?? null
    case "fiance":       return people.find(x => x.id === msg.recipientPersonId)?.fullName ?? null
    case "both_fiances": return "Les deux fiancés"
    case "all_guests":   return "Tous les invités"
    case "other":        return msg.recipientLabel ?? null
    default:             return null
  }
}

function countdownLabel(scheduledTime: string, now: Date): string | null {
  const [h, m] = scheduledTime.split(":").map(Number)
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  if (h < 7 && now.getHours() >= 7) target.setDate(target.getDate() + 1)
  const diffMin = Math.ceil((target.getTime() - now.getTime()) / 60_000)
  if (diffMin <= 0) return null
  if (diffMin < 60) return `dans ${diffMin} min`
  const hrs = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  return mins > 0 ? `dans ${hrs} h ${mins} min` : `dans ${hrs} h`
}

type MessageLifecycle = "pending" | "declined" | "accepted" | "transmitted" | "not-transmitted"

function getLifecycle(msg: RosMessage): MessageLifecycle {
  if (msg.sentAt !== null) return "transmitted"
  if (msg.notDelivered === true) return "not-transmitted"
  if (msg.delivererStatus === "declined") return "declined"
  if (msg.delivererStatus === "accepted") return "accepted"
  return "pending"
}

// ── Méta pills (destinataire / heure / mode) ──────────────────────────────────

function MetaPills({ msg }: { msg: RosMessage }) {
  const { data: guests = [] } = useGuests()
  const { data: people = [] } = usePeople()
  const recipient = resolveRecipient(msg, guests, people)
  const isMulti = msg.recipientType === "both_fiances" || msg.recipientType === "all_guests"

  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {recipient && (
        <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5">
          {isMulti ? <Users className="size-3 shrink-0 text-muted-foreground" /> : <User className="size-3 shrink-0 text-muted-foreground" />}
          <span className="text-muted-foreground">Pour</span>
          <span className="font-medium text-foreground">{recipient}</span>
        </span>
      )}
      {msg.scheduledTime && (
        <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5">
          <Clock className="size-3 shrink-0 text-muted-foreground" />
          <span className="font-mono font-semibold text-foreground">{msg.scheduledTime}</span>
        </span>
      )}
      {msg.deliveryMode === "micro" && (
        <span className="flex items-center gap-1 rounded-full bg-bordeaux/10 px-2.5 py-0.5 font-semibold text-bordeaux">
          <Mic className="size-3" />Micro
        </span>
      )}
      {msg.deliveryMode === "discret" && (
        <span className="flex items-center gap-1 rounded-full bg-lagon/10 px-2.5 py-0.5 font-semibold text-lagon">
          <EarOff className="size-3" />Discret
        </span>
      )}
    </div>
  )
}

// ── Card : en attente ─────────────────────────────────────────────────────────

function PendingMessageCard({ msg }: { msg: RosMessage }) {
  const respond = useRespondToMessage()
  const [busy, setBusy] = useState(false)

  async function handleRespond(status: MissionAcceptanceStatus) {
    setBusy(true)
    try { await respond.mutateAsync({ id: msg.id, status }) }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">{msg.subject ?? "Message"}</p>
      </div>
      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{msg.content}</p>
      </div>
      <MetaPills msg={msg} />
      <div className="flex gap-2 pt-0.5">
        <Button size="sm" variant="success" className="gap-1.5" disabled={busy} onClick={() => handleRespond("accepted")}>
          <CheckCircle2 className="size-3.5" />Accepter
        </Button>
        <Button size="sm" variant="destructive" className="gap-1.5" disabled={busy} onClick={() => handleRespond("declined")}>
          <XCircle className="size-3.5" />Décliner
        </Button>
      </div>
    </div>
  )
}

// ── Card : accepté (countdown + délivré ?) ────────────────────────────────────

function AcceptedMessageCard({ msg }: { msg: RosMessage }) {
  const markSent = useMarkMessageSent()
  const updateMsg = useUpdateRosMessage()
  const [now, setNow] = useState(() => new Date())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const countdown = msg.scheduledTime ? countdownLabel(msg.scheduledTime, now) : null

  async function handleDelivered(delivered: boolean) {
    setBusy(true)
    try {
      if (delivered) {
        await markSent.mutateAsync({ id: msg.id, sent: true })
      } else {
        await updateMsg.mutateAsync({ id: msg.id, patch: { notDelivered: true } })
      }
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <MessageSquare className="size-3.5 shrink-0 text-emerald-600" />
          <p className="text-sm font-semibold text-foreground">{msg.subject ?? "Message"}</p>
        </div>
        {countdown && (
          <span className="shrink-0 text-xs font-semibold text-lagon">{countdown}</span>
        )}
      </div>
      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{msg.content}</p>
      </div>
      <MetaPills msg={msg} />
      <div className="flex items-center gap-3 pt-0.5">
        <span className="text-sm font-medium text-foreground">Message délivré ?</span>
        <div className="flex gap-2">
          <Button size="sm" variant="success" className="gap-1.5" disabled={busy} onClick={() => handleDelivered(true)}>
            <CheckCheck className="size-3.5" />Oui
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5" disabled={busy} onClick={() => handleDelivered(false)}>
            <Circle className="size-3.5" />Non
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Card : transmis ───────────────────────────────────────────────────────────

function TransmittedMessageCard({ msg }: { msg: RosMessage }) {
  const markSent = useMarkMessageSent()

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 opacity-70">
      <CheckCheck className="size-4 shrink-0 text-emerald-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{msg.subject ?? "Message"}</p>
        {msg.sentAt && (
          <p className="text-xs text-muted-foreground">
            Transmis à {new Date(msg.sentAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => markSent.mutate({ id: msg.id, sent: false })}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        Annuler
      </button>
    </div>
  )
}

// ── Card : non transmis ───────────────────────────────────────────────────────

function NotTransmittedMessageCard({ msg }: { msg: RosMessage }) {
  const updateMsg = useUpdateRosMessage()

  return (
    <div className="rounded-xl border border-destructive/20 bg-card px-4 py-3 flex items-center gap-3 opacity-70">
      <XCircle className="size-4 shrink-0 text-destructive" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{msg.subject ?? "Message"}</p>
        <p className="text-xs text-muted-foreground">Non transmis</p>
      </div>
      <button
        type="button"
        onClick={() => updateMsg.mutate({ id: msg.id, patch: { notDelivered: null } })}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        Annuler
      </button>
    </div>
  )
}

// ── Card : décliné ────────────────────────────────────────────────────────────

function DeclinedMessageCard({ msg }: { msg: RosMessage }) {
  const respond = useRespondToMessage()

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 opacity-60">
      <XCircle className="size-4 shrink-0 text-muted-foreground" />
      <p className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{msg.subject ?? "Message"}</p>
      <button
        type="button"
        onClick={() => respond.mutate({ id: msg.id, status: "pending" })}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        Reconsidérer
      </button>
    </div>
  )
}

// ── Section helper ─────────────────────────────────────────────────────────────

function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
      )}
    </div>
  )
}

// ── Card mission ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MissionAcceptanceStatus | null | undefined }) {
  if (!status || status === "pending") {
    return <Badge variant="outline" className="shrink-0 gap-1 text-xs text-muted-foreground"><Clock className="size-3" />En attente</Badge>
  }
  if (status === "accepted") {
    return <Badge variant="success" className="shrink-0 gap-1 text-xs"><CheckCircle2 className="size-3" />Accepté</Badge>
  }
  return <Badge variant="destructive" className="shrink-0 gap-1 text-xs"><XCircle className="size-3" />Décliné</Badge>
}

function MissionCard({ missionId, guestId }: { missionId: string; guestId: string }) {
  const { data: missions } = useMissions()
  const { data: acceptances } = useMissionAcceptancesForGuest(guestId)
  const respondToMission = useRespondToMission()
  const [responding, setResponding] = useState(false)

  const mission = missions?.find(m => m.id === missionId)
  if (!mission) return null

  const acceptance = acceptances?.find(a => a.missionId === missionId)
  const status = acceptance?.status ?? null

  const handleRespond = (accept: boolean) => {
    setResponding(true)
    respondToMission.mutate(
      { missionId, guestId, status: accept ? "accepted" : "declined" },
      { onSettled: () => setResponding(false) }
    )
  }

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-3 transition-colors",
      status === "accepted" && "border-emerald-200 dark:border-emerald-900",
      status === "declined" && "border-destructive/20 opacity-60",
      !status && "border-border"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Swords className="size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground truncate">{mission.title}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {mission.description && (
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{mission.description}</p>
        </div>
      )}
      <div className="flex gap-2 pt-0.5">
        <Button size="sm" variant={status === "accepted" ? "success" : "outline"} className="gap-1.5" disabled={responding} onClick={() => handleRespond(true)}>
          <CheckCircle2 className="size-3.5" />Accepter
        </Button>
        <Button size="sm" variant={status === "declined" ? "destructive" : "outline"} className="gap-1.5" disabled={responding} onClick={() => handleRespond(false)}>
          <XCircle className="size-3.5" />Décliner
        </Button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function MesResponsabilitesPage() {
  const { person } = useIdentity()
  const { data: messages, isLoading: messagesLoading } = useRosMessages()
  const { data: launches, isLoading: launchesLoading } = useRosLaunches()
  const { data: missions, isLoading: missionsLoading } = useMissions()
  const { isLoading: entriesLoading, entries } = useResponsableEntries()

  const myMessages = useMemo(() => {
    if (!person || !messages) return []
    return messages
      .filter(m =>
        m.delivererGuestId === person.id ||
        m.delivererPersonId === person.id ||
        (person.role === "admin" && m.delivererType === "both_fiances")
      )
      .sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) return sortableTime(a.scheduledTime) - sortableTime(b.scheduledTime)
        if (a.scheduledTime) return -1
        if (b.scheduledTime) return 1
        return a.sortOrder - b.sortOrder
      })
  }, [person, messages])

  const myMissionIds = useMemo(() => {
    if (!person || !missions || !launches) return []
    const entry = entries.find(e => e.identity.id === person.id)
    const domaineIds = entry?.domaineIds ?? []
    const missionIdsWithLaunch = new Set(launches.filter(l => l.missionId != null).map(l => l.missionId!))
    return missions
      .filter(m => m.domaineId != null && domaineIds.includes(m.domaineId) && missionIdsWithLaunch.has(m.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(m => m.id)
  }, [person, missions, launches, entries])

  const pendingMessages     = myMessages.filter(m => getLifecycle(m) === "pending")
  const acceptedMessages    = myMessages.filter(m => getLifecycle(m) === "accepted")
  const transmittedMessages = myMessages.filter(m => getLifecycle(m) === "transmitted")
  const notTransmitted      = myMessages.filter(m => getLifecycle(m) === "not-transmitted")
  const declinedMessages    = myMessages.filter(m => getLifecycle(m) === "declined")

  const isLoading = messagesLoading || launchesLoading || missionsLoading || entriesLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mes missions" description="Messages à transmettre et missions du timing." />
        <div className="space-y-3 max-w-2xl">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const hasNothing = myMessages.length === 0 && myMissionIds.length === 0

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes missions"
        description="Accepte ou décline les messages à transmettre et les missions du timing."
      />

      {hasNothing ? (
        <EmptyState
          icon={CheckCircle2}
          title="Rien à confirmer"
          description="Aucun message ni mission de timing ne t'est assigné pour le moment."
        />
      ) : (
        <div className="max-w-2xl space-y-8">

          {/* Messages en attente */}
          {pendingMessages.length > 0 && (
            <section className="space-y-3">
              <SectionTitle label="Messages à transmettre" count={pendingMessages.length} />
              {pendingMessages.map(m => <PendingMessageCard key={m.id} msg={m} />)}
            </section>
          )}

          {/* Messages acceptés — countdown + délivré ? */}
          {acceptedMessages.length > 0 && (
            <section className="space-y-3">
              <SectionTitle label="Acceptés" count={acceptedMessages.length} />
              {acceptedMessages.map(m => <AcceptedMessageCard key={m.id} msg={m} />)}
            </section>
          )}

          {/* Messages transmis */}
          {transmittedMessages.length > 0 && (
            <section className="space-y-2">
              <SectionTitle label="Transmis" count={transmittedMessages.length} />
              {transmittedMessages.map(m => <TransmittedMessageCard key={m.id} msg={m} />)}
            </section>
          )}

          {/* Messages non transmis */}
          {notTransmitted.length > 0 && (
            <section className="space-y-2">
              <SectionTitle label="Non transmis" count={notTransmitted.length} />
              {notTransmitted.map(m => <NotTransmittedMessageCard key={m.id} msg={m} />)}
            </section>
          )}

          {/* Messages déclinés */}
          {declinedMessages.length > 0 && (
            <section className="space-y-2">
              <SectionTitle label="Déclinés" count={declinedMessages.length} />
              {declinedMessages.map(m => <DeclinedMessageCard key={m.id} msg={m} />)}
            </section>
          )}

          {/* Missions du timing */}
          {myMissionIds.length > 0 && person && (
            <section className="space-y-3">
              <SectionTitle label="Missions dans le timing" count={myMissionIds.length} />
              {myMissionIds.map(id => <MissionCard key={id} missionId={id} guestId={person.id} />)}
            </section>
          )}

        </div>
      )}
    </div>
  )
}
