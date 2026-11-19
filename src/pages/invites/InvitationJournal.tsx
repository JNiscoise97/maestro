import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, CircleHelp, LogIn, MailCheck, RotateCcw, Search, X } from "lucide-react"


import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { KEYS } from "@/features/gallery/api"
import { galleryClient } from "@/features/gallery/client"
import { useGuests } from "@/hooks/queries/use-guests"
import { useRsvpResponses } from "@/hooks/queries/use-rsvp"
import { cn } from "@/lib/utils"
import type { MomentAnswer, PartyMember, RsvpResponse } from "@/services/rsvp.service"
import { DAYS } from "@/pages/sj-invitation/content"
import type { Guest } from "@/types/domain"

/**
 * Journal de l'invitation en ligne (Invités › Invitations › Journal), du plus récent au plus ancien :
 *   · connexions et retours sur l'invitation : journal de la galerie (_20260725_gal_activity, événements
 *     login / visit envoyés avec details.source = 'invitation'), lus par la fonction
 *     _20260725_gal_invitation_journal (migration 0182 : nom, heure, rôle ; jamais l'e-mail), sans session galerie ;
 *   · réponses envoyées depuis l'invitation (rsvp_responses, wave = invitation), visibles sans connexion.
 */
export function InvitationJournal() {
  return <Journal />
}

/** Une connexion ou un retour sur l'invitation (fonction _20260725_gal_invitation_journal). */
type Visit = {
  id: number; created_at: string; event: "login" | "visit"; member_id: string | null
  first_name: string | null; last_name: string | null; guest_id: string | null; role: string | null
}

type Kind = "login" | "visit" | "rsvp"
type Entry = { id: string; at: string; kind: Kind; who: string; detail?: string; update?: boolean; response?: RsvpResponse; admin?: boolean }

const KIND_LABELS: Record<Kind, string> = { login: "Connexion", visit: "Retour sur l'invitation", rsvp: "Réponse" }
const ATTENDANCE: Record<string, string> = { yes: "Oui", probably: "Ne sait pas encore", "probably-not": "Probablement pas", no: "Non" }
/** Moments de l'invitation, dans l'ordre du programme (titre et jour). */
const MOMENTS = DAYS.flatMap((d) => d.moments.map((m) => ({ id: m.sequenceId, title: m.title, day: d.label })))
const MOMENT_ANSWER: Record<MomentAnswer, string> = { yes: "Oui", no: "Non", unsure: "Ne sait pas encore" }
const FILTERS = [
  { value: "all", label: "Tout" },
  { value: "connexions", label: "Connexions" },
  { value: "rsvp", label: "Réponses" },
] as const
type Filter = (typeof FILTERS)[number]["value"]

