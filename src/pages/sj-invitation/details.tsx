import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, Lock, LockOpen, MapPin, TriangleAlert } from "lucide-react"

import { useGalleryAuth } from "@/context/GalleryAuthContext"
import { MATTE_GOLD } from "@/features/gallery/gilded"
import type { GalleryMember } from "@/features/gallery/types"
import { Masthead } from "@/pages/photos/GalleryChrome"
import { rsvpService, type MomentAnswer, type PartyMember, type RsvpResponse } from "@/services/rsvp.service"
import {
  AMBIANCE, CORTEGE, DAYS, FAQ, GIFTS, INVITATION, OUR_WORD, PLACES, PROGRAMME, RSVP, THANKS, TRAVEL, isTodo, type Day, type Moment,
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
  if (isTodo(children)) return <span className={`italic ${className}`} style={{ color: "#b3aca2" }}>{children}</span>
  // **texte** = en gras (ex. « pense au **covoiturage** »).
  const parts = children.split(/\*\*(.+?)\*\*/g)
  return <span className={className}>{parts.map((p, i) => (i % 2 ? <strong key={i} className="font-semibold">{p}</strong> : p))}</span>
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
  // Aperçu demandé depuis l'appli (Invités › Invitation en ligne › « Voir sa page ») : ?apercu=<id invité>.
  const [previewId, setPreviewId] = useState(() => (isAdmin ? new URLSearchParams(window.location.search).get("apercu") ?? "" : ""))
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
    loadProgramme(target, guests)
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

const HERO_PHOTO = "/sj-invitation/details-fond.webp"
const HERO_SHADOW = "0 1px 12px rgba(0,0,0,.4)"

function Hero({ member }: { member: GalleryMember }) {
  return (
    // Photo des mariés en fond (public/sj-invitation/details-fond.webp, tirée de S&J397.jpg) sous un voile sombre :
    // textes en blanc, comme sur l'accueil.
    <header className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-12 text-center text-white">
      <img src={HERO_PHOTO} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, rgba(20,16,12,.55) 0%, rgba(20,16,12,.45) 50%, rgba(20,16,12,.65) 100%)" }} />
      {/* Même nom qu'avant (capitales espacées, « & » entre deux filets), passé en blanc sur la photo. */}
      <div className="[&_h1_span]:text-white!" style={{ "--p-gold": "#fff", textShadow: HERO_SHADOW } as React.CSSProperties}>
        <Masthead subtitle={INVITATION_SUBTITLE} gilded />
      </div>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90" style={{ textShadow: HERO_SHADOW }}>
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
function Section({ id, eyebrow, title, children, narrow = false, width, picto, decor, carte = false }: {
  id: SectionId; eyebrow?: string; title: string; children: React.ReactNode; narrow?: boolean
  /** Largeur maximale (classe max-w-*) ; remplace celle de narrow. */
  width?: string
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
      <div className={`relative mx-auto ${width ?? (narrow ? "max-w-2xl" : "max-w-4xl")}`}>
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
        <p className="text-lg sm:text-xl"><T>{INVITATION.date}</T></p>
        <Fleuron className="my-8" />
        <p className="mx-auto max-w-xl text-lg leading-relaxed sm:text-xl"><T>{INVITATION.context}</T></p>
        <p className="mt-6 text-lg sm:text-xl"><T>{INVITATION.invite}</T></p>
      </div>
    </Section>
  )
}

// ── 2. Un mot de nous ─────────────────────────────────────────────────────────

type PolaroidPhoto = { src: string; rotate: number; caption?: string }

/** Polaroïds sous « Un mot de nous » (photos des mariés 1 et 6, recadrées dans public/sj-invitation/). */
const POLAROIDS_MOT: [PolaroidPhoto, PolaroidPhoto] = [
  { src: "/sj-invitation/polaroid-1.webp", rotate: -6, caption: "1ère photo de nous, 2020 !" },
  { src: "/sj-invitation/polaroid-2.webp", rotate: 5, caption: "Mexique, 2023 !" },
]

/** Polaroïds plus bas, dans « Liste de mariage » (photos 4 et 5). */
const POLAROIDS_LISTE: [PolaroidPhoto, PolaroidPhoto] = [
  { src: "/sj-invitation/polaroid-3.webp", rotate: -4, caption: "La Réunion, 2023 !" },
  { src: "/sj-invitation/polaroid-4.webp", rotate: 6, caption: "À nous !" },
]

/** Deux polaroïds qui se chevauchent légèrement, le second un peu plus bas ; ils arrivent de chaque côté. */
function PolaroidPair({ photos }: { photos: [PolaroidPhoto, PolaroidPhoto] }) {
  const [a, b] = photos
  return (
    <div className="mx-auto mt-12 flex max-w-md justify-center">
      <Reveal from="left" delay={150} className="relative z-10 w-1/2">
        <Polaroid src={a.src} rotate={a.rotate} caption={a.caption} className="translate-x-3" />
      </Reveal>
      <Reveal from="right" delay={350} className="w-1/2">
        <Polaroid src={b.src} rotate={b.rotate} caption={b.caption} className="-translate-x-3 translate-y-4" />
      </Reveal>
    </div>
  )
}

function OurWordSection() {
  return (
    <Section id="mot" eyebrow="De tout cœur" title="Un mot de nous" width="max-w-8xl" picto="coeurs">
      <div className="space-y-5 text-center text-xl leading-relaxed sm:text-2xl" style={heading}>
        {OUR_WORD.paragraphs.map((p) => <p key={p}><T>{p}</T></p>)}
        <p className="pt-4 text-2xl italic" style={{ color: MATTE_GOLD }}>{OUR_WORD.signature}</p>
      </div>
      <PolaroidPair photos={POLAROIDS_MOT} />
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
    <Section id="programme" eyebrow={eyebrow} title={loading ? "Ton programme" : title} decor={
      <Deco className="-bottom-10 -right-8 w-32 sm:-right-20 sm:w-48"><FlowerCluster kind="arums" className="w-full" /></Deco>
    }>
      {loading ? (
        <p className="text-center text-sm" style={muted} role="status">Chargement de ton programme…</p>
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
                {/* Jour : bien visible (grand titre doré, filet en dessous) pour repérer d'un coup d'œil le découpage. */}
                <h3 className="mb-8 border-b pb-3 text-center text-3xl sm:text-left sm:text-4xl"
                  style={{ ...heading, color: MATTE_GOLD, borderColor: MATTE_GOLD }}>{day.label}</h3>
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
                        {m.warning && (
                          <p className="mt-2"><NoticePill>{m.warning}</NoticePill></p>
                        )}
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

/** Pastille d'avertissement (moment sous réserve, lieu pas encore connu…). */
function NoticePill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-start gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-left text-xs font-medium text-amber-800">
      <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" /><T>{children}</T>
    </span>
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
              {/prochainement/i.test(place.address)
                ? <p className="mt-2"><NoticePill>{place.address}</NoticePill></p>
                : <p className="mt-2 text-sm" style={muted}><T>{place.address}</T></p>}
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
  // Jours où l'invité est convié, avec leur libellé (« Vendredi 25 juin »).
  const label = new Map(days.map((d) => [d.date, d.label]))
  const shown = AMBIANCE.days.filter((a) => label.has(a.date))
  const tenue = (name: string) => `/sj-invitation/tenue-${name}.webp`
  return (
    <Section id="ambiance" eyebrow="Ambiance & tenues" title="Comment s'habiller ?" width="max-w-8xl" picto="robe" decor={
      // Tourne-disque flottant en biais, en haut à gauche (comme le bouquet du programme).
      <Deco className="-left-4 -top-12 w-32 sm:-left-10 sm:-top-16 sm:w-48" from="left"><RecordPlayer className="w-full -rotate-12" /></Deco>
    }>
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="text-xl leading-relaxed sm:text-2xl" style={heading}><T>{AMBIANCE.intro}</T></p>
        <p className="text-base leading-relaxed sm:text-lg" style={muted}><T>{AMBIANCE.why}</T></p>
      </div>
      <Fleuron className="my-10" />
      <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a, k) => {
          const wide = a.tenues.length > 2
          return (
            <Reveal key={a.date} delay={k * 120} className={`flex flex-col items-center text-center ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
              <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: MATTE_GOLD }}>{label.get(a.date)}</p>
              <h3 className="mt-1 text-3xl sm:text-4xl" style={heading}>{a.mood}</h3>
              <div className={wide ? "mt-6 grid w-full max-w-5xl grid-cols-4 gap-2 sm:gap-4 lg:grid-cols-8" : "mt-6 flex justify-center gap-2"}>
                {a.tenues.map((t) => (
                  <img key={t} src={tenue(t)} alt="" aria-hidden loading="lazy" decoding="async"
                    className={wide ? "aspect-square w-full object-contain" : "size-36 object-contain sm:size-44"} />
                ))}
              </div>
              <p className={`mt-5 text-base leading-relaxed sm:text-lg ${wide ? "max-w-3xl" : "max-w-sm"}`} style={heading}><T>{a.text}</T></p>
              {a.note && <p className="mt-3 text-sm italic" style={{ color: MATTE_GOLD }}><T>{a.note}</T></p>}
            </Reveal>
          )
        })}
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
    <Section id="liste" eyebrow="Si le cœur t'en dit" title="Liste de mariage" narrow picto="cadeau">
      <p className="text-center text-lg leading-relaxed sm:text-xl" style={heading}><T>{GIFTS.text}</T></p>
      {GIFTS.url && (
        <p className="mt-8 text-center">
          <a href={GIFTS.url} target="_blank" rel="noreferrer" className={button} style={buttonStyle}>{GIFTS.label}</a>
        </p>
      )}
      <PolaroidPair photos={POLAROIDS_LISTE} />
    </Section>
  )
}

// ── 8. FAQ ────────────────────────────────────────────────────────────────────

function FaqSection() {
  return (
    <Section id="faq" eyebrow="Tes questions" title="Questions fréquentes" narrow picto="question">
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

const RSVP_TABLE = weddingTable("rsvp_responses")

type Presence = "yes" | "no" | "unsure"
type Answers = Record<string, MomentAnswer | null>
type Person = { key: string; firstName: string; lastName: string; under10: boolean; moments: Answers; hasDiet: boolean; diet: string }
type StepId = "presence" | "moments" | "party" | "word"

const ANSWER_ORDER: MomentAnswer[] = ["yes", "no", "unsure"]
const toAttendance = { yes: "yes", no: "no", unsure: "probably" } as const
const fromAttendance = (a: string): Presence => (a === "no" || a === "probably-not" ? "no" : a === "probably" ? "unsure" : "yes")
const newKey = () => Math.random().toString(36).slice(2)

/**
 * Formulaire de réponse, étape par étape :
 *   1. Ta présence (nom, oui / non / je ne sais pas encore) ;
 *   2. Tes moments : oui / non / je ne sais pas encore pour chacun (si l'invité est convié à plusieurs) ;
 *   3. Qui vient avec toi : personnes ajoutées une à une (prénom, nom, moins de 10 ans, présence par moment),
 *      avec le compteur de personnes ;
 *   4. Un petit mot (restrictions alimentaires, message), puis envoi.
 * Une réponse « non » passe directement à l'étape 4.
 */
function RsvpSection({ member, days: programmeDays, guestId }: { member: GalleryMember; days: Day[]; guestId: string | null }) {
  const moments = programmeDays.flatMap((d) => d.moments.map((m) => ({ ...m, day: d.label, date: d.date })))
  const askMoments = moments.length > 1

  const [previous, setPrevious] = useState<RsvpResponse | null>(null)
  const [editing, setEditing] = useState(true)
  const [step, setStep] = useState(0)
  // Prénom puis NOM DE FAMILLE en capitales (comme sur le faire-part).
  const accountFirst = member.first_name?.trim() ?? ""
  const accountLast = member.last_name?.trim().toLocaleUpperCase("fr-FR") ?? ""
  const [firstName, setFirstName] = useState(accountFirst)
  const [lastName, setLastName] = useState(accountLast)
  // Nom repris du compte : verrouillé par défaut (cadenas pour le modifier) ; libre s'il est inconnu.
  const [nameLocked, setNameLocked] = useState(accountFirst !== "" && accountLast !== "")
  const nameRef = useRef<HTMLInputElement>(null)
  const [presence, setPresence] = useState<Presence | null>(null)
  const [mine, setMine] = useState<Answers>({})
  const [others, setOthers] = useState<Person[]>([])
  // Restrictions alimentaires de la personne qui répond (celles des autres sont dans others).
  const [hasDiet, setHasDiet] = useState(false)
  const [dietary, setDietary] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps: StepId[] = presence === "no" ? ["presence", "word"] : ["presence", ...(askMoments ? ["moments" as const] : []), "party", "word"]
  const current = steps[Math.min(step, steps.length - 1)]
  const isLast = step >= steps.length - 1
  const count = 1 + others.length

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
    // Recharger seulement quand l'invité change (fill ne fait que remplir le formulaire).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestId])

  function fill(r: RsvpResponse) {
    const [self, ...rest] = r.party ?? []
    setFirstName(self?.firstName ?? accountFirst)
    setLastName(self?.lastName ?? accountLast)
    setPresence(fromAttendance(r.attendance))
    setMine(self?.moments ?? {})
    setOthers(rest.map((p) => ({ ...p, key: newKey(), hasDiet: !!p.diet?.trim(), diet: p.diet ?? "" })))
    // Anciennes réponses : une seule restriction pour tout le monde, reprise pour la personne qui répond.
    const myDiet = self ? (self.diet ?? "") : (r.dietaryConstraints ?? "")
    setHasDiet(!!myDiet.trim())
    setDietary(myDiet)
    setMessage(r.message ?? "")
    setStep(0)
  }

  /** Réponses d'une personne pour tous les moments (un seul moment : la présence globale). */
  const answersOf = (a: Answers): Record<string, MomentAnswer> =>
    Object.fromEntries(moments.map((m) => [m.sequenceId, a[m.sequenceId] ?? (askMoments ? "unsure" : (presence ?? "unsure"))]))

  function validate(id: StepId): string | null {
    if (id === "presence") {
      if (!firstName.trim() || !lastName.trim()) return "Merci d'indiquer ton prénom et ton nom."
      if (!presence) return "Merci d'indiquer si tu seras présent."
    }
    if (id === "moments" && moments.some((m) => !mine[m.sequenceId])) return "Merci de répondre pour chacun des moments."
    if (id === "party") {
      const i = others.findIndex((p) => !p.firstName.trim() || !p.lastName.trim())
      if (i >= 0) return `Merci d'indiquer le prénom et le nom de la personne ${i + 2}.`
      const j = others.findIndex((p) => moments.some((m) => !p.moments[m.sequenceId]))
      if (j >= 0) return `Merci d'indiquer la présence de ${others[j].firstName.trim()} à chacun des moments.`
      if (hasDiet && !dietary.trim()) return "Merci de préciser tes restrictions alimentaires, ou de décocher la case."
      const k = others.findIndex((p) => p.hasDiet && !p.diet.trim())
      if (k >= 0) return `Merci de préciser les restrictions alimentaires de ${others[k].firstName.trim()}, ou de décocher la case.`
    }
    return null
  }

  function go(delta: number) {
    if (delta > 0) {
      const problem = validate(current)
      if (problem) { setError(problem); return }
    }
    setError(null)
    setStep((s) => Math.max(0, Math.min(steps.length - 1, s + delta)))
    scrollToId("reponse")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isLast) { go(1); return }
    const problem = steps.map(validate).find(Boolean)
    if (problem) { setError(problem); return }
    setLoading(true)
    setError(null)
    const coming = presence !== "no"
    const party: PartyMember[] = coming ? [
      { firstName: firstName.trim(), lastName: lastName.trim(), under10: false, moments: answersOf(mine), diet: hasDiet && dietary.trim() ? dietary.trim() : null },
      ...others.map((p) => ({
        firstName: p.firstName.trim(), lastName: p.lastName.trim(), under10: p.under10, moments: answersOf(p.moments),
        diet: p.hasDiet && p.diet.trim() ? p.diet.trim() : null,
      })),
    ] : []
    // Récapitulatif des restrictions (colonne existante, lue par l'onglet Réponses) : « Prénom Nom : … ».
    const diets = party.filter((p) => p.diet).map((p) => `${p.firstName} ${p.lastName} : ${p.diet}`).join(" · ")
    const attended = moments.filter((m) => party.some((p) => p.moments[m.sequenceId] === "yes"))
    try {
      const saved = await rsvpService.create({
        wave: "invitation",
        name: `${firstName.trim()} ${lastName.trim()}`,
        guestId,
        attendance: toAttendance[presence!],
        adults: coming ? party.filter((p) => !p.under10).length : null,
        children: coming ? party.filter((p) => p.under10).length : null,
        party: coming ? party : null,
        partySize: coming ? party.length : null,
        partyNames: coming ? party.map((p) => `${p.firstName} ${p.lastName}`).join("\n") : null,
        sequencesAttending: coming ? attended.map((m) => m.sequenceId) : null,
        daysAttending: coming ? [...new Set(attended.map((m) => m.date))] : null,
        dietaryConstraints: coming && diets ? diets : null,
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

  const updateOther = (key: string, patch: Partial<Person>) => setOthers((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)))

  return (
    <Section id="reponse" eyebrow="Confirmation de présence" title="Seras-tu des nôtres ?" narrow picto="enveloppe" decor={
      <Deco className="-right-6 -top-10 w-32 sm:-right-12 sm:-top-14 sm:w-48"><FlowerCluster flip kind="coin-hortensia" className="w-full" /></Deco>
    }>
      <div className="-mt-4 mb-10 space-y-3 text-center text-sm leading-relaxed" style={muted}>
        <p><T>{RSVP.intro}</T></p>
        <p>Merci de nous répondre avant le <strong style={{ color: "#2e2a25" }}>{RSVP.deadline}</strong>.</p>
      </div>

      {previous && !editing ? (
        <PreviousAnswer response={previous} moments={moments} onEdit={() => { fill(previous); setEditing(true) }} />
      ) : (
        <form onSubmit={submit} noValidate className="text-left">
          {/* Étapes */}
          <ol className="mb-10 flex items-center gap-2" aria-label="Étapes du formulaire">
            {steps.map((id, i) => (
              <li key={id} className="flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={i === step ? "step" : undefined}>
                <span className="h-0.5 w-full" style={{ background: i <= step ? MATTE_GOLD : "#e5dfd5" }} />
                <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: i === step ? MATTE_GOLD : "var(--p-muted)" }}>
                  {RSVP.steps[id]}
                </span>
              </li>
            ))}
          </ol>
          <p className="sr-only" aria-live="polite">Étape {step + 1} sur {steps.length} : {RSVP.steps[current]}</p>

          <div className="space-y-10">
            {current === "presence" && (
              <>
                <Question label={RSVP.name.label} help={RSVP.name.help} required group>
                  {/* Nom déjà connu (compte de l'invité) : en lecture seule, le cadenas permet de le modifier. */}
                  <div className="relative grid gap-4 pr-10 sm:grid-cols-2">
                    {([["Prénom", firstName, setFirstName, "given-name"], ["Nom", lastName, setLastName, "family-name"]] as const).map(([text, value, set, auto], i) => (
                      <input key={text} ref={i === 0 ? nameRef : undefined} value={value} onChange={(e) => set(e.target.value)} placeholder={text} aria-label={text}
                        autoComplete={auto} readOnly={nameLocked} aria-readonly={nameLocked || undefined}
                        className={`${field} ${nameLocked ? "cursor-default" : ""}`} style={{ ...fieldStyle, color: nameLocked ? "var(--p-muted)" : undefined }} />
                    ))}
                    <button type="button" onClick={() => { setNameLocked((v) => !v); if (nameLocked) requestAnimationFrame(() => nameRef.current?.focus()) }}
                      aria-label={nameLocked ? "Modifier le nom" : "Verrouiller le nom"} title={nameLocked ? "Modifier le nom" : "Verrouiller le nom"}
                      className="absolute right-0 top-1 flex size-8 items-center justify-center transition-colors hover:text-[#a8844f]"
                      style={{ color: nameLocked ? "var(--p-muted)" : MATTE_GOLD }}>
                      {nameLocked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
                    </button>
                  </div>
                </Question>
                <Question label={RSVP.attendance.label} help={RSVP.attendance.help} required group>
                  <div className="flex flex-wrap gap-3">
                    {(["yes", "no", "unsure"] as const).map((v) => (
                      <Choice key={v} selected={presence === v} onClick={() => setPresence(v)}>{RSVP.attendance[v]}</Choice>
                    ))}
                  </div>
                </Question>
              </>
            )}

            {current === "moments" && (
              <Question label={RSVP.moments.label} help={RSVP.moments.help} required group>
                <MomentAnswers moments={moments} value={mine} onChange={(id, a) => setMine((p) => ({ ...p, [id]: a }))}
                  onChangeAll={(a) => setMine(Object.fromEntries(moments.map((m) => [m.sequenceId, a])))} />
              </Question>
            )}

            {current === "party" && (
              <Question label={RSVP.party.label} help={RSVP.party.help} group>
                <p className="mb-5 text-center text-sm" role="status" style={{ color: MATTE_GOLD }}>
                  <strong className="text-2xl font-normal" style={heading}>{count}</strong> personne{count > 1 ? "s" : ""} au total, toi compris
                  {others.some((p) => p.under10) && ` · dont ${others.filter((p) => p.under10).length} de moins de 10 ans`}
                </p>
                <div className="space-y-5">
                  {/* La personne qui répond : ses restrictions alimentaires. */}
                  <div className="border p-4 sm:p-5" style={{ borderColor: "#e5dfd5", borderRadius: "var(--p-radius)" }}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <span className="text-[10.5px] uppercase tracking-[0.16em]" style={muted}>Toi</span>
                      <span className="text-lg" style={heading}>{firstName} {lastName}</span>
                    </div>
                    <DietField id="rsvp-diet-0" label={RSVP.dietary.checkSelf} checked={hasDiet} value={dietary}
                      onCheck={setHasDiet} onChange={setDietary} />
                  </div>
                  {others.length === 0 && <p className="text-center text-sm italic" style={muted}>{RSVP.party.alone}</p>}
                  {others.map((p, i) => (
                    <div key={p.key} className="border p-4 sm:p-5" style={{ borderColor: "#e5dfd5", borderRadius: "var(--p-radius)" }}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10.5px] uppercase tracking-[0.16em]" style={muted}>Personne {i + 2}</span>
                        <button type="button" className="text-xs underline" style={muted}
                          onClick={() => setOthers((list) => list.filter((x) => x.key !== p.key))}>Retirer</button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <input value={p.firstName} onChange={(e) => updateOther(p.key, { firstName: e.target.value })} placeholder="Prénom"
                          aria-label={`Prénom de la personne ${i + 2}`} className={field} style={fieldStyle} />
                        <input value={p.lastName} onChange={(e) => updateOther(p.key, { lastName: e.target.value })} placeholder="Nom"
                          aria-label={`Nom de la personne ${i + 2}`} className={field} style={fieldStyle} />
                      </div>
                      <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
                        <input type="checkbox" checked={p.under10} onChange={(e) => updateOther(p.key, { under10: e.target.checked })}
                          className="size-4" style={{ accentColor: MATTE_GOLD }} />
                        {RSVP.party.under10}
                      </label>
                      <div className="mt-3">
                        <DietField id={`rsvp-diet-${p.key}`} label={`${p.firstName.trim() || "Cette personne"} ${RSVP.dietary.checkOther.toLowerCase()}`}
                          checked={p.hasDiet} value={p.diet}
                          onCheck={(v) => updateOther(p.key, { hasDiet: v })} onChange={(v) => updateOther(p.key, { diet: v })} />
                      </div>
                      <div className="mt-5">
                        <MomentAnswers moments={moments} value={p.moments} compact
                          onChange={(id, a) => updateOther(p.key, { moments: { ...p.moments, [id]: a } })}
                          onChangeAll={(a) => updateOther(p.key, { moments: Object.fromEntries(moments.map((m) => [m.sequenceId, a])) })} />
                      </div>
                    </div>
                  ))}
                  <div className="text-center">
                    <button type="button" className={button} style={buttonStyle}
                      onClick={() => setOthers((list) => [...list, { key: newKey(), firstName: "", lastName: lastName.trim(), under10: false, moments: {}, hasDiet: false, diet: "" }])}>
                      + {RSVP.party.add}
                    </button>
                  </div>
                </div>
              </Question>
            )}

            {current === "word" && (
              <>
                <Question id="rsvp-msg" label={RSVP.message.label} help={RSVP.message.help}>
                  <textarea id="rsvp-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ton message"
                    className={`${field} resize-y`} style={fieldStyle} />
                </Question>
              </>
            )}
          </div>

          {error && <p className="mt-8 text-sm" style={{ color: "#9b2c2c" }} role="alert">{error}</p>}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {step > 0 && (
              <button type="button" className="px-4 py-3 text-xs uppercase tracking-[0.24em] underline-offset-4 hover:underline" style={muted} onClick={() => go(-1)}>
                Précédent
              </button>
            )}
            <button type="submit" disabled={loading} className={button} style={buttonStyle}>
              {isLast ? (loading ? "Envoi…" : "Envoyer ma réponse") : "Suivant"}
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

/** Allergies ou restrictions alimentaires d'une personne : case à cocher, zone de texte si cochée. */
function DietField({ id, label: text, checked, value, onCheck, onChange }: {
  id: string; label: string; checked: boolean; value: string; onCheck: (v: boolean) => void; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)}
          className="size-4" style={{ accentColor: MATTE_GOLD }} aria-controls={id} aria-expanded={checked} />
        {text}
      </label>
      {checked && (
        <textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} autoFocus aria-label={`${text} : précisions`}
          placeholder={`${RSVP.dietary.help} Ex. : allergie aux fruits à coque`} className={`${field} mt-2 resize-y`} style={fieldStyle} />
      )}
    </div>
  )
}

/** Oui / Non / Je ne sais pas encore pour chaque moment ; rien de sélectionné par défaut. Sélection rapide en tête. */
function MomentAnswers({ moments, value, onChange, onChangeAll, compact = false }: {
  moments: (Moment & { day: string })[]
  value: Answers
  onChange: (sequenceId: string, answer: MomentAnswer) => void
  onChangeAll: (answer: MomentAnswer) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {moments.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b pb-3" style={{ borderColor: "#e5dfd5" }}>
          <span className="mr-1 text-xs" style={muted}>{RSVP.answersAll.label}</span>
          {ANSWER_ORDER.map((a) => {
            const all = moments.every((m) => value[m.sequenceId] === a)
            return (
              <button key={a} type="button" aria-pressed={all} onClick={() => onChangeAll(a)}
                className="whitespace-nowrap border border-dashed px-2.5 py-1 text-xs transition-colors"
                style={{ borderColor: MATTE_GOLD, color: all ? "#fff" : MATTE_GOLD, background: all ? MATTE_GOLD : "transparent", borderRadius: "var(--p-radius)" }}>
                {RSVP.answersAll[a]}
              </button>
            )
          })}
        </div>
      )}
      {moments.map((m) => (
        <div key={m.sequenceId} role="radiogroup" aria-label={m.title}
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
          <span className={compact ? "text-sm" : "text-base"}>
            {m.title}
            <span className="block text-xs" style={muted}>{m.day}{isTodo(m.time) ? "" : ` · ${m.time}`}</span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            {ANSWER_ORDER.map((a) => {
              const on = value[m.sequenceId] === a
              return (
                <button key={a} type="button" role="radio" aria-checked={on} onClick={() => onChange(m.sequenceId, a)}
                  className="whitespace-nowrap border px-2.5 py-1.5 text-xs leading-tight transition-colors"
                  style={{ borderColor: on ? MATTE_GOLD : "#d8d2c8", background: on ? MATTE_GOLD : "transparent", color: on ? "#fff" : "#2e2a25", borderRadius: "var(--p-radius)" }}>
                  {RSVP.answers[a]}
                </button>
              )
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Réponse déjà envoyée : résumé par personne et par moment. */
function PreviousAnswer({ response: r, moments, onEdit }: { response: RsvpResponse; moments: (Moment & { day: string })[]; onEdit: () => void }) {
  const presence = fromAttendance(r.attendance)
  const party = r.party ?? []
  const title = { yes: "Merci, à très bientôt !", no: "Merci de nous avoir répondu.", unsure: "Merci, tiens-nous au courant !" }[presence]
  return (
    <div className="border p-6 text-center sm:p-8" style={{ borderColor: MATTE_GOLD }} role="status">
      <p className="text-3xl" style={heading}>{title}</p>
      <p className="mt-4 text-sm leading-relaxed" style={muted}>
        Réponse enregistrée le {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} :{" "}
        {RSVP.attendance[presence].toLowerCase()}
        {presence !== "no" && party.length > 0 && ` · ${party.length} personne${party.length > 1 ? "s" : ""}`}.
      </p>
      {presence !== "no" && party.length > 0 && moments.length > 0 && (
        <ul className="mx-auto mt-5 max-w-md space-y-3 text-left text-sm">
          {party.map((p, i) => (
            <li key={i}>
              <span style={heading} className="text-lg">{p.firstName} {p.lastName}</span>
              {p.under10 && <span className="ml-2 text-xs" style={muted}>moins de 10 ans</span>}
              {p.diet && <span className="block text-xs italic" style={muted}>Restrictions : {p.diet}</span>}
              <span className="block text-xs leading-relaxed" style={muted}>
                {moments.map((m) => `${m.title} : ${RSVP.answers[p.moments[m.sequenceId] ?? "unsure"].toLowerCase()}`).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="mt-6 text-xs underline" style={muted} onClick={onEdit}>
        Modifier ma réponse
      </button>
    </div>
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
    <button type="button" aria-pressed={selected} onClick={onClick} className="whitespace-nowrap border px-4 py-3.5 text-lg transition-colors"
      style={{ ...heading, borderColor: selected ? MATTE_GOLD : "#d8d2c8", background: selected ? MATTE_GOLD : "transparent", color: selected ? "#fff" : "#2e2a25", borderRadius: "var(--p-radius)" }}>
      {children}
    </button>
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
