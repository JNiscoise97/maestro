import { Navigate } from "react-router-dom"
import type { ReactNode } from "react"

import { usePermissions } from "@/hooks/use-permissions"
import type { Capability } from "@/types/permissions"

interface RoleGuardProps {
  capability: Capability
  children: ReactNode
}

export function RoleGuard({ capability, children }: RoleGuardProps) {
  const { can } = usePermissions()

  if (!can(capability)) {
    return <Navigate to="/" replace />
  }

  return children
}
