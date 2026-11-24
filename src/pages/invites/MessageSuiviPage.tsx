import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Ban, Check, CheckCircle2, Circle, GripVertical, Link2, MessageSquare, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { Guest, ProspectStatus, RsvpStatus } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/shared/EmptyState"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  useCommunicationPrep,
  useCommunicationSends,
  useCommunications,
  useCreateCommunication,
  useDeleteCommunication,
  useMarkCommunicationSent,
  useReorderCommunications,
  useSaveCommunicationPrep,
  useUnmarkCommunicationSent,
  useUpdateCommunication,
} from "@/hooks/queries/use-communications"
import { useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import type { GuestGroup } from "@/types/domain"
import type { CommSender, Communication, CommunicationPrep } from "@/services/supabase/communications"
import { cn } from "@/lib/utils"

type SendFilter = "pending" | "sent" | "excluded"
/** Filtre « qui envoie » de la liste. */
type SenderFilter = "all" | CommSender | "none"
const SENDERS: { id: CommSender; label: string }[] = [
  { id: "jordan", label: "Jordan" }, { id: "sarah", label: "Sarah" }, { id: "both", label: "À deux" },
]
const senderLabel = (s: CommSender | null | undefined) => SENDERS.find((x) => x.id === s)?.label ?? null

function isUnder18(g: Guest): boolean {
  if (g.isChild) return true
  const match = g.ageRange?.match(/(\d+)\s*-\s*(\d+)/)
  return match ? Number(match[2]) < 18 : false
}

// ── Side panel CRUD ────────────────────────────────────────────────────────────

function CommSheet({
  open,
  onOpenChange,
  comm,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  comm: Communication | null
  onDeleted: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [targetRsvpStatuses, setTargetRsvpStatuses] = useState<RsvpStatus[]>([])
  const [targetProspectStatuses, setTargetProspectStatuses] = useState<ProspectStatus[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const create = useCreateCommunication()
  const update = useUpdateCommunication()
  const remove = useDeleteCommunication()

  useEffect(() => {
    setName(comm?.name ?? "")
    setDescription(comm?.description ?? "")
    setTargetRsvpStatuses((comm?.targetRsvpStatuses ?? []) as RsvpStatus[])
    setTargetProspectStatuses((comm?.targetProspectStatuses ?? []) as ProspectStatus[])
    setConfirmDelete(false)
  }, [comm, open])

  function toggleRsvpStatus(status: RsvpStatus) {
    setTargetRsvpStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  function toggleProspectStatus(status: ProspectStatus) {
    setTargetProspectStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const rsvpStatuses = targetRsvpStatuses.length > 0 ? targetRsvpStatuses : null
    const prospectStatuses = targetProspectStatuses.length > 0 ? targetProspectStatuses : null
    if (comm) {
      update.mutate(
        { id: comm.id, patch: { name: name.trim(), description: description.trim() || null, targetRsvpStatuses: rsvpStatuses, targetProspectStatuses: prospectStatuses } },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      create.mutate(
        { name: name.trim(), description: description.trim() || null, targetRsvpStatuses: rsvpStatuses, targetProspectStatuses: prospectStatuses },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }

  function handleDelete() {
    if (!comm) return
    remove.mutate(comm.id, {
      onSuccess: () => {
        onOpenChange(false)
        onDeleted()
      },
    })
  }

  const isPending = create.isPending || update.isPending || remove.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{comm ? "Modifier la communication" : "Nouvelle communication"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-4 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="comm-name">Nom</Label>
            <Input
              id="comm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="J-30, Rappel menu, Guide pratique…"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comm-desc">Description <span className="text-muted-foreground font-normal">(optionnelle)</span></Label>
            <Textarea
              id="comm-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contenu ou notes associées…"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Statut RSVP <span className="text-muted-foreground font-normal">(tous si vide)</span></Label>
            <div className="flex flex-col gap-2">
              {(["pending", "confirmed", "declined"] as RsvpStatus[]).map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={targetRsvpStatuses.includes(status)}
                    onCheckedChange={() => toggleRsvpStatus(status)}
                  />
                  <span className="text-sm">
                    {status === "pending" ? "En attente" : status === "confirmed" ? "Confirmés" : "Déclinés"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Statut liste <span className="text-muted-foreground font-normal">(tous si vide)</span></Label>
            <div className="flex flex-col gap-2">
              {([
                ["main_list",      "Liste A"],
                ["secondary_list", "Liste B"],
                ["deferred",       "Liste différée"],
                ["faire_part",     "Faire-part"],
                ["pending",        "En réflexion"],
                ["not_invited",    "Hors liste"],
              ] as [ProspectStatus, string][]).map(([status, label]) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={targetProspectStatuses.includes(status)}
                    onCheckedChange={() => toggleProspectStatus(status)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {comm ? "Enregistrer" : "Créer"}
          </Button>
        </form>

        {comm && (
          <SheetFooter className="border-t">
            {confirmDelete ? (
              <div className="space-y-2 w-full">
                <p className="text-sm text-muted-foreground">Supprimer définitivement cette communication et tout son historique d'envoi ?</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                    Confirmer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive w-full justify-start"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4 mr-2" />
                Supprimer
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Guest send tracking ────────────────────────────────────────────────────────

type GuestStatus =
  | { kind: "pending" }
  | { kind: "direct"; sendId: string }
  | { kind: "via_partner"; partnerName: string }

function CommTracking({ comm, guests, groups }: { comm: Communication; guests: Guest[]; groups: GuestGroup[] }) {
  const [filter, setFilter] = useState<SendFilter>("pending")
  const [senderFilter, setSenderFilter] = useState<SenderFilter>("all")
  const [readyOnly, setReadyOnly] = useState(false)
  const { data: sends = [], isLoading } = useCommunicationSends(comm.id)
  const { data: prepRows = [] } = useCommunicationPrep(comm.id)
  const savePrep = useSaveCommunicationPrep(comm.id)
  const prepOf = useMemo(() => new Map(prepRows.map((r) => [r.guestId, r])), [prepRows])
  const prep = (id: string): CommunicationPrep => prepOf.get(id) ?? { guestId: id, ready: false, sender: null, excluded: false }

  /** Modifie la préparation d'un invité et de son inséparable (mêmes valeurs pour les deux). */
  function setPrep(g: Guest, change: Partial<Pick<CommunicationPrep, "ready" | "sender" | "excluded">>) {
    const ids = [g.id, ...(g.pairedWithId ? [g.pairedWithId] : [])]
    // « excluded » n'est envoyé que s'il est utilisé : sans la migration 0186, « Prête » et « Qui envoie » marchent encore.
    const rows = ids.map((id) => {
      const { excluded, ...rest } = { ...prep(id), ...change, guestId: id }
      return "excluded" in change || excluded ? { ...rest, excluded } : rest
    })
    savePrep.mutate(rows, {
      onError: (e) => {
        const msg = (e as Error).message ?? ""
        toast.error(/excluded/i.test(msg) ? "Migration 0186 à exécuter pour « Ne pas envoyer »." : "Enregistrement impossible. Réessaie dans un instant.")
      },
    })
  }
  const markSent = useMarkCommunicationSent(comm.id)
  const unmark = useUnmarkCommunicationSent(comm.id)

  const targetStatuses: RsvpStatus[] = useMemo(() => {
    if (comm.targetRsvpStatuses?.length) return comm.targetRsvpStatuses as RsvpStatus[]
    // Si un filtre prospect est actif, ne pas restreindre par RSVP (les prospects sont souvent encore "pending")
    if (comm.targetProspectStatuses?.length) return ["pending", "confirmed", "declined", "no_show"]
    return ["confirmed"]
  }, [comm.targetRsvpStatuses, comm.targetProspectStatuses])

  const targetProspectStatuses: ProspectStatus[] | null = useMemo(
    () => (comm.targetProspectStatuses?.length ? (comm.targetProspectStatuses as ProspectStatus[]) : null),
    [comm.targetProspectStatuses]
  )

  const eligible = useMemo(
    () => guests.filter((g) => {
      if (!targetStatuses.includes(g.rsvpStatus)) return false
      if (targetProspectStatuses) {
        // null prospectStatus = invité historique, traité comme main_list
        const ps: ProspectStatus = g.prospectStatus ?? "main_list"
        if (!targetProspectStatuses.includes(ps)) return false
      }
      return !isUnder18(g)
    }),
    [guests, targetStatuses, targetProspectStatuses]
  )

  // Index nom par id pour résoudre les partenaires
  const nameById = useMemo(() => new Map(guests.map((g) => [g.id, g.fullName])), [guests])

  const sentDirectMap = useMemo(() => new Map(sends.map((s) => [s.guestId, s.id])), [sends])

  const statusOf = useMemo((): Map<string, GuestStatus> => {
    const m = new Map<string, GuestStatus>()
    for (const g of eligible) {
      const sendId = sentDirectMap.get(g.id)
      if (sendId) {
        m.set(g.id, { kind: "direct", sendId })
      } else if (g.pairedWithId && sentDirectMap.has(g.pairedWithId)) {
        m.set(g.id, { kind: "via_partner", partnerName: nameById.get(g.pairedWithId) ?? "partenaire" })
      } else {
        m.set(g.id, { kind: "pending" })
      }
    }
    return m
  }, [eligible, sentDirectMap, nameById])

  const sentList = useMemo(() => eligible.filter((g) => statusOf.get(g.id)?.kind !== "pending"), [eligible, statusOf])
  // Hors envoi (ne peut pas recevoir cette communication) : ni à envoyer, ni dans le total.
  const isExcluded = (id: string) => prepOf.get(id)?.excluded === true
  const excludedList = eligible.filter((g) => statusOf.get(g.id)?.kind === "pending" && isExcluded(g.id))
  const pendingList = eligible.filter((g) => statusOf.get(g.id)?.kind === "pending" && !isExcluded(g.id))
  const total = eligible.length - excludedList.length
  const progress = total > 0 ? Math.round((sentList.length / total) * 100) : 0
  const byTab = filter === "pending" ? pendingList : filter === "excluded" ? excludedList : sentList
  const displayed = byTab.filter((g) => {
    const p = prep(g.id)
    if (senderFilter !== "all" && (senderFilter === "none" ? p.sender !== null : p.sender !== senderFilter)) return false
    return !readyOnly || p.ready
  })
  // Compteurs de la préparation (invités restant à envoyer).
  const prepCounts = {
    ready: pendingList.filter((g) => prep(g.id).ready).length,
    jordan: pendingList.filter((g) => prep(g.id).sender === "jordan").length,
    sarah: pendingList.filter((g) => prep(g.id).sender === "sarah").length,
    both: pendingList.filter((g) => prep(g.id).sender === "both").length,
    none: pendingList.filter((g) => !prep(g.id).sender).length,
  }

  // Regrouper par famille, triée par sortOrder
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.sortOrder - b.sortOrder), [groups])

  const displayedByGroup = useMemo(() => {
    const buckets = new Map<string, Guest[]>()
    for (const g of displayed) {
      const key = g.groupId ?? "__none__"
      const list = buckets.get(key) ?? []
      list.push(g)
      buckets.set(key, list)
    }
    // Trier les invités dans chaque bucket par nom
    for (const list of buckets.values()) list.sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))

    const result: Array<{ groupId: string; label: string; guests: Guest[] }> = []
    // D'abord les groupes connus dans l'ordre
    for (const grp of sortedGroups) {
      const list = buckets.get(grp.id)
      if (list?.length) result.push({ groupId: grp.id, label: grp.familyName, guests: list })
    }
    // Ensuite les invités sans groupe
    const none = buckets.get("__none__")
    if (none?.length) result.push({ groupId: "__none__", label: "Sans groupe", guests: none })
    return result
  }, [displayed, sortedGroups, groupsById])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card px-5 py-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-sm leading-snug">{comm.name}</p>
            {comm.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{comm.description}</p>
            )}
            {((comm.targetRsvpStatuses?.length ?? 0) > 0 || (comm.targetProspectStatuses?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {targetStatuses.map((s) => (
                  <span key={`rsvp-${s}`} className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                    {s === "pending" ? "En attente" : s === "confirmed" ? "Confirmés" : "Déclinés"}
                  </span>
                ))}
                {targetProspectStatuses?.map((s) => (
                  <span key={`ps-${s}`} className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
                    {s === "main_list" ? "Liste A" : s === "secondary_list" ? "Liste B" : s === "deferred" ? "Différée" : s === "faire_part" ? "Faire-part" : s === "pending" ? "En réflexion" : "Hors liste"}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-2xl font-bold tabular-nums shrink-0">
            {sentList.length}
            <span className="text-base font-normal text-muted-foreground">/{total}</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as SendFilter)}>
        <TabsList>
          <TabsTrigger value="pending">À envoyer ({pendingList.length})</TabsTrigger>
          <TabsTrigger value="sent">Envoyés ({sentList.length})</TabsTrigger>
          {(excludedList.length > 0 || filter === "excluded") && <TabsTrigger value="excluded">Hors envoi ({excludedList.length})</TabsTrigger>}
        </TabsList>
      </Tabs>

      {/* Préparation : qui envoie, invitations prêtes. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Qui envoie">
          {([
            ["all", "Tous"],
            ["jordan", `Jordan (${prepCounts.jordan})`],
            ["sarah", `Sarah (${prepCounts.sarah})`],
            ["both", `À deux (${prepCounts.both})`],
            ["none", `Non attribués (${prepCounts.none})`],
          ] as [SenderFilter, string][]).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={senderFilter === id} onClick={() => setSenderFilter(id)}
              className={cn("rounded-full border px-3 py-1 text-xs transition-colors",
                senderFilter === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30")}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox checked={readyOnly} onCheckedChange={(v) => setReadyOnly(v === true)} />
          Prêtes seulement ({prepCounts.ready}/{pendingList.length} à envoyer)
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : displayed.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-10">
          {byTab.length > 0 ? "Aucun invité pour ce filtre"
            : filter === "pending" ? "Tous les envois sont faits ✓" : filter === "excluded" ? "Personne n'est hors envoi" : "Aucun envoi enregistré pour l'instant"}
        </p>
      ) : (
        <div className="space-y-3">
          {displayedByGroup.map(({ groupId, label, guests: groupGuests }) => (
            <div key={groupId} className="rounded-2xl border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </span>
              </div>
              <div className="divide-y bg-card">
                {groupGuests.map((g) => {
                  const status = statusOf.get(g.id)!
                  const p = prep(g.id)
                  return (
                    // Téléphone : nom complet sur une ligne, actions (prête, qui envoie, envoyé) sur la suivante.
                    // À partir de 640 px : tout sur une ligne, nom tronqué si besoin.
                    <div key={g.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:min-w-0 sm:flex-1 sm:flex-nowrap">
                        {status.kind === "direct" ? (
                          <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        ) : status.kind === "via_partner" ? (
                          <Link2 className="size-4 text-green-400 shrink-0" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm sm:truncate">{g.fullName}</span>
                        {status.kind === "via_partner" && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            via {status.partnerName}
                          </span>
                        )}
                        {g.pairedWithId && status.kind === "pending" && (
                          <span title="Inséparable : prête et envoi appliqués aux deux"><Link2 className="size-3.5 text-muted-foreground shrink-0" aria-hidden /></span>
                        )}
                        {status.kind !== "pending" && senderLabel(p.sender) && (
                          <span className="text-xs text-muted-foreground shrink-0">{p.sender === "both" ? "à deux" : `par ${senderLabel(p.sender)}`}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                      {status.kind === "pending" && isExcluded(g.id) && (
                        <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1" onClick={() => setPrep(g, { excluded: false })}>
                          <RotateCcw className="size-3.5" aria-hidden />Remettre à envoyer
                        </Button>
                      )}
                      {status.kind === "pending" && !isExcluded(g.id) && (
                        <div className="flex items-center gap-2">
                          {/* Invitation prête à être envoyée (cochée à la main). */}
                          <button type="button" onClick={() => setPrep(g, { ready: !p.ready })} aria-pressed={p.ready}
                            className={cn("inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors",
                              p.ready ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:border-foreground/30")}>
                            {p.ready ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                            {p.ready ? "Prête" : "Pas prête"}
                          </button>
                          {/* Qui envoie : Jordan, Sarah ou à deux (un second clic retire l'attribution). */}
                          <div className="inline-flex h-7 overflow-hidden rounded-full border text-xs" role="radiogroup" aria-label={`Qui envoie à ${g.fullName}`}>
                            {SENDERS.map((s) => (
                              <button key={s.id} type="button" role="radio" aria-checked={p.sender === s.id}
                                onClick={() => setPrep(g, { sender: p.sender === s.id ? null : s.id })}
                                className={cn("px-2.5 transition-colors",
                                  p.sender === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {status.kind === "direct" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground h-7 shrink-0"
                          onClick={() => unmark.mutate(status.sendId)}
                          disabled={unmark.isPending}
                        >
                          Annuler
                        </Button>
                      ) : status.kind === "pending" && !isExcluded(g.id) ? (<>
                        {/* Ne peut pas recevoir cette communication (pas d'appareil, très âgé…) : hors envoi. */}
                        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 text-muted-foreground"
                          title="Ne peut pas recevoir cette communication : la retirer des envois et du total"
                          onClick={() => setPrep(g, { excluded: true })}>
                          <Ban className="size-3.5" aria-hidden />Ne pas envoyer
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => markSent.mutate(g.id)}
                          disabled={markSent.isPending}
                        >
                          Envoyé ✓
                        </Button>
                      </>) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

function SortableCommRow({
  comm,
  isSelected,
  onSelect,
  onEdit,
}: {
  comm: Communication
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: comm.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center gap-2 rounded-2xl border bg-card px-3 py-3 transition-colors",
        isSelected ? "border-primary/60 bg-primary/5" : "hover:bg-muted/40",
        isDragging ? "opacity-50" : "",
      ].join(" ")}
    >
      <button
        type="button"
        aria-label="Réordonner"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onSelect}>
        <p className="text-sm font-medium">{comm.name}</p>
        {comm.description && (
          <p className="text-xs text-muted-foreground truncate">{comm.description}</p>
        )}
        {((comm.targetRsvpStatuses?.length ?? 0) > 0 || (comm.targetProspectStatuses?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(comm.targetRsvpStatuses ?? []).map((s) => (
              <span key={s} className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                {s === "pending" ? "En attente" : s === "confirmed" ? "Confirmés" : "Déclinés"}
              </span>
            ))}
            {(comm.targetProspectStatuses ?? []).map((s) => (
              <span key={`ps-${s}`} className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
                {s === "main_list" ? "Liste A" : s === "secondary_list" ? "Liste B" : s === "deferred" ? "Différée" : s === "faire_part" ? "Faire-part" : s === "pending" ? "En réflexion" : "Hors liste"}
              </span>
            ))}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        aria-label="Modifier"
        className="shrink-0"
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  )
}

export function MessageSuiviPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingComm, setEditingComm] = useState<Communication | null>(null)

  const { data: comms, isLoading: commsLoading } = useCommunications()
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: groups = [], isLoading: groupsLoading } = useGuestGroups()
  const reorder = useReorderCommunications()

  const isLoading = commsLoading || guestsLoading || groupsLoading

  const sortedComms = useMemo(
    () => [...(comms ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [comms]
  )

  const selectedComm = sortedComms.find((c) => c.id === selectedId) ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedComms.findIndex((c) => c.id === active.id)
    const newIndex = sortedComms.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(sortedComms, oldIndex, newIndex).map((c, i) => ({ ...c, sortOrder: i }))
    reorder.mutate(reordered.map(({ id, sortOrder }) => ({ id, sortOrder })))
  }

  function openCreate() {
    setEditingComm(null)
    setSheetOpen(true)
  }

  function openEdit(comm: Communication) {
    setEditingComm(comm)
    setSheetOpen(true)
  }

  function handleDeleted() {
    setSelectedId(null)
  }

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Suivi des communications</h2>
          <p className="text-sm text-muted-foreground">
            Créez vos communications et suivez leur envoi invité par invité.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          Nouvelle
        </Button>
      </div>

      {!comms || comms.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Aucune communication"
          description="Commencez par créer une communication."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4 mr-1.5" />
              Nouvelle communication
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedComms.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedComms.map((comm) => (
                <SortableCommRow
                  key={comm.id}
                  comm={comm}
                  isSelected={comm.id === selectedId}
                  onSelect={() => setSelectedId(comm.id === selectedId ? null : comm.id)}
                  onEdit={() => openEdit(comm)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {selectedComm && (
        <CommTracking
          key={selectedComm.id}
          comm={selectedComm}
          guests={guests ?? []}
          groups={groups}
        />
      )}

      <CommSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        comm={editingComm}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
