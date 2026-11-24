import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, ExternalLink, FlaskConical, Link2, MailX, Search, TriangleAlert, Users, UserX } from "lucide-react"
import type { ReactNode } from "react"

import type { Guest, GuestGroup, ProspectStatus } from "@/types/domain"
import type { MomentAnswer, PartyMember, RsvpResponse } from "@/services/rsvp.service"
import { useGuestGroups, useGuests, useUpdateGuest } from "@/hooks/queries/use-guests"
import { buildGuestTree, type GuestTreeNode } from "@/components/invites/GuestTreeView"
import { MAILED_STATUSES, defaultInvitationName, effectiveProspect } from "@/lib/invitations"
import { useEventSequences } from "@/hooks/queries/use-event-sequences"
import { useGuestSequences } from "@/hooks/queries/use-guest-sequences"
import { useLinkPartyMember, useRsvpResponses } from "@/hooks/queries/use-rsvp"
import { useCommunicationSends, useCommunications } from "@/hooks/queries/use-communications"
import { useInvitationActivity } from "./use-invitation-activity"
import { groupLabel } from "@/lib/groups"
import { PROSPECT_LISTS, guestList } from "@/lib/prospect"
import { sequenceColor } from "@/lib/sequence-colors"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { DAYS, RSVP } from "@/pages/sj-invitation/content"
import { INVITATION_ROUTES } from "@/pages/sj-invitation/paths"
import { simulateResponses } from "./invitation-demo"
import { InvitationStats, type MomentStat, type SideStat, type Slice } from "./InvitationStats"

/**
 * Invités › Invitation en ligne : suivi de l'invitation /Jordan-Sarah-2027/invitation.
 *   · statistiques (graphiques dépliables) ;
 *   · par moment : conviés, réponses, personnes annoncées ;
 *   · par invité, regroupés par groupe : liste (A, B…), moments conviés, réponse, aperçu de sa page,
 *     et nom qui figurera sur l'invitation (surnom ou prénom par défaut, ou alias saisi, ex. « Tatie Monique »).
 * Une réponse couvre la personne qui répond, son conjoint (pairedWithId) et les personnes de sa liste
 * « personnes concernées » dont le nom correspond à un seul invité.
 */

/** unsure : « je ne sais pas encore ». */
type Status = "yes" | "no" | "unsure" | "pending"
/** member : la personne correspondante dans la réponse (formulaire par étapes), avec sa réponse par moment. */
type Coverage = { response: RsvpResponse; via: "self" | "party"; member?: PartyMember }
type SortKey = "family" | "name" | "status" | "date" | "list"
/** conviés : au moins un moment coché · courrier : toutes les listes qui reçoivent un courrier · sans-moment : courrier sans moment. */
type Scope = "invited" | "mailed" | "no-moment"

const SORT_LABELS: Record<SortKey, string> = {
  family: "Famille (couples ensemble)", name: "Nom", status: "Réponse (sans réponse d'abord)", date: "Date de réponse (récentes d'abord)", list: "Liste (A, B…)",
}
const STATUS_ORDER: Record<Status, number> = { pending: 0, unsure: 1, yes: 2, no: 3 }
const LIST_ORDER = new Map(PROSPECT_LISTS.map((l, i) => [l.value, i]))
/** Couleurs des listes pour le camembert (mêmes teintes que les badges). */
const LIST_COLORS: Partial<Record<ProspectStatus, string>> = {
  main_list: "#3f8f5a", secondary_list: "#3b82c4", deferred: "#d9a441", faire_part: "#8b6bb8", pending: "#9ca3af", not_invited: "#c0504d",
}
const SIDE_LABELS: Record<string, string> = { sarah: "Côté Sarah", jordan: "Côté Jordan", both: "Commun", none: "Sans côté" }
const NO_GROUP = "__none__"
const MAILED = new Set(MAILED_STATUSES.map((s) => s.value))

/** Ordre de l'arbre des invités : couple côte à côte, enfants après leurs parents. */
function flatten(nodes: GuestTreeNode[]): Guest[] {
  return nodes.flatMap((n) => [n.primary, ...(n.partner ? [n.partner] : []), ...flatten(n.children)])
}

const normalize = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "")

const isNo = (r: RsvpResponse) => r.attendance === "no" || r.attendance === "probably-not"

const isUnsure = (r: RsvpResponse) => r.attendance === "probably"
const ANSWER_STATUS: Record<MomentAnswer, Status> = { yes: "yes", no: "no", unsure: "unsure" }

/** État d'un invité pour un moment donné (ou pour l'invitation, sans moment). */
function statusIn(coverage: Map<string, Coverage>, guestId: string, momentId?: string): Status {
  const c = coverage.get(guestId)
  if (!c) return "pending"
  if (isNo(c.response)) return "no"
  // Formulaire par étapes : réponse de la personne pour ce moment (absente = moment non proposé).
  if (c.member) {
    if (!momentId) return isUnsure(c.response) ? "unsure" : "yes"
    const a = c.member.moments[momentId]
    return a ? ANSWER_STATUS[a] : "pending"
  }
  if (isUnsure(c.response)) return "unsure"
  if (momentId && c.response.sequencesAttending && !c.response.sequencesAttending.includes(momentId)) return "no"
  return "yes"
}

