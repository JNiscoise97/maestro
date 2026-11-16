import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, MapPin } from "lucide-react"

import { useGalleryAuth } from "@/context/GalleryAuthContext"
import { MATTE_GOLD } from "@/features/gallery/gilded"
import type { GalleryMember } from "@/features/gallery/types"
import { Masthead } from "@/pages/photos/GalleryChrome"
import { rsvpService, type RsvpResponse } from "@/services/rsvp.service"
import {
  AMBIANCE, CORTEGE, DAYS, FAQ, GIFTS, HERO, INVITATION, OUR_WORD, PLACES, PROGRAMME, RSVP, THANKS, TRAVEL, isTodo, type Day,
} from "./content"
import {
  findGuest, loadGuestIdsWithSequences, loadProgramme, loadWeddingGuests, momentsInWords, visibleDays, weddingTable,
  type Programme, type WeddingGuest,
} from "./guest-programme"
import { INVITATION_ROUTES, INVITATION_SUBTITLE } from "./paths"
import { PinNumber, PlacesMap } from "./places-map"
import { hasPin } from "./places-map-data"
import { Carte, Fleuron, FlowerCluster, Picto, Polaroid, RecordPlayer, Reveal, Ribbon } from "./decor"
import { PAPER_STYLE, TABLE_STYLE, iconForMoment, pictoForTravel, type PictoName } from "./decor-styles"

/**
 * 5. Invitation complète : une seule page qu'on fait défiler, avec une barre de navigation collée en haut
 * (la rubrique en cours est soulignée, un clic y mène directement, « Répondre » toujours visible).
 * Le texte vient de ./content.ts. Le programme est personnalisé : chaque invité ne voit que les moments
 * auxquels il est convié (./guest-programme.ts) ; un administrateur peut prévisualiser la page d'un invité.
 */

type SectionId = "invitation" | "mot" | "programme" | "lieux" | "ambiance" | "cortege" | "venir" | "liste" | "faq" | "reponse"

const NAV: { id: SectionId; label: string }[] = [
  { id: "invitation", label: "Invitation" },
  { id: "mot", label: "Un mot" },
  { id: "programme", label: "Programme" },
  { id: "lieux", label: "Lieux" },
  { id: "ambiance", label: "Tenues" },
  ...(CORTEGE.show ? [{ id: "cortege" as const, label: "Cortège" }] : []),
  { id: "venir", label: "Venir & dormir" },
  { id: "liste", label: "Liste" },
  { id: "faq", label: "Questions" },
]

const NAV_HEIGHT = 56
const button = "inline-block border px-8 py-3 text-xs uppercase tracking-[0.24em] transition-colors hover:bg-[#a8844f]! hover:text-white! disabled:opacity-40"
const buttonStyle = { borderColor: MATTE_GOLD, color: MATTE_GOLD, background: "transparent", borderRadius: "var(--p-radius)" }
const heading = { fontFamily: "var(--p-heading)" }
const muted = { color: "var(--p-muted)" }

/** Texte du contenu : « À compléter… » s'affiche en italique grisé. */
function T({ children, className = "" }: { children: string; className?: string }) {
  return isTodo(children)
    ? <span className={`italic ${className}`} style={{ color: "#b3aca2" }}>{children}</span>
    : <span className={className}>{children}</span>
}

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT + 1, behavior: reduce ? "auto" : "smooth" })
}

export function DetailsScreen({ member }: { member: GalleryMember }) {
  const view = useGuestView(member)
  return (
    <div className="min-h-svh overflow-x-clip" style={{ ...TABLE_STYLE, color: "#2e2a25" }}>
      <Hero member={member} />
      {member.role === "admin" && <PreviewBar view={view} />}
      <Nav />
      <main>
        <InvitationSection />
        <OurWordSection />
        <ProgrammeSection view={view} />
        <PlacesSection days={view.days} />
        <AmbianceSection days={view.days} />
        {CORTEGE.show && <CortegeSection />}
        <TravelSection />
        <GiftsSection />
        <FaqSection />
        <RsvpSection member={member} days={view.days} guestId={view.guestId} />
        <ThanksSection />
      </main>
      <Footer />
    </div>
  )
}

// ── Programme de l'invité ─────────────────────────────────────────────────────

type GuestView = {
  loading: boolean
  /** all : tous les moments · some : une partie · unknown : invité non retrouvé (moments ouverts à tous). */
  mode: "all" | "some" | "unknown"
  days: Day[]
  /** Invité de la liste du mariage auquel rattacher la réponse. */
  guestId: string | null
  /** Aperçu administrateur. */
  guests: WeddingGuest[]
  previewable: Set<string>
  previewId: string
  setPreviewId: (id: string) => void
}

/** Comptes qui voient tout le programme, quelles que soient leurs séquences (en minuscules). */
const FULL_PROGRAMME_EMAILS = ["niscoise.j@gmail.com"]

