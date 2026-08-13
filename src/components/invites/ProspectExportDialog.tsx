import { useEffect, useMemo, useState } from "react"
import { Download, Plus, X } from "lucide-react"
import * as XLSX from "xlsx"

import type { ProspectStatus } from "@/services/supabase/prospects"
import type { Prospect } from "@/services/supabase/prospects"
import type { GuestGroup } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// ── Labels ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProspectStatus, string> = {
  pending:    "À décider",
  invite:     "Invités",
  next_event: "Prochain événement",
  no:         "Écartés",
}

const STATUS_ORDER: Record<ProspectStatus, number> = { invite: 0, pending: 1, next_event: 2, no: 3 }

// ── Colonnes ──────────────────────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  defaultOn: boolean
  getValue: (p: Prospect) => string
}

const ALL_COLUMNS: ColDef[] = [
  { key: "fullName",    label: "Nom",           defaultOn: true,  getValue: (p) => p.fullName },
  { key: "groupName",   label: "Groupe",        defaultOn: true,  getValue: (p) => p.groupName ?? "" },
  { key: "status",      label: "Statut",        defaultOn: true,  getValue: (p) => STATUS_LABELS[p.status] },
  { key: "notes",       label: "Notes",         defaultOn: true,  getValue: (p) => p.notes ?? "" },
  { key: "addedByName", label: "Ajouté par",    defaultOn: true,  getValue: (p) => p.addedByName ?? "" },
]

// ── Tri ───────────────────────────────────────────────────────────────────────

type SortField = "groupOrder" | "fullName" | "status"

const SORT_FIELD_LABELS: Record<SortField, string> = {
  groupOrder: "Groupe",
  fullName:   "Nom",
  status:     "Statut",
}

interface SortLevel { field: SortField; dir: "asc" | "desc" }

const DEFAULT_SORT: SortLevel[] = [
  { field: "groupOrder", dir: "asc" },
  { field: "fullName",   dir: "asc" },
]

function sortProspects(
  prospects: Prospect[],
  levels: SortLevel[],
  groupOrderMap: Map<string, number>
): Prospect[] {
  return [...prospects].sort((a, b) => {
    for (const { field, dir } of levels) {
      let cmp = 0
      switch (field) {
        case "groupOrder":
          cmp = (groupOrderMap.get(a.groupName ?? "") ?? Infinity) - (groupOrderMap.get(b.groupName ?? "") ?? Infinity)
          break
        case "fullName":
          cmp = a.fullName.localeCompare(b.fullName, "fr")
          break
        case "status":
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          break
      }
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp
    }
    return 0
  })
}

// ── Composant ─────────────────────────────────────────────────────────────────

const ALL_STATUSES = (Object.keys(STATUS_LABELS) as ProspectStatus[])

export function ProspectExportDialog({ prospects, groups }: { prospects: Prospect[]; groups: GuestGroup[] }) {
  const [open, setOpen] = useState(false)

  // ── Groupes (noms uniques issus des prospects + groupes connus)
  const allGroupKeys = useMemo(() => {
    const names = new Set<string>()
    for (const p of prospects) names.add(p.groupName ?? "__none__")
    // Ajouter les groupes connus dans l'ordre
    for (const g of groups) names.add(g.familyName)
    return [...names]
  }, [prospects, groups])

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

  // ── Statuts
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ProspectStatus>>(new Set())

  useEffect(() => {
    if (open) setSelectedStatuses(new Set(ALL_STATUSES))
  }, [open])

  const allStatusesSelected = selectedStatuses.size === ALL_STATUSES.length

  function toggleStatus(s: ProspectStatus) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
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
  const groupOrderMap = useMemo(
    () => new Map(groups.map((g) => [g.familyName, g.sortOrder])),
    [groups]
  )

  const exportRows = useMemo(() => {
    const filtered = prospects.filter(
      (p) =>
        selectedStatuses.has(p.status) &&
        selectedGroups.has(p.groupName ?? "__none__")
    )
    return sortProspects(filtered, sortLevels, groupOrderMap)
  }, [prospects, selectedStatuses, selectedGroups, sortLevels, groupOrderMap])

  const activeCols = useMemo(() => ALL_COLUMNS.filter((c) => selectedCols.has(c.key)), [selectedCols])

  function handleExport() {
    const data = exportRows.map((p) =>
      Object.fromEntries(activeCols.map((col) => [col.label, col.getValue(p)]))
    )
    const ws = XLSX.utils.json_to_sheet(data)
    ws["!cols"] = activeCols.map((col) => ({
      wch: Math.max(col.label.length, ...data.map((r) => String(r[col.label] ?? "").length), 10),
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Atelier")
    XLSX.writeFile(wb, `atelier-${new Date().toISOString().split("T")[0]}.xlsx`)
    setOpen(false)
  }

  const canExport = exportRows.length > 0 && activeCols.length > 0
  const hasNoGroup = prospects.some((p) => !p.groupName)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="size-4 mr-1.5" />
          Exporter
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col w-[90vw] max-w-[90vw] max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Exporter l'atelier</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {exportRows.length} candidat{exportRows.length > 1 ? "s" : ""}
            {" · "}
            {activeCols.length} colonne{activeCols.length > 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto divide-y divide-border">

          {/* ── Statuts ── */}
          <section className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Statuts</h3>
              <button
                type="button"
                onClick={() => setSelectedStatuses(allStatusesSelected ? new Set() : new Set(ALL_STATUSES))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {allStatusesSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {ALL_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedStatuses.has(s)} onCheckedChange={() => toggleStatus(s)} />
                  <span className="text-sm">{STATUS_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </section>

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
                  <Checkbox checked={selectedGroups.has(grp.familyName)} onCheckedChange={() => toggleGroup(grp.familyName)} />
                  <span className="text-sm truncate">{grp.familyName}</span>
                </label>
              ))}
              {hasNoGroup && (
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
            <div className="flex flex-wrap gap-x-6 gap-y-2">
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
            {exportRows.length} candidat{exportRows.length > 1 ? "s" : ""}
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
