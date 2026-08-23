import { useMemo, useRef, useState } from "react"
import { CheckCircle2, Mail, Send, Smartphone } from "lucide-react"

import type { Guest, PaperType, ProspectStatus } from "@/types/domain"
import { useGuestGroups, useGuests, useUpdateGuest } from "@/hooks/queries/use-guests"
import { groupLabel } from "@/lib/groups"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

// Statuts inclus dans la tab papeterie (not_invited et pending exclus)
const POSTAL_STATUSES = new Set<ProspectStatus>(["main_list", "secondary_list", "deferred", "faire_part"])

const PROSPECT_LABEL: Record<string, string> = {
  main_list: "Liste A",
  secondary_list: "Liste B",
  deferred: "Différée",
  faire_part: "Faire-part",
}

const PROSPECT_COLORS: Record<string, string> = {
  main_list: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  secondary_list: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  deferred: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  faire_part: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
}

type PaperFilter = "all" | "paper" | "digital"
type ProspectFilter = "all" | ProspectStatus

// null prospectStatus = historique traité comme main_list
function effectiveStatus(guest: Guest): ProspectStatus {
  return guest.prospectStatus ?? "main_list"
}

// Type de courrier déduit du statut prospect (usage interne uniquement)
function derivedPaperType(guest: Guest): PaperType {
  return guest.prospectStatus === "faire_part" ? "faire_part" : "invitation"
}

// ── Champ adresse inline ───────────────────────────────────────────────────────

function AddressField({ guest }: { guest: Guest }) {
  const update = useUpdateGuest()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(guest.postalAddress ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(guest.postalAddress ?? "")
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function save() {
    const val = draft.trim() || null
    if (val !== (guest.postalAddress ?? null)) {
      update.mutate({ id: guest.id, patch: { postalAddress: val } })
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder="Adresse postale complète…"
        className="mt-0.5 block w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="mt-0.5 block text-left w-full text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
    >
      {guest.postalAddress ?? <span className="italic opacity-50">Ajouter une adresse…</span>}
    </button>
  )
}

// ── Ligne invité ───────────────────────────────────────────────────────────────

function GuestRow({ guest, showToggle }: { guest: Guest; showToggle: boolean }) {
  const update = useUpdateGuest()
  const isPaper = !!guest.paperType
  const status = effectiveStatus(guest)

  function togglePaper(v: boolean) {
    update.mutate({
      id: guest.id,
      patch: {
        paperType: v ? derivedPaperType(guest) : null,
        paperSent: v ? guest.paperSent : false,
      },
    })
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
      {/* Toggle Numérique / Papier — uniquement dans la vue "Tous" */}
      {showToggle && (
        <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => { if (isPaper) togglePaper(false) }}
            className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
              !isPaper ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Smartphone className="size-3" />
            Numérique
          </button>
          <div className="w-px bg-border" />
          <button
            type="button"
            onClick={() => { if (!isPaper) togglePaper(true) }}
            className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
              isPaper
                ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400"
                : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Mail className="size-3" />
            Papier
          </button>
        </div>
      )}

      {/* Nom + adresse */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isPaper ? "font-medium" : "text-muted-foreground"}`}>
          {guest.fullName}
        </span>
        <AddressField guest={guest} />
      </div>

      {/* Badge statut prospect */}
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PROSPECT_COLORS[status] ?? ""}`}>
        {PROSPECT_LABEL[status] ?? status}
      </span>

      {/* Envoyé — seulement si papier */}
      {isPaper && (
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-muted-foreground">
          <Checkbox
            checked={guest.paperSent}
            onCheckedChange={(v) => update.mutate({ id: guest.id, patch: { paperSent: !!v } })}
          />
          Envoyé
        </label>
      )}
    </div>
  )
}

// ── Tab principal ──────────────────────────────────────────────────────────────

const PROSPECT_FILTERS: { value: ProspectFilter; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "main_list", label: "Liste A" },
  { value: "secondary_list", label: "Liste B" },
  { value: "deferred", label: "Différée" },
  { value: "faire_part", label: "Faire-part" },
]

