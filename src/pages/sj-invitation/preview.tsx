import { useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Monitor, Smartphone } from "lucide-react"

import { useGalleryAuth } from "@/context/GalleryAuthContext"

type Device = "desktop" | "mobile"
const STORAGE_KEY = "sj-invitation-apercu"
/** Format d'écran simulé : iPhone 14 / 15 (390 × 844 points). */
const PHONE = { width: 390, height: 844 }

function readDevice(): Device {
  try { return sessionStorage.getItem(STORAGE_KEY) === "mobile" ? "mobile" : "desktop" } catch { return "desktop" }
}

/**
 * Aperçu ordinateur / téléphone de l'invitation (administrateurs seulement).
 * Bouton en haut à droite. En mode téléphone, la page est rechargée dans une iframe de 390 px :
 * les règles responsives (sm:, lg:…) se basent alors sur la largeur du téléphone, comme sur un vrai mobile.
 * En revenant sur « Ordinateur », la page principale reprend l'écran affiché dans le téléphone.
 */
export function DevicePreview({ children }: { children: React.ReactNode }) {
  const { member } = useGalleryAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device>(readDevice)
  // Adresse chargée dans l'iframe : figée à l'ouverture du mode téléphone (pas de rechargement à chaque navigation).
  const [frameSrc, setFrameSrc] = useState(location.pathname)
  const frame = useRef<HTMLIFrameElement>(null)

  // Page affichée dans le cadre téléphone : détectée par l'iframe elle-même (pas par l'adresse, perdue
  // à la navigation), sinon le stockage de session partagé ouvrirait un cadre dans le cadre.
  const insidePreview = isInIframe()
  // Bouton réservé aux administrateurs : les invités voient la page telle quelle.
  const isAdmin = member?.role === "admin" && member.status === "active"
  // Dans l'iframe, dans l'administration ou pour un invité : la page telle quelle.
  if (!isAdmin || insidePreview || location.pathname.includes("/admin")) return <>{children}</>

  function choose(next: Device) {
    if (next === "mobile") setFrameSrc(location.pathname)
    else syncPath()
    setDevice(next)
    try { sessionStorage.setItem(STORAGE_KEY, next) } catch { /* stockage indisponible */ }
  }

  function syncPath() {
    try {
      const path = frame.current?.contentWindow?.location.pathname
      if (path && path !== location.pathname) navigate(path, { replace: true })
    } catch { /* iframe d'une autre origine : rien à synchroniser */ }
  }

  return (
    <>
      {device === "mobile" ? (
        <div className="flex min-h-svh items-center justify-center bg-neutral-200 p-6">
          <iframe ref={frame} src={frameSrc} title="Aperçu téléphone de l'invitation"
            className="rounded-[2.5rem] border-[10px] border-neutral-900 bg-white shadow-2xl"
            style={{ width: PHONE.width + 20, height: Math.min(PHONE.height + 20, window.innerHeight - 48) }} />
        </div>
      ) : children}

      <div className="fixed right-4 top-4 z-50 flex overflow-hidden print:hidden rounded-full border border-neutral-300 bg-white/90 text-neutral-700 shadow-md backdrop-blur"
        role="group" aria-label="Aperçu de l'invitation">
        <DeviceButton active={device === "desktop"} onClick={() => choose("desktop")} label="Ordinateur"><Monitor className="size-4" /></DeviceButton>
        <DeviceButton active={device === "mobile"} onClick={() => choose("mobile")} label="Téléphone"><Smartphone className="size-4" /></DeviceButton>
      </div>
    </>
  )
}

function DeviceButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} title={`Aperçu ${label.toLowerCase()}`}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>
      {children}<span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function isInIframe(): boolean {
  try { return window.self !== window.top } catch { return true }
}
