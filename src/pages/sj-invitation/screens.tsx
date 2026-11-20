import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useGalleryAuth } from "@/context/GalleryAuthContext"
import type { GalleryMember } from "@/features/gallery/types"
import { GOLD_TEXT, MATTE_GOLD } from "@/features/gallery/gilded"
import { Masthead } from "@/pages/photos/GalleryChrome"
import { useGreetingName } from "./guest-programme"
import { useContent } from "./i18n"
import { LangSwitch } from "./lang-switch"
import { INVITATION_ROUTES, LANDING_PHOTO_DESKTOP, LANDING_PHOTO_MOBILE } from "./paths"

// Bouton or mat : contour fin et texte dorés, rempli d'or au survol.
const primary = "inline-block border px-8 py-3 text-xs uppercase tracking-[0.24em] transition-colors hover:bg-[#a8844f]! hover:text-white! disabled:opacity-40"
const primaryStyle = { borderColor: MATTE_GOLD, color: MATTE_GOLD, background: "transparent", borderRadius: "var(--p-radius)" }

/** Cadre commun : fond blanc (porté par le conteneur), contenu centré, pied (admin, déconnexion) si connecté. */
function Frame({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
  const { member, signOut } = useGalleryAuth()
  const { UI } = useContent()
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-12 text-center">
      <LangSwitch className="absolute right-4 top-4" />
      {children}
      {footer && member && (
        <div className="mt-10 flex gap-4 text-xs" style={{ color: "var(--p-muted)" }}>
          {member.role === "admin" && <Link to={INVITATION_ROUTES.admin} className="underline">{UI.common.admin}</Link>}
          <button type="button" className="underline" onClick={() => void signOut()}>{UI.common.signOut}</button>
        </div>
      )}
    </div>
  )
}

// ── 1. Accueil public ─────────────────────────────────────────────────────────

export function LandingScreen() {
  const { session, member } = useGalleryAuth()
  const { UI } = useContent()
  // Déjà connecté : le bouton mène directement à l'enveloppe.
  const target = session && member?.status === "active" ? INVITATION_ROUTES.envelope : INVITATION_ROUTES.login
  // Ordinateur (640 px et plus) : bloc de texte descendu de 100 px (200 px de marge haute en plus, contenu centré).
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-12 text-center text-white sm:pt-[248px]">
      {/* Photo plein écran + voile sombre léger pour que le texte blanc reste lisible. */}
      {/* Une photo par format : portrait sous 640 px (téléphone, même seuil que la mise en page), paysage au-delà.
          Téléphone : léger zoom (×1,08) sur la photo, rognée par overflow-hidden. */}
      <picture>
        <source media="(max-width: 639px)" srcSet={LANDING_PHOTO_MOBILE} />
        <img src={LANDING_PHOTO_DESKTOP} alt="" aria-hidden className="absolute inset-0 -z-10 size-full scale-[1.08] object-cover sm:scale-100" />
      </picture>
      <div aria-hidden className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.5) 100%)" }} />
      <LangSwitch tone="light" className="absolute right-4 top-4" />

      <p className="text-xs uppercase tracking-[0.4em] sm:text-sm" style={{ textShadow: SHADOW }}>{UI.subtitle}</p>
      <h1 className="mt-6 flex flex-col items-center gap-x-[0.35em] text-6xl font-medium uppercase leading-none sm:flex-row sm:text-7xl lg:text-8xl"
        style={{ fontFamily: "var(--p-names-font, var(--p-heading))", letterSpacing: "0.08em", textShadow: SHADOW }}>
        <span>Jordan</span>
        <span className="my-2 text-[0.5em] sm:my-0">&amp;</span>
        <span>Sarah</span>
      </h1>
      <Link to={target}
        className="mt-12 inline-block border border-white px-8 py-3 text-xs uppercase tracking-[0.25em] text-white transition-colors hover:bg-white hover:text-neutral-900"
        style={{ textShadow: SHADOW }}>
        {UI.landing.cta}
      </Link>
    </div>
  )
}

const SHADOW = "0 1px 12px rgba(0,0,0,.35)"

// ── 3. Enveloppe fermée ───────────────────────────────────────────────────────

