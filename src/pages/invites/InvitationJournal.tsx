import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { LogIn, MailCheck, RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { GalleryAuthProvider, useGalleryAuth } from "@/context/GalleryAuthContext"
import { KEYS, useMembers } from "@/features/gallery/api"
import { galleryClient, gt } from "@/features/gallery/client"
import { themeStyle } from "@/features/gallery/theme"
import type { ActivityEntry, GalleryMember } from "@/features/gallery/types"
import { useGuests } from "@/hooks/queries/use-guests"
import { useRsvpResponses } from "@/hooks/queries/use-rsvp"
import { cn } from "@/lib/utils"
import { LoginScreen } from "@/pages/photos/LoginScreen"
import type { RsvpResponse } from "@/services/rsvp.service"

/**
 * Journal de l'invitation en ligne (Invités › Invitations › Journal), du plus récent au plus ancien :
 *   · connexions et retours sur l'invitation : journal de la galerie (_20260725_gal_activity, événements
 *     login / visit envoyés avec details.source = 'invitation'). Lisible seulement par un administrateur
 *     connecté à la galerie (RLS) : sans cette session, un encart propose de se connecter ;
 *   · réponses envoyées depuis l'invitation (rsvp_responses, wave = invitation), visibles sans connexion.
 */
export function InvitationJournal() {
  return (
    <GalleryAuthProvider>
      <Journal />
    </GalleryAuthProvider>
  )
}

type Kind = "login" | "visit" | "rsvp"
type Entry = { id: string; at: string; kind: Kind; who: string; detail?: string; update?: boolean }

const KIND_LABELS: Record<Kind, string> = { login: "Connexion", visit: "Retour sur l'invitation", rsvp: "Réponse" }
const ATTENDANCE: Record<string, string> = { yes: "Oui", probably: "Ne sait pas encore", "probably-not": "Probablement pas", no: "Non" }
const FILTERS = [
  { value: "all", label: "Tout" },
  { value: "connexions", label: "Connexions" },
  { value: "rsvp", label: "Réponses" },
] as const
type Filter = (typeof FILTERS)[number]["value"]

/** Connexions et retours sur l'invitation (journal de la galerie), 1 000 derniers. */
function useInvitationActivity(enabled: boolean) {
  return useQuery({
    queryKey: [...KEYS.admin, "activity", "invitation"],
    enabled: enabled && !!galleryClient,
    refetchInterval: 60_000,
    queryFn: async (): Promise<ActivityEntry[]> => {
      const { data, error } = await (galleryClient! as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from(gt("activity"))
        .select("*")
        .in("event", ["login", "visit"])
        .eq("details->>source", "invitation")
        .order("created_at", { ascending: false })
        .limit(1000)
      if (error) throw error
      return (data ?? []) as ActivityEntry[]
    },
  })
}

function Journal() {
  const { session, member, loading: authLoading } = useGalleryAuth()
  const isAdmin = !!member && member.role === "admin" && member.status === "active"
  const { data: guests = [] } = useGuests()
  const { data: responses = [], isLoading: lRsvp } = useRsvpResponses()
  const { data: members = [] } = useMembers(isAdmin)
  const { data: activity = [], isLoading: lActivity, error: activityError } = useInvitationActivity(isAdmin)

  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [showLogin, setShowLogin] = useState(false)

  const guestName = useMemo(() => new Map(guests.map((g) => [g.id, g.fullName])), [guests])
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const nameOf = (m: GalleryMember | undefined) =>
    !m ? "Compte supprimé" : (m.guest_id && guestName.get(m.guest_id)) || `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email

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
      list.push({ id: `r-${r.id}`, at: r.createdAt, kind: "rsvp", who: (r.guestId && guestName.get(r.guestId)) || r.name, detail: rsvpDetail(r), update: seen.has(key) })
      seen.add(key)
    }
    for (const a of activity) {
      if (a.event !== "login" && a.event !== "visit") continue
      list.push({ id: `a-${a.id}`, at: a.created_at, kind: a.event, who: nameOf(a.member_id ? memberById.get(a.member_id) : undefined) })
    }
    return list.sort((a, b) => b.at.localeCompare(a.at))
    // nameOf ne dépend que de guestName et memberById.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationResponses, activity, guestName, memberById])

  const q = query.trim().toLowerCase()
  const shown = entries.filter((e) =>
    (filter === "all" || (filter === "rsvp" ? e.kind === "rsvp" : e.kind !== "rsvp")) &&
    (!q || e.who.toLowerCase().includes(q) || (e.detail ?? "").toLowerCase().includes(q)))

  // Comptes venus sur l'invitation sans avoir encore répondu (ni été inclus par un proche) : à relancer.
  const stats = useMemo(() => {
    const visitors = new Set(activity.map((a) => a.member_id).filter(Boolean) as string[])
    const answered = new Set<string>()
    for (const r of invitationResponses) {
      if (r.guestId) answered.add(r.guestId)
      for (const p of r.party ?? []) if (p.guestId) answered.add(p.guestId)
    }
    const silent = [...visitors].map((id) => memberById.get(id)).filter((m): m is GalleryMember => !!m && m.role !== "admin" && !(m.guest_id && answered.has(m.guest_id)))
    const respondents = new Set(invitationResponses.map((r) => r.guestId ?? r.name.toLowerCase()))
    return { visitors: visitors.size, respondents: respondents.size, silent }
  }, [activity, invitationResponses, memberById])

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

      {/* Connexions : session administrateur de la galerie requise (même base de comptes que l'invitation). */}
      {!authLoading && !isAdmin && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p>
            {session
              ? "Ce compte de galerie n'est pas administrateur : seules les réponses sont affichées."
              : "Les connexions à l'invitation sont visibles une fois connecté avec un compte administrateur de la galerie. Seules les réponses sont affichées pour l'instant."}
          </p>
          {!session && (
            showLogin ? (
              <div className="mt-3 max-w-md overflow-hidden rounded-xl" style={themeStyle("cinema", "light")}>
                <LoginScreen compact mode="light" onToggleMode={() => {}} />
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowLogin(true)}>
                <LogIn className="size-3.5" /> Se connecter
              </Button>
            )
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Personnes venues sur l'invitation" value={isAdmin ? stats.visitors : "—"} />
        <Stat label="Invités ayant répondu" value={stats.respondents} />
        <Stat label="Venus sans répondre" value={isAdmin ? stats.silent.length : "—"}
          hint={isAdmin && stats.silent.length > 0 ? stats.silent.map(nameOf).sort((a, b) => a.localeCompare(b, "fr")).join(", ") : undefined} />
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

      {activityError && <p className="text-sm text-destructive">Impossible de charger les connexions : {(activityError as Error).message}</p>}
      {isAdmin && lActivity && <p className="text-sm text-muted-foreground">Chargement des connexions…</p>}

      {byDay.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Rien pour l'instant.</p>
      ) : (
        <div className="space-y-6">
          {byDay.map(({ day, items }) => (
            <section key={day}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{formatDay(day)}</h3>
              <ul className="divide-y rounded-lg border bg-card">
                {items.map((e) => <JournalRow key={e.id} entry={e} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function JournalRow({ entry: e }: { entry: Entry }) {
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
          <span className="text-muted-foreground">
            · {e.kind === "rsvp" ? (e.update ? "Réponse modifiée" : "Réponse") : KIND_LABELS[e.kind]}
          </span>
        </p>
        {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
      </div>
    </li>
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
