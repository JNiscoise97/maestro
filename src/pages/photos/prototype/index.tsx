import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Monitor, Moon, Search, Smartphone, Sun } from "lucide-react"

import { useColorMode } from "@/features/gallery/colorMode"
import { themeVars, type ColorMode } from "@/features/gallery/theme"
import { ALBUMS, HOME_SELECTION, PHOTOS, WELCOME_TEXT, type ProtoPhoto } from "./data"
import { ProtoViewer } from "./Viewer"

/**
 * Prototype de la galerie privée — direction validée le 18/10/2026 :
 * style cinématographique (bordeaux, vert, touches d'or), « Sarah & Jordan » en Nickainley,
 * accueil en diaporama horizontal, galerie complète organisée par catégories + favoris.
 * Photos fictives, parcours simulés, aucun contrôle d'accès.
 */
type Screen = "connexion" | "connexion-nom" | "regles" | "accueil" | "categories" | "categorie" | "favoris"

const SCREENS: { id: Screen; label: string }[] = [
  { id: "connexion", label: "Connexion e-mail" },
  { id: "connexion-nom", label: "Connexion nom / prénom" },
  { id: "regles", label: "Règles (1re connexion)" },
  { id: "accueil", label: "Accueil" },
  { id: "categories", label: "Galerie complète" },
  { id: "categorie", label: "Une catégorie" },
  { id: "favoris", label: "Favoris" },
]