export function EnvelopeScreen(props: { member: GalleryMember }) {
  const { UI } = useContent()
  const navigate = useNavigate()
  const [opening, setOpening] = useState(false)
  function open() {
    if (opening) return
    setOpening(true)
    // Fondu vers l'enveloppe ouverte (même place), puis l'écran suivant fait sortir la lettre.
    window.setTimeout(() => navigate(INVITATION_ROUTES.opened), 750)
  }
  return (
    <Frame>
      <EnvelopeHeader member={props.member} />
      <Envelope open={opening} onClick={open} label={UI.envelope.open} />
      <button type="button" onClick={open} className={`${primary} mt-10`} style={primaryStyle} disabled={opening}>
        {UI.envelope.open}
      </button>
    </Frame>
  )
}

/**
 * En-tête des écrans 3 et 4 (même mise en page : l'enveloppe reste exactement au même endroit).
 * Sur l'écran 4, il s'efface (sa place est conservée) et la lettre sort de l'enveloppe par-dessus.
 */
function EnvelopeHeader({ member, hidden = false, headerRef }: {
  member: GalleryMember
  hidden?: boolean
  headerRef?: React.Ref<HTMLDivElement>
}) {
  const { UI } = useContent()
  const name = useGreetingName(member)
  return (
    <div ref={headerRef} aria-hidden={hidden || undefined}
      className="flex flex-col items-center transition-opacity duration-500 motion-reduce:transition-none" style={{ opacity: hidden ? 0 : 1 }}>
      {/* Même en-tête que la connexion : sous-titre et « Jordan & Sarah » en or mat. */}
      <Masthead compact subtitle={UI.subtitle} gilded />
      <p className="mb-8 mt-2 text-[10px] uppercase tracking-[0.35em]" style={{ color: "var(--p-muted)" }}>
        {UI.envelope.letterFor(name)}
      </p>
    </div>
  )
}

// ── 4. Enveloppe ouverte ──────────────────────────────────────────────────────

