import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle, ArrowLeft, Camera, Check, CheckCircle2,
  ChevronDown, ChevronRight, Clock, Pencil, SkipForward, Star,
} from "lucide-react"
import { toast } from "sonner"

import type { Guest, GuestGroup, Person, PhotoGroup, PhotoGroupMember, PhotoSession } from "@/types/domain"
import { GuestTreeView } from "@/components/invites/GuestTreeView"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { estimatePhotoDurationSeconds, formatDuration, recordPhotoDuration } from "@/lib/photo-duration"
import { useGuests, useGuestGroups } from "@/hooks/queries/use-guests"
import { usePeople } from "@/hooks/queries/use-people"
import {
  useAllPhotoGroupMembers,
  usePhotoGroups,
  useUpdatePhotoGroup,
  useUpdatePhotoGroupMember,
} from "@/hooks/queries/use-photo-groups"
import { usePhotoSessions } from "@/hooks/queries/use-photo-sessions"

// ── Types & helpers ──────────────────────────────────────────────────────────

type Screen = "sessions" | "gathering" | "shooting"
type PresenceStatus = "present" | "en_route" | "absent"

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function cyclePresence(s: PresenceStatus): PresenceStatus {
  return s === "present" ? "en_route" : s === "en_route" ? "absent" : "present"
}

const PRESENCE_CLASS: Record<PresenceStatus, string> = {
  present: "bg-vert-vegetal/15 text-vert-vegetal border-vert-vegetal/30",
  en_route: "bg-dore/20 text-brun border-dore/40",
  absent: "bg-bordeaux/15 text-bordeaux border-bordeaux/30",
}

const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  present: "Présent·e",
  en_route: "En route",
  absent: "Absent·e définitivement",
}

function chronoKey(sessionId: string) {
  return `photos-elapsed-${sessionId}`
}

function loadElapsed(sessionId: string): Map<string, number> {
  try {
    const raw = sessionStorage.getItem(chronoKey(sessionId))
    if (raw) return new Map(Object.entries(JSON.parse(raw) as Record<string, number>))
  } catch {}
  return new Map()
}

function saveElapsed(sessionId: string, map: Map<string, number>) {
  try {
    sessionStorage.setItem(chronoKey(sessionId), JSON.stringify(Object.fromEntries(map)))
  } catch {}
}