/** Connexions et retours sur l'invitation (journal de la galerie), 1 000 derniers. */
function useInvitationActivity() {
  return useQuery({
    queryKey: [...KEYS.admin, "activity", "invitation-journal"],
    enabled: !!galleryClient,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Visit[]> => {
      const { data, error } = await (galleryClient! as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .rpc("_20260725_gal_invitation_journal", { p_limit: 1000 })
      if (error) throw error
      return (data ?? []) as Visit[]
    },
  })
}

function Journal() {
  const { data: guests = [] } = useGuests()
  const { data: responses = [], isLoading: lRsvp } = useRsvpResponses()
  const { data: activity = [], isLoading: lActivity, error: activityError } = useInvitationActivity()

  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const guestName = useMemo(() => new Map(guests.map((g) => [g.id, g.fullName])), [guests])
  const nameOf = (v: Visit) =>
    !v.member_id ? "Compte supprimé" : (v.guest_id && guestName.get(v.guest_id)) || `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim() || "Compte sans nom"

  const invitationResponses = useMemo(
    () => responses.filter((r) => r.wave === "invitation").sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [responses],
  )

  const entries = useMemo(() => {
    const list: Entry[] = []
    // Réponses : la première d'un invité, puis ses modifications.
    const seen = new Set<string>()
    for (const r of invitationResponses) {
      const key = r.guestId ?? `nom:${r.name.toLowerCase()}`
      list.push({ id: `r-${r.id}`, at: r.createdAt, kind: "rsvp", who: (r.guestId && guestName.get(r.guestId)) || r.name, detail: rsvpDetail(r), update: seen.has(key), response: r })
      seen.add(key)
    }
    for (const a of activity) {
      if (a.event !== "login" && a.event !== "visit") continue
      list.push({ id: `a-${a.id}`, at: a.created_at, kind: a.event, who: nameOf(a), admin: a.role === "admin" })
    }
    return list.sort((a, b) => b.at.localeCompare(a.at))
    // nameOf ne dépend que de guestName.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationResponses, activity, guestName])

  const q = query.trim().toLowerCase()
  const shown = entries.filter((e) =>
    (filter === "all" || (filter === "rsvp" ? e.kind === "rsvp" : e.kind !== "rsvp")) &&
    (!q || e.who.toLowerCase().includes(q) || (e.detail ?? "").toLowerCase().includes(q) ||
      (e.response?.party ?? []).some((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))))

  // Comptes venus sur l'invitation sans avoir encore répondu (ni été inclus par un proche) : à relancer.
  const stats = useMemo(() => {
    const lastVisit = new Map<string, Visit>()
    for (const a of activity) if (a.member_id && !lastVisit.has(a.member_id)) lastVisit.set(a.member_id, a)
    const answered = new Set<string>()
    for (const r of invitationResponses) {
      if (r.guestId) answered.add(r.guestId)
      for (const p of r.party ?? []) if (p.guestId) answered.add(p.guestId)
    }
    const silent = [...lastVisit.values()].filter((v) => v.role !== "admin" && !(v.guest_id && answered.has(v.guest_id)))
    const respondents = new Set(invitationResponses.map((r) => r.guestId ?? r.name.toLowerCase()))
    return { visitors: lastVisit.size, respondents: respondents.size, silent }
  }, [activity, invitationResponses])

  const byDay = useMemo(() => {
    const groups: { day: string; items: Entry[] }[] = []
    for (const e of shown) {
      const day = e.at.slice(0, 10)
      const last = groups[groups.length - 1]
      if (last?.day === day) last.items.push(e)
      else groups.push({ day, items: [e] })
    }
    return groups
  }, [shown])

  if (lRsvp) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Journal de l'invitation</h2>
        <p className="text-sm text-muted-foreground">
          Qui se connecte à l'invitation en ligne, qui revient, et qui répond. Le plus récent en premier.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Personnes venues sur l'invitation" value={stats.visitors} />
        <Stat label="Invités ayant répondu" value={stats.respondents} />
        <Stat label="Venus sans répondre" value={stats.silent.length}
          hint={stats.silent.length > 0 ? stats.silent.map(nameOf).sort((a, b) => a.localeCompare(b, "fr")).join(", ") : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Type d'événement">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" role="radio" aria-checked={filter === f.value} onClick={() => setFilter(f.value)}
              className={cn("rounded-full border px-3 py-1 text-sm transition-colors",
                filter === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30")}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une personne" className="pl-8" aria-label="Rechercher une personne" />
        </div>
      </div>

      {activityError && (
        <p className="text-sm text-destructive">
          Impossible de charger les connexions : {(activityError as Error).message}
          {/function|_20260725_gal_invitation_journal/i.test((activityError as Error).message ?? "") && " (migration 0182 à exécuter)"}
        </p>
      )}
      {lActivity && <p className="text-sm text-muted-foreground">Chargement des connexions…</p>}

      {byDay.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Rien pour l'instant.</p>
      ) : (
        <div className="space-y-6">
          {byDay.map(({ day, items }) => (
            <section key={day}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{formatDay(day)}</h3>
              <ul className="divide-y rounded-lg border bg-card">
                {items.map((e) => <JournalRow key={e.id} entry={e} guests={guests} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function JournalRow({ entry: e, guests }: { entry: Entry; guests: Guest[] }) {
  const Icon = e.kind === "rsvp" ? MailCheck : e.kind === "login" ? LogIn : RotateCcw
  return (
    <li className="flex items-start gap-3 px-3 py-2.5 text-sm">
      <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{formatTime(e.at)}</span>
      <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
        e.kind === "rsvp" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p>
          <span className="font-medium">{e.who}</span>{" "}
          {e.admin && <span className="mr-1"><Tag>Admin</Tag></span>}
          <span className="text-muted-foreground">
            · {e.kind === "rsvp" ? (e.update ? "Réponse modifiée" : "Réponse") : KIND_LABELS[e.kind]}
          </span>
        </p>
        {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
        {e.response && <Bulletin response={e.response} guests={guests} />}
      </div>
    </li>
  )
}

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "")

/**
 * Bulletin de réponse complet : chaque personne (la première est celle qui répond), dans la liste des invités
 * ou ajoutée librement, moins de 10 ans, restrictions, et sa réponse pour chaque moment ;
 * puis la confirmation horaire, les restrictions générales et le petit mot.
 */
function Bulletin({ response: r, guests }: { response: RsvpResponse; guests: Guest[] }) {
  const party = r.party ?? []
  // Moments du bulletin : ceux présents dans les réponses, dans l'ordre du programme (inconnus à la fin).
  const ids = [...new Set(party.flatMap((p) => Object.keys(p.moments)))]
  const known = MOMENTS.filter((m) => ids.includes(m.id))
  const moments = [...known, ...ids.filter((id) => !known.some((m) => m.id === id)).map((id) => ({ id, title: "Séquence inconnue", day: "" }))]
  const inList = (p: PartyMember) =>
    (!!p.guestId && guests.some((g) => g.id === p.guestId)) ||
    guests.some((g) => norm(g.firstName) === norm(p.firstName) && norm(g.lastName) === norm(p.lastName))
  const declined = r.attendance === "no" || r.attendance === "probably-not"
  const fallbackMoments = !party.length && r.sequencesAttending?.length
    ? r.sequencesAttending.map((id) => MOMENTS.find((m) => m.id === id)?.title ?? "Séquence inconnue").join(", ") : null

  return (
    <div className="mt-2 space-y-3 rounded-md border bg-muted/30 p-3 text-xs">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Rempli par</dt><dd className="font-medium">{r.name}</dd>
        <dt className="text-muted-foreground">Présence</dt><dd>{ATTENDANCE[r.attendance] ?? r.attendance}</dd>
        {!declined && (party.length > 0 || r.partySize != null) && (
          <><dt className="text-muted-foreground">Personnes</dt><dd>{party.length || r.partySize}</dd></>
        )}
        {r.arrivalAck && (
          <><dt className="text-muted-foreground">Horaire</dt><dd>{r.arrivalAck === "ok" ? "C'est bien noté" : "Risque d'arriver plus tard"}</dd></>
        )}
        {fallbackMoments && <><dt className="text-muted-foreground">Moments</dt><dd>{fallbackMoments}</dd></>}
        {!party.length && r.partyNames && <><dt className="text-muted-foreground">Noms</dt><dd className="whitespace-pre-line">{r.partyNames}</dd></>}
        {r.dietaryConstraints && <><dt className="text-muted-foreground">Restrictions</dt><dd>{r.dietaryConstraints}</dd></>}
      </dl>

      {!declined && party.length > 0 && (
        <ul className="space-y-2">
          {party.map((p, i) => (
            <li key={i} className="rounded border bg-card p-2.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium">{`${p.firstName} ${p.lastName}`.trim() || "Sans nom"}</span>
                {i === 0 && <Tag>répond</Tag>}
                {inList(p) ? <Tag>dans la liste</Tag> : <Tag warn>hors liste</Tag>}
                {p.under10 && <Tag>moins de 10 ans</Tag>}
              </p>
              {p.diet && <p className="mt-0.5 italic text-muted-foreground">Restrictions : {p.diet}</p>}
              {moments.length > 0 && (
                <ul className="mt-1.5 divide-y">
                  {moments.map((m) => <MomentLine key={m.id} title={m.title} day={m.day} answer={p.moments[m.id]} />)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {r.message && (
        <blockquote className="whitespace-pre-line border-l-2 pl-2.5 italic text-foreground/80">{r.message}</blockquote>
      )}
    </div>
  )
}

function MomentLine({ title, day, answer }: { title: string; day: string; answer: MomentAnswer | undefined }) {
  const a = answer ?? "unsure"
  const Icon = a === "yes" ? Check : a === "no" ? X : CircleHelp
  return (
    <li className="flex items-center justify-between gap-3 py-1">
      <span>{title}{day && <span className="text-muted-foreground"> · {day}</span>}</span>
      <span className={cn("flex shrink-0 items-center gap-1 font-medium",
        a === "yes" ? "text-emerald-700 dark:text-emerald-300" : a === "no" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300")}>
        <Icon className="size-3.5" aria-hidden />{answer ? MOMENT_ANSWER[a] : "—"}
      </span>
    </li>
  )
}

function Tag({ children, warn = false }: { children: ReactNode; warn?: boolean }) {
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
      warn ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground")}>
      {children}
    </span>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs">{hint}</p>}
    </div>
  )
}

/** « Oui · 3 personnes (avec Paul DUPONT, Léa DUPONT) ». */
function rsvpDetail(r: RsvpResponse): string {
  const answer = ATTENDANCE[r.attendance] ?? r.attendance
  if (r.attendance === "no" || r.attendance === "probably-not") return answer
  const party = r.party ?? []
  const count = party.length || r.partySize || 1
  const others = party.slice(1).map((p) => `${p.firstName} ${p.lastName}`.trim())
  return `${answer} · ${count} personne${count > 1 ? "s" : ""}${others.length ? ` (avec ${others.join(", ")})` : ""}`
}

function formatDay(day: string) {
  const s = new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

/** Onglet Invités › Invitations : suivi des invités (par défaut) ou journal des connexions et réponses. */
export function InvitationsArea({ suivi }: { suivi: ReactNode }) {
  const [view, setView] = useState<"suivi" | "journal">(() => {
    try { return localStorage.getItem("sj-invitations-vue") === "journal" ? "journal" : "suivi" } catch { return "suivi" }
  })
  const change = (v: "suivi" | "journal") => {
    setView(v)
    try { localStorage.setItem("sj-invitations-vue", v) } catch { /* stockage indisponible */ }
  }
  return (
    <div className="space-y-5">
      <div className="flex gap-1.5" role="tablist" aria-label="Vue de l'invitation en ligne">
        {([["suivi", "Suivi des invités"], ["journal", "Journal"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => change(id)}
            className={cn("rounded-full border px-3 py-1 text-sm transition-colors",
              view === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30")}>
            {label}
          </button>
        ))}
      </div>
      {view === "journal" ? <InvitationJournal /> : suivi}
    </div>
  )
}