export function GaleriePrototypePage() {
  const [params, setParams] = useSearchParams()
  const screen = (params.get("ecran") as Screen) || "accueil"
  const album = params.get("categorie") ?? ALBUMS[0]
  const device = params.get("apercu") === "mobile" ? "mobile" : "desktop"
  const [mode, toggleMode] = useColorMode()

  function go(next: Record<string, string>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) p.set(k, v)
    setParams(p, { replace: true })
    document.getElementById("proto-scroll")?.scrollTo({ top: 0 })
  }

  const [viewer, setViewer] = useState<{ list: ProtoPhoto[]; index: number } | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(PHOTOS.filter((_, i) => i % 9 === 4).map((p) => p.id)))
  const toggleFavorite = (id: string) =>
    setFavorites((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })

  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow"
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])

  const open = (list: ProtoPhoto[], index: number) => setViewer({ list, index })
  const favoriteList = PHOTOS.filter((p) => favorites.has(p.id))

  const content = (
    <div className="@container relative h-full overflow-hidden"
      // transform : la visionneuse reste contenue dans l'aperçu mobile.
      style={{ ...(themeVars("cinema", mode) as CSSProperties), colorScheme: mode, background: "var(--p-bg)", color: "var(--p-fg)", fontFamily: "var(--p-body)", transform: "translateZ(0)" }}>
      <div className="h-full overflow-y-auto" id="proto-scroll">
        {(screen === "connexion" || screen === "connexion-nom") && (
          <ProtoLogin key={screen} initial={screen === "connexion" ? "email" : "name"} onDone={() => go({ ecran: "regles" })} mode={mode} onToggleMode={toggleMode} />
        )}
        {screen !== "connexion" && screen !== "connexion-nom" && (
          <ProtoNav screen={screen} onNavigate={(s) => go({ ecran: s })} mode={mode} onToggleMode={toggleMode} />
        )}
        {(screen === "accueil" || screen === "regles") && <ProtoHome onOpen={(i) => open(HOME_SELECTION, i)} onAll={() => go({ ecran: "categories" })} />}
        {screen === "categories" && (
          <ProtoCategories favorites={favoriteList}
            onCategory={(name) => go({ ecran: "categorie", categorie: name })}
            onFavorites={() => go({ ecran: "favoris" })}
            onOpen={open} />
        )}
        {screen === "categorie" && (
          <ProtoCategory title={album} photos={PHOTOS.filter((p) => p.album === album)} favorites={favorites}
            onBack={() => go({ ecran: "categories" })} onOpen={open} />
        )}
        {screen === "favoris" && (
          <ProtoCategory title="Mes favoris" photos={favoriteList} favorites={favorites} empty="Touchez le cœur d'une photo pour la retrouver ici."
            onBack={() => go({ ecran: "categories" })} onOpen={open} />
        )}
      </div>
      {/* Première connexion : les règles s'imposent par-dessus l'accueil, photos inaccessibles tant qu'elles ne sont pas acceptées. */}
      {screen === "regles" && <ConsentModal onAccept={() => go({ ecran: "accueil" })} onSignOut={() => go({ ecran: "connexion" })} />}
      {viewer && (
        <ProtoViewer photos={viewer.list} index={viewer.index}
          onIndex={(i) => setViewer({ ...viewer, index: i })} onClose={() => setViewer(null)}
          favorites={favorites} onToggleFavorite={toggleFavorite} />
      )}
    </div>
  )

  return (
    <div className="flex h-svh flex-col bg-neutral-200 text-neutral-900">
      {/* Barre de démonstration (hors maquette) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-300 bg-white px-3 py-2 text-xs">
        <span className="font-semibold">Prototype galerie</span>
        <div className="flex flex-wrap overflow-hidden rounded-md border border-neutral-300">
          {SCREENS.map((s) => (
            <button key={s.id} type="button" onClick={() => go({ ecran: s.id })} aria-pressed={screen === s.id}
              className={`px-2 py-1 ${screen === s.id ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-100"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={toggleMode} title={mode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
            className="rounded p-1.5 hover:bg-neutral-100">
            {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button type="button" onClick={() => go({ apercu: "desktop" })} aria-pressed={device === "desktop"} title="Aperçu ordinateur"
            className={`rounded p-1.5 ${device === "desktop" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>
            <Monitor className="size-4" />
          </button>
          <button type="button" onClick={() => go({ apercu: "mobile" })} aria-pressed={device === "mobile"} title="Aperçu mobile"
            className={`rounded p-1.5 ${device === "mobile" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>
            <Smartphone className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-0 sm:p-4">
        {device === "mobile" ? (
          <div className="mx-auto h-full max-h-[844px] w-full max-w-[390px] overflow-hidden rounded-[2rem] border-[10px] border-neutral-900 shadow-2xl">
            {content}
          </div>
        ) : (
          <div className="h-full overflow-hidden sm:rounded-lg sm:shadow-xl">{content}</div>
        )}
      </div>
    </div>
  )
}

// ── Éléments communs ──────────────────────────────────────────────────────────

function Masthead({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`px-6 text-center ${compact ? "py-6" : "pb-8 pt-14 @2xl:pt-20"}`}>
      <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: "var(--p-gold)" }}>
        Fiançailles · 25 juillet 2026
      </p>
      <h1 className={`mt-2 leading-none ${compact ? "text-5xl" : "text-6xl @2xl:text-8xl"}`}
        style={{ fontFamily: "var(--p-names-font)", color: "var(--p-names-color)" }}>
        Sarah &amp; Jordan
      </h1>
    </header>
  )
}

function ProtoNav({ screen, onNavigate, mode, onToggleMode }: {
  screen: Screen
  onNavigate: (s: Screen) => void
  mode: ColorMode
  onToggleMode: () => void
}) {
  const item = (s: Screen, label: React.ReactNode, active: boolean) => (
    <button type="button" onClick={() => onNavigate(s)}
      className="flex items-center gap-1 border-b pb-0.5 transition-opacity"
      style={{ borderColor: active ? "var(--p-accent)" : "transparent", opacity: active ? 1 : 0.65 }}>
      {label}
    </button>
  )
  return (
    <nav className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 text-[11px] uppercase tracking-[0.18em] backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--p-bg) 85%, transparent)", borderBottom: "1px solid var(--p-line)" }}>
      {item("accueil", "Accueil", screen === "accueil")}
      {item("categories", "Toutes les photos", screen === "categories" || screen === "categorie")}
      {item("favoris", <><span aria-hidden className="text-[12px] tracking-normal">❤️</span> Favoris</>, screen === "favoris")}
      <ModeToggle mode={mode} onToggle={onToggleMode} className="ml-auto" />
    </nav>
  )
}

/** Bascule clair / sombre, discrète, dans la barre de navigation et sur l'écran de connexion. */
function ModeToggle({ mode, onToggle, className = "" }: { mode: ColorMode; onToggle: () => void; className?: string }) {
  return (
    <button type="button" onClick={onToggle} className={`opacity-70 transition-opacity hover:opacity-100 ${className}`}
      aria-label={mode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"} title={mode === "dark" ? "Mode clair" : "Mode sombre"}>
      {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

const btnPrimary = "w-full py-3 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-40"
const field = "w-full border-b bg-transparent py-2 text-sm outline-none"

// ── Connexion (e-mail ou nom / prénom → code → engagement) ───────────────────

function ProtoLogin({ initial, onDone, mode, onToggleMode }: {
  initial: "email" | "name"
  onDone: () => void
  mode: ColorMode
  onToggleMode: () => void
}) {
  const [step, setStep] = useState<"email" | "name" | "code" | "pending">(initial)
  const [email, setEmail] = useState(initial === "name" ? "nouveau@exemple.com" : "")
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-10">
      <ModeToggle mode={mode} onToggle={onToggleMode} className="absolute right-4 top-4" />
      <div className="w-full max-w-sm space-y-6">
        <Masthead compact />
        {step === "email" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep(email.includes("nouveau") ? "name" : "code") }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              Indiquez votre adresse e-mail : nous vous envoyons un code de connexion.
            </p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com" className={field} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" className={btnPrimary} style={{ background: "var(--p-accent)" }}>Recevoir mon code</button>
          </form>
        )}
        {step === "name" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep("code") }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>
              Nous ne connaissons pas encore <b style={{ color: "var(--p-fg)" }}>{email}</b>. Indiquez votre prénom et votre nom.
            </p>
            <input required placeholder="Prénom" aria-label="Prénom" className={field} style={{ borderColor: "var(--p-line)" }} />
            <input required placeholder="Nom" aria-label="Nom" className={field} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" className={btnPrimary} style={{ background: "var(--p-accent)" }}>Continuer</button>
            <div className="flex justify-between text-xs" style={{ color: "var(--p-muted)" }}>
              <button type="button" className="underline" onClick={() => setStep("email")}>← Revenir</button>
              <button type="button" className="underline" onClick={() => setStep("pending")}>Simuler : personne introuvable</button>
            </div>
          </form>
        )}
        {step === "pending" && (
          <div className="space-y-3 text-sm">
            <p>Votre demande a bien été transmise à Sarah et Jordan.</p>
            <p style={{ color: "var(--p-muted)" }}>Vous recevrez un e-mail dès qu'elle sera acceptée.</p>
          </div>
        )}
        {step === "code" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onDone() }}>
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>Saisissez le code reçu par e-mail. Il est valable 15 minutes.</p>
            <input inputMode="numeric" maxLength={6} required placeholder="••••••" aria-label="Code à 6 chiffres"
              className={`${field} text-center text-2xl tracking-[0.5em]`} style={{ borderColor: "var(--p-line)" }} />
            <button type="submit" className={btnPrimary} style={{ background: "var(--p-accent)" }}>Se connecter</button>
            <p className="text-center text-xs underline" style={{ color: "var(--p-accent-2)" }}>Renvoyer un code</p>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Règles de confidentialité : fenêtre à la première connexion (CONF-01) ─────

const RULES = [
  "Ces photos sont privées : elles sont partagées avec nos proches uniquement.",
  "Merci de ne pas les diffuser ni les repartager (réseaux sociaux, messageries…) sans notre accord.",
  "Les téléchargements se font une photo à la fois, pour votre usage personnel.",
  "Si une photo vous concerne et vous dérange, signalez-la : elle sera masquée aussitôt.",
  "Vos actions utiles (connexions, réactions, commentaires, téléchargements) sont enregistrées.",
]

function ConsentModal({ onAccept, onSignOut }: { onAccept: () => void; onSignOut: () => void }) {
  const [checked, setChecked] = useState(false)
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="max-h-full w-full max-w-md space-y-5 overflow-y-auto p-6 shadow-2xl @2xl:p-8"
        style={{ background: "var(--p-surface)", color: "var(--p-fg)", border: "1px solid var(--p-line)" }}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: "var(--p-gold)" }}>Avant de commencer</p>
          <h2 id="consent-title" className="mt-2 text-2xl font-light uppercase tracking-[0.12em]" style={{ fontFamily: "var(--p-heading)" }}>
            Nos règles
          </h2>
        </div>
        <ul className="space-y-2.5 text-sm leading-relaxed">
          {RULES.map((r) => (
            <li key={r} className="flex gap-3">
              <span aria-hidden className="mt-2.5 h-px w-3 shrink-0" style={{ background: "var(--p-accent)" }} />
              <span style={{ color: "var(--p-muted)" }}>{r}</span>
            </li>
          ))}
        </ul>
        <label className="flex cursor-pointer items-start gap-3 border p-3 text-sm transition-colors"
          style={{ borderColor: checked ? "var(--p-accent-2)" : "var(--p-line)" }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4 shrink-0"
            style={{ accentColor: "var(--p-accent-2)" }} />
          <span>J'ai lu ces règles et je m'engage à les respecter.</span>
        </label>
        <button type="button" disabled={!checked} onClick={onAccept} className={btnPrimary} style={{ background: "var(--p-accent)" }}>
          Voir les photos
        </button>
        <button type="button" onClick={onSignOut} className="w-full text-xs underline" style={{ color: "var(--p-muted)" }}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

// ── Accueil : texte + diaporama horizontal des 50 photos ──────────────────────

function ProtoHome({ onOpen, onAll }: { onOpen: (i: number) => void; onAll: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const scrollTo = (i: number) =>
    (ref.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })

  return (
    <>
      <Masthead />
      <p className="mx-auto max-w-xl px-6 pb-10 text-center text-sm leading-relaxed @2xl:text-base" style={{ color: "var(--p-muted)" }}>
        {WELCOME_TEXT}
      </p>
      <div ref={ref} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[8%] pb-4 @2xl:gap-6" style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const el = e.currentTarget
          const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1
          setCurrent(Math.round(el.scrollLeft / (w + 12)))
        }}>
        {HOME_SELECTION.map((p, i) => (
          <button key={p.id} type="button" onClick={() => onOpen(i)}
            className="flex h-[62svh] w-[84%] shrink-0 snap-center items-center justify-center @2xl:h-[72vh]" style={{ background: "var(--p-slide-bg)" }}>
            <img src={p.display} alt={p.code} loading="lazy" width={p.width} height={p.height}
              className="max-h-full max-w-full object-contain" style={{ aspectRatio: `${p.width} / ${p.height}` }} />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-5 text-xs">
        <button type="button" aria-label="Précédente" className="opacity-70 hover:opacity-100" onClick={() => scrollTo(Math.max(0, current - 1))}>
          <ChevronLeft className="size-5" />
        </button>
        <span className="tabular-nums tracking-[0.25em]" style={{ color: "var(--p-gold)" }}>
          {String(current + 1).padStart(2, "0")} / {HOME_SELECTION.length}
        </span>
        <button type="button" aria-label="Suivante" className="opacity-70 hover:opacity-100" onClick={() => scrollTo(Math.min(HOME_SELECTION.length - 1, current + 1))}>
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="flex justify-center px-6 py-14">
        <button type="button" onClick={onAll} className="border px-8 py-4 text-xs uppercase tracking-[0.25em] transition-colors hover:bg-[var(--p-accent-2)] hover:text-[var(--p-bg)]"
          style={{ borderColor: "var(--p-accent-2)", color: "var(--p-accent-2)" }}>
          Voir toutes les photos
        </button>
      </div>
    </>
  )
}

// ── Galerie complète : uniquement les catégories (+ favoris) ──────────────────

function ProtoCategories({ favorites, onCategory, onFavorites, onOpen }: {
  favorites: ProtoPhoto[]
  onCategory: (name: string) => void
  onFavorites: () => void
  onOpen: (list: ProtoPhoto[], index: number) => void
}) {
  const [query, setQuery] = useState("")
  const q = query.trim().toUpperCase().replace(/^SJ-?/, "")
  const found = /^\d+$/.test(q) ? PHOTOS.filter((p) => p.code === `SJ-${q.padStart(4, "0")}`) : []

  const cards = [
    ...ALBUMS.map((name) => {
      const photos = PHOTOS.filter((p) => p.album === name)
      return { key: name, title: name, count: photos.length, cover: photos[3] ?? photos[0], onClick: () => onCategory(name) }
    }),
    { key: "favoris", title: "Mes favoris", count: favorites.length, cover: favorites[0], onClick: onFavorites },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-light uppercase tracking-[0.15em]" style={{ fontFamily: "var(--p-heading)" }}>Toutes les photos</h2>
        <label className="flex items-center gap-2 border-b text-xs" style={{ borderColor: "var(--p-line)" }}>
          <Search className="size-3.5" style={{ color: "var(--p-muted)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher SJ-0042" aria-label="Rechercher une photo par numéro"
            className="w-32 bg-transparent py-1 outline-none" />
        </label>
      </div>

      {query.trim() ? (
        found.length ? (
          <button type="button" onClick={() => onOpen(found, 0)} className="block w-48">
            <img src={found[0].thumb} alt={found[0].code} className="w-full" style={{ aspectRatio: `${found[0].width} / ${found[0].height}` }} />
            <span className="mt-1 block text-xs tracking-[0.2em]" style={{ color: "var(--p-gold)" }}>{found[0].code}</span>
          </button>
        ) : <p className="text-sm" style={{ color: "var(--p-muted)" }}>Aucune photo ne porte ce numéro.</p>
      ) : (
        <div className="-mx-4 grid grid-cols-1 gap-1 @2xl:mx-0 @2xl:grid-cols-2 @2xl:gap-3 @5xl:grid-cols-4">
          {cards.map((c) => (
            <button key={c.key} type="button" onClick={c.onClick}
              className="group relative aspect-[4/5] overflow-hidden text-left" style={{ background: "var(--p-surface)" }}>
              {c.cover ? (
                <img src={c.cover.display} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
              ) : (
                <Heart className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 opacity-30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <span className="block h-0.5 w-8" style={{ background: c.key === "favoris" ? "var(--p-accent-2)" : "var(--p-accent)" }} />
                <span className="mt-3 flex items-center gap-2 text-xl font-light uppercase tracking-[0.12em]" style={{ fontFamily: "var(--p-heading)" }}>
                  {c.key === "favoris" && <span aria-hidden className="text-base">❤️</span>}
                  {c.title}
                </span>
                <span className="mt-1 block text-[11px] uppercase tracking-[0.25em] text-[#e8c98f]">
                  {c.count} photo{c.count > 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Une catégorie (ou les favoris) : ses photos, chargées au défilement ───────

const PAGE = 24

function ProtoCategory({ title, photos, favorites, empty = "Aucune photo pour l'instant.", onBack, onOpen }: {
  title: string
  photos: ProtoPhoto[]
  favorites: Set<string>
  empty?: string
  onBack: () => void
  onOpen: (list: ProtoPhoto[], index: number) => void
}) {
  const [shown, setShown] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)
  const list = useMemo(() => photos, [photos])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setShown((n) => n + PAGE)
    }, { root: document.getElementById("proto-scroll"), rootMargin: "600px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [shown])

  return (
    <div className="pb-16">
      <div className="px-4 pb-6 pt-8 @2xl:px-6">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--p-accent-2)" }}>
          <ArrowLeft className="size-3.5" /> Catégories
        </button>
        <h2 className="mt-3 text-3xl font-light uppercase tracking-[0.15em]" style={{ fontFamily: "var(--p-heading)" }}>{title}</h2>
        <span className="mt-1 block text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--p-gold)" }}>
          {list.length} photo{list.length > 1 ? "s" : ""}
        </span>
      </div>
      {list.length === 0 ? (
        <p className="px-6 py-10 text-sm" style={{ color: "var(--p-muted)" }}>{empty}</p>
      ) : (
        <div className="columns-2 gap-1 px-1 @2xl:columns-3 @2xl:gap-2 @2xl:px-2 @5xl:columns-4">
          {list.slice(0, shown).map((p, i) => (
            <button key={p.id} type="button" onClick={() => onOpen(list, i)} className="relative mb-1 block w-full break-inside-avoid @2xl:mb-2">
              <img src={p.thumb} alt={p.code} loading="lazy" width={p.width} height={p.height}
                className="h-auto w-full" style={{ aspectRatio: `${p.width} / ${p.height}`, background: "var(--p-line)" }} />
              {favorites.has(p.id) && (
                <Heart className="absolute right-2 top-2 size-4 drop-shadow" style={{ color: "var(--p-accent-2)" }} fill="currentColor" />
              )}
            </button>
          ))}
        </div>
      )}
      {shown < list.length && <div ref={sentinel} className="h-10" />}
    </div>
  )
}
