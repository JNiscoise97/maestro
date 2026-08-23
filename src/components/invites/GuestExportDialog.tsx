import { useEffect, useMemo, useState } from "react"
import { Download, Plus, X } from "lucide-react"
import * as XLSX from "xlsx"

import type { Guest, GuestGroup, RsvpStatus } from "@/types/domain"
import { groupLabel } from "@/lib/groups"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// ── Labels ────────────────────────────────────────────────────────────────────

const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending:   "En attente",
  confirmed: "Confirmé",
  declined:  "Décliné",
  no_show:   "No show",
}

const RSVP_ORDER: Record<RsvpStatus, number> = { pending: 0, confirmed: 1, no_show: 2, declined: 3 }

const MEAL_LABELS: Record<string, string> = {
  poulet: "Poulet", poisson: "Poisson",
  enfant_poulet: "Enfant poulet", enfant_poisson: "Enfant poisson",
}

const TRAVEL_LABELS: Record<string, string> = {
  train: "Train", avion: "Avion", voiture: "Voiture", bus: "Bus",
}

// ── Colonnes disponibles ──────────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  defaultOn: boolean
  getValue: (g: Guest, groupName: string, groupSide: string) => string | number
}

const ALL_COLUMNS: ColDef[] = [
  { key: "fullName",           label: "Nom complet",              defaultOn: true,  getValue: (g) => g.fullName },
  { key: "firstName",          label: "Prénom",                   defaultOn: false, getValue: (g) => g.firstName },
  { key: "lastName",           label: "Nom",                      defaultOn: false, getValue: (g) => g.lastName },
  { key: "groupName",          label: "Groupe",                   defaultOn: true,  getValue: (_, gn) => gn },
  { key: "rsvpStatus",         label: "Statut RSVP",              defaultOn: true,  getValue: (g) => RSVP_LABELS[g.rsvpStatus] },
  { key: "side",               label: "Côté",                     defaultOn: true,  getValue: (_g, _gn, gs) => gs },
  { key: "isChild",            label: "Enfant",                   defaultOn: true,  getValue: (g) => g.isChild ? "Oui" : "Non" },
  { key: "ageRange",           label: "Tranche d'âge",            defaultOn: true,  getValue: (g) => g.ageRange ?? "" },
  { key: "childAge",           label: "Âge (enfant)",             defaultOn: false, getValue: (g) => g.childAge ?? "" },
  { key: "dietaryConstraints", label: "Contraintes alimentaires", defaultOn: true,  getValue: (g) => g.dietaryConstraints ?? "" },
  { key: "allergies",          label: "Allergies",                defaultOn: true,  getValue: (g) => g.allergies ?? "" },
  { key: "mealChoice",         label: "Choix repas",              defaultOn: true,  getValue: (g) => g.mealChoice ? (MEAL_LABELS[g.mealChoice] ?? g.mealChoice) : "" },
  { key: "city",               label: "Ville",                    defaultOn: false, getValue: (g) => g.city ?? "" },
  { key: "travelMode",         label: "Transport",                defaultOn: false, getValue: (g) => g.travelMode ? (TRAVEL_LABELS[g.travelMode] ?? g.travelMode) : "" },
  { key: "accommodation",      label: "Hébergement",              defaultOn: false, getValue: (g) => g.accommodation ?? "" },
  { key: "hasVehicle",         label: "Véhicule",                 defaultOn: false, getValue: (g) => g.hasVehicle ? "Oui" : "Non" },
  { key: "needsLateTransport", label: "Transport tardif",         defaultOn: false, getValue: (g) => g.needsLateTransport ? "Oui" : "Non" },
  { key: "isReducedMobility",  label: "PMR",                      defaultOn: false, getValue: (g) => g.isReducedMobility ? "Oui" : "Non" },
  { key: "inCortege",          label: "Cortège",                  defaultOn: false, getValue: (g) => g.inCortege ? "Oui" : "Non" },
  { key: "relationCategory",   label: "Catégorie relation",       defaultOn: false, getValue: (g) => g.relationCategory ?? "" },
  { key: "rsvpChannel",        label: "Canal RSVP",               defaultOn: false, getValue: (g) => g.rsvpChannel ?? "" },
  { key: "rsvpRespondedAt",    label: "Date réponse RSVP",        defaultOn: false, getValue: (g) => g.rsvpRespondedAt ? new Date(g.rsvpRespondedAt).toLocaleDateString("fr-FR") : "" },
  { key: "notes",              label: "Notes",                    defaultOn: false, getValue: (g) => g.notes ?? "" },
]