/** Nombre de personnes d'une réponse : ses personnes (formulaire par étapes), ou à défaut le nombre indiqué. */
const peopleOf = (r: RsvpResponse) => (r.party ? r.party.length : (r.partySize ?? r.adults ?? 1))

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso))
}

/** Moments de l'invitation (ordre et libellés de content.ts). */
const MOMENTS = DAYS.flatMap((d) => d.moments.map((m) => ({ id: m.sequenceId, title: m.title, day: d.label, time: m.time, limited: !!m.limited })))

export function InvitationEnLigneTab() {
  const { data: guests = [], isLoading: lGuests } = useGuests()
  const { data: groups = [], isLoading: lGroups } = useGuestGroups()
  const { data: sequences = [] } = useEventSequences()
  const { data: assigned = {}, isLoading: lAssign } = useGuestSequences()
  const { data: responses = [], isLoading: lRsvp } = useRsvpResponses()

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")
  const [momentFilter, setMomentFilter] = useState("")
  const [listFilter, setListFilter] = useState<ProspectStatus | "all">("all")
  const [sortKey, setSortKey] = useState<SortKey>("family")
  const [scope, setScope] = useState<Scope>("invited")
  const [onlyCustom, setOnlyCustom] = useState(false)
  const [grouped, setGrouped] = useState(true)
  // Réponses fictives, en mémoire uniquement (aperçu de l'onglet avant les vraies réponses).
  const [demo, setDemo] = useState(false)

  const momentName = (id: string) => MOMENTS.find((m) => m.id === id)?.title ?? sequences.find((s) => s.id === id)?.name ?? "Séquence inconnue"
  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  // Réponses de l'invitation, la plus récente d'abord : chaque invité est couvert par la plus récente qui le concerne.
  const demoResponses = useMemo(() => {
    if (!demo) return []
    const ids = MOMENTS.map((m) => m.id)
    const inv = guests.filter((g) => (assigned[g.id] ?? []).some((id) => ids.includes(id)))
    return simulateResponses(inv, assigned, ids)
  }, [demo, guests, assigned])

  const invitationResponses = useMemo(
    () => [...responses, ...demoResponses].filter((r) => r.wave === "invitation").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [responses, demoResponses],
  )

  // Invité de la liste correspondant à une personne d'une réponse : par sa fiche, sinon par nom unique.
  const memberGuestId = useMemo(() => {
    const byName = new Map<string, Guest[]>()
    for (const g of guests) {
      const k = normalize(`${g.firstName}${g.lastName}`)
      byName.set(k, [...(byName.get(k) ?? []), g])
    }
    return (m: PartyMember): string | null => {
      if (m.guestId && guestById.has(m.guestId)) return m.guestId
      const found = byName.get(normalize(`${m.firstName}${m.lastName}`))
      return found?.length === 1 ? found[0].id : null
    }
  }, [guests, guestById])

  const coverage = useMemo(() => {
    const byName = new Map<string, Guest[]>()
    for (const g of guests) {
      const k = normalize(`${g.firstName}${g.lastName}`)
      byName.set(k, [...(byName.get(k) ?? []), g])
    }
    const map = new Map<string, Coverage>()
    const cover = (id: string | null | undefined, c: Coverage) => { if (id && !map.has(id)) map.set(id, c) }
    for (const r of invitationResponses) {
      const self = r.guestId ? guestById.get(r.guestId) : undefined
      if (r.party?.length) {
        // Formulaire par étapes : la première personne est celle qui répond ; les autres, par leur fiche
        // (membres du foyer proposés), sinon par prénom + nom.
        cover(self?.id, { response: r, via: "self", member: r.party[0] })
        for (const m of r.party.slice(self ? 1 : 0)) {
          const id = memberGuestId(m)
          if (id) cover(id, { response: r, via: "party", member: m })
        }
        continue
      }
      // Anciennes réponses : la personne, son conjoint et les noms de la liste.
      cover(self?.id, { response: r, via: "self" })
      cover(self?.pairedWithId, { response: r, via: "party" })
      for (const line of (r.partyNames ?? "").split("\n")) {
        const found = byName.get(normalize(line))
        if (found?.length === 1) cover(found[0].id, { response: r, via: "party" })
      }
    }
    return map
  }, [invitationResponses, guests, guestById, memberGuestId])

  // Personnes d'une réponse qui en dépendent encore : un membre qui a répondu depuis (lui-même ou via un proche)
  // est compté avec cette réponse plus récente, pas deux fois.
  const activeParty = useCallback((r: RsvpResponse) => (r.party ?? []).filter((m, i) => {
    const id = i === 0 && r.guestId ? r.guestId : memberGuestId(m)
    return !id || !coverage.has(id) || coverage.get(id)!.response.id === r.id
  }), [coverage, memberGuestId])
  const peopleIn = useCallback((r: RsvpResponse) => (r.party ? activeParty(r).length : peopleOf(r)), [activeParty])

  const knownNames = useMemo(() => new Set(guests.map((g) => normalize(`${g.firstName}${g.lastName}`))), [guests])

  // Invités conviés : au moins une séquence de l'invitation.
  const invited = useMemo(
    () => guests.filter((g) => (assigned[g.id] ?? []).some((id) => MOMENTS.some((m) => m.id === id))),
    [guests, assigned],
  )

  const totals = useMemo(() => {
    const t = { invited: invited.length, yes: 0, no: 0, unsure: 0, pending: 0, people: 0, under10: 0, responses: 0 }
    for (const g of invited) t[statusIn(coverage, g.id)]++
    // Réponses retenues : la plus récente de chaque invité qui répond (les anciennes versions sont ignorées).
    const kept = invitationResponses.filter((r) => !r.guestId || coverage.get(r.guestId)?.response.id === r.id)
    t.responses = kept.length
    t.people = kept.filter((r) => !isNo(r)).reduce((n, r) => n + peopleIn(r), 0)
    t.under10 = kept.filter((r) => !isNo(r)).reduce((n, r) => n + activeParty(r).filter((m) => m.under10).length, 0)
    return t
  }, [invited, coverage, invitationResponses, peopleIn, activeParty])

  const byMoment: MomentStat[] = useMemo(() => MOMENTS.map((m) => {
    const guestsOfMoment = invited.filter((g) => (assigned[g.id] ?? []).includes(m.id))
    const counts = { yes: 0, no: 0, unsure: 0, pending: 0 }
    for (const g of guestsOfMoment) counts[statusIn(coverage, g.id, m.id)]++
    // Personnes annoncées : chaque réponse comptée une fois. Formulaire par étapes : les personnes qui ont
    // répondu « oui » (et « je ne sais pas encore ») à ce moment, invitées ou non ; sinon le nombre de personnes.
    const counted = new Set<string>()
    let people = 0, maybe = 0
    for (const g of guestsOfMoment) {
      const c = coverage.get(g.id)
      if (!c || counted.has(c.response.id) || isNo(c.response)) continue
      counted.add(c.response.id)
      if (c.response.party) {
        const party = activeParty(c.response)
        people += party.filter((p) => p.moments[m.id] === "yes").length
        maybe += party.filter((p) => p.moments[m.id] === "unsure").length
      } else if (statusIn(coverage, g.id, m.id) === "yes") people += peopleOf(c.response)
      else if (statusIn(coverage, g.id, m.id) === "unsure") maybe += peopleOf(c.response)
    }
    const seq = sequences.find((s) => s.id === m.id)
    return { ...m, color: seq ? sequenceColor(seq) : "#9ca3af", invited: guestsOfMoment.length, ...counts, people, maybe }
  }), [invited, assigned, coverage, sequences, activeParty])

  const byList: Slice[] = useMemo(() => PROSPECT_LISTS.map((l) => ({
    key: l.value, label: l.label, color: LIST_COLORS[l.value] ?? "#9ca3af",
    value: invited.filter((g) => guestList(g) === l.value).length,
  })), [invited])

  const bySide: SideStat[] = useMemo(() => {
    const map = new Map<string, SideStat>()
    for (const g of invited) {
      const key = (g.groupId ? groupById.get(g.groupId)?.side : null) ?? "none"
      const s = map.get(key) ?? { key, label: SIDE_LABELS[key] ?? key, yes: 0, no: 0, unsure: 0, pending: 0 }
      s[statusIn(coverage, g.id)]++
      map.set(key, s)
    }
    return ["sarah", "jordan", "both", "none"].map((k) => map.get(k)).filter((s): s is SideStat => !!s)
  }, [invited, groupById, coverage])

  // Date de réponse de chaque invité couvert (courbe d'arrivée des réponses).
  const responseDates = useMemo(
    () => invited.map((g) => coverage.get(g.id)?.response.createdAt.slice(0, 10)).filter((d): d is string => !!d),
    [invited, coverage],
  )

  // Personnes déclarées dans une réponse mais introuvables dans la liste (nom saisi librement, homonymes…) :
  // à rattacher à la main. La personne qui répond, si son compte est relié à un invité, n'en fait pas partie.
  const outsiders = useMemo(() => responses
    .filter((r) => r.wave === "invitation" && r.party?.length)
    .flatMap((r) => r.party!.map((m, index) => ({ r, m, index })))
    .filter(({ r, m, index }) => !(index === 0 && r.guestId && guestById.has(r.guestId)) && !memberGuestId(m))
    .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt)),
  [responses, guestById, memberGuestId])

  const unlinked = useMemo(
    () => invitationResponses.filter((r) => !r.guestId || !guestById.has(r.guestId)),
    [invitationResponses, guestById],
  )

  // Périmètre de la liste : conviés (statistiques), ou toutes les personnes qui reçoivent un courrier.
  const invitedIds = useMemo(() => new Set(invited.map((g) => g.id)), [invited])
  const listed = useMemo(() => {
    if (scope === "invited") return invited
    const mailed = guests.filter((g) => MAILED.has(effectiveProspect(g)))
    if (scope === "no-moment") return mailed.filter((g) => !invitedIds.has(g.id))
    return [...invited, ...mailed.filter((g) => !invitedIds.has(g.id))]
  }, [scope, invited, invitedIds, guests])

  const rows = useMemo(() => {
    const q = normalize(query)
    const filtered = listed.filter((g) => {
      if (q && !normalize(`${g.firstName}${g.lastName}${g.fullName}${g.invitationName ?? ""}`).includes(q)) return false
      if (onlyCustom && !g.invitationName?.trim()) return false
      if (momentFilter && !(assigned[g.id] ?? []).includes(momentFilter)) return false
      if (listFilter !== "all" && guestList(g) !== listFilter) return false
      if (statusFilter !== "all" && statusIn(coverage, g.id, momentFilter || undefined) !== statusFilter) return false
      return true
    })
    const byName = (a: Guest, b: Guest) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr")
    // Famille : ordre de l'arbre (couples côte à côte, enfants après leurs parents), groupe par groupe.
    const treeOrder = new Map<string, number>()
    if (sortKey === "family") {
      const byGroup = new Map<string, Guest[]>()
      for (const g of filtered) byGroup.set(g.groupId ?? NO_GROUP, [...(byGroup.get(g.groupId ?? NO_GROUP) ?? []), g])
      for (const list of byGroup.values()) flatten(buildGuestTree(list)).forEach((g, i) => treeOrder.set(g.id, i))
    }
    const cmp: Record<SortKey, (a: Guest, b: Guest) => number> = {
      family: (a, b) => (treeOrder.get(a.id) ?? 0) - (treeOrder.get(b.id) ?? 0) || byName(a, b),
      name: byName,
      status: (a, b) => STATUS_ORDER[statusIn(coverage, a.id, momentFilter || undefined)] - STATUS_ORDER[statusIn(coverage, b.id, momentFilter || undefined)] || byName(a, b),
      date: (a, b) => (coverage.get(b.id)?.response.createdAt ?? "").localeCompare(coverage.get(a.id)?.response.createdAt ?? "") || byName(a, b),
      list: (a, b) => (LIST_ORDER.get(guestList(a)) ?? 99) - (LIST_ORDER.get(guestList(b)) ?? 99) || byName(a, b),
    }
    return filtered.sort(cmp[sortKey])
  }, [listed, query, onlyCustom, statusFilter, momentFilter, listFilter, sortKey, assigned, coverage])

  // Regroupement par groupe d'invités, dans l'ordre des groupes ; « Sans groupe » en dernier.
  const sections = useMemo(() => {
    if (!grouped) return [{ key: "all", label: "", group: null as GuestGroup | null, guests: rows }]
    const map = new Map<string, Guest[]>()
    for (const g of rows) {
      const k = g.groupId && groupById.has(g.groupId) ? g.groupId : NO_GROUP
      map.set(k, [...(map.get(k) ?? []), g])
    }
    return [...groups].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => g.id).concat(NO_GROUP)
      .filter((k) => map.has(k))
      .map((k) => {
        const group = groupById.get(k) ?? null
        return { key: k, label: group ? groupLabel(group, groups) : "Sans groupe", group, guests: map.get(k)! }
      })
  }, [grouped, rows, groups, groupById])

  if (lGuests || lGroups || lAssign || lRsvp) {
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
  }

  const previewUrl = (id: string) => `${INVITATION_ROUTES.details}?apercu=${encodeURIComponent(id)}`
  const select = "h-9 rounded-md border bg-background px-2 text-sm"

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Invitation en ligne</h2>
          <p className="text-sm text-muted-foreground">
            Chaque invité voit les moments cochés dans l'onglet Séquences. Les réponses arrivent aussi dans l'onglet Réponses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDemo((d) => !d)} aria-pressed={demo}
            className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
              demo ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300" : "hover:bg-muted")}>
            <FlaskConical className="size-3.5" aria-hidden />
            {demo ? "Retirer la simulation" : "Simuler des réponses"}
          </button>
          <a href={INVITATION_ROUTES.landing} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            Ouvrir l'invitation <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>

      {demo && (
        <p className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm text-violet-800 dark:text-violet-200" role="status">
          <b>Simulation</b> : {demoResponses.length} réponses fictives sont ajoutées à l'affichage pour voir le rendu.
          Rien n'est enregistré ; elles disparaissent en quittant l'onglet ou avec « Retirer la simulation ».
        </p>
      )}

      <InvitationStats totals={totals} moments={byMoment} byList={byList} bySide={bySide}
        responseDates={responseDates} deadline={RSVP.deadlineDate} />

      {/* Par moment */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Par moment</h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Moment</th>
                <th className="px-3 py-2 text-right font-medium">Conviés</th>
                <th className="px-3 py-2 text-right font-medium">Oui</th>
                <th className="px-3 py-2 text-right font-medium">Non</th>
                <th className="px-3 py-2 text-right font-medium">Ne sait pas</th>
                <th className="px-3 py-2 text-right font-medium">En attente</th>
                <th className="px-3 py-2 text-right font-medium">Personnes annoncées</th>
                <th className="w-40 px-3 py-2 font-medium">Avancement</th>
              </tr>
            </thead>
            <tbody>
              {byMoment.map((m) => (
                <tr key={m.id} className={cn("cursor-pointer border-t hover:bg-muted/30", momentFilter === m.id && "bg-muted")}
                  onClick={() => setMomentFilter(momentFilter === m.id ? "" : m.id)} aria-selected={momentFilter === m.id}>
                  <td className="px-3 py-2">
                    <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ background: m.color }} />
                    <span className="font-medium">{m.title}</span>
                    {m.limited && <span className="ml-2 rounded border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">limité</span>}
                    <span className="block pl-3.5 text-xs text-muted-foreground">{m.day}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.invited}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{m.yes}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.no}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-sky-700 dark:text-sky-400">{m.unsure}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-400">{m.pending}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {m.people}{m.maybe > 0 && <span className="font-normal text-sky-700 dark:text-sky-400"> +{m.maybe} ?</span>}
                  </td>
                  <td className="px-3 py-2"><Progress yes={m.yes} no={m.no} unsure={m.unsure} total={m.invited} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Cliquez sur un moment pour filtrer la liste des invités.</p>
      </section>

      {/* Personnes hors liste : alerte, à rattacher à la main avant de lire la liste des invités */}
      {outsiders.length > 0 && (
        <section className="space-y-3 rounded-xl border border-amber-400 bg-amber-50 p-4 dark:border-amber-500/60 dark:bg-amber-950/30" role="alert">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <TriangleAlert className="size-4" aria-hidden />
            Personnes hors liste ({outsiders.length})
          </h3>
          <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
            Personnes déclarées dans une réponse sans correspondance dans la liste (nom saisi autrement, homonyme…).
            Rattache-les à un invité pour qu'elles comptent dans le suivi et les statistiques.
          </p>
          <div className="divide-y rounded-lg border bg-background">
            {outsiders.map(({ r, m, index }) => (
              <OutsiderRow key={`${r.id}-${index}`} response={r} member={m} index={index} guests={guests}
                responderName={(r.guestId && guestById.get(r.guestId)?.fullName) || r.name} momentName={momentName} />
            ))}
          </div>
        </section>
      )}

      {/* Invitation envoyée (Communications) mais pas encore ouverte */}
      <NotConnected guestById={guestById} answered={(id) => coverage.has(id)} />

      {/* Par invité (bloc dépliable) */}
      <Fold storageKey="sj-suivi-invites-ouvert" icon={<Users className="size-4 text-muted-foreground" />}
        title="Invités" summary={`${rows.length} affiché${rows.length > 1 ? "s" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" className="h-9 w-44 pl-8" aria-label="Rechercher un invité" />
          </div>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label="Périmètre" className={select}>
            <option value="invited">Conviés (au moins un moment)</option>
            <option value="mailed">Tout le courrier (A, B, différée, faire-part)</option>
            <option value="no-moment">Courrier sans moment coché</option>
          </select>
          <select value={listFilter} onChange={(e) => setListFilter(e.target.value as ProspectStatus | "all")} aria-label="Filtrer par liste" className={select}>
            <option value="all">Toutes les listes</option>
            {PROSPECT_LISTS.filter((l) => byList.some((b) => b.key === l.value && b.value > 0)).map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <select value={momentFilter} onChange={(e) => setMomentFilter(e.target.value)} aria-label="Filtrer par moment" className={select}>
            <option value="">Tous les moments</option>
            {MOMENTS.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | "all")} aria-label="Filtrer par réponse" className={select}>
            <option value="all">Toutes les réponses</option>
            <option value="pending">Sans réponse</option>
            <option value="unsure">Ne sait pas encore</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} aria-label="Trier" className={select}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <option key={k} value={k}>Tri : {SORT_LABELS[k]}</option>)}
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} className="size-4 accent-primary" />
            Par groupe
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input type="checkbox" checked={onlyCustom} onChange={(e) => setOnlyCustom(e.target.checked)} className="size-4 accent-primary" />
            Noms personnalisés
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Nom sur l'invitation : par défaut le surnom ou, à défaut, le prénom. Saisissez un autre nom (ex. « Tatie Monique ») pour le remplacer ;
          videz le champ pour revenir au nom par défaut.
        </p>

        {rows.length === 0 && <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Aucun invité ne correspond.</p>}

        <div className="space-y-4">
          {sections.map((sec) => {
            const counts = { yes: 0, no: 0, unsure: 0, pending: 0 }
            for (const g of sec.guests) if (invitedIds.has(g.id)) counts[statusIn(coverage, g.id, momentFilter || undefined)]++
            return (
              <div key={sec.key} className="overflow-hidden rounded-xl border">
                {grouped && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-3 py-2">
                    <span className="font-semibold">{sec.label}</span>
                    {sec.group?.side && <span className="text-xs text-muted-foreground">{SIDE_LABELS[sec.group.side]}</span>}
                    <span className="ml-auto flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-muted-foreground">{sec.guests.length} personne{sec.guests.length > 1 ? "s" : ""}</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{counts.yes} oui</span>
                      <span className="text-muted-foreground">{counts.no} non</span>
                      {counts.unsure > 0 && <span className="text-sky-700 dark:text-sky-400">{counts.unsure} ne sait pas</span>}
                      <span className="text-amber-700 dark:text-amber-400">{counts.pending} en attente</span>
                    </span>
                  </div>
                )}
                <div className="divide-y">
                  {sec.guests.map((g) => (
                    <GuestRow key={g.id} guest={g} coverage={coverage.get(g.id)} assigned={assigned[g.id] ?? []}
                      status={invitedIds.has(g.id) ? statusIn(coverage, g.id, momentFilter || undefined) : "none"}
                      momentStatus={(id) => statusIn(coverage, g.id, id)}
                      responderName={(id) => guestById.get(id)?.fullName}
                      isKnown={(m) => knownNames.has(normalize(`${m.firstName}${m.lastName}`))}
                      previewUrl={previewUrl(g.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Fold>

      {/* Réponses non rattachées */}
      {unlinked.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Réponses non rattachées à un invité ({unlinked.length})
          </h3>
          <p className="text-xs text-muted-foreground">Compte de l'invitation non retrouvé dans la liste : à rapprocher à la main.</p>
          <div className="divide-y rounded-xl border">
            {unlinked.map((r) => (
              <div key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <StatusBadge status={isNo(r) ? "no" : "yes"} />
                <span className="text-xs text-muted-foreground">
                  {formatDate(r.createdAt)}
                  {r.partySize ? ` · ${r.partySize} pers.` : ""}
                  {r.sequencesAttending?.length ? ` · ${r.sequencesAttending.map(momentName).join(", ")}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Invitation reçue, pas encore connecté ────────────────────────────────────

/**
 * Invités notés « envoyé » dans une communication (par défaut celle dont le nom contient « M-6 ») qui ne se sont
 * jamais connectés à l'invitation (journal 0182 : connexions rattachées à leur fiche). À relancer.
 */
function NotConnected({ guestById, answered }: { guestById: Map<string, Guest>; answered: (guestId: string) => boolean }) {
  const { data: comms = [] } = useCommunications()
  const sorted = useMemo(() => [...comms].sort((a, b) => a.sortOrder - b.sortOrder), [comms])
  const [chosen, setChosen] = useState<string | null>(null)
  const commId = chosen ?? (sorted.find((c) => /m\s*-?\s*6/i.test(c.name)) ?? sorted[0])?.id ?? null
  const { data: sends = [], isLoading: lSends } = useCommunicationSends(commId)
  const { data: activity = [], isLoading: lActivity, error } = useInvitationActivity()

  const rows = useMemo(() => {
    const connected = new Set(activity.map((v) => v.guest_id).filter((id): id is string => !!id))
    return sends
      .map((s) => ({ s, g: guestById.get(s.guestId) }))
      .filter((x): x is { s: typeof x.s; g: Guest } => !!x.g && !connected.has(x.g.id))
      .map(({ s, g }) => ({
        s, g,
        partner: g.pairedWithId && connected.has(g.pairedWithId) ? guestById.get(g.pairedWithId) : undefined,
        answered: answered(g.id),
      }))
      // D'abord ceux sans nouvelle (ni réponse, ni conjoint connecté), puis les plus anciens envois.
      .sort((a, b) => Number(!!a.partner || a.answered) - Number(!!b.partner || b.answered) || a.s.sentAt.localeCompare(b.s.sentAt))
  }, [sends, activity, guestById, answered])

  if (sorted.length === 0) return null
  const silent = rows.filter((x) => !x.partner && !x.answered).length

  return (
    <Fold storageKey="sj-suivi-pas-connectes-ouvert" icon={<MailX className="size-4 text-muted-foreground" />}
      title="Invitation reçue, pas encore connecté"
      summary={lSends || lActivity ? "…" : `${rows.length} personne${rows.length > 1 ? "s" : ""}${silent > 0 ? ` · ${silent} sans nouvelle` : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <select value={commId ?? ""} onChange={(e) => setChosen(e.target.value)} aria-label="Communication"
          className="h-9 rounded-md border bg-background px-2 text-sm">
          {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Invités notés « envoyé » dans Communications qui ne se sont jamais connectés à l'invitation.
        {silent > 0 && ` ${silent} sans aucune nouvelle à relancer en priorité.`}
      </p>
      {error ? (
        <p className="text-sm text-destructive">Impossible de charger les connexions : {(error as Error).message}</p>
      ) : !lSends && !lActivity && rows.length === 0 ? (
        <p className="rounded-xl border p-4 text-center text-sm text-muted-foreground">
          {sends.length === 0 ? "Aucun envoi noté pour cette communication." : "Tous les destinataires se sont connectés."}
        </p>
      ) : (
        <div className="divide-y rounded-xl border">
          {rows.map(({ s, g, partner, answered: done }) => (
            <div key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm">
              <span className="font-medium">{g.fullName}</span>
              <span className="text-xs text-muted-foreground">envoyée le {formatDate(s.sentAt)}</span>
              {partner && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">{partner.firstName} s'est connecté(e)</span>}
              {done && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">réponse reçue via un proche</span>}
            </div>
          ))}
        </div>
      )}
    </Fold>
  )
}

/** Bloc dépliable (comme les statistiques) : état ouvert / fermé mémorisé sur l'appareil. */
function Fold({ storageKey, icon, title, summary, children }: {
  storageKey: string; icon: ReactNode; title: string; summary?: string; children: ReactNode
}) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(storageKey) !== "0" } catch { return true } })
  const toggle = () => setOpen((o) => { try { localStorage.setItem(storageKey, o ? "0" : "1") } catch { /* stockage indisponible */ } return !o })
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
        <ChevronDown className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 border-t border-border p-4">{children}</div>}
    </section>
  )
}

// ── Personne hors liste ───────────────────────────────────────────────────────

/** Une personne hors liste : son contexte (réponse, moments) et la recherche d'un invité auquel la rattacher. */
function OutsiderRow({ response: r, member: m, index, guests, responderName, momentName }: {
  response: RsvpResponse; member: PartyMember; index: number; guests: Guest[]; responderName: string
  momentName: (id: string) => string
}) {
  const link = useLinkPartyMember()
  const [query, setQuery] = useState("")
  const name = `${m.firstName} ${m.lastName}`.trim() || "Sans nom"
  const answers = Object.entries(m.moments ?? {})
  // Suggestions : la recherche saisie, sinon les invités au même nom ou prénom.
  const suggestions = useMemo(() => {
    const q = normalize(query)
    const score = (g: Guest) => {
      if (q) return normalize(`${g.firstName}${g.lastName}${g.fullName}`).includes(q) ? 1 : 0
      return (normalize(g.lastName) === normalize(m.lastName) ? 2 : 0) + (normalize(g.firstName) === normalize(m.firstName) ? 1 : 0)
    }
    return guests.map((g) => ({ g, s: score(g) })).filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.g.lastName.localeCompare(b.g.lastName, "fr")).slice(0, 6).map((x) => x.g)
  }, [guests, query, m.firstName, m.lastName])

  function attach(g: Guest) {
    link.mutate({ responseId: r.id, party: r.party ?? [], index, guestId: g.id }, {
      onSuccess: () => toast.success(`${name} rattaché(e) à ${g.fullName}`),
      onError: () => toast.error("Le rattachement a échoué. Réessaie dans un instant."),
    })
  }

  return (
    <div className="space-y-2 p-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <UserX className="size-3.5 shrink-0 self-center text-amber-600" aria-hidden />
        <span className="font-medium">{name}</span>
        {m.under10 && <span className="text-xs text-muted-foreground">moins de 10 ans</span>}
        <span className="text-xs text-muted-foreground">
          {index === 0 ? "a répondu" : `dans la réponse de ${responderName}`} · {formatDate(r.createdAt)}
        </span>
      </div>
      {answers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {answers.map(([id, a]) => `${momentName(id)} ${ANSWER_MARK[a]}`).join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher l'invité…"
            className="h-8 pl-8 text-sm" aria-label={`Invité à rattacher à ${name}`} />
        </div>
        {suggestions.map((g) => (
          <button key={g.id} type="button" disabled={link.isPending} onClick={() => attach(g)}
            className="inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50">
            <Link2 className="size-3" aria-hidden />{g.fullName}
          </button>
        ))}
        {query && suggestions.length === 0 && <span className="text-xs text-muted-foreground">Aucun invité trouvé.</span>}
      </div>
    </div>
  )
}

// ── Ligne invité ──────────────────────────────────────────────────────────────

const ANSWER_MARK: Record<MomentAnswer, string> = { yes: "✓", no: "✗", unsure: "?" }

function GuestRow({ guest: g, coverage: c, assigned, status, momentStatus, responderName, isKnown, previewUrl }: {
  guest: Guest
  coverage: Coverage | undefined
  assigned: string[]
  /** none : aucun moment coché (pas convié en ligne). */
  status: Status | "none"
  momentStatus: (momentId: string) => Status
  responderName: (guestId: string) => string | undefined
  /** La personne de la réponse correspond-elle à un invité de la liste ? */
  isKnown: (member: PartyMember) => boolean
  previewUrl: string
}) {
  const r = c?.response
  const list = PROSPECT_LISTS.find((l) => l.value === guestList(g))
  return (
    <div className="grid gap-2 p-3 sm:grid-cols-[minmax(12rem,16rem)_1fr_auto] sm:items-start sm:gap-4">
      <div className="min-w-0">
        <p className="font-medium">{g.firstName} {g.lastName}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {status === "none"
            ? <span className="inline-flex rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground">Aucun moment coché</span>
            : <StatusBadge status={status} />}
          {list && <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", list.color)}>{list.label}</span>}
          {g.isChild && <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Enfant</span>}
        </div>
        <NameInput guest={g} />
        <LanguageToggle guest={g} />
      </div>
      <div className="space-y-1 text-sm">
        <p className="flex flex-wrap gap-1">
          {MOMENTS.filter((m) => assigned.includes(m.id)).map((m) => {
            const s = momentStatus(m.id)
            return (
              <span key={m.id} title={`${m.title} · ${m.day}`}
                className={cn("rounded-full border px-2 py-0.5 text-xs",
                  s === "yes" && "border-emerald-500/40 bg-emerald-500/10", s === "no" && "text-muted-foreground line-through",
                  s === "unsure" && "border-dashed border-sky-500/60 bg-sky-500/5")}>
                {m.title}
              </span>
            )
          })}
        </p>
        {r && (
          <p className="text-xs text-muted-foreground">
            {c?.via === "party" ? `Réponse de ${(r.guestId && responderName(r.guestId)) || r.name}` : "A répondu"} le {formatDate(r.createdAt)}
            {!isNo(r) && peopleOf(r) ? ` · ${peopleOf(r)} personne${peopleOf(r) > 1 ? "s" : ""}` : ""}
            {!r.party && r.partyNames && !isNo(r) ? ` (${r.partyNames.split("\n").filter(Boolean).join(", ")})` : ""}
            {r.dietaryConstraints && !r.party ? ` · Régime : ${r.dietaryConstraints}` : ""}
          </p>
        )}
        {r?.party && !isNo(r) && c?.via === "self" && (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {r.party.map((p, i) => {
              const known = isKnown(p)
              return (
                <li key={i}>
                  <span className="text-foreground">{p.firstName} {p.lastName}</span>
                  {p.under10 && " · moins de 10 ans"}
                  {p.diet && <span className="ml-1 rounded bg-rose-500/10 px-1 text-[10px] text-rose-700 dark:text-rose-400">régime : {p.diet}</span>}
                  {!known && <span className="ml-1 rounded bg-amber-500/15 px-1 text-[10px] text-amber-700 dark:text-amber-400">hors liste</span>}
                  {" : "}
                  {MOMENTS.filter((m) => p.moments[m.id]).map((m) => `${m.title} ${ANSWER_MARK[p.moments[m.id]]}`).join(" · ")}
                </li>
              )
            })}
          </ul>
        )}
        {r?.message && c?.via === "self" && <p className="rounded bg-muted/60 px-2 py-1 text-xs italic">« {r.message} »</p>}
      </div>
      <a href={previewUrl} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1 justify-self-start text-xs text-muted-foreground underline-offset-4 hover:underline sm:justify-self-end">
        Voir sa page <ExternalLink className="size-3" aria-hidden />
      </a>
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = {
    yes: { label: "Oui", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    no: { label: "Non", cls: "bg-muted text-muted-foreground" },
    unsure: { label: "Ne sait pas encore", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
    pending: { label: "Sans réponse", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  }[status]
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>{cfg.label}</span>
}

function Progress({ yes, no, unsure, total }: { yes: number; no: number; unsure: number; total: number }) {
  if (!total) return <span className="text-xs text-muted-foreground">—</span>
  const pct = (n: number) => `${(n / total) * 100}%`
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-amber-500/20" role="img"
      aria-label={`${yes} oui, ${no} non, ${unsure} ne savent pas encore, ${total - yes - no - unsure} en attente sur ${total}`}>
      <span className="bg-emerald-500" style={{ width: pct(yes) }} />
      <span className="bg-muted-foreground/30" style={{ width: pct(no) }} />
      <span className="bg-sky-500/60" style={{ width: pct(unsure) }} />
    </div>
  )
}

/** Langue de l'invitation en ligne (FR par défaut) : enregistrée au clic. */
function LanguageToggle({ guest }: { guest: Guest }) {
  const update = useUpdateGuest()
  const current = guest.invitationLanguage ?? "fr"
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Langue de l'invitation</span>
      <div className="inline-flex overflow-hidden rounded-md border" role="radiogroup" aria-label={`Langue de l'invitation de ${guest.firstName} ${guest.lastName}`}>
        {(["fr", "en"] as const).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={current === l}
            className={cn("px-2 py-0.5 text-[11px] font-medium uppercase", current === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            onClick={() => {
              if (l === current) return
              update.mutate({ id: guest.id, patch: { invitationLanguage: l === "fr" ? null : l } }, { onError: () => toast.error("Langue non enregistrée.") })
            }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Nom sur l'invitation : enregistré en quittant le champ (ou avec Entrée) ; vide = nom par défaut. */
function NameInput({ guest }: { guest: Guest }) {
  const update = useUpdateGuest()
  const [draft, setDraft] = useState(guest.invitationName ?? "")
  const save = () => {
    const v = draft.trim() || null
    if (v === (guest.invitationName?.trim() || null)) return
    update.mutate({ id: guest.id, patch: { invitationName: v } }, { onError: () => toast.error("Nom non enregistré.") })
  }
  return (
    <label className="mt-2 block">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Nom sur l'invitation</span>
      <Input value={draft} placeholder={defaultInvitationName(guest)} aria-label={`Nom sur l'invitation de ${guest.firstName} ${guest.lastName}`}
        className={cn("mt-0.5 h-8", draft.trim() && "border-primary/50 font-medium")}
        onChange={(e) => setDraft(e.target.value)} onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }} />
    </label>
  )
}
