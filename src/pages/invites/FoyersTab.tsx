import { useMemo, useState } from "react"
import { Plus, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import type { Guest, GuestGroup, Household, ProspectStatus } from "@/types/domain"
import { buildGuestTree, type GuestTreeNode } from "@/components/invites/GuestTreeView"
import {
  useCreateHousehold, useDeleteHousehold, useGuestGroups, useGuests, useHouseholds, useSetGuestsHousehold, useUpdateHousehold,
} from "@/hooks/queries/use-guests"
import { groupLabel } from "@/lib/groups"
import { MAILED_STATUSES, effectiveProspect, householdText, invitationName, orderMembers } from "@/lib/invitations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

const NO_GROUP = "__none__"

/** Ordre de l'arbre des invités : couple côte à côte, enfants après leurs parents. */
function flatten(nodes: GuestTreeNode[]): Guest[] {
  return nodes.flatMap((n) => [n.primary, ...(n.partner ? [n.partner] : []), ...flatten(n.children)])
}

/**
 * Invités › Foyers : constitution des foyers à la main, groupe par groupe — une invitation par foyer.
 * Les noms sur l'invitation se saisissent dans l'onglet Invitations.
 */
export function FoyersTab() {
  const { data: guests = [], isLoading: l1 } = useGuests()
  const { data: groups = [], isLoading: l2 } = useGuestGroups()
  const { data: households = [], isLoading: l3 } = useHouseholds()
  const [statuses, setStatuses] = useState<Set<ProspectStatus>>(new Set(MAILED_STATUSES.map((s) => s.value)))
  const [search, setSearch] = useState("")
  const [hideDone, setHideDone] = useState(false)

  const inScope = useMemo(() => guests.filter((g) => statuses.has(effectiveProspect(g))), [guests, statuses])
  const householdIds = new Set(households.map((h) => h.id))
  const hasHousehold = (g: Guest) => !!g.householdId && householdIds.has(g.householdId)

  // Groupes dans l'ordre des réglages, « Sans groupe » en dernier ; invités dans l'ordre de l'arbre.
  const sections = useMemo(() => {
    const keys = [...groups.map((g) => g.id), NO_GROUP]
    return keys.map((key) => {
      const group = groups.find((g) => g.id === key) ?? null
      const members = flatten(buildGuestTree(inScope.filter((g) => (g.groupId ?? NO_GROUP) === key)))
      return { key, group, title: group ? groupLabel(group, groups) : "Sans groupe", members }
    }).filter((s) => s.members.length > 0 || households.some((h) => (h.groupId ?? NO_GROUP) === s.key))
  }, [groups, inScope, households])

  if (l1 || l2 || l3) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>

  const q = search.trim().toLowerCase()
  const visible = sections
    .map((s) => ({
      ...s,
      members: !q || s.title.toLowerCase().includes(q) ? s.members
        : s.members.filter((g) => `${g.firstName} ${g.lastName} ${invitationName(g)}`.toLowerCase().includes(q)),
    }))
    .filter((s) => s.members.length > 0 || !q)
    .filter((s) => !hideDone || s.members.some((g) => !hasHousehold(g)))

  const withoutHousehold = inScope.filter((g) => !hasHousehold(g)).length
  const usedHouseholds = households.filter((h) => inScope.some((g) => g.householdId === h.id)).length

  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Personnes", value: inScope.length },
          { label: "Foyers = invitations", value: usedHouseholds },
          { label: "Sans foyer", value: withoutHousehold, accent: withoutHousehold > 0 },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card px-4 py-3 text-center">
            <p className={cn("text-2xl font-bold tabular-nums", c.accent && "text-amber-600 dark:text-amber-400")}>{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="relative min-w-48 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" placeholder="Rechercher une personne, un groupe…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Courrier :</span>
        {MAILED_STATUSES.map((s) => (
          <button key={s.value} type="button" className={chip(statuses.has(s.value))} onClick={() => setStatuses((prev) => {
            const next = new Set(prev)
            if (next.has(s.value)) next.delete(s.value); else next.add(s.value)
            return next
          })}>{s.label}</button>
        ))}
        <button type="button" className={chip(hideDone)} onClick={() => setHideDone((v) => !v)}>Seulement les groupes à compléter</button>
      </div>

      <p className="text-xs text-muted-foreground">
        Une invitation par foyer. Cochez les personnes d'un groupe puis « Créer un foyer », ou ajoutez-les à un foyer existant. Le texte de l'invitation reprend les noms des membres (adultes puis enfants) ; vous pouvez le remplacer.
      </p>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Personne ne correspond.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((s) => (
            <HouseholdsSection key={s.key} group={s.group} title={s.title} members={s.members}
              households={households.filter((h) => (h.groupId ?? NO_GROUP) === s.key)} guests={guests} hasHousehold={hasHousehold} />
          ))}
        </div>
      )}
    </div>
  )
}

