import { useNavigate, useLocation } from "react-router-dom"
import { EyeOff, LogOut, X } from "lucide-react"

import { NAV_ITEMS } from "@/lib/constants"
import { useIdentity } from "@/context/IdentityContext"
import { Button } from "@/components/ui/button"

function useCurrentPageLabel() {
  const { pathname } = useLocation()
  const match = NAV_ITEMS.find((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
  )
  return match?.label ?? "Jordan & Sarah"
}

export function TopBar() {
  const label = useCurrentPageLabel()
  const { logout, person, isImpersonating, stopImpersonating } = useIdentity()
  const navigate = useNavigate()

  function handleStopImpersonating() {
    stopImpersonating()
    navigate("/parametres")
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
      <span
        className="text-2xl font-normal lg:hidden"
        style={{ fontFamily: "'Nickainley', serif", color: "#7a272c" }}
      >
        Jordan &amp; Sarah
      </span>
      <span className="hidden font-heading text-base font-medium text-foreground lg:inline">{label}</span>

      <div className="flex items-center gap-2">
        {isImpersonating && person && (
          <button
            type="button"
            onClick={handleStopImpersonating}
            className="flex items-center gap-1.5 rounded-full border border-dore/40 bg-dore/10 px-3 py-1 text-xs font-medium text-brun transition-colors hover:bg-dore/20"
            title="Revenir à ma vue"
          >
            <EyeOff className="size-3.5 shrink-0" />
            <span className="max-w-32 truncate">{person.fullName}</span>
            <X className="size-3 shrink-0 opacity-60" />
          </button>
        )}

        <Button variant="ghost" size="sm" onClick={logout} aria-label="Déconnexion">
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </Button>
      </div>
    </header>
  )
}
