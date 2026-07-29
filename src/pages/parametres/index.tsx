import { useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardCheck } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EventConfigForm } from "@/components/parametres/EventConfigForm"
import { ParametresTree } from "@/components/parametres/ParametresTree"
import { SeatingTablesManager } from "@/components/parametres/SeatingTablesManager"
import { PhotoGroupsManager } from "@/components/parametres/PhotoGroupsManager"
import { GuestGroupsManager } from "@/components/parametres/GuestGroupsManager"
import { PersonManager } from "@/components/parametres/PersonManager"
import { ResetIntroductionSeenButton } from "@/components/parametres/ResetIntroductionSeenButton"
import { ResetCheckInsButton } from "@/components/parametres/ResetCheckInsButton"
import { ResetPhotoGroupsButton } from "@/components/parametres/ResetPhotoGroupsButton"
import { SyncFromFiancaillesButton } from "@/components/parametres/SyncFromFiancaillesButton"
import { GuestCsvImport } from "@/components/parametres/GuestCsvImport"
import { EquipmentManager } from "@/components/parametres/EquipmentManager"
import { AccessCodesManager } from "@/components/parametres/AccessCodesManager"
import { MessagesConfig } from "@/components/timing/MessagesConfig"
import { MessagesManager } from "@/components/parametres/MessagesManager"
import { MissionsManager } from "@/components/parametres/MissionsManager"
import { TachesManager } from "@/components/parametres/TachesManager"
import { useRunOfShow } from "@/hooks/queries/use-run-of-show"
import { useRosMessages } from "@/hooks/queries/use-ros-messages"
import { useRosLaunches } from "@/hooks/queries/use-ros-launches"
import { cn } from "@/lib/utils"

// ── Navigation ────────────────────────────────────────────────────────────────

type Section =
  | "evenement"
  | "organisation"
  | "timing-messages-crud"
  | "timing-messages"
  | "timing-missions"
  | "timing-taches"
  | "invites-groupes"
  | "invites-import"
  | "invites-photos"
  | "invites-tables"
  | "materiel"
  | "acces-fiancies"
  | "acces-comptes"
  | "outils"

interface NavItem { id: Section; label: string }
interface NavGroup { label: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    label: "Événement",
    items: [{ id: "evenement", label: "Configuration" }],
  },
  {
    label: "Organisation",
    items: [{ id: "organisation", label: "Pôles, domaines & missions" }],
  },
  {
    label: "Timing",
    items: [
      { id: "timing-missions",      label: "Missions" },
      { id: "timing-taches",        label: "Tâches" },
      { id: "timing-messages-crud", label: "Messages" },
      { id: "timing-messages",      label: "Historique" },
    ],
  },
  {
    label: "Invités",
    items: [
      { id: "invites-groupes", label: "Groupes & familles" },
      { id: "invites-import", label: "Import CSV" },
      { id: "invites-photos", label: "Photos de groupe" },
      { id: "invites-tables", label: "Plan de table" },
    ],
  },
  {
    label: "Matériel",
    items: [{ id: "materiel", label: "Articles" }],
  },
  {
    label: "Accès",
    items: [
      { id: "acces-fiancies", label: "Profils fiancés" },
      { id: "acces-comptes", label: "Comptes & accès" },
    ],
  },
  {
    label: "Outils",
    items: [{ id: "outils", label: "Réinitialisation" }],
  },
]

const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items)

function flatLabel(item: NavItem): string {
  const group = NAV.find((g) => g.items.some((i) => i.id === item.id))!
  return `${group.label} — ${item.label}`
}

// ── Panneau de contenu ────────────────────────────────────────────────────────

function TimingMessagesSection() {
  const { data: steps } = useRunOfShow()
  const { data: messages } = useRosMessages()
  const { data: launches } = useRosLaunches()

  if (!steps || !messages || !launches) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  return <MessagesConfig steps={steps} messages={messages} launches={launches} />
}

function OutilsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-3 font-heading text-base font-medium text-foreground">Synchronisation</h2>
        <SyncFromFiancaillesButton />
      </div>
      <div>
        <h2 className="mb-3 font-heading text-base font-medium text-foreground">Réinitialisation</h2>
        <div className="flex flex-wrap gap-3">
          <ResetIntroductionSeenButton />
          <ResetCheckInsButton />
          <ResetPhotoGroupsButton />
        </div>
      </div>
      <div>
        <h2 className="mb-3 font-heading text-base font-medium text-foreground">Contenu</h2>
        <Button variant="outline" size="sm" asChild>
          <Link to="/parametres/revue-contenu">
            <ClipboardCheck className="size-4" />
            Revue de contenu
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ContentPanel({ section }: { section: Section }) {
  switch (section) {
    case "evenement":              return <EventConfigForm />
    case "organisation":           return <ParametresTree />
    case "timing-missions":         return <MissionsManager />
    case "timing-taches":           return <TachesManager />
    case "timing-messages-crud":   return <MessagesManager />
    case "timing-messages":        return <TimingMessagesSection />
    case "invites-groupes": return <GuestGroupsManager />
    case "invites-import":  return <GuestCsvImport />
    case "invites-photos":  return <PhotoGroupsManager />
    case "invites-tables":  return <SeatingTablesManager />
    case "materiel":        return <EquipmentManager />
    case "acces-fiancies":  return <PersonManager />
    case "acces-comptes":   return <AccessCodesManager />
    case "outils":          return <OutilsSection />
  }
}

// ── Sidebar (desktop) ─────────────────────────────────────────────────────────

function Sidebar({ section, onSelect }: { section: Section; onSelect: (s: Section) => void }) {
  return (
    <nav className="w-52 shrink-0">
      <div className="sticky top-4 rounded-2xl border border-border bg-card p-2">
        {NAV.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="my-2 border-t border-border/60" />}
            <p className="mb-0.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground/50">
              {group.label}
            </p>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  section === item.id
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function ParametresPage() {
  const [section, setSection] = useState<Section>("evenement")
  const currentItem = ALL_ITEMS.find((i) => i.id === section)!

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configuration de l'événement, organisation, invités et accès."
      />

      {/* Sélecteur mobile */}
      <div className="md:hidden">
        <Select value={section} onValueChange={(v) => setSection(v as Section)}>
          <SelectTrigger>
            <SelectValue>{flatLabel(currentItem)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {NAV.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Layout desktop : sidebar + contenu */}
      <div className="flex items-start gap-6">
        <div className="hidden md:block">
          <Sidebar section={section} onSelect={setSection} />
        </div>
        <div className="min-w-0 flex-1">
          <ContentPanel section={section} />
        </div>
      </div>
    </div>
  )
}
