import {
  Heart,
  UserCheck,
  Home,
  ListChecks,
  Users,
  CalendarRange,
  PartyPopper,
  Truck,
  Armchair,
  FolderOpen,
  Settings,
  Camera,
  DoorOpen,
  ClipboardList,
  UtensilsCrossed,
  MessageSquare,
  Gift,
  type LucideIcon,
} from "lucide-react"

import type { Capability } from "@/types/permissions"
import type { AppRole, DomainePhase, PlanningMilestone } from "@/types/domain"

export const EVENT_NAME = import.meta.env.VITE_EVENT_NAME ?? "Fiançailles de Sarah & Jordan"

export const EVENT_DATE = import.meta.env.VITE_EVENT_DATE ?? "2026-07-25"

function offsetDate(base: string, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const INSTALLATION_DATE = import.meta.env.VITE_INSTALLATION_DATE ?? offsetDate(EVENT_DATE, -1)
export const DESINSTALLATION_DATE = import.meta.env.VITE_DESINSTALLATION_DATE ?? offsetDate(EVENT_DATE, 1)

export const PHASE_DAYS: { date: string; label: string }[] = [
  { date: INSTALLATION_DATE, label: formatPhaseDay(INSTALLATION_DATE, "Installation") },
  { date: EVENT_DATE, label: formatPhaseDay(EVENT_DATE, "Jour J") },
  { date: DESINSTALLATION_DATE, label: formatPhaseDay(DESINSTALLATION_DATE, "Désinstallation") },
]

function formatPhaseDay(iso: string, prefix: string): string {
  const d = new Date(iso)
  const short = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
  return `${prefix} · ${short}`
}

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  capability: Capability
  /** Restreint l'affichage dans la nav à ces rôles, en plus de `capability` — la route reste accessible aux autres rôles (ex. "/" reste la cible de repli de RoleGuard), seul l'onglet est masqué. */
  visibleToRoles?: AppRole[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Introduction", path: "/introduction", icon: Heart, capability: "view:introduction" },
  { label: "Mon rôle", path: "/ma-mission", icon: UserCheck, capability: "view:role" },
  { label: "Tableau de bord", path: "/", icon: Home, capability: "view:dashboard", visibleToRoles: ["fiance"] },
  { label: "Accueil", path: "/", icon: Home, capability: "view:referent-home" },
  {
    label: "Les missions",
    path: "/missions",
    icon: ListChecks,
    capability: "view:missions",
    visibleToRoles: ["fiance"],
  },
  { label: "Équipe", path: "/referents", icon: Users, capability: "view:referents" },
  { label: "Planning", path: "/planning", icon: CalendarRange, capability: "view:planning" },
  { label: "Déroulé", path: "/deroule", icon: PartyPopper, capability: "view:deroule" },
  { label: "Messages", path: "/messages", icon: MessageSquare, capability: "view:messages" },
  { label: "Mes missions", path: "/mes-responsabilites", icon: ClipboardList, capability: "view:briefing" },
  { label: "Photos de groupe", path: "/photos-groupe", icon: Camera, capability: "view:photos-groupe" },
  { label: "Réception", path: "/accueil", icon: DoorOpen, capability: "view:accueil" },
  { label: "Logistique", path: "/logistique", icon: Truck, capability: "view:logistique" },
  { label: "Invités", path: "/invites", icon: Armchair, capability: "view:guests" },
  { label: "Tour des tables", path: "/tour-tables", icon: UtensilsCrossed, capability: "view:tour-tables" },
  { label: "Cadeaux", path: "/cadeaux", icon: Gift, capability: "view:cadeaux" },
  { label: "Documents", path: "/documents", icon: FolderOpen, capability: "view:documents" },
  { label: "Paramètres", path: "/parametres", icon: Settings, capability: "manage:settings" },
]

export const MILESTONE_ORDER: PlanningMilestone[] = [
  "j_moins_30",
  "j_moins_15",
  "j_moins_7",
  "j_moins_1",
  "jour_j",
  "j_plus_1",
]

export const MILESTONE_LABELS: Record<PlanningMilestone, string> = {
  j_moins_30: "J-30",
  j_moins_15: "J-15",
  j_moins_7: "J-7",
  j_moins_1: "J-1",
  jour_j: "Jour J",
  j_plus_1: "J+1",
}

export const DOMAINE_PHASE_ORDER: DomainePhase[] = [
  "avant",
  "installation",
  "jour_j",
  "desinstallation",
  "apres",
]

export const DOMAINE_PHASE_LABELS: Record<DomainePhase, string> = {
  avant: "Avant",
  installation: "Installation",
  jour_j: "Jour J",
  desinstallation: "Désinstallation",
  apres: "Après",
}