function useGuestView(member: GalleryMember): GuestView {
  const isAdmin = member.role === "admin"
  const [guests, setGuests] = useState<WeddingGuest[] | null>(null)
  const [previewable, setPreviewable] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState("")
  const [loaded, setLoaded] = useState<{ id: string; programme: Programme | null } | null>(null)

  useEffect(() => {
    let alive = true
    loadWeddingGuests()
      .then((g) => { if (alive) setGuests(g) })
      .catch((e) => { console.error("[invitation] invités", e); if (alive) setGuests([]) })
    if (isAdmin) void loadGuestIdsWithSequences().then((ids) => { if (alive) setPreviewable(ids) }).catch(() => {})
    return () => { alive = false }
  }, [isAdmin])

  const self = useMemo(() => (guests ? findGuest(guests, member) : null), [guests, member])
  const target = isAdmin ? (guests?.find((g) => g.id === previewId) ?? null) : self

  useEffect(() => {
    if (!guests || !target) return
    let alive = true
    loadProgramme(target)
      .then((programme) => { if (alive) setLoaded({ id: target.id, programme }) })
      .catch((e) => { console.error("[invitation] programme", e); if (alive) setLoaded({ id: target.id, programme: null }) })
    return () => { alive = false }
  }, [guests, target])

  const base = { guestId: self?.id ?? member.guest_id ?? null, guests: guests ?? [], previewable, previewId, setPreviewId }
  const unknown = { ...base, loading: false, mode: "unknown" as const, days: visibleDays(null, true) }
  if (!guests) return { ...base, loading: true, mode: "some", days: [] }
  if (isAdmin && !previewId) return { ...base, loading: false, mode: "all", days: visibleDays(null) }
  if (!isAdmin && FULL_PROGRAMME_EMAILS.includes(member.email.trim().toLowerCase()))
    return { ...base, loading: false, mode: "all", days: visibleDays(null) }
  if (!target) return unknown
  if (loaded?.id !== target.id) return { ...base, loading: true, mode: "some", days: [] }
  const programme = loaded.programme
  if (programme?.status !== "found" || programme.sequenceIds.size === 0) return unknown
  const days = visibleDays(programme.sequenceIds)
  const count = days.reduce((n, d) => n + d.moments.length, 0)
  const total = DAYS.reduce((n, d) => n + d.moments.length, 0)
  return { ...base, loading: false, mode: count === total ? "all" : "some", days }
}