export function PapeterieTab() {
  const { data: guests = [], isLoading: guestsLoading } = useGuests()
  const { data: groups = [], isLoading: groupsLoading } = useGuestGroups()
  const [paperFilter, setPaperFilter] = useState<PaperFilter>("paper")
  const [prospectFilter, setProspectFilter] = useState<ProspectFilter>("all")

  const isLoading = guestsLoading || groupsLoading

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.sortOrder - b.sortOrder), [groups])

  // Seuls les invités des listes prospects (+ null = historiques = Liste A)
  const activeGuests = useMemo(
    () =>
      guests.filter(
        (g) =>
          g.isActive !== false &&
          !g.isChild &&
          (g.prospectStatus === null || POSTAL_STATUSES.has(g.prospectStatus as ProspectStatus)),
      ),
    [guests],
  )

  const stats = useMemo(() => {
    const paper = activeGuests.filter((g) => g.paperType)
    const sent = activeGuests.filter((g) => g.paperSent)
    return { paper: paper.length, digital: activeGuests.length - paper.length, sent: sent.length }
  }, [activeGuests])

  const filtered = useMemo(() => {
    let list = activeGuests
    if (prospectFilter !== "all") {
      list = list.filter((g) => effectiveStatus(g) === prospectFilter)
    }
    if (paperFilter === "paper") list = list.filter((g) => g.paperType)
    if (paperFilter === "digital") list = list.filter((g) => !g.paperType)
    return list
  }, [activeGuests, paperFilter, prospectFilter])

  const byGroup = useMemo(() => {
    const map = new Map<string, Guest[]>()
    for (const g of filtered) {
      const key = g.groupId ?? "__none__"
      const arr = map.get(key) ?? []
      arr.push(g)
      map.set(key, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
    return map
  }, [filtered])

  const groupRows = useMemo(() => {
    const rows: { key: string; label: string; guests: Guest[] }[] = []
    for (const grp of sortedGroups) {
      const list = byGroup.get(grp.id)
      if (list?.length) rows.push({ key: grp.id, label: groupLabel(grp, groups), guests: list })
    }
    const none = byGroup.get("__none__")
    if (none?.length) rows.push({ key: "__none__", label: "Sans groupe", guests: none })
    return rows
  }, [byGroup, sortedGroups, groups])

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h2 className="font-semibold text-lg">Papeterie</h2>
        <p className="text-sm text-muted-foreground">
          Réception numérique par défaut. Indiquez qui recevra un envoi postal parmi les listes A, B, Différée et Faire-part.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="flex items-center gap-6 rounded-xl border bg-card px-5 py-3">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums">{stats.paper}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="size-3" /> Papier postal</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums">{stats.digital}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="size-3" /> Numérique</span>
        </div>
        {stats.paper > 0 && (
          <>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold tabular-nums">{stats.sent}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Send className="size-3" /> Envoyés</span>
            </div>
            <div className="flex-1 min-w-0 ml-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.round((stats.sent / stats.paper) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {Math.round((stats.sent / stats.paper) * 100)} % envoyés
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Filtres ── */}
      <div className="space-y-2">
        {/* Filtre papier / numérique */}
        <div className="flex flex-wrap gap-2">
          {([
            { value: "all" as PaperFilter, label: "Tous", count: activeGuests.length },
            { value: "paper" as PaperFilter, label: "Papier postal", count: stats.paper },
            { value: "digital" as PaperFilter, label: "Numérique", count: stats.digital },
          ] as const).map(({ value, label, count }) => (
            <Button key={value} variant={paperFilter === value ? "default" : "outline"} size="sm" onClick={() => setPaperFilter(value)}>
              {label}
              <span className="ml-1.5 tabular-nums text-xs opacity-70">{count}</span>
            </Button>
          ))}
        </div>

        {/* Filtre statut prospect */}
        <div className="flex flex-wrap gap-2">
          {PROSPECT_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setProspectFilter(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                prospectFilter === value
                  ? value === "all"
                    ? "bg-foreground text-background"
                    : (PROSPECT_COLORS[value] ?? "bg-foreground text-background")
                  : "bg-muted text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste par groupe ── */}
      {groupRows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun invité dans cette vue.</p>
      ) : (
        <div className="space-y-4">
          {groupRows.map(({ key, label, guests: list }) => {
            const paperInGroup = list.filter((g) => g.paperType)
            const sentInGroup = list.filter((g) => g.paperSent)
            return (
              <div key={key} className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex-1">{label}</p>
                  {paperInGroup.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {sentInGroup.length}/{paperInGroup.length} envoyé{sentInGroup.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {paperInGroup.some((g) => !g.paperSent) && (
                    <MarkGroupSentButton guests={paperInGroup} />
                  )}
                </div>
                <div className="divide-y divide-border/50">
                  {list.map((g) => (
                    <GuestRow key={g.id} guest={g} showToggle={paperFilter === "all"} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MarkGroupSentButton({ guests }: { guests: Guest[] }) {
  const update = useUpdateGuest()
  const toMark = guests.filter((g) => g.paperType && !g.paperSent)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    toMark.forEach((g) => update.mutate({ id: g.id, patch: { paperSent: true } }))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      <CheckCircle2 className="size-3" />
      Tout marquer envoyé
    </button>
  )
}
