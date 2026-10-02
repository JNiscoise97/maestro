import { useState, type ReactNode } from "react"
import { CalendarClock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useUpdateChecklistItem } from "@/hooks/queries/use-checklists"
import { RetroFields } from "@/components/missions/RetroFields"
import {
  EMPTY_BULK_VALUES, retroBulkPatch, retroDatesInvalid, retroPatch, retroValuesFromItem, type RetroValues,
} from "@/lib/retroplanning-values"
import { cn } from "@/lib/utils"
import type { ChecklistItem } from "@/types/domain"

/**
 * Éditeur sur place du rétroplanning d'un item (jalon, dates, criticité).
 * Le déclencheur est fourni par l'appelant (la ligne de rétroplanning de l'item).
 */
export function ItemRetroPopover({ item, children }: { item: ChecklistItem; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<RetroValues>(() => retroValuesFromItem(item))
  const update = useUpdateChecklistItem()
  const invalid = retroDatesInvalid(values)

  function handleOpenChange(next: boolean) {
    if (next) setValues(retroValuesFromItem(item))
    setOpen(next)
  }

  async function save() {
    if (invalid) return
    try {
      await update.mutateAsync({ id: item.id, patch: retroPatch(values) })
      setOpen(false)
    } catch (err) {
      console.error("[ItemRetroPopover] save:", err)
      toast.error("Erreur lors de l'enregistrement du rétroplanning.")
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))] space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Rétroplanning de l'item</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.label}</p>
        </div>
        <RetroFields value={values} onChange={setValues} idPrefix={`pop-${item.id}`} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
          <Button size="sm" onClick={save} disabled={invalid || update.isPending}>Enregistrer</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Planifie d'un coup les items d'une mission : seuls les champs renseignés sont appliqués,
 * à tous les items ou seulement à ceux qui n'ont pas encore de jalon.
 */
export function MissionRetroPopover({ items }: { items: ChecklistItem[] }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<RetroValues>(EMPTY_BULK_VALUES)
  const [scope, setScope] = useState<"all" | "unplanned">("unplanned")
  const update = useUpdateChecklistItem()
  const [saving, setSaving] = useState(false)

  const unplanned = items.filter((i) => !i.milestoneId)
  const targets = scope === "all" ? items : unplanned
  const patch = retroBulkPatch(values)
  const empty = Object.keys(patch).length === 0
  const invalid = retroDatesInvalid(values)

  function handleOpenChange(next: boolean) {
    if (next) {
      setValues(EMPTY_BULK_VALUES)
      setScope(unplanned.length > 0 ? "unplanned" : "all")
    }
    setOpen(next)
  }

  async function apply() {
    if (empty || invalid || targets.length === 0) return
    setSaving(true)
    try {
      await Promise.all(targets.map((i) => update.mutateAsync({ id: i.id, patch })))
      toast.success(`${targets.length} item${targets.length > 1 ? "s" : ""} mis à jour.`)
      setOpen(false)
    } catch (err) {
      console.error("[MissionRetroPopover] apply:", err)
      toast.error("Erreur lors de la mise à jour des items.")
    } finally {
      setSaving(false)
    }
  }

  if (items.length === 0) return null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Planifier les items de la mission" title="Planifier les items de la mission">
          <CalendarClock className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(32rem,calc(100vw-2rem))] space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Planifier les items de la mission</p>
          <p className="text-xs text-muted-foreground">Jalon, dates et criticité appliqués en une fois.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Items concernés">
          {([
            { value: "unplanned", label: `Items sans jalon (${unplanned.length})` },
            { value: "all", label: `Tous les items (${items.length})` },
          ] as const).map((opt) => (
            <button key={opt.value} type="button" role="radio" aria-checked={scope === opt.value}
              onClick={() => setScope(opt.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                scope === opt.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/30",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <RetroFields value={values} onChange={setValues} bulk idPrefix="bulk" />
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
          <Button size="sm" onClick={apply} disabled={empty || invalid || targets.length === 0 || saving}>
            Appliquer à {targets.length} item{targets.length > 1 ? "s" : ""}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