/** Administrateur : voir la page telle qu'un invité la verra. */
function PreviewBar({ view }: { view: GuestView }) {
  const options = view.guests
    .filter((g) => view.previewable.has(g.id))
    .map((g) => ({ id: g.id, name: `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
  return (
    <div className="border-t px-6 py-3 text-xs" style={{ borderColor: "var(--p-line)", background: "#faf8f4" }}>
      <label className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="uppercase tracking-[0.16em]" style={muted}>Aperçu administrateur</span>
        <select value={view.previewId} onChange={(e) => view.setPreviewId(e.target.value)}
          className="max-w-full border bg-white px-2 py-1.5 text-sm" style={{ borderColor: "#d8d2c8", borderRadius: "var(--p-radius)" }}>
          <option value="">Tout le programme</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
    </div>
  )
}

// ── En-tête et navigation ─────────────────────────────────────────────────────

const HERO_PHOTO = "/sj-invitation/entete.webp"
const HERO_SHADOW = "0 1px 12px rgba(0,0,0,.4)"

function Hero({ member }: { member: GalleryMember }) {
  return (
    // Photo des mariés en fond (public/sj-invitation/entete.webp, tirée de IMG_7794.JPG) sous un voile sombre :
    // textes en blanc, comme sur l'accueil.
    <header className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-12 text-center text-white">
      <img src={HERO_PHOTO} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, rgba(20,16,12,.55) 0%, rgba(20,16,12,.45) 50%, rgba(20,16,12,.65) 100%)" }} />
      {/* Même nom qu'avant (capitales espacées, « & » entre deux filets), passé en blanc sur la photo. */}
      <div className="[&_h1_span]:text-white!" style={{ "--p-gold": "#fff", textShadow: HERO_SHADOW } as React.CSSProperties}>
        <Masthead subtitle={INVITATION_SUBTITLE} gilded />
      </div>
      <p className="-mt-4 text-lg sm:text-xl" style={{ ...heading, textShadow: HERO_SHADOW }}><T>{HERO.dates}</T></p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.3em]" style={{ textShadow: HERO_SHADOW }}>{HERO.place}</p>
      <p className="mt-8 max-w-md text-sm leading-relaxed text-white/90" style={{ textShadow: HERO_SHADOW }}>
        {member.first_name ? `${member.first_name}, voici` : "Voici"} tout ce qu'il faut savoir sur notre mariage.
      </p>
      <button type="button" onClick={() => scrollToId("reponse")}
        className="mt-8 inline-block border border-white px-8 py-3 text-xs uppercase tracking-[0.24em] text-white transition-colors hover:bg-white hover:text-neutral-900"
        style={{ borderRadius: "var(--p-radius)", textShadow: HERO_SHADOW }}>
        Répondre à l'invitation
      </button>
    </header>
  )
}

function Nav() {
  const [active, setActive] = useState<SectionId | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Rubrique en cours : la dernière dont le haut est passé sous la barre.
  useEffect(() => {
    const ids: SectionId[] = [...NAV.map((n) => n.id), "reponse"]
    let frame = 0
    const update = () => {
      frame = 0
      let current: SectionId | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= NAV_HEIGHT + 80) current = id
      }
      // Tout en bas de la page : la dernière rubrique, même si elle est courte.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1]
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Sur téléphone, la barre défile horizontalement : on garde le lien actif visible.
  useEffect(() => {
    const list = listRef.current
    const link = list?.querySelector<HTMLElement>(`[data-id="${active}"]`)
    if (!list || !link) return
    const left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2
    list.scrollTo({ left, behavior: "smooth" })
  }, [active])

  return (
    <nav aria-label="Rubriques de l'invitation" className="sticky top-0 z-30 border-y backdrop-blur"
      style={{ height: NAV_HEIGHT, background: "rgba(255,255,255,.92)", borderColor: "var(--p-line)" }}>
      <div className="mx-auto flex h-full max-w-5xl items-center gap-3 pl-2 pr-3 sm:px-6">
        <div ref={listRef} className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} data-id={n.id}
              onClick={(e) => { e.preventDefault(); scrollToId(n.id) }}
              aria-current={active === n.id ? "true" : undefined}
              className="shrink-0 whitespace-nowrap border-b px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] transition-colors"
              style={{ borderColor: active === n.id ? MATTE_GOLD : "transparent", color: active === n.id ? MATTE_GOLD : "var(--p-muted)" }}>
              {n.label}
            </a>
          ))}
        </div>
        <a href="#reponse" onClick={(e) => { e.preventDefault(); scrollToId("reponse") }}
          className="shrink-0 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90"
          style={{ background: MATTE_GOLD, borderRadius: "var(--p-radius)" }}
          aria-current={active === "reponse" ? "true" : undefined}>
          Répondre
        </a>
      </div>
    </nav>
  )
}

// ── Gabarit de rubrique ───────────────────────────────────────────────────────

/**
 * Une rubrique = une carte posée sur la table (papier, ombre portée), qui apparaît en descendant.
 * picto : pictogramme doré au-dessus du titre · decor : ornements placés autour de la carte (fleurs, ruban…)
 * · carte : carte de faire-part aux coins échancrés au lieu de la feuille simple.
 */
function Section({ id, eyebrow, title, children, narrow = false, picto, decor, carte = false }: {
  id: SectionId; eyebrow?: string; title: string; children: React.ReactNode; narrow?: boolean
  picto?: PictoName; decor?: React.ReactNode; carte?: boolean
}) {
  const body = (
    <div className="px-6 py-12 sm:px-12 sm:py-16">
      <div className="mb-10 text-center sm:mb-12">
        {picto && <Picto name={picto} className="mb-4 h-11 gap-1" />}
        {eyebrow && <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: MATTE_GOLD }}>{eyebrow}</p>}
        <h2 id={`${id}-title`} className="mt-3 text-4xl font-light sm:text-5xl" style={heading}>{title}</h2>
        <Fleuron className="mt-5" />
      </div>
      {children}
    </div>
  )
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="px-4 py-8 sm:px-6 sm:py-12" style={{ scrollMarginTop: NAV_HEIGHT }}>
      <div className={`relative mx-auto ${narrow ? "max-w-2xl" : "max-w-4xl"}`}>
        <Reveal>
          {carte ? <Carte>{body}</Carte> : (
            <div style={{ ...PAPER_STYLE, backgroundColor: PAPER_STYLE.backgroundColor }}>{body}</div>
          )}
        </Reveal>
        {decor}
      </div>
    </section>
  )
}

/** Ornement autour d'une carte : positionné en absolu, apparaît un peu après la carte. */
function Deco({ className, children, delay = 300, from = "zoom" }: {
  className: string; children: React.ReactNode; delay?: number; from?: "zoom" | "left" | "right" | "up"
}) {
  return <Reveal from={from} delay={delay} className={`pointer-events-none absolute z-10 ${className}`}>{children}</Reveal>
}

// ── 1. Invitation ─────────────────────────────────────────────────────────────

function InvitationSection() {
  return (
    <Section id="invitation" eyebrow="Faire-part" title="L'invitation" carte decor={
      <Deco className="-right-8 -top-10 w-36 sm:-right-24 sm:-top-14 sm:w-52"><FlowerCluster kind="couronne" className="w-full" /></Deco>
    }>
      <div className="text-center" style={heading}>
        <div className="grid gap-x-12 gap-y-8 text-base sm:grid-cols-2 sm:text-xl">
          <ul className="space-y-1">{INVITATION.brideParents.map((p) => <li key={p} className="whitespace-nowrap"><T>{p}</T></li>)}</ul>
          <ul className="space-y-1">{INVITATION.groomParents.map((p) => <li key={p} className="whitespace-nowrap"><T>{p}</T></li>)}</ul>
        </div>
        <p className="mt-8 text-lg italic sm:text-xl">{INVITATION.announce}</p>
        <p className="my-6 text-4xl font-light uppercase tracking-[0.18em] sm:text-5xl" style={{ color: MATTE_GOLD }}>
          Sarah <span className="text-[0.6em] normal-case italic tracking-normal">&amp;</span> Jordan
        </p>
        <p className="text-lg sm:text-xl"><T>{INVITATION.invite}</T></p>
      </div>
    </Section>
  )
}

// ── 2. Un mot de nous ─────────────────────────────────────────────────────────

/** Polaroïds de « Un mot de nous » (photos des mariés : 1, 6, 4 et 5, recadrées dans public/sj-invitation/). */
const POLAROIDS: { src: string; rotate: number; shift: string; caption?: string }[] = [
  { src: "/sj-invitation/polaroid-1.webp", rotate: -6, shift: "sm:translate-x-2" },
  { src: "/sj-invitation/polaroid-2.webp", rotate: 4, shift: "translate-y-3 sm:-translate-x-1" },
  { src: "/sj-invitation/polaroid-3.webp", rotate: -3, shift: "sm:translate-x-1 sm:translate-y-2" },
  { src: "/sj-invitation/polaroid-4.webp", rotate: 6, shift: "translate-y-3 sm:-translate-x-2", caption: "À nous !" },
]

function OurWordSection() {
  return (
    <Section id="mot" eyebrow="De tout cœur" title="Un mot de nous" narrow picto="coeurs">
      <div className="space-y-5 text-center text-xl leading-relaxed sm:text-2xl" style={heading}>
        {OUR_WORD.paragraphs.map((p) => <p key={p}><T>{p}</T></p>)}
        <p className="pt-4 text-2xl italic" style={{ color: MATTE_GOLD }}>{OUR_WORD.signature}</p>
      </div>
      {/* Quatre polaroïds éparpillés : 2 × 2 sur téléphone, en ligne sur ordinateur. */}
      <div className="mx-auto mt-12 grid max-w-xl grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-4 sm:gap-x-0">
        {POLAROIDS.map((p, i) => (
          <Reveal key={p.src} from={i % 2 ? "right" : "left"} delay={120 + i * 140} className={i % 2 ? "relative z-10" : ""}>
            <Polaroid src={p.src} rotate={p.rotate} caption={p.caption} className={p.shift} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

// ── 3. Programme ──────────────────────────────────────────────────────────────

const placeName = (id: string) => PLACES.find((p) => p.id === id)?.name ?? ""

function ProgrammeSection({ view }: { view: GuestView }) {
  const { days, mode, loading } = view
  // Numéro de chaque moment (I, II…), dans l'ordre du programme de l'invité.
  const number = useMemo(() => new Map(days.flatMap((d) => d.moments).map((m, i) => [m.sequenceId, i + 1])), [days])
  const count = number.size
  const hasLimited = days.some((d) => d.moments.some((m) => m.limited))
  const title = mode === "all" ? PROGRAMME.titleAll : count ? PROGRAMME.titleSome.replace("{n}", momentsInWords(count)) : "Le programme"
  const eyebrow = days.length > 1 ? `${["", "Un jour", "Deux jours", "Trois jours", "Quatre jours"][days.length] ?? `${days.length} jours`}` : days[0]?.label ?? "Programme"
  return (
    <Section id="programme" eyebrow={eyebrow} title={loading ? "Votre programme" : title} decor={
      <Deco className="-bottom-10 -right-8 w-32 sm:-right-20 sm:w-48"><FlowerCluster kind="arums" className="w-full" /></Deco>
    }>
      {loading ? (
        <p className="text-center text-sm" style={muted} role="status">Chargement de votre programme…</p>
      ) : (
        <>
          <p className="mx-auto max-w-xl text-center text-sm leading-relaxed" style={muted}>
            <T>{mode === "all" ? PROGRAMME.introAll : PROGRAMME.introSome}</T>
          </p>
          {mode === "unknown" && (
            <p className="mx-auto mt-4 max-w-xl text-center text-xs italic leading-relaxed" style={muted}><T>{PROGRAMME.unknownNote}</T></p>
          )}
          {hasLimited && (
            <p className="mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 text-center text-xs leading-relaxed" style={muted}>
              <LimitedBadge /><T>{PROGRAMME.limitedNote}</T>
            </p>
          )}
          <div className="mt-12 space-y-14">
            {days.map((day) => (
              <div key={day.date}>
                <h3 className="mb-6 border-b pb-3 text-center text-[11px] uppercase tracking-[0.3em] sm:text-left"
                  style={{ color: MATTE_GOLD, borderColor: "var(--p-line)" }}>{day.label}</h3>
                <ol className="space-y-8">
                  {day.moments.map((m) => (
                    <li key={m.sequenceId} className="grid gap-x-8 gap-y-1 sm:grid-cols-[9rem_1fr]">
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                        <img src={iconForMoment(m.title)} alt="" aria-hidden loading="lazy" decoding="async" className="size-16 shrink-0 object-contain sm:size-20" />
                        <p className="text-sm sm:text-right" style={muted}><T>{m.time}</T></p>
                      </div>
                      <div>
                        <h4 className="text-2xl" style={heading}>
                          <span className="mr-2 text-base italic" style={{ color: MATTE_GOLD }}>{toRoman(number.get(m.sequenceId) ?? 0)}.</span>{m.title}
                          {m.limited && <LimitedBadge className="ml-3 align-middle" />}
                        </h4>
                        <p className="mt-1 text-sm leading-relaxed" style={muted}><T>{m.text}</T></p>
                        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                          {placeName(m.placeId) && (
                            <a href={`#lieu-${m.placeId}`} onClick={(e) => { e.preventDefault(); scrollToId(`lieu-${m.placeId}`) }}
                              className="inline-flex items-center gap-1 underline-offset-4 hover:underline" style={{ color: MATTE_GOLD }}>
                              <MapPin className="size-3.5" aria-hidden /><T>{placeName(m.placeId)}</T>
                            </a>
                          )}
                          {m.dressCode && <span style={muted}>Tenue : <T>{m.dressCode}</T></span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  )
}

function LimitedBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap border px-2 py-0.5 font-sans text-[9.5px] uppercase tracking-[0.16em] ${className}`}
      style={{ borderColor: MATTE_GOLD, color: MATTE_GOLD, borderRadius: "var(--p-radius)" }}>
      Places limitées
    </span>
  )
}

function toRoman(n: number): string {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][n] ?? String(n)
}

// ── 4. Lieux ──────────────────────────────────────────────────────────────────

function PlacesSection({ days }: { days: Day[] }) {
  // Seuls les lieux des moments de l'invité, dans l'ordre du programme.
  const places = PLACES.filter((p) => days.some((d) => d.moments.some((m) => m.placeId === p.id)))
  // Numéro de chaque lieu présent sur le plan (dans l'ordre du programme).
  const number = new Map(places.filter((p) => hasPin(p.id)).map((p, i) => [p.id, i + 1]))
  return (
    <Section id="lieux" eyebrow="Où nous retrouver" title="Les lieux" picto="pin">
      <PlacesMap placeIds={places.map((p) => p.id)} number={number} />
      <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {places.map((place) => {
          const moments = days.flatMap((d) => d.moments.filter((m) => m.placeId === place.id).map((m) => ({ day: d.label, ...m })))
          return (
            <article key={place.id} id={`lieu-${place.id}`} className="text-center sm:text-left"
              style={{ scrollMarginTop: NAV_HEIGHT + 16 }}>
              <h3 className="text-2xl" style={heading}>{number.has(place.id) && <PinNumber n={number.get(place.id)!} />}<T>{place.name}</T></h3>
              <p className="mt-2 text-sm" style={muted}><T>{place.address}</T></p>
              {place.access && <p className="mt-2 text-sm" style={muted}><T>{place.access}</T></p>}
              <ul className="mt-5 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "var(--p-line)" }}>
                {moments.map((m) => (
                  <li key={m.sequenceId} className="flex flex-wrap justify-center gap-x-2 sm:justify-start">
                    <span style={{ color: MATTE_GOLD }}>{m.day}</span>
                    <span style={muted}>·</span>
                    <T>{m.time}</T>
                    <span style={muted}>·</span>
                    <span>{m.title}</span>
                  </li>
                ))}
              </ul>
              {!isTodo(place.address) && !/prochainement/i.test(place.address) && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`}
                  target="_blank" rel="noreferrer" className={`${button} mt-6 px-5! py-2!`} style={buttonStyle}>
                  Itinéraire
                </a>
              )}
            </article>
          )
        })}
      </div>
    </Section>
  )
}

