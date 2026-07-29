import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useIdentity } from "@/context/IdentityContext"

export function ProtectedLayout() {
  const { person, isLoading, justLoggedOut, isImpersonating } = useIdentity()
  const location = useLocation()

  if (isLoading) return null

  if (!person) {
    // Pas de `from` après une déconnexion volontaire : sinon la connexion
    // suivante ramènerait sur la page quittée au lieu de laisser
    // useDefaultLandingPath choisir (voir IdentityContext.justLoggedOut).
    return <Navigate to="/connexion" state={justLoggedOut ? undefined : { from: location }} replace />
  }

  // Tout invité (référent ou simple) qui n'a pas encore vu l'introduction y
  // est forcé avant toute autre page — les fiancés n'ont pas ce champ.
  const needsIntroduction = person.role !== "admin" && !person.introductionSeen && !isImpersonating
  if (needsIntroduction && location.pathname !== "/introduction") {
    return <Navigate to="/introduction" replace />
  }

return <Outlet />
}
