import { useMemo } from "react"
import { EarOff, MessageSquare, Mic } from "lucide-react"

import type { RosDeliveryMode, RosMessage, RunOfShowStep } from "@/types/domain"
import { useRosMessages } from "@/hooks/queries/use-ros-messages"
import { useRunOfShow } from "@/hooks/queries/use-run-of-show"
import { useIdentity } from "@/context/IdentityContext"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { RosMessagesTab } from "@/pages/deroule/RosMessagesTab"
import { cn } from "@/lib/utils"

// ── Badges ─────────────────────────────────────────────────────────────────────

function deliveryModeBadge(mode: RosDeliveryMode | null) {
  if (!mode) return null
  if (mode === "micro")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        <Mic className="size-3" />
        Au micro
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <EarOff className="size-3" />
      Discrètement
    </span>
  )
}

function roleBadge(role: "sender" | "recipient") {
  if (role === "sender")
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        Vous délivrez
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      Vous recevez
    </span>
  )
}

// ── Card (vue invité) ──────────────────────────────────────────────────────────

function MessageCard({
  msg,
  step,
  role,
}: {
  msg: RosMessage
  step: RunOfShowStep | undefined
  role: "sender" | "recipient"
}) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3.5 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {step && (
          <span className="text-xs font-medium text-muted-foreground">
            {step.timeLabel} · {step.label}
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {roleBadge(role)}
          {deliveryModeBadge(msg.deliveryMode)}
        </div>
      </div>

      {msg.subject && (
        <p className="font-semibold text-sm">{msg.subject}</p>
      )}
      <p className={cn("text-sm leading-relaxed", !msg.subject && "font-medium")}>
        {msg.content}
      </p>
    </div>
  )
}

// ── Vue invité ────────────────────────────────────────────────────────────────

function GuestMessagesView({ guestId }: { guestId: string }) {
  const { data: messages = [], isLoading: msgLoading } = useRosMessages()
  const { data: steps = [], isLoading: stepsLoading } = useRunOfShow()

  const stepsById = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps])

  const myMessages = useMemo(() => {
    return messages
      .filter((msg) => {
        const isSender = msg.delivererType === "guest" && msg.delivererGuestId === guestId
        const isRecipient = msg.recipientType === "guest" && msg.recipientGuestId === guestId
        return isSender || isRecipient
      })
      .sort((a, b) => {
        const sa = stepsById.get(a.stepId)?.startsAt ?? ""
        const sb = stepsById.get(b.stepId)?.startsAt ?? ""
        if (sa !== sb) return sa.localeCompare(sb)
        return a.sortOrder - b.sortOrder
      })
  }, [messages, guestId, stepsById])

  if (msgLoading || stepsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    )
  }

  if (myMessages.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Aucun message pour vous"
        description="Vous n'avez pas de message à délivrer ni à recevoir pour l'instant."
      />
    )
  }

  return (
    <div className="space-y-3">
      {myMessages.map((msg) => {
        const isSender = msg.delivererType === "guest" && msg.delivererGuestId === guestId
        const step = stepsById.get(msg.stepId)
        return (
          <MessageCard
            key={msg.id}
            msg={msg}
            step={step}
            role={isSender ? "sender" : "recipient"}
          />
        )
      })}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function MessagesPage() {
  const { person } = useIdentity()
  const isFiance = person?.role === "fiance"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description={
          isFiance
            ? "Gérez et consultez tous les messages du déroulé."
            : "Les messages qui vous concernent le jour J, dans l'ordre chronologique."
        }
      />

      {isFiance ? (
        <RosMessagesTab />
      ) : (
        <GuestMessagesView guestId={person?.id ?? ""} />
      )}
    </div>
  )
}
