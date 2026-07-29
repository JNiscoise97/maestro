import { useIdentity } from "@/context/IdentityContext"
import { PERMISSIONS, type Capability } from "@/types/permissions"

export function usePermissions() {
  const { person } = useIdentity()

  function can(capability: Capability): boolean {
    if (!person) return false
    // Les pages d'accueil sont toujours accessibles à un guest, même si allowedTabs est défini.
    if ((capability === "view:referent-home" || capability === "view:guest-home") && person.role !== "admin") return true
    if (person.allowedTabs != null) {
      return (person.allowedTabs as Capability[]).includes(capability)
    }
    return PERMISSIONS[person.role].has(capability)
  }

  return { can, role: person?.role ?? null }
}
