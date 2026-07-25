import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Circle, Link2, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react"

import type { Guest } from "@/types/domain"
import { Button } from "@/components/ui/button"
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
  useCommunicationSends,
  useCommunications,
  useCreateCommunication,
  useDeleteCommunication,
  useMarkCommunicationSent,
  useUnmarkCommunicationSent,
  useUpdateCommunication,
} from "@/hooks/queries/use-communications"
import { useGuestGroups, useGuests } from "@/hooks/queries/use-guests"
import type { GuestGroup } from "@/types/domain"
import type { Communication } from "@/services/supabase/communications"

type SendFilter = "pending" | "sent"

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
  const [confirmDelete, setConfirmDelete] = useState(false)

  const create = useCreateCommunication()
  const update = useUpdateCommunication()
  const remove = useDeleteCommunication()

  useEffect(() => {
    setName(comm?.name ?? "")
    setDescription(comm?.description ?? "")
    setConfirmDelete(false)
  }, [comm, open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (comm) {
      update.mutate(
        { id: comm.id, patch: { name: name.trim(), description: description.trim() || null } },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      create.mutate(
        { name: name.trim(), description: description.trim() || null },
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
  const { data: sends = [], isLoading } = useCommunicationSends(comm.id)
  const markSent = useMarkCommunicationSent(comm.id)
  const unmark = useUnmarkCommunicationSent(comm.id)

  // Adultes confirmés uniquement — même logique que EnfantsPage
  const eligible = useMemo(
    () => guests.filter((g) => g.rsvpStatus === "confirmed" && !isUnder18(g)),
    [guests]
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
  const pendingList = useMemo(() => eligible.filter((g) => statusOf.get(g.id)?.kind === "pending"), [eligible, statusOf])
  const progress = eligible.length > 0 ? Math.round((sentList.length / eligible.length) * 100) : 0
  const displayed = filter === "pending" ? pendingList : sentList

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
          </div>
          <span className="text-2xl font-bold tabular-nums shrink-0">
            {sentList.length}
            <span className="text-base font-normal text-muted-foreground">/{eligible.length}</span>
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
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : displayed.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-10">
          {filter === "pending" ? "Tous les envois sont faits ✓" : "Aucun envoi enregistré pour l'instant"}
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
                  return (
                    <div key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {status.kind === "direct" ? (
                          <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        ) : status.kind === "via_partner" ? (
                          <Link2 className="size-4 text-green-400 shrink-0" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm truncate">{g.fullName}</span>
                        {status.kind === "via_partner" && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            via {status.partnerName}
                          </span>
                        )}
                      </div>
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
                      ) : status.kind === "pending" ? (
                        <Button
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => markSent.mutate(g.id)}
                          disabled={markSent.isPending}
                        >
                          Envoyé ✓
                        </Button>
                      ) : null}
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

export function MessageSuiviPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingComm, setEditingComm] = useState<Communication | null>(null)

  const { data: comms, isLoading: commsLoading } = useCommunications()
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: groups = [], isLoading: groupsLoading } = useGuestGroups()

  const isLoading = commsLoading || guestsLoading || groupsLoading

  const selectedComm = (comms ?? []).find((c) => c.id === selectedId) ?? null

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
        <div className="space-y-2">
          {comms.map((comm) => {
            const isSelected = comm.id === selectedId
            return (
              <div
                key={comm.id}
                onClick={() => setSelectedId(isSelected ? null : comm.id)}
                className={[
                  "flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 cursor-pointer transition-colors",
                  isSelected ? "border-primary/60 bg-primary/5" : "hover:bg-muted/40",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{comm.name}</p>
                  {comm.description && (
                    <p className="text-xs text-muted-foreground truncate">{comm.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(comm)
                  }}
                  aria-label="Modifier"
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            )
          })}
        </div>
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