function HouseholdsSection({ group, title, members, households, guests, hasHousehold }: {
  group: GuestGroup | null
  title: string
  members: Guest[]
  households: Household[]
  guests: Guest[]
  hasHousehold: (g: Guest) => boolean
}) {
  const create = useCreateHousehold()
  const setHousehold = useSetGuestsHousehold()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const loose = members.filter((g) => !hasHousehold(g))
  const membersOf = (h: Household) => orderMembers(guests.filter((g) => g.householdId === h.id))

  async function createFrom(ids: string[]) {
    try {
      await create.mutateAsync({ groupId: group?.id ?? null, memberIds: ids, sortOrder: households.length })
      setSelected(new Set())
    } catch (err) {
      console.error(err)
      toast.error("Foyer non créé.")
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">
          {households.length} foyer{households.length > 1 ? "s" : ""}
          {loose.length > 0 ? <> · <b className="text-amber-600 dark:text-amber-400">{loose.length} sans foyer</b></> : " · complet ✓"}
        </span>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Personnes sans foyer */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sans foyer ({loose.length})</p>
          {loose.length === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">Tout le monde a un foyer.</p>
          ) : (
            <ul className="space-y-1">
              {loose.map((g) => (
                <li key={g.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/40">
                  <Checkbox checked={selected.has(g.id)} aria-label={`Sélectionner ${g.firstName} ${g.lastName}`} onCheckedChange={(v) => setSelected((prev) => {
                    const next = new Set(prev)
                    if (v) next.add(g.id); else next.delete(g.id)
                    return next
                  })} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {invitationName(g)} <span className="text-xs text-muted-foreground">({g.firstName} {g.lastName})</span>
                    {g.isChild && <span className="ml-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">enfant</span>}
                  </span>
                  {households.length > 0 && (
                    <select className="h-7 max-w-36 rounded-md border border-input bg-background px-1.5 text-xs" value="" aria-label="Ajouter à un foyer"
                      onChange={(e) => { if (e.target.value) setHousehold.mutate({ guestIds: [g.id], householdId: e.target.value }) }}>
                      <option value="">Ajouter à…</option>
                      {households.map((h, i) => <option key={h.id} value={h.id}>{i + 1}. {householdText(h, membersOf(h))}</option>)}
                    </select>
                  )}
                </li>
              ))}
            </ul>
          )}
          {loose.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" disabled={selected.size === 0 || create.isPending} onClick={() => void createFrom([...selected])}>
                <Plus className="size-3.5" /> Créer un foyer{selected.size ? ` (${selected.size})` : ""}
              </Button>
              {selected.size > 0 && <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Désélectionner</Button>}
            </div>
          )}
        </div>

        {/* Foyers du groupe */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Foyers ({households.length})</p>
          {households.length === 0 && <p className="text-xs italic text-muted-foreground/70">Aucun foyer dans ce groupe.</p>}
          {households.map((h, i) => <HouseholdCard key={h.id} index={i + 1} household={h} members={membersOf(h)} />)}
        </div>
      </div>
    </section>
  )
}

function HouseholdCard({ index, household, members }: { index: number; household: Household; members: Guest[] }) {
  const update = useUpdateHousehold()
  const remove = useDeleteHousehold()
  const setHousehold = useSetGuestsHousehold()
  const [label, setLabel] = useState(household.label ?? "")
  const auto = householdText({ ...household, label: null }, members)

  const saveLabel = () => {
    const v = label.trim() || null
    if (v !== (household.label?.trim() || null)) update.mutate({ id: household.id, patch: { label: v } })
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">#{index}</span>
        <Input value={label} placeholder={auto} aria-label="Texte de l'invitation pour ce foyer"
          className={cn("h-8", label.trim() && "border-primary/50 font-medium")}
          onChange={(e) => setLabel(e.target.value)} onBlur={saveLabel}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }} />
        <button type="button" aria-label="Supprimer le foyer" title="Supprimer le foyer (ses membres redeviennent sans foyer)"
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
          onClick={() => { if (confirm(`Supprimer ce foyer ? Ses ${members.length} membre(s) redeviendront sans foyer.`)) remove.mutate(household.id) }}>
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {members.length === 0 && <span className="text-xs italic text-muted-foreground">Aucun membre.</span>}
        {members.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs">
            {invitationName(g)}
            {g.isChild && <span className="text-[10px] text-muted-foreground">· enfant</span>}
            <button type="button" aria-label={`Retirer ${g.firstName} du foyer`} className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setHousehold.mutate({ guestIds: [g.id], householdId: null })}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