// ── 4 bis. Ambiance & tenues ──────────────────────────────────────────────────

function AmbianceSection({ days }: { days: Day[] }) {
  const ids = new Set(days.flatMap((d) => d.moments.map((m) => m.sequenceId)))
  const notes = AMBIANCE.notes.filter((n) => n.sequenceIds.some((id) => ids.has(id)))
  return (
    <Section id="ambiance" eyebrow="Ambiance & tenues" title="Comment s'habiller ?" narrow picto="robe">
      <Reveal from="zoom" className="mx-auto -mt-2 mb-10 w-48 sm:w-56"><RecordPlayer className="w-full" /></Reveal>
      <div className="space-y-6 text-center">
        <p className="text-xl leading-relaxed sm:text-2xl" style={heading}>
          <T>{AMBIANCE.text}</T>{" "}
          {AMBIANCE.influences.map((x, i) => (
            <span key={x}>
              <strong className="font-medium" style={{ color: MATTE_GOLD }}>{x}</strong>
              {i < AMBIANCE.influences.length - 2 ? ", " : i === AMBIANCE.influences.length - 2 ? " et " : "."}
            </span>
          ))}
        </p>
        <Fleuron />
        <p className="text-lg leading-relaxed" style={heading}>
          <T>{AMBIANCE.dress}</T> <span className="italic" style={{ color: MATTE_GOLD }}><T>{AMBIANCE.examples}</T></span>
        </p>
        <p className="text-lg" style={heading}><T>{AMBIANCE.avoid}</T></p>
        {notes.length > 0 && (
          <ul className="mx-auto max-w-md space-y-2 border-t pt-6 text-sm" style={{ borderColor: "var(--p-line)" }}>
            {notes.map((n) => <li key={n.text}><T>{n.text}</T></li>)}
          </ul>
        )}
      </div>
    </Section>
  )
}

