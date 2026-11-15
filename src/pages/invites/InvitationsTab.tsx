import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"

import type { Guest, ProspectStatus } from "@/types/domain"
import { buildGuestTree, type GuestTreeNode } from "@/components/invites/GuestTreeView"
import { useGuestGroups, useGuests, useUpdateGuest } from "@/hooks/queries/use-guests"
import { groupLabel } from "@/lib/groups"
import { MAILED_STATUSES, defaultInvitationName, effectiveProspect, invitationName } from "@/lib/invitations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

const NO_GROUP = "__none__"

/** Ordre de l'arbre des invités : couple côte à côte, enfants après leurs parents. */
function flatten(nodes: GuestTreeNode[]): Guest[] {
  return nodes.flatMap((n) => [n.primary, ...(n.partner ? [n.partner] : []), ...flatten(n.children)])
}

/**
 * Préparation des invitations (Invités › Invitations) : pour chaque personne, le nom qui figurera
 * sur l'invitation — surnom ou prénom par défaut, ou un alias saisi (ex. « Tatie Monique »).
 */
export function InvitationsTab() {
  const { data: guests = [], isLoading: l1 } = useGuests()
  const { data: groups = [], isLoading: l2 } = useGuestGroups()
  const [statuses, setStatuses] = useState<Set<ProspectStatus>>(new Set(MAILED_STATUSES.map((s) => s.value)))
  const [search, setSearch] = useState("")
  const [onlyCustom, setOnlyCustom] = useState(false)

  const inScope = useMemo(() => guests.filter((g) => statuses.has(effectiveProspect(g))), [guests, statuses])

  // Groupes dans l'ordre des réglages, « Sans groupe » en dernier ; invités dans l'ordre de l'arbre.
  const sections = useMemo(() => [...groups.map((g) => g.id), NO_GROUP].map((key) => {
    const group = groups.find((g) => g.id === key) ?? null
    const members = flatten(buildGuestTree(inScope.filter((g) => (g.groupId ?? NO_GROUP) === key)))
    return { key, title: group ? groupLabel(group, groups) : "Sans groupe", members }
  }), [groups, inScope])

  if (l1 || l2) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>

  const q = search.trim().toLowerCase()
  const visible = sections
    .map((s) => ({
      ...s,
      members: s.members
        .filter((g) => !onlyCustom || g.invitationName?.trim())
        .filter((g) => !q || s.title.toLowerCase().includes(q) || `${g.firstName} ${g.lastName} ${invitationName(g)}`.toLowerCase().includes(q)),
    }))
    .filter((s) => s.members.length > 0)
  const custom = inScope.filter((g) => g.invitationName?.trim()).length

  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Rechercher une personne, un groupe…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground">{inScope.length} personnes · {custom} nom{custom > 1 ? "s" : ""} personnalisé{custom > 1 ? "s" : ""}</span>
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
        <button type="button" className={chip(onlyCustom)} onClick={() => setOnlyCustom((v) => !v)}>Seulement les noms personnalisés</button>
      </div>

      <p className="text-xs text-muted-foreground">
        Par défaut, l'invitation reprend le surnom ou, à défaut, le prénom. Saisissez un autre nom (ex. « Tatie Monique ») pour le remplacer ; videz le champ pour revenir au nom par défaut.
      </p>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Personne ne correspond.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((s) => (
            <section key={s.key} className="overflow-hidden rounded-2xl border bg-card">
              <div className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</div>
              <div className="divide-y divide-border/40">
                {s.members.map((g) => (
                  <div key={g.id} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 px-4 py-2 sm:grid-cols-2">
                    <div className="min-w-0 text-sm">
                      {g.firstName} <span className="font-medium">{g.lastName}</span>
                      {g.isChild && <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">enfant</span>}
                    </div>
                    <NameInput guest={g} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function NameInput({ guest }: { guest: Guest }) {
  const update = useUpdateGuest()
  const [draft, setDraft] = useState(guest.invitationName ?? "")
  const save = () => {
    const v = draft.trim() || null
    if (v === (guest.invitationName?.trim() || null)) return
    update.mutate({ id: guest.id, patch: { invitationName: v } }, { onError: () => toast.error("Nom non enregistré.") })
  }
  return (
    <Input value={draft} placeholder={defaultInvitationName(guest)} aria-label={`Nom sur l'invitation de ${guest.firstName} ${guest.lastName}`}
      className={cn("h-8", draft.trim() && "border-primary/50 font-medium")}
      onChange={(e) => setDraft(e.target.value)} onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }} />
  )
}