export function OpenedEnvelopeScreen(props: { member: GalleryMember }) {
  const { UI } = useContent()
  // Même nom que sur l'enveloppe : nom sur l'invitation, sinon surnom, sinon prénom.
  const name = useGreetingName(props.member)
  const navigate = useNavigate()
  // Refermer : la lettre redescend dans la poche, puis retour à l'enveloppe fermée.
  const [closing, setClosing] = useState(false)
  function close() {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => navigate(INVITATION_ROUTES.envelope), 650)
  }

  // La lettre sort de l'enveloppe vers le haut, par-dessus l'en-tête effacé. Si elle est plus haute que
  // la place disponible (petits écrans), on ajoute la différence en haut de page pour qu'elle ne soit pas coupée.
  const headerRef = useRef<HTMLDivElement>(null)
  const envelopeRef = useRef<HTMLDivElement>(null)
  const letterRef = useRef<HTMLDivElement>(null)
  const [extraTop, setExtraTop] = useState(0)
  useLayoutEffect(() => {
    const measure = () => {
      const header = headerRef.current, envelope = envelopeRef.current, letter = letterRef.current
      if (!header || !envelope || !letter) return
      // Haut de la lettre par rapport au haut de l'en-tête (sans l'éventuelle marge déjà ajoutée).
      const letterTop = envelope.offsetTop + envelope.offsetHeight * (1 - LETTER_BOTTOM) - letter.offsetHeight
      setExtraTop(Math.max(0, Math.ceil(header.offsetTop - letterTop)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ;[headerRef.current, envelopeRef.current, letterRef.current].forEach((el) => el && ro.observe(el))
    return () => ro.disconnect()
  }, [])

  return (
    <Frame>
      <div aria-hidden style={{ height: extraTop }} />
      <EnvelopeHeader member={props.member} hidden headerRef={headerRef} />
      <OpenEnvelope cardIn={closing} envelopeRef={envelopeRef} letterRef={letterRef}>
        <p className="text-2xl italic leading-tight sm:text-3xl" style={{ fontFamily: "var(--p-names-font, var(--p-heading))" }}>
          {UI.envelope.hello(name)}
        </p>
        <div className="mt-4 space-y-3 text-base leading-snug sm:text-lg" style={{ fontFamily: "var(--p-heading)" }}>
          {UI.envelope.letter.map((para) => (
            <p key={para}>{para.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <strong key={i} className="font-semibold">{t}</strong> : t))}</p>
          ))}
        </div>
        {/* Signature : mots espacés par un écart fixe (l'espacement des lettres ne s'applique qu'aux noms). */}
        <p className="mt-5 flex items-baseline justify-center gap-[0.6em] text-xl font-light uppercase"
          style={{ fontFamily: "var(--p-names-font, var(--p-heading))", ...GOLD_TEXT }}>
          <span className="tracking-[0.22em]" style={{ marginRight: "-0.22em" }}>Jordan</span>
          <span className="italic normal-case">&amp;</span>
          <span className="tracking-[0.22em]" style={{ marginRight: "-0.22em" }}>Sarah</span>
        </p>
      </OpenEnvelope>
      <div className="mt-10 flex items-stretch justify-center gap-3">
        {/* Refermer : icône seule (enveloppe fermée), à gauche, libellé en infobulle. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={close} disabled={closing} aria-label={UI.envelope.close}
              className="flex aspect-square items-center justify-center border px-3 transition-colors hover:border-[#a8844f]! hover:text-[#a8844f]! disabled:opacity-40"
              style={{ borderColor: "var(--p-line)", color: "var(--p-muted)", borderRadius: "var(--p-radius)" }}>
              <Mail className="size-4" strokeWidth={1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{UI.envelope.close}</TooltipContent>
        </Tooltip>
        <Link to={INVITATION_ROUTES.details} className={primary} style={primaryStyle}>{UI.envelope.discover}</Link>
      </div>
    </Frame>
  )
}

// ── Enveloppe (photos : fermée / ouverte) ─────────────────────────────────────

/**
 * Photos de l'enveloppe ivoire au format allongé (cachet de cire à feuillage), découpées dans le même
 * cadre de 1000 × 724 px depuis « Enveloppes ivoire embossées, fermée et ouverte.png » : l'enveloppe
 * est au même endroit sur les deux, le passage de l'une à l'autre se fait sans saut.
 */
// Fond transparent (détouré), nouveaux noms pour ne pas resservir les anciennes images du cache.
const ENVELOPE_CLOSED = "/sj-invitation/invitation-enveloppe-fermee-or-mat.webp"
/**
 * Enveloppe ouverte recalée sur la fermée (élargie au même gabarit, traits obliques du bas alignés
 * ligne par ligne) et sa poche avant détourée à part (bord détecté sur la photo, lissé, adouci) :
 * la lettre passe entre les deux. Images générées depuis la photo d'origine (enveloppes fermée et ouverte).
 */
const ENVELOPE_OPEN = "/sj-invitation/invitation-enveloppe-ouverte-alignee.webp"
const ENVELOPE_POCKET = "/sj-invitation/invitation-enveloppe-poche.webp"
const ENVELOPE_RATIO = "1000 / 724"
const ENVELOPE_WIDTH = "w-[min(94vw,46rem)]"
/** Ombre douce sous l'enveloppe (les photos détourées n'ont plus leur ombre). */
const ENVELOPE_SHADOW = "drop-shadow(0 14px 18px rgba(104, 86, 59, .16)) drop-shadow(0 2px 3px rgba(104, 86, 59, .12))"
/**
 * Sur la photo fermée, le haut (≈ 37 % de la hauteur, soit 26,8 % de la largeur) est vide : c'est la
 * place du rabat ouvert. On remonte l'enveloppe d'autant (moins une marge) pour ne pas laisser de trou.
 */
const CLOSED_PULL_UP = "calc(min(94vw, 46rem) * -0.22)"

const photoOf = (url: string): React.CSSProperties => ({
  backgroundImage: `url("${url}")`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
})

/**
 * Chargement + décodage des images, mémorisé pour toute la session : les calques ne s'affichent
 * qu'ensemble (sinon la poche peut apparaître avant l'enveloppe et la lettre).
 */
const decoded = new Map<string, Promise<void>>()
function preload(url: string): Promise<void> {
  let p = decoded.get(url)
  if (!p) {
    const img = new Image()
    img.src = url
    p = img.decode().catch(() => { /* image indisponible : on affiche quand même */ })
    decoded.set(url, p)
  }
  return p
}
const ready = new Set<string>()
function useImagesReady(urls: string[]): boolean {
  const key = urls.join("|")
  const [ok, setOk] = useState(() => ready.has(key))
  useEffect(() => {
    if (ok) return
    let alive = true
    Promise.all(urls.map(preload)).then(() => { ready.add(key); if (alive) setOk(true) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ok])
  return ok
}
const OPEN_IMAGES = [ENVELOPE_OPEN, ENVELOPE_POCKET]
const CLOSED_IMAGES = [ENVELOPE_CLOSED, ENVELOPE_OPEN]

/**
 * Enveloppe fermée. À l'ouverture (open), fondu vers la photo de l'enveloppe ouverte au même endroit ;
 * l'écran suivant fait ensuite sortir la lettre. Toute la surface est cliquable.
 */
function Envelope({ open, onClick, label }: { open: boolean; onClick?: () => void; label: string }) {
  const loaded = useImagesReady(CLOSED_IMAGES)
  // Préparation de l'écran suivant : la poche est déjà décodée quand on ouvre.
  useEffect(() => { void preload(ENVELOPE_POCKET) }, [])
  return (
    <div className={`relative ${ENVELOPE_WIDTH} transition-opacity duration-300`}
      style={{ aspectRatio: ENVELOPE_RATIO, marginTop: CLOSED_PULL_UP, filter: ENVELOPE_SHADOW, opacity: loaded ? 1 : 0 }}>
      <div aria-hidden className="absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
        style={{ ...photoOf(ENVELOPE_OPEN), opacity: open ? 1 : 0 }} />
      <div aria-hidden className="absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
        style={{ ...photoOf(ENVELOPE_CLOSED), opacity: open ? 0 : 1 }} />
      {!open && onClick && (
        <button type="button" onClick={onClick} aria-label={label}
          className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a8844f]" />
      )}
    </div>
  )
}


/** Montée de la lettre à l'arrivée sur l'enveloppe ouverte. */
const LETTER_KEYFRAMES = `@keyframes sj-letter-rise { from { transform: translateY(32%); opacity: 0 } to { transform: none; opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .sj-letter { animation: none !important } }`

/** Bas de la lettre : à 15 % du bas de la photo, donc bien dans la poche. */
const LETTER_BOTTOM = 0.15

/**
 * Enveloppe ouverte avec la lettre (children), dans exactement le même cadre que l'enveloppe fermée
 * (même largeur, même remontée) : photo entière → lettre → poche avant.
 * La lettre est ancrée en bas dans la poche et monte au-dessus de l'enveloppe ; son bas reste caché.
 * Texte au-dessus de la ligne où la poche commence sur les côtés de la lettre :
 *   - ordinateur : lettre de 18 % à 82 % (le rabat festonné reste visible de part et d'autre),
 *     poche à ≈ 52 % de la hauteur sur ses côtés → marge basse 27,5 % de la largeur (avec de la marge) ;
 *   - téléphone : lettre de 5 % à 95 %, poche à ≈ 38 % → marge basse 34,8 % de la largeur.
 */
function OpenEnvelope({ children, cardIn = false, envelopeRef, letterRef }: {
  children: React.ReactNode
  /** Lettre rentrée dans la poche (animation de fermeture). */
  cardIn?: boolean
  envelopeRef?: React.Ref<HTMLDivElement>
  letterRef?: React.Ref<HTMLDivElement>
}) {
  // Les trois calques apparaissent ensemble ; la lettre ne commence à monter qu'une fois tout prêt.
  const loaded = useImagesReady(OPEN_IMAGES)
  return (
    <div ref={envelopeRef} className={`relative ${ENVELOPE_WIDTH}`}
      style={{ aspectRatio: ENVELOPE_RATIO, marginTop: CLOSED_PULL_UP, visibility: loaded ? "visible" : "hidden" }}>
      <style>{LETTER_KEYFRAMES}</style>
      {/* Photo entière (rabat relevé, intérieur). L'ombre est posée sur ce seul calque : un filtre sur un
          conteneur regrouperait les calques et la lettre passerait devant la poche. */}
      <div aria-hidden className="absolute inset-0 z-[1]" style={{ ...photoOf(ENVELOPE_OPEN), filter: ENVELOPE_SHADOW }} />
      <div ref={letterRef}
        className="sj-letter absolute left-[5%] right-[5%] z-[3] px-[6%] pb-[34.8%] pt-10 text-center transition-[transform,opacity] duration-500 ease-in-out motion-reduce:transition-none sm:left-[18%] sm:right-[18%] sm:pb-[27.5%]"
        style={{
          bottom: `${LETTER_BOTTOM * 100}%`,
          // Carte « blanc pur, tranche dorée » : blanc franc bordé d'or mat épais.
          background: "#fff", border: `3px solid ${MATTE_GOLD}`, color: "#2e2a25",
          boxShadow: "0 6px 18px rgba(74, 53, 37, .12)",
          animation: loaded ? "sj-letter-rise 1s cubic-bezier(.2, .75, .2, 1) both" : "none",
          ...(loaded ? {} : { opacity: 0 }),
          ...(cardIn ? { transform: "translateY(35%)", opacity: 0, animation: "none" } : {}),
        }}>
        <div className="relative">{children}</div>
      </div>
      {/* Poche avant, par-dessus la lettre. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[4]" style={photoOf(ENVELOPE_POCKET)} />
    </div>
  )
}