// Effective member set of a group after removing absent people (prefixed ids to distinguish guests/fiancés)
function getEffectiveMembers(
  group: PhotoGroup,
  membersByGroupId: Map<string, PhotoGroupMember[]>,
  absentGuestIds: string[],
  absentFianceIds: string[],
  allFiances: Person[]
): Set<string> {
  const result = new Set<string>()
  for (const m of membersByGroupId.get(group.id) ?? []) {
    if (!absentGuestIds.includes(m.guestId)) result.add(`g:${m.guestId}`)
  }
  const reqIds = group.requiredFianceIds.length > 0 ? group.requiredFianceIds : allFiances.map(f => f.id)
  for (const fid of reqIds) {
    if (!absentFianceIds.includes(fid)) result.add(`f:${fid}`)
  }
  return result
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

// ── SessionListScreen ────────────────────────────────────────────────────────

function SessionListScreen({ sessions = [], groups = [], members = [], fiances = [], onEnter }: {
  sessions: PhotoSession[]
  groups: PhotoGroup[]
  members: PhotoGroupMember[]
  fiances: Person[]
  onEnter: (id: string) => void
}) {
  const sorted = useMemo(() => [...sessions].sort((a, b) => a.sortOrder - b.sortOrder), [sessions])

  const membersByGroupId = useMemo(() => {
    const map = new Map<string, PhotoGroupMember[]>()
    for (const m of members) {
      const list = map.get(m.photoGroupId) ?? []
      list.push(m)
      map.set(m.photoGroupId, list)
    }
    return map
  }, [members])

  const sessionData = useMemo(() => sorted.map((session, idx) => {
    const sg = groups.filter(g => g.sessionId === session.id).sort((a, b) => a.sortOrder - b.sortOrder)
    const done = sg.filter(g => g.status === "done")
    const pending = sg.filter(g => g.status === "pending")
    const skipped = sg.filter(g => g.status === "skipped")
    const remaining = [...pending, ...skipped]
    const isAllDone = sg.length > 0 && done.length === sg.length
    const hasStarted = done.length > 0 || skipped.length > 0
    const isInProgress = hasStarted && !isAllDone

    const estimatedSeconds = sg.reduce((sum, g) => {
      const rf = g.requiredFianceIds.length > 0 ? fiances.filter(f => g.requiredFianceIds.includes(f.id)) : fiances
      return sum + estimatePhotoDurationSeconds((membersByGroupId.get(g.id) ?? []).length + rf.length, g.label)
    }, 0)

    const remainingSeconds = remaining.reduce((sum, g) => {
      const rf = g.requiredFianceIds.length > 0 ? fiances.filter(f => g.requiredFianceIds.includes(f.id)) : fiances
      return sum + estimatePhotoDurationSeconds((membersByGroupId.get(g.id) ?? []).length + rf.length, g.label)
    }, 0)

    return { session, sg, done, pending, skipped, remaining, isAllDone, hasStarted, isInProgress, estimatedSeconds, remainingSeconds, idx }
  }), [sorted, groups, membersByGroupId, fiances])

  const totalGroups = groups.length
  const totalDone = useMemo(() => groups.filter(g => g.status === "done").length, [groups])
  const totalRemainingSeconds = useMemo(() => sessionData.reduce((sum, sd) => sum + sd.remainingSeconds, 0), [sessionData])
  const allSessionsDone = sessionData.length > 0 && sessionData.every(sd => sd.isAllDone)

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Camera className="size-10 text-muted-foreground opacity-20" />
        <div>
          <p className="text-sm font-medium text-foreground">Aucune séance configurée</p>
          <p className="text-xs text-muted-foreground mt-1">Configurez vos séances depuis les Paramètres.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compteur global */}
      {totalGroups > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-heading font-bold text-foreground tabular-nums">{totalDone}</span>
                <span className="text-xl text-muted-foreground font-normal">/ {totalGroups}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allSessionsDone ? "Toutes les photos sont prises !" : "photos prises"}
              </p>
            </div>
            {allSessionsDone ? (
              <CheckCircle2 className="size-9 text-vert-vegetal shrink-0 mt-0.5" />
            ) : totalRemainingSeconds > 0 ? (
              <div className="text-right shrink-0">
                <p className="text-xl font-heading font-semibold text-foreground">~{formatDuration(totalRemainingSeconds)}</p>
                <p className="text-xs text-muted-foreground">restantes</p>
              </div>
            ) : null}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", allSessionsDone ? "bg-vert-vegetal" : "bg-vert-vegetal/70")}
              style={{ width: `${totalGroups > 0 ? Math.round((totalDone / totalGroups) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Cartes de séance */}
      <div className="space-y-2">
        {sessionData.map(({ session, sg, done, remaining, isAllDone, isInProgress, estimatedSeconds, remainingSeconds, idx }) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onEnter(session.id)}
            className={cn(
              "w-full text-left rounded-xl border p-4 transition-all",
              isAllDone
                ? "border-vert-vegetal/30 bg-vert-vegetal/5 hover:bg-vert-vegetal/10"
                : isInProgress
                ? "border-dore/50 bg-dore/5 shadow-sm ring-1 ring-dore/20 hover:bg-dore/10"
                : "border-border bg-card hover:bg-muted/40"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icône de statut */}
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full font-semibold mt-0.5",
                isAllDone ? "bg-vert-vegetal text-white"
                : isInProgress ? "bg-dore text-white"
                : "bg-muted text-muted-foreground text-sm"
              )}>
                {isAllDone ? (
                  <Check className="size-4" />
                ) : isInProgress ? (
                  <Camera className="size-3.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("font-semibold truncate", isInProgress ? "text-brun" : "text-foreground")}>
                    {session.label}
                  </p>
                  {isInProgress && (
                    <Badge className="shrink-0 bg-dore/20 text-brun border-0">En cours</Badge>
                  )}
                  {isAllDone && (
                    <span className="shrink-0 text-xs font-medium text-vert-vegetal">Terminée</span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {isAllDone
                    ? `${done.length} photo${done.length > 1 ? "s" : ""} prises`
                    : isInProgress
                    ? `${done.length} prise${done.length > 1 ? "s" : ""} · ${remaining.length} restante${remaining.length > 1 ? "s" : ""} · ~${formatDuration(remainingSeconds)}`
                    : `${sg.length} groupe${sg.length > 1 ? "s" : ""} · ~${formatDuration(estimatedSeconds)}`}
                </p>

                {/* Barre de progression */}
                {sg.length > 0 && (isInProgress || isAllDone) && (
                  <div className="pt-0.5">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", isAllDone ? "bg-vert-vegetal" : "bg-vert-vegetal/60")}
                        style={{ width: `${Math.round((done.length / sg.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Chevron */}
              {!isAllDone && (
                <ChevronRight className={cn("size-5 shrink-0 mt-0.5", isInProgress ? "text-brun" : "text-muted-foreground")} />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── GatheringScreen ──────────────────────────────────────────────────────────

function GatheringScreen({
  session, groups = [], members = [], guests = [], guestGroups = [], fiances = [],
  presence, onTogglePresence, onStart, onBack,
}: {
  session: PhotoSession
  groups: PhotoGroup[]
  members: PhotoGroupMember[]
  guests: Guest[]
  guestGroups: GuestGroup[]
  fiances: Person[]
  presence: Map<string, PresenceStatus>
  onTogglePresence: (id: string) => void
  onStart: () => void
  onBack: () => void
}) {
  const [confirmSkipAll, setConfirmSkipAll] = useState(false)
  const [confirmSkipRedundant, setConfirmSkipRedundant] = useState(false)
  const updateGroup = useUpdatePhotoGroup()

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.sortOrder - b.sortOrder), [groups])
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests])
  const membersByGroupId = useMemo(() => {
    const map = new Map<string, PhotoGroupMember[]>()
    for (const m of members) {
      const list = map.get(m.photoGroupId) ?? []
      list.push(m)
      map.set(m.photoGroupId, list)
    }
    return map
  }, [members])

  const fianceIdSet = useMemo(() => new Set(fiances.map(f => f.id)), [fiances])

  const absentGuestIds = useMemo(() =>
    [...presence.entries()].filter(([id, s]) => s === "absent" && !fianceIdSet.has(id)).map(([id]) => id),
    [presence, fianceIdSet]
  )
  const absentFianceIds = useMemo(() =>
    [...presence.entries()].filter(([id, s]) => s === "absent" && fianceIdSet.has(id)).map(([id]) => id),
    [presence, fianceIdSet]
  )

  const impactedGroups = useMemo(() =>
    sortedGroups.filter(group => {
      if (group.status !== "pending") return false
      const gm = membersByGroupId.get(group.id) ?? []
      if (gm.some(m => absentGuestIds.includes(m.guestId))) return true
      const reqIds = group.requiredFianceIds.length > 0 ? group.requiredFianceIds : fiances.map(f => f.id)
      return absentFianceIds.some(id => reqIds.includes(id))
    }),
    [absentGuestIds, absentFianceIds, sortedGroups, membersByGroupId, fiances]
  )

  // For each impacted group, find another pending group with an identical effective member set
  const redundancyMap = useMemo(() => {
    const result = new Map<string, PhotoGroup>()
    for (const ig of impactedGroups) {
      const effectiveIG = getEffectiveMembers(ig, membersByGroupId, absentGuestIds, absentFianceIds, fiances)
      // Group is trivially redundant if it has no remaining members
      if (effectiveIG.size === 0) {
        result.set(ig.id, ig)
        continue
      }
      for (const other of sortedGroups) {
        if (other.id === ig.id) continue
        if (other.status !== "pending") continue
        const effectiveOther = getEffectiveMembers(other, membersByGroupId, absentGuestIds, absentFianceIds, fiances)
        if (setsEqual(effectiveIG, effectiveOther)) {
          result.set(ig.id, other)
          break
        }
      }
    }
    return result
  }, [impactedGroups, sortedGroups, membersByGroupId, absentGuestIds, absentFianceIds, fiances])

  const totalAbsent = absentGuestIds.length + absentFianceIds.length

  async function doSkipAll() {
    await Promise.all(impactedGroups.map(g => updateGroup.mutateAsync({ id: g.id, patch: { status: "skipped" } })))
    toast.success(`${impactedGroups.length} groupe${impactedGroups.length > 1 ? "s" : ""} différé${impactedGroups.length > 1 ? "s" : ""}.`)
    setConfirmSkipAll(false)
  }

  async function doSkipRedundant() {
    const redundantGroups = [...redundancyMap.keys()].map(id => sortedGroups.find(g => g.id === id)).filter(Boolean) as PhotoGroup[]
    await Promise.all(redundantGroups.map(g => updateGroup.mutateAsync({ id: g.id, patch: { status: "skipped" } })))
    toast.success(`${redundantGroups.length} groupe${redundantGroups.length > 1 ? "s" : ""} redondant${redundantGroups.length > 1 ? "s" : ""} ignoré${redundantGroups.length > 1 ? "s" : ""}.`)
    setConfirmSkipRedundant(false)
  }

  const sessionGuestIds = useMemo(() => {
    const ids = new Set<string>()
    for (const m of members) ids.add(m.guestId)
    return ids
  }, [members])

  const sessionFianceIds = useMemo(() => {
    const ids = new Set<string>()
    for (const group of sortedGroups) {
      const req = group.requiredFianceIds.length > 0 ? group.requiredFianceIds : fiances.map(f => f.id)
      req.forEach(id => ids.add(id))
    }
    return ids
  }, [sortedGroups, fiances])

  const guestsByGuestGroup = useMemo(() => {
    const sessionGuests = guests.filter(g => sessionGuestIds.has(g.id))
    const sortedGG = [...guestGroups].sort((a, b) => a.sortOrder - b.sortOrder)
    const rows: { label: string; guestIds: string[] }[] = []
    for (const gg of sortedGG) {
      const ids = sessionGuests.filter(g => g.groupId === gg.id).map(g => g.id)
      if (ids.length > 0) rows.push({ label: gg.familyName, guestIds: ids })
    }
    const ungrouped = sessionGuests.filter(g => !g.groupId).map(g => g.id)
    if (ungrouped.length > 0) rows.push({ label: "Sans groupe", guestIds: ungrouped })
    return rows
  }, [guests, guestGroups, sessionGuestIds])

  const pendingCount = sortedGroups.filter(g => g.status === "pending").length
  const isStarted = sortedGroups.some(g => g.status !== "pending")
  const sessionFianceList = fiances.filter(f => sessionFianceIds.has(f.id))
  const anyMarked = presence.size > 0

  const startLabel = anyMarked
    ? isStarted ? "Reprendre la séance" : "Lancer la séance"
    : isStarted ? "Reprendre la séance" : "Démarrer sans vérifier les présences"

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onBack} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <p className="font-heading text-base font-semibold text-foreground">{session.label}</p>
          <p className="text-xs text-muted-foreground">Rassemblement · cliquez sur un nom pour changer son statut</p>
        </div>
      </div>

      {/* Légende des états */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Statut :</span>
        {(["present", "en_route", "absent"] as PresenceStatus[]).map(s => (
          <span key={s} className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", PRESENCE_CLASS[s])}>
            {PRESENCE_LABELS[s]}
          </span>
        ))}
      </div>

      {/* Absences & groupes impactés */}
      {impactedGroups.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-bordeaux/30 bg-bordeaux/5 p-3">
          <AlertTriangle className="size-4 shrink-0 text-bordeaux mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-bordeaux">
              {totalAbsent} absent{totalAbsent > 1 ? "s" : ""} définitif{totalAbsent > 1 ? "s" : ""} · {impactedGroups.length} groupe{impactedGroups.length > 1 ? "s" : ""} impacté{impactedGroups.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-1">
              {impactedGroups.map(g => {
                const redundantWith = redundancyMap.get(g.id)
                const isVoid = redundantWith?.id === g.id
                return (
                  <div key={g.id} className="text-xs">
                    <span className="font-medium text-bordeaux">{g.label}</span>
                    {isVoid ? (
                      <span className="text-bordeaux/60"> — plus personne à photographier</span>
                    ) : redundantWith ? (
                      <span className="text-bordeaux/60"> — devient identique à « {redundantWith.label} »</span>
                    ) : (
                      <span className="text-bordeaux/40"> — unique, à conserver</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {redundancyMap.size > 0 && (
                <Button
                  size="sm" variant="outline"
                  className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/10 hover:text-bordeaux"
                  onClick={() => setConfirmSkipRedundant(true)}
                  disabled={updateGroup.isPending}
                >
                  Ignorer les redondants ({redundancyMap.size})
                </Button>
              )}
              <Button
                size="sm" variant="outline"
                className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/10 hover:text-bordeaux"
                onClick={() => setConfirmSkipAll(true)}
                disabled={updateGroup.isPending}
              >
                Différer tous ({impactedGroups.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        {sessionFianceList.length > 0 && (
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-bordeaux">Fiancés</p>
            <div className="flex flex-wrap gap-1.5">
              {sessionFianceList.map(f => {
                const status = presence.get(f.id) ?? "present"
                return (
                  <button key={f.id} type="button" onClick={() => onTogglePresence(f.id)}
                    className={cn("cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80", PRESENCE_CLASS[status])}>
                    {f.fullName}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {guestsByGuestGroup.map(({ label, guestIds }) => {
          const groupGuests = guestIds.map(id => guestById.get(id)).filter((g): g is Guest => !!g)
          return (
            <div key={label} className="border-t border-border px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{label}</p>
              <GuestTreeView
                guests={groupGuests}
                renderGuest={guest => {
                  const status = presence.get(guest.id) ?? "present"
                  return (
                    <button type="button" onClick={() => onTogglePresence(guest.id)}
                      className={cn("cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80", PRESENCE_CLASS[status])}>
                      {guest.fullName}
                    </button>
                  )
                }}
              />
            </div>
          )
        })}
      </div>

      {pendingCount > 0 ? (
        <Button className="w-full" size="lg" onClick={onStart}>
          <Camera className="size-4" />
          {startLabel}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="size-8 text-vert-vegetal" />
          <p className="text-sm font-medium text-foreground">Séance terminée</p>
          <Button variant="outline" onClick={onBack}>Retour aux séances</Button>
        </div>
      )}

      {/* Confirmation : ignorer redondants */}
      <Dialog open={confirmSkipRedundant} onOpenChange={setConfirmSkipRedundant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              Ignorer {redundancyMap.size} groupe{redundancyMap.size > 1 ? "s" : ""} redondant{redundancyMap.size > 1 ? "s" : ""} ?
            </DialogTitle>
            <DialogDescription>
              Ces groupes deviennent identiques à d'autres après les absences déclarées et seront différés :{" "}
              <span className="font-medium text-foreground">
                {[...redundancyMap.keys()].map(id => sortedGroups.find(g => g.id === id)?.label).filter(Boolean).join(", ")}
              </span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSkipRedundant(false)}>Annuler</Button>
            <Button variant="destructive" onClick={doSkipRedundant} disabled={updateGroup.isPending}>
              Ignorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation : différer tous */}
      <Dialog open={confirmSkipAll} onOpenChange={setConfirmSkipAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              Différer {impactedGroups.length} groupe{impactedGroups.length > 1 ? "s" : ""} ?
            </DialogTitle>
            <DialogDescription>
              Ces groupes seront repoussés à la fin de la file :{" "}
              <span className="font-medium text-foreground">{impactedGroups.map(g => g.label).join(", ")}</span>.
              Vous pourrez les traiter à la fin de la séance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSkipAll(false)}>Annuler</Button>
            <Button variant="destructive" onClick={doSkipAll} disabled={updateGroup.isPending}>
              Différer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── ShootingScreen ───────────────────────────────────────────────────────────

function ShootingScreen({ session, groups = [], members = [], guests = [], guestGroups = [], fiances = [], presence, onBack, onQuit }: {
  session: PhotoSession
  groups: PhotoGroup[]
  members: PhotoGroupMember[]
  guests: Guest[]
  guestGroups: GuestGroup[]
  fiances: Person[]
  presence: Map<string, PresenceStatus>
  onBack: () => void
  onQuit: () => void
}) {
  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.sortOrder - b.sortOrder), [groups])
  const pendingGroups = useMemo(() => sortedGroups.filter(g => g.status === "pending"), [sortedGroups])
  const skippedGroups = useMemo(() => sortedGroups.filter(g => g.status === "skipped"), [sortedGroups])

  // Groups dismissed in the deferred phase (skipped a 2nd time) — local only
  const [dismissedGroupIds, setDismissedGroupIds] = useState<Set<string>>(new Set())

  // Full active queue: pending first (original order), then deferred (skipped, not dismissed)
  const activeQueue = useMemo(() => [
    ...pendingGroups,
    ...skippedGroups.filter(g => !dismissedGroupIds.has(g.id)),
  ], [pendingGroups, skippedGroups, dismissedGroupIds])

  // We're in the deferred phase when all original pending groups are done
  const isInDeferredPhase = pendingGroups.length === 0 && activeQueue.length > 0

  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => pendingGroups[0]?.id ?? null)
  const [groupStartTime, setGroupStartTime] = useState<number>(() => Date.now())
  const [elapsedByGroupId, setElapsedByGroupId] = useState<Map<string, number>>(() => loadElapsed(session.id))
  const [now, setNow] = useState(() => Date.now())
  const [noteValue, setNoteValue] = useState("")
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [freedNames, setFreedNames] = useState<string[] | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateGroup = useUpdatePhotoGroup()
  const updateMember = useUpdatePhotoGroupMember()

  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests])
  const membersByGroupId = useMemo(() => {
    const map = new Map<string, PhotoGroupMember[]>()
    for (const m of members) {
      const list = map.get(m.photoGroupId) ?? []
      list.push(m)
      map.set(m.photoGroupId, list)
    }
    return map
  }, [members])

  const activeGroup = sortedGroups.find(g => g.id === activeGroupId) ?? null

  useEffect(() => {
    setNoteValue(activeGroup?.notes ?? "")
    setGroupStartTime(Date.now())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId])

  // Auto-select first available group when activeGroupId becomes invalid
  useEffect(() => {
    if (!activeGroupId && activeQueue.length > 0) {
      setActiveGroupId(activeQueue[0].id)
    }
  }, [activeGroupId, activeQueue])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current) }, [])

  function handleNoteChange(value: string) {
    setNoteValue(value)
    if (!activeGroupId) return
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => {
      updateGroup.mutate({ id: activeGroupId, patch: { notes: value.trim() || null } })
    }, 800)
  }

  const groupElapsedMs = now - groupStartTime

  const sessionEstimatedSeconds = useMemo(() =>
    sortedGroups.reduce((sum, g) => {
      const rf = g.requiredFianceIds.length > 0 ? fiances.filter(f => g.requiredFianceIds.includes(f.id)) : fiances
      return sum + estimatePhotoDurationSeconds((membersByGroupId.get(g.id) ?? []).length + rf.length, g.label)
    }, 0),
    [sortedGroups, fiances, membersByGroupId]
  )

  const sessionActualMs = [...elapsedByGroupId.values()].reduce((s, v) => s + v, 0)
    + (activeGroupId ? groupElapsedMs : 0)

  const reqFiances = activeGroup
    ? (activeGroup.requiredFianceIds.length > 0 ? fiances.filter(f => activeGroup.requiredFianceIds.includes(f.id)) : fiances)
    : []
  const activeMembers = activeGroupId ? (membersByGroupId.get(activeGroupId) ?? []) : []

  // Members of the current group who were marked "en route" during gathering
  const enRouteInGroup = useMemo(() => {
    const names: string[] = []
    for (const m of activeMembers) {
      if (presence.get(m.guestId) === "en_route") {
        const g = guestById.get(m.guestId)
        if (g) names.push(g.fullName)
      }
    }
    for (const f of reqFiances) {
      if (presence.get(f.id) === "en_route") names.push(f.fullName)
    }
    return names
  }, [activeMembers, reqFiances, presence, guestById])

  const activeMembersByGuestGroup = useMemo(() => {
    const sortedGG = [...guestGroups].sort((a, b) => a.sortOrder - b.sortOrder)
    const byKey = new Map<string, PhotoGroupMember[]>()
    for (const m of activeMembers) {
      const key = guestById.get(m.guestId)?.groupId ?? "__none__"
      const list = byKey.get(key) ?? []
      list.push(m)
      byKey.set(key, list)
    }
    const rows: { label: string | null; key: string; members: PhotoGroupMember[] }[] = []
    for (const gg of sortedGG) {
      const ms = byKey.get(gg.id)
      if (ms?.length) rows.push({ label: gg.familyName, key: gg.id, members: ms })
    }
    const ungrouped = byKey.get("__none__") ?? []
    if (ungrouped.length) rows.push({ label: null, key: "__none__", members: ungrouped })
    return rows
  }, [activeMembers, guestById, guestGroups])

  const activeEstimatedSeconds = activeGroup
    ? estimatePhotoDurationSeconds(activeMembers.length + reqFiances.length, activeGroup.label)
    : 0

  const timeStatus = sessionActualMs / 1000 > sessionEstimatedSeconds ? "over"
    : sessionActualMs / 1000 > sessionEstimatedSeconds * 0.85 ? "warn"
    : "ok"

  async function handlePhotoPrise() {
    if (!activeGroupId || !activeGroup) return

    // Flush pending note debounce before completing the group
    if (noteTimer.current) {
      clearTimeout(noteTimer.current)
      noteTimer.current = null
    }
    if (noteValue.trim() !== (activeGroup.notes ?? "").trim()) {
      await updateGroup.mutateAsync({ id: activeGroupId, patch: { notes: noteValue.trim() || null } })
    }

    const elapsed = Date.now() - groupStartTime
    recordPhotoDuration(elapsed / 1000)
    const newElapsed = new Map(elapsedByGroupId).set(activeGroupId, elapsed)
    setElapsedByGroupId(newElapsed)
    saveElapsed(session.id, newElapsed)

    // Compute freed people: in this group but not in any remaining queue group
    const afterQueue = activeQueue.filter(g => g.id !== activeGroupId)
    const freed: string[] = []
    const groupMembers = membersByGroupId.get(activeGroupId) ?? []
    for (const m of groupMembers) {
      const stillNeeded = afterQueue.some(g => (membersByGroupId.get(g.id) ?? []).some(gm => gm.guestId === m.guestId))
      if (!stillNeeded) {
        const guest = guestById.get(m.guestId)
        if (guest) freed.push(guest.fullName)
      }
    }
    const completedFianceIds = activeGroup.requiredFianceIds.length > 0
      ? activeGroup.requiredFianceIds
      : fiances.map(f => f.id)
    for (const fid of completedFianceIds) {
      const stillNeeded = afterQueue.some(g => {
        const req = g.requiredFianceIds.length > 0 ? g.requiredFianceIds : fiances.map(f => f.id)
        return req.includes(fid)
      })
      if (!stillNeeded) {
        const fiance = fiances.find(f => f.id === fid)
        if (fiance) freed.push(fiance.fullName)
      }
    }

    await updateGroup.mutateAsync({ id: activeGroupId, patch: { status: "done" } })
    const next = activeQueue.find(g => g.id !== activeGroupId)
    setActiveGroupId(next?.id ?? null)
    if (freed.length > 0) setFreedNames(freed)
  }

  async function handlePasser() {
    if (!activeGroupId) return

    if (isInDeferredPhase) {
      // In deferred phase: dismiss definitively (keep skipped in DB, remove from local queue)
      const newDismissed = new Set([...dismissedGroupIds, activeGroupId])
      setDismissedGroupIds(newDismissed)
      const next = activeQueue.find(g => g.id !== activeGroupId && !newDismissed.has(g.id))
      setActiveGroupId(next?.id ?? null)
    } else {
      // Normal phase: defer to end (set skipped in DB — will reappear at end of queue)
      await updateGroup.mutateAsync({ id: activeGroupId, patch: { status: "skipped" } })
      const next = activeQueue.find(g => g.id !== activeGroupId)
      setActiveGroupId(next?.id ?? null)
    }
  }

  const doneGroups = sortedGroups.filter(g => g.status === "done")
  const dismissedGroups = skippedGroups.filter(g => dismissedGroupIds.has(g.id))

  // ── Recap ────────────────────────────────────────────────────────────────

  if (sortedGroups.length > 0 && activeQueue.length === 0) {
    const totalActual = [...elapsedByGroupId.values()].reduce((s, v) => s + v, 0) / 1000
    const delta = totalActual - sessionEstimatedSeconds

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onQuit} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-5" />
          </button>
          <p className="font-heading text-base font-semibold text-foreground">{session.label}</p>
        </div>

        <div className="rounded-xl border border-vert-vegetal/30 bg-vert-vegetal/5 p-5 space-y-3 text-center">
          <CheckCircle2 className="size-10 text-vert-vegetal mx-auto" />
          <p className="font-heading text-base font-semibold text-foreground">Séance terminée !</p>
          <div className="flex justify-center gap-4 text-sm text-foreground">
            <span>{doneGroups.length} prise{doneGroups.length > 1 ? "s" : ""}</span>
            {dismissedGroups.length > 0 && (
              <span className="text-muted-foreground">{dismissedGroups.length} ignoré{dismissedGroups.length > 1 ? "s" : ""}</span>
            )}
          </div>
          {totalActual > 0 && (
            <div className="flex justify-center items-center gap-2 text-sm flex-wrap">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="font-mono">{formatDuration(Math.round(totalActual))}</span>
              <span className="text-muted-foreground">/ {formatDuration(sessionEstimatedSeconds)} prévu</span>
              <span className={cn("text-xs font-medium", delta > 0 ? "text-bordeaux" : "text-vert-vegetal")}>
                ({delta > 0 ? "+" : ""}{formatDuration(Math.abs(Math.round(delta)))})
              </span>
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={onQuit}>
          Retour aux séances
        </Button>
      </div>
    )
  }

  // ── Freed announcement overlay ────────────────────────────────────────────

  if (freedNames && freedNames.length > 0) {
    const joined = freedNames.length === 1
      ? freedNames[0]
      : freedNames.length === 2
        ? `${freedNames[0]} et ${freedNames[1]}`
        : `${freedNames.slice(0, -1).join(", ")} et ${freedNames[freedNames.length - 1]}`
    const plural = freedNames.length > 1
    const announcement = plural
      ? `${joined}, merci pour votre patience ! Vous êtes libérés et pouvez rejoindre les autres invités.`
      : `${joined}, merci pour ta patience ! Tu es libéré${freedNames[0].endsWith("e") ? "e" : ""} et peux rejoindre les autres invités.`

    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] px-4 text-center">
        <div className="rounded-2xl border border-vert-vegetal/30 bg-vert-vegetal/5 p-6 space-y-4 w-full max-w-sm">
          <CheckCircle2 className="size-10 text-vert-vegetal mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-vert-vegetal">À dire à voix haute</p>
            <p className="text-lg font-heading font-semibold text-foreground leading-snug">
              « {announcement} »
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Button size="lg" onClick={() => setFreedNames(null)}>
            Continuer
          </Button>
          <p className="text-xs text-muted-foreground">Appuyez pour passer au groupe suivant</p>
        </div>
      </div>
    )
  }

  // ── Blank guard ───────────────────────────────────────────────────────────

  if (!activeGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onBack} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-5" />
          </button>
          <p className="font-heading text-base font-semibold text-foreground">{session.label}</p>
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  const upcoming = activeQueue.filter(g => g.id !== activeGroupId)

  // ── Active group ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button type="button" onClick={onBack} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-base font-semibold text-foreground truncate">{session.label}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              {doneGroups.length} prise{doneGroups.length > 1 ? "s" : ""} · {activeQueue.length} restante{activeQueue.length > 1 ? "s" : ""}
            </span>
            <span className={cn(
              "flex items-center gap-1 font-mono font-medium",
              timeStatus === "over" ? "text-bordeaux" : timeStatus === "warn" ? "text-brun" : "text-foreground"
            )}>
              <Clock className="size-3" />
              {formatMs(sessionActualMs)} / {formatDuration(sessionEstimatedSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Deferred phase banner */}
      {isInDeferredPhase && (
        <div className="rounded-lg border border-dore/30 bg-dore/5 px-3 py-2 text-xs text-brun">
          Phase de rattrapage — tous les groupes initiaux sont traités. {activeQueue.length} groupe{activeQueue.length > 1 ? "s" : ""} différé{activeQueue.length > 1 ? "s" : ""} restant{activeQueue.length > 1 ? "s" : ""}.
        </div>
      )}

      {/* Active group card */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <p className="font-heading text-base font-semibold text-foreground flex-1">{activeGroup.label}</p>
          {activeGroup.isPriority && <Star className="size-3.5 fill-dore text-dore shrink-0" />}
          {isInDeferredPhase && (
            <span className="rounded-full bg-dore/20 px-2 py-0.5 text-[10px] font-medium text-brun">différé</span>
          )}
        </div>

        {/* En route reminder */}
        {enRouteInGroup.length > 0 && (
          <div className="rounded-lg border border-dore/40 bg-dore/10 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="size-3.5 text-brun shrink-0 mt-0.5" />
            <p className="text-xs text-brun">
              {enRouteInGroup.length === 1
                ? `${enRouteInGroup[0]} était en route — vérifiez qu'il·elle est bien arrivé·e.`
                : `${enRouteInGroup.join(", ")} étaient en route — vérifiez qu'ils sont bien arrivés.`}
            </p>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2">
          {reqFiances.map(f => (
            <div key={f.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <div className="size-4 shrink-0 rounded-full border-2 border-bordeaux/40 bg-bordeaux/10" />
              <span className="text-sm font-medium text-bordeaux">{f.fullName}</span>
            </div>
          ))}
          {activeMembersByGuestGroup.map(({ label, key, members: ms }) => (
            <div key={key} className="space-y-0.5">
              {label && (
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              )}
              {ms.map(m => {
                const g = guestById.get(m.guestId)
                if (!g) return null
                return (
                  <label key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={m.isPresent}
                      onCheckedChange={v => updateMember.mutate({ id: m.id, patch: { isPresent: !!v } })}
                    />
                    <span className={cn("text-sm", !m.isPresent && "line-through text-muted-foreground")}>
                      {g.fullName}
                    </span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>

        {/* Per-group chrono */}
        <div className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2",
          groupElapsedMs / 1000 > activeEstimatedSeconds ? "bg-bordeaux/5" : "bg-muted/50"
        )}>
          <Clock className="size-3.5 text-muted-foreground shrink-0" />
          <span className={cn(
            "font-mono text-sm font-medium tabular-nums",
            groupElapsedMs / 1000 > activeEstimatedSeconds ? "text-bordeaux" : "text-foreground"
          )}>
            {formatMs(groupElapsedMs)}
          </span>
          <span className="text-xs text-muted-foreground">/ {formatDuration(activeEstimatedSeconds)} estimé</span>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Pencil className="size-3" /> Note
          </label>
          <Textarea
            value={noteValue}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder="Attendre le grand-père, à refaire en fin de soirée…"
            rows={2}
            className="text-xs resize-none"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline" size="sm"
              onClick={handlePasser}
              disabled={updateGroup.isPending}
              className={isInDeferredPhase ? "text-muted-foreground" : ""}
            >
              <SkipForward className="size-3.5" />
              {isInDeferredPhase ? "Ignorer" : "Passer"}
            </Button>
            <Button
              size="sm"
              className="bg-vert-vegetal hover:bg-vert-vegetal/90 text-white"
              onClick={handlePhotoPrise}
              disabled={updateGroup.isPending}
            >
              <Check className="size-3.5" />
              Photo prise
            </Button>
          </div>
          <button
            type="button"
            onClick={onQuit}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Quitter la séance
          </button>
        </div>
      </div>

      {/* Upcoming groups */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <button type="button" onClick={() => setShowUpcoming(v => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            {showUpcoming ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            <span>Groupes restants</span>
            <span className="ml-auto text-muted-foreground">{upcoming.length}</span>
          </button>
          {showUpcoming && (
            <div className="border-t border-border divide-y divide-border">
              {upcoming.map(g => {
                const gm = membersByGroupId.get(g.id) ?? []
                const rf = g.requiredFianceIds.length > 0 ? fiances.filter(f => g.requiredFianceIds.includes(f.id)) : fiances
                const isDeferred = g.status === "skipped"
                return (
                  <div key={g.id} className={cn("flex items-center gap-3 px-4 py-2.5", isDeferred && "opacity-60")}>
                    {g.isPriority && <Star className="size-3 fill-dore text-dore shrink-0" />}
                    <p className="flex-1 text-sm truncate text-foreground">{g.label}</p>
                    {isDeferred && <span className="text-[10px] text-muted-foreground shrink-0">différé</span>}
                    <span className="text-xs text-muted-foreground shrink-0">{gm.length + rf.length} pers.</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function PhotosGroupePage() {
  const [screen, setScreen] = useState<Screen>("sessions")
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [presence, setPresence] = useState<Map<string, PresenceStatus>>(new Map())

  const { data: sessions = [], isLoading: sl } = usePhotoSessions()
  const { data: groups = [], isLoading: gl } = usePhotoGroups()
  const { data: members = [], isLoading: ml } = useAllPhotoGroupMembers()
  const { data: guests = [], isLoading: gul } = useGuests()
  const { data: guestGroups = [], isLoading: ggl } = useGuestGroups()
  const { data: people = [], isLoading: pl } = usePeople()
  const isLoading = sl || gl || ml || gul || ggl || pl

  const updateMember = useUpdatePhotoGroupMember()

  const fiances = useMemo(() => people.filter(p => p.role === "admin"), [people])
  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId) ?? null, [sessions, activeSessionId])
  const sessionGroups = useMemo(() => groups.filter(g => g.sessionId === activeSessionId), [groups, activeSessionId])
  const sessionMembers = useMemo(
    () => members.filter(m => sessionGroups.some(g => g.id === m.photoGroupId)),
    [members, sessionGroups]
  )

  function handleEnterSession(id: string) {
    setActiveSessionId(id)
    setPresence(new Map())
    setScreen("gathering")
  }

  function togglePresence(id: string) {
    setPresence(prev => {
      const next = new Map(prev)
      next.set(id, cyclePresence(next.get(id) ?? "present"))
      return next
    })
  }

  function handleStart() {
    const absentGuestIds = [...presence.entries()]
      .filter(([, s]) => s === "absent")
      .map(([id]) => id)

    if (absentGuestIds.length > 0) {
      for (const m of sessionMembers) {
        if (absentGuestIds.includes(m.guestId)) {
          updateMember.mutate({ id: m.id, patch: { isPresent: false } })
        }
      }
    }
    setScreen("shooting")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Photos de groupe" description="" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (screen === "sessions" || !activeSession) {
    return (
      <div className="space-y-6">
        <PageHeader title="Photos de groupe" description="Gérez le déroulé des séances photo le jour J." />
        <SessionListScreen
          sessions={sessions}
          groups={groups}
          members={members}
          fiances={fiances}
          onEnter={handleEnterSession}
        />
      </div>
    )
  }

  if (screen === "gathering") {
    return (
      <GatheringScreen
        key={activeSessionId ?? "none"}
        session={activeSession}
        groups={sessionGroups}
        members={sessionMembers}
        guests={guests}
        guestGroups={guestGroups}
        fiances={fiances}
        presence={presence}
        onTogglePresence={togglePresence}
        onStart={handleStart}
        onBack={() => setScreen("sessions")}
      />
    )
  }

  return (
    <ShootingScreen
      key={activeSessionId}
      session={activeSession}
      groups={sessionGroups}
      members={sessionMembers}
      guests={guests}
      guestGroups={guestGroups}
      fiances={fiances}
      presence={presence}
      onBack={() => setScreen("gathering")}
      onQuit={() => setScreen("sessions")}
    />
  )
}