// ── Tri multi-niveaux ─────────────────────────────────────────────────────────

type SortField = "fullName" | "firstName" | "lastName" | "groupOrder" | "rsvpStatus" | "side" | "isChild" | "ageRange"

const SORT_FIELD_LABELS: Record<SortField, string> = {
  groupOrder: "Groupe",
  fullName:   "Nom complet",
  firstName:  "Prénom",
  lastName:   "Nom",
  rsvpStatus: "Statut RSVP",
  side:       "Côté",
  isChild:    "Enfant / adulte",
  ageRange:   "Tranche d'âge",
}

interface SortLevel { field: SortField; dir: "asc" | "desc" }

const DEFAULT_SORT: SortLevel[] = [
  { field: "groupOrder", dir: "asc" },
  { field: "fullName",   dir: "asc" },
]

function ageValue(g: Guest): number {
  if (g.isChild && g.childAge != null) return g.childAge
  const n = Number(g.ageRange?.match(/\d+/)?.[0])
  return isNaN(n) ? Infinity : n
}

function sortGuests(
  guests: Guest[],
  levels: SortLevel[],
  groupOrderMap: Map<string | null | undefined, number>,
  groupSideMap: Map<string, string>
): Guest[] {
  return [...guests].sort((a, b) => {
    for (const { field, dir } of levels) {
      let cmp = 0
      switch (field) {
        case "fullName":   cmp = a.fullName.localeCompare(b.fullName, "fr"); break
        case "firstName":  cmp = a.firstName.localeCompare(b.firstName, "fr"); break
        case "lastName":   cmp = a.lastName.localeCompare(b.lastName, "fr"); break
        case "groupOrder": cmp = (groupOrderMap.get(a.groupId) ?? Infinity) - (groupOrderMap.get(b.groupId) ?? Infinity); break
        case "rsvpStatus": cmp = RSVP_ORDER[a.rsvpStatus] - RSVP_ORDER[b.rsvpStatus]; break
        case "side":       cmp = (groupSideMap.get(a.groupId ?? "") ?? "").localeCompare(groupSideMap.get(b.groupId ?? "") ?? ""); break
        case "isChild":    cmp = (a.isChild ? 1 : 0) - (b.isChild ? 1 : 0); break
        case "ageRange":   cmp = ageValue(a) - ageValue(b); break
      }
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp
    }
    return 0
  })
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function GuestExportDialog({ guests, groups }: { guests: Guest[]; groups: GuestGroup[] }) {
  const [open, setOpen] = useState(false)

  // ── Groupes
  const allGroupKeys = useMemo(() => {
    const keys = groups.map((g) => g.id)
    if (guests.some((g) => !g.groupId)) keys.push("__none__")
    return keys
  }, [groups, guests])

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) setSelectedGroups(new Set(allGroupKeys))
  }, [open, allGroupKeys])

  const allGroupsSelected = selectedGroups.size === allGroupKeys.length

  function toggleGroup(key: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Tri
  const [sortLevels, setSortLevels] = useState<SortLevel[]>(DEFAULT_SORT)

  useEffect(() => {
    if (open) setSortLevels(DEFAULT_SORT)
  }, [open])

  function setSortLevel(i: number, patch: Partial<SortLevel>) {
    setSortLevels((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function addSortLevel() {
    const used = new Set(sortLevels.map((l) => l.field))
    const next = (Object.keys(SORT_FIELD_LABELS) as SortField[]).find((f) => !used.has(f))
    if (next) setSortLevels((prev) => [...prev, { field: next, dir: "asc" }])
  }

  // ── Colonnes
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) setSelectedCols(new Set(ALL_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)))
  }, [open])

  const allColsSelected = selectedCols.size === ALL_COLUMNS.length

  function toggleCol(key: string) {
    setSelectedCols((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Données à exporter
  const groupNameMap  = useMemo(() => new Map(groups.map((g) => [g.id, groupLabel(g, groups)])), [groups])
  const groupOrderMap = useMemo(() => new Map<string | null | undefined, number>(groups.map((g) => [g.id, g.sortOrder])), [groups])
  const groupSideMap  = useMemo(() => new Map(groups.map((g) => [g.id, g.side === "sarah" ? "Sarah" : g.side === "jordan" ? "Jordan" : g.side === "both" ? "Les deux" : ""])), [groups])

  const exportRows = useMemo(() => {
    const filtered = guests.filter((g) => selectedGroups.has(g.groupId ?? "__none__"))
    return sortGuests(filtered, sortLevels, groupOrderMap, groupSideMap)
  }, [guests, selectedGroups, sortLevels, groupOrderMap, groupSideMap])

  const activeCols = useMemo(() => ALL_COLUMNS.filter((c) => selectedCols.has(c.key)), [selectedCols])

  function handleExport() {
    const data = exportRows.map((guest) => {
      const gn = guest.groupId ? (groupNameMap.get(guest.groupId) ?? "") : ""
      const gs = guest.groupId ? (groupSideMap.get(guest.groupId) ?? "") : ""
      return Object.fromEntries(activeCols.map((col) => [col.label, col.getValue(guest, gn, gs)]))
    })
    const ws = XLSX.utils.json_to_sheet(data)
    ws["!cols"] = activeCols.map((col) => ({
      wch: Math.max(col.label.length, ...data.map((r) => String(r[col.label] ?? "").length), 10),
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Invités")
    XLSX.writeFile(wb, `invites-${new Date().toISOString().split("T")[0]}.xlsx`)
    setOpen(false)
  }

  const canExport = exportRows.length > 0 && activeCols.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="size-4 mr-1.5" />
          Exporter
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col w-[90vw] max-w-[90vw] sm:max-w-[90vw] max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Exporter les invités</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {exportRows.length} invité{exportRows.length > 1 ? "s" : ""}
            {" · "}
            {activeCols.length} colonne{activeCols.length > 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto divide-y divide-border">

          {/* ── Groupes ── */}
          <section className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Groupes</h3>
              <button
                type="button"
                onClick={() => setSelectedGroups(allGroupsSelected ? new Set() : new Set(allGroupKeys))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {allGroupsSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              {groups.map((grp) => (
                <label key={grp.id} className="flex items-center gap-2 cursor-pointer min-w-0">
                  <Checkbox checked={selectedGroups.has(grp.id)} onCheckedChange={() => toggleGroup(grp.id)} />
                  <span className="text-sm truncate">{groupLabel(grp, groups)}</span>
                </label>
              ))}
              {guests.some((g) => !g.groupId) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedGroups.has("__none__")} onCheckedChange={() => toggleGroup("__none__")} />
                  <span className="text-sm italic text-muted-foreground">Sans groupe</span>
                </label>
              )}
            </div>
          </section>

          {/* ── Tri ── */}
          <section className="px-6 py-5 space-y-3">
            <h3 className="text-sm font-semibold">Ordre de tri</h3>
            <div className="space-y-2">
              {sortLevels.map((level, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
                  <Select value={level.field} onValueChange={(v) => setSortLevel(i, { field: v as SortField })}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(SORT_FIELD_LABELS) as [SortField, string][]).map(([f, label]) => (
                        <SelectItem key={f} value={f} disabled={sortLevels.some((l, li) => li !== i && l.field === f)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setSortLevel(i, { dir: level.dir === "asc" ? "desc" : "asc" })}
                    className="h-8 px-2.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors shrink-0 tabular-nums"
                  >
                    {level.dir === "asc" ? "A → Z" : "Z → A"}
                  </button>
                  {sortLevels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSortLevels((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {sortLevels.length < Object.keys(SORT_FIELD_LABELS).length && (
                <button
                  type="button"
                  onClick={addSortLevel}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                  <Plus className="size-3.5" />
                  Ajouter un niveau
                </button>
              )}
            </div>
          </section>

          {/* ── Colonnes ── */}
          <section className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Colonnes à exporter</h3>
              <button
                type="button"
                onClick={() => setSelectedCols(allColsSelected ? new Set() : new Set(ALL_COLUMNS.map((c) => c.key)))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {allColsSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t px-6 py-4 shrink-0 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {exportRows.length} invité{exportRows.length > 1 ? "s" : ""}
            {" · "}
            {activeCols.length} colonne{activeCols.length > 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
            <Button size="sm" disabled={!canExport} onClick={handleExport}>
              <Download className="size-4 mr-1.5" />
              Télécharger le fichier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