// ── 5. Cortège ────────────────────────────────────────────────────────────────

function CortegeSection() {
  return (
    <Section id="cortege" eyebrow="À nos côtés" title="Le cortège" picto="coeurs">
      <p className="mx-auto mb-12 max-w-xl text-center text-sm leading-relaxed" style={muted}><T>{CORTEGE.intro}</T></p>
      <div className="grid gap-10 text-center sm:grid-cols-2">
        {CORTEGE.groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-[11px] uppercase tracking-[0.3em]" style={{ color: MATTE_GOLD }}>{g.title}</h3>
            <ul className="mt-4 space-y-2">
              {g.people.map((p, i) => (
                <li key={i}>
                  <p className="text-xl" style={heading}><T>{p.name}</T></p>
                  {p.role && <p className="text-xs" style={muted}>{p.role}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 6. Venir & se loger ───────────────────────────────────────────────────────

function TravelSection() {
  return (
    <Section id="venir" eyebrow="Infos pratiques" title="Venir & se loger">
      <div className="grid gap-8 sm:grid-cols-3">
        {TRAVEL.getting.map((g) => (
          <div key={g.title} className="text-center">
            <Picto name={pictoForTravel(g.title)} className="mb-3 h-11 gap-1" />
            <h3 className="text-2xl" style={heading}>{g.title}</h3>
            <p className="mt-2 text-sm leading-relaxed" style={muted}><T>{g.text}</T></p>
          </div>
        ))}
      </div>
      <div className="mt-16 text-center"><Picto name="hotel" className="h-11 gap-1" /></div>
      <h3 className="mb-6 mt-3 border-b pb-3 text-center text-[11px] uppercase tracking-[0.3em]"
        style={{ color: MATTE_GOLD, borderColor: "var(--p-line)" }}>Où dormir</h3>
      <ul className="grid gap-6 sm:grid-cols-2">
        {TRAVEL.stays.map((s) => (
          <li key={s.name}>
            <p className="text-xl" style={heading}><T>{s.name}</T></p>
            <p className="mt-1 text-sm leading-relaxed" style={muted}><T>{s.details}</T></p>
            {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline" style={{ color: MATTE_GOLD }}>Réserver</a>}
          </li>
        ))}
      </ul>
    </Section>
  )
}

// ── 7. Liste de mariage ───────────────────────────────────────────────────────

function GiftsSection() {
  return (
    <Section id="liste" eyebrow="Si le cœur vous en dit" title="Liste de mariage" narrow picto="cadeau">
      <p className="text-center text-lg leading-relaxed sm:text-xl" style={heading}><T>{GIFTS.text}</T></p>
      {GIFTS.url && (
        <p className="mt-8 text-center">
          <a href={GIFTS.url} target="_blank" rel="noreferrer" className={button} style={buttonStyle}>{GIFTS.label}</a>
        </p>
      )}
    </Section>
  )
}

// ── 8. FAQ ────────────────────────────────────────────────────────────────────

function FaqSection() {
  return (
    <Section id="faq" eyebrow="Vos questions" title="Questions fréquentes" narrow picto="question">
      <div className="border-t" style={{ borderColor: "var(--p-line)" }}>
        {FAQ.map((f) => (
          <details key={f.q} className="group border-b" style={{ borderColor: "var(--p-line)" }}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-xl [&::-webkit-details-marker]:hidden" style={heading}>
              {f.q}
              <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" style={{ color: MATTE_GOLD }} aria-hidden />
            </summary>
            <p className="pb-5 text-sm leading-relaxed" style={muted}><T>{f.a}</T></p>
          </details>
        ))}
      </div>
    </Section>
  )
}

// ── 9. Votre réponse (RSVP) ───────────────────────────────────────────────────


const field = "w-full border-0 border-b bg-transparent py-2.5 text-base focus:outline-none"
const fieldStyle = { borderColor: "#d8d2c8", borderRadius: 0 }
const label = "mb-3 block text-[10.5px] uppercase tracking-[0.16em]"

const RSVP_TABLE = weddingTable("rsvp_responses")

function RsvpSection({ member, days: programmeDays, guestId }: { member: GalleryMember; days: Day[]; guestId: string | null }) {
  const accountName = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()
  const moments = programmeDays.flatMap((d) => d.moments.map((m) => ({ ...m, day: d.label, date: d.date })))
  const askMoments = moments.length > 1

  const [previous, setPrevious] = useState<RsvpResponse | null>(null)
  const [editing, setEditing] = useState(true)
  const [name, setName] = useState(accountName)
  const [attending, setAttending] = useState<"yes" | "no" | "">("")
  // null = tous les moments de l'invité (cochés par défaut).
  const [chosen, setChosen] = useState<string[] | null>(null)
  const [partySize, setPartySize] = useState(1)
  const [partyNames, setPartyNames] = useState(accountName)
  const [dietary, setDietary] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isYes = attending === "yes"
  const selected = chosen ?? moments.map((m) => m.sequenceId)

  // Réponse déjà envoyée par cet invité : on l'affiche et on pré-remplit le formulaire pour la modifier.
  useEffect(() => {
    if (!guestId) return
    let alive = true
    void rsvpService.latestForGuest(guestId, RSVP_TABLE).then((r) => {
      if (!alive || !r) return
      setPrevious(r)
      setEditing(false)
      fill(r)
    })
    return () => { alive = false }
  }, [guestId])

  function fill(r: RsvpResponse) {
    setName(r.name)
    setAttending(r.attendance === "no" || r.attendance === "probably-not" ? "no" : "yes")
    setChosen(r.sequencesAttending)
    setPartySize(r.partySize ?? r.adults ?? 1)
    setPartyNames(r.partyNames ?? r.name)
    setDietary(r.dietaryConstraints ?? "")
    setMessage(r.message ?? "")
  }

  const nameLines = partyNames.split("\n").map((l) => l.trim()).filter(Boolean)

  function validate(): string | null {
    if (!name.trim()) return "Merci d'indiquer votre nom."
    if (!attending) return "Merci d'indiquer si vous serez présents."
    if (!isYes) return null
    if (askMoments && selected.length === 0) return "Merci de cocher au moins un moment, ou de répondre « Non »."
    if (nameLines.length === 0) return "Merci d'indiquer le nom des personnes concernées."
    if (nameLines.length !== partySize)
      return `Vous avez indiqué ${partySize} personne${partySize > 1 ? "s" : ""} et ${nameLines.length} nom${nameLines.length > 1 ? "s" : ""} : merci de vérifier.`
    return null
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const problem = validate()
    if (problem) { setError(problem); return }
    setLoading(true)
    setError(null)
    const sequences = isYes ? moments.filter((m) => selected.includes(m.sequenceId)) : []
    try {
      const saved = await rsvpService.create({
        wave: "invitation",
        name: name.trim(),
        guestId,
        attendance: attending as "yes" | "no",
        adults: null,
        children: null,
        partySize: isYes ? partySize : null,
        partyNames: isYes ? nameLines.join("\n") : null,
        sequencesAttending: isYes ? sequences.map((m) => m.sequenceId) : null,
        daysAttending: isYes ? [...new Set(sequences.map((m) => m.date))] : null,
        dietaryConstraints: isYes && dietary.trim() ? dietary.trim() : null,
        message: message.trim() || null,
      }, RSVP_TABLE)
      setPrevious(saved)
      setEditing(false)
      scrollToId("reponse")
    } catch {
      setError("L'envoi n'a pas abouti. Merci de réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const answered = previous && (previous.attendance === "no" || previous.attendance === "probably-not") ? "no" : "yes"
  const previousCount = previous?.partySize ?? previous?.adults ?? null

  return (
    <Section id="reponse" eyebrow="Confirmation de présence" title="Serez-vous des nôtres ?" narrow picto="enveloppe" decor={
      <Deco className="-right-10 -top-10 w-36 sm:-right-28 sm:w-52"><FlowerCluster flip kind="coin-hortensia" className="w-full" /></Deco>
    }>
      <div className="-mt-4 mb-10 space-y-3 text-center text-sm leading-relaxed" style={muted}>
        <p><T>{RSVP.intro}</T></p>
        <p>Merci de nous répondre avant le <strong style={{ color: "#2e2a25" }}>{RSVP.deadline}</strong>.</p>
      </div>

      {previous && !editing ? (
        <div className="border p-8 text-center" style={{ borderColor: MATTE_GOLD }} role="status">
          <p className="text-3xl" style={heading}>
            {answered === "no" ? "Merci de nous avoir répondu." : "Merci, à très bientôt !"}
          </p>
          <p className="mt-4 text-sm leading-relaxed" style={muted}>
            Réponse enregistrée le {new Date(previous.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} :{" "}
            {answered === "no" ? "absent(e)" : "présent(e)"}
            {answered === "yes" && previousCount ? ` · ${previousCount} personne${previousCount > 1 ? "s" : ""}` : ""}.
          </p>
          {answered === "yes" && previous.sequencesAttending && askMoments && (
            <p className="mt-2 text-sm" style={muted}>
              {moments.filter((m) => previous.sequencesAttending!.includes(m.sequenceId)).map((m) => m.title).join(" · ")}
            </p>
          )}
          <button type="button" className="mt-6 text-xs underline" style={muted} onClick={() => setEditing(true)}>
            Modifier ma réponse
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-10 text-left">
          <p className="text-xs" style={muted}><span style={{ color: MATTE_GOLD }}>*</span> Question obligatoire</p>

          <Question id="rsvp-name" label={RSVP.name.label} help={RSVP.name.help} required>
            <input id="rsvp-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} style={fieldStyle} />
          </Question>

          <Question label={RSVP.attendance.label} help={RSVP.attendance.help} required group>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([["yes", RSVP.attendance.yes], ["no", RSVP.attendance.no]] as const).map(([v, l]) => (
                <Choice key={v} selected={attending === v} onClick={() => setAttending(v)}>{l}</Choice>
              ))}
            </div>
          </Question>

          {isYes && (
            <>
              {askMoments && (
                <Question label={RSVP.moments.label} help={RSVP.moments.help} required group>
                  <div className="space-y-2.5">
                    {moments.map((m) => (
                      <label key={m.sequenceId} className="flex cursor-pointer items-start gap-3 text-base">
                        <input type="checkbox" checked={selected.includes(m.sequenceId)} className="mt-1 size-4 shrink-0" style={{ accentColor: MATTE_GOLD }}
                          onChange={() => setChosen(selected.includes(m.sequenceId) ? selected.filter((x) => x !== m.sequenceId) : [...selected, m.sequenceId])} />
                        <span>
                          {m.title}
                          <span className="block text-xs" style={muted}>{m.day}{isTodo(m.time) ? "" : ` · ${m.time}`}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Question>
              )}

              <Question label={RSVP.partySize.label} help={RSVP.partySize.help} required group>
                <Counter label="Personnes" value={partySize} min={1} onChange={setPartySize} hideLabel />
              </Question>

              <Question id="rsvp-names" label={RSVP.partyNames.label} help={RSVP.partyNames.help} required>
                <textarea id="rsvp-names" rows={Math.max(2, partySize)} value={partyNames} onChange={(e) => setPartyNames(e.target.value)}
                  placeholder={"Prénom Nom\nPrénom Nom"} className={`${field} resize-y`} style={fieldStyle} />
              </Question>

              <Question id="rsvp-diet" label={RSVP.dietary.label} help={RSVP.dietary.help}>
                <textarea id="rsvp-diet" rows={2} value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="Facultatif"
                  className={`${field} resize-y`} style={fieldStyle} />
              </Question>

            </>
          )}

          <Question id="rsvp-msg" label={RSVP.message.label} help={RSVP.message.help}>
            <textarea id="rsvp-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Votre message"
              className={`${field} resize-y`} style={fieldStyle} />
          </Question>

          {error && <p className="text-sm" style={{ color: "#9b2c2c" }} role="alert">{error}</p>}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button type="submit" disabled={loading} className={button} style={buttonStyle}>
              {loading ? "Envoi…" : "Envoyer ma réponse"}
            </button>
            {previous && (
              <button type="button" className="text-xs underline" style={muted} onClick={() => { fill(previous); setEditing(false) }}>
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
    </Section>
  )
}

/** Une question du formulaire : intitulé, aide, astérisque si obligatoire. group = plusieurs champs (fieldset). */
function Question({ id, label: text, help, required = false, group = false, children }: {
  id?: string; label: string; help?: string; required?: boolean; group?: boolean; children: React.ReactNode
}) {
  const title = (
    <>
      <span className="text-xl" style={{ ...heading, color: "#2e2a25" }}>
        {text}{required && <span style={{ color: MATTE_GOLD }} aria-hidden> *</span>}
      </span>
      {help && <span className="mt-1 block text-sm leading-relaxed" style={muted}>{help}</span>}
    </>
  )
  return group ? (
    <fieldset aria-required={required || undefined}>
      <legend className="mb-4 block">{title}</legend>
      {children}
    </fieldset>
  ) : (
    <div>
      <label htmlFor={id} className="mb-2 block">{title}</label>
      {children}
    </div>
  )
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className="border px-4 py-3.5 text-lg transition-colors"
      style={{ ...heading, borderColor: selected ? MATTE_GOLD : "#d8d2c8", background: selected ? MATTE_GOLD : "transparent", color: selected ? "#fff" : "#2e2a25", borderRadius: "var(--p-radius)" }}>
      {children}
    </button>
  )
}

function Counter({ label: text, value, min, onChange, hideLabel = false }: {
  label: string; value: number; min: number; onChange: (n: number) => void; hideLabel?: boolean
}) {
  const btn = "flex size-9 items-center justify-center border text-lg disabled:opacity-30"
  const btnStyle = { borderColor: "#d8d2c8", borderRadius: "var(--p-radius)" }
  return (
    <div>
      {!hideLabel && <p className={label} style={muted}>{text}</p>}
      <div className="flex items-center gap-4">
        <button type="button" className={btn} style={btnStyle} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${text} : moins`}>−</button>
        <span className="w-6 text-center text-2xl" style={heading} aria-live="polite">{value}</span>
        <button type="button" className={btn} style={btnStyle} disabled={value >= 20} onClick={() => onChange(value + 1)} aria-label={`${text} : plus`}>+</button>
      </div>
    </div>
  )
}

// ── 10. Merci (polaroïd et petit mot, comme sur le mood board) ─────────────────

const script = { fontFamily: "'Nickainley', var(--p-heading)", color: MATTE_GOLD }

function ThanksSection() {
  return (
    <section aria-label="Merci" className="px-4 pb-6 pt-14 sm:pt-20">
      <div className="relative mx-auto max-w-sm sm:max-w-md">
        {/* Ruban derrière le polaroïd et le mot (pas de z-index), comme posé dessous. */}
        <Reveal from="up" delay={200} className="pointer-events-none absolute -right-8 -top-6 h-[96%] sm:-right-24"><Ribbon className="h-full w-auto" /></Reveal>
        <Reveal from="zoom" className="relative">
          <Polaroid src="/sj-invitation/polaroid-merci.webp" rotate={3} square className="mx-auto w-[80%]" />
        </Reveal>
        <Reveal delay={350} className="relative z-20 -mt-14 ml-auto w-[78%] sm:-mr-8">
          <div className="px-6 py-6 text-center sm:px-8" style={{ ...PAPER_STYLE, transform: "rotate(-1.5deg)" }}>
            <p className="text-4xl sm:text-5xl" style={script}>{THANKS.title}</p>
            <p className="mt-3 text-base leading-relaxed sm:text-lg" style={heading}>{THANKS.text}</p>
            <p className="mt-3 text-sm italic" style={{ ...heading, ...muted }}>{THANKS.closing}</p>
            <p className="mt-1 text-3xl sm:text-4xl" style={script}>{THANKS.signature}</p>
          </div>
        </Reveal>
        <Deco className="-bottom-12 -left-12 w-40 sm:-left-28 sm:w-52" delay={500}><FlowerCluster flip kind="bouquet-roses" className="w-full" /></Deco>
      </div>
    </section>
  )
}

// ── Pied de page ──────────────────────────────────────────────────────────────

function Footer() {
  const { member, signOut } = useGalleryAuth()
  return (
    <footer className="px-6 pb-12 pt-6 text-center">
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs" style={muted}>
        <Link to={INVITATION_ROUTES.opened} className="underline">Revoir la lettre</Link>
        {member?.role === "admin" && <Link to={INVITATION_ROUTES.admin} className="underline">Administration</Link>}
        <button type="button" className="underline" onClick={() => void signOut()}>Se déconnecter</button>
      </div>
    </footer>
  )
}
