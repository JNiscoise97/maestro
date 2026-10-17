import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ListTree, Loader2 } from "lucide-react"
import { toast } from "sonner"

import type { Checklist, ChecklistItem, Domaine, Mission } from "@/types/domain"
import { useCreateMission, useUpdateMission, useDeleteMission } from "@/hooks/queries/use-missions"
import {
  useCreateChecklist, useDeleteChecklist,
  useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem,
} from "@/hooks/queries/use-checklists"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { compareChecklistItems, compareMissions } from "@/lib/ordering"

// ── Types internes ─────────────────────────────────────────────────────────────

interface NewItem      { label: string }
interface NewChecklist { title: string; items: NewItem[] }
interface NewMission   { title: string; checklists: NewChecklist[] }

interface OrigItem      { id: string; label: string; sortOrder: number }
interface OrigChecklist { id: string; title: string | null; items: OrigItem[] }
interface OrigMission   { id: string; title: string; sortOrder: number; checklists: OrigChecklist[] }

interface PlanNode {
  newIndex: number
  newTitle: string
  origId?: string
  origTitle?: string
  checklists: Array<{
    newIndex: number
    newTitle: string
    origId?: string
    origTitle?: string
    items: Array<{
      newIndex: number
      newLabel: string
      origId?: string
      origLabel?: string
    }>
  }>
}

interface ReconcileResult {
  missionNodes: PlanNode[]
  toDeleteMissions: OrigMission[]
  toDeleteChecklists: OrigChecklist[]
  toDeleteItems: OrigItem[]
}

interface DiffLine {
  kind: "create" | "delete" | "update"
  type: "mission" | "checklist" | "item"
  description: string
}

// ── Transformation du format □ / Mission : ───────────────────────────────────

function applyInputTransform(raw: string): string {
  return raw
    .split("\n")
    .map((line) => {
      if (line.startsWith("Mission : ")) return line.slice("Mission : ".length) + "\n  TODO"
      return line.replace("□ ", "    ")
    })
    .join("\n")
}

// ── Parsing du texte ──────────────────────────────────────────────────────────

function parseText(text: string): NewMission[] {
  const missions: NewMission[] = []
  let curMission: NewMission | null = null
  let curChecklist: NewChecklist | null = null

  for (const raw of text.split("\n")) {
    const trimmed = raw.trimStart()
    if (!trimmed) continue
    const spaces = raw.length - trimmed.length
    const indent = Math.floor(spaces / 2)

    if (indent === 0) {
      curMission = { title: trimmed, checklists: [] }
      missions.push(curMission)
      curChecklist = null
    } else if (indent === 1) {
      if (!curMission) continue
      curChecklist = { title: trimmed, items: [] }
      curMission.checklists.push(curChecklist)
    } else {
      if (!curMission) continue
      if (!curChecklist) {
        curChecklist = { title: "", items: [] }
        curMission.checklists.push(curChecklist)
      }
      curChecklist.items.push({ label: trimmed })
    }
  }
  return missions
}

// ── Sérialisation ─────────────────────────────────────────────────────────────

function serialize(missions: OrigMission[]): string {
  const lines: string[] = []
  for (const m of missions) {
    lines.push(m.title)
    for (const cl of m.checklists) {
      lines.push("  " + (cl.title ?? ""))
      for (const item of cl.items) {
        lines.push("    " + item.label)
      }
    }
  }
  return lines.join("\n")
}

// ── Réconciliation ────────────────────────────────────────────────────────────

function reconcile(origMissions: OrigMission[], newMissions: NewMission[]): ReconcileResult {
  const matchedOrigMIds = new Set<string>()
  const missionNodes: PlanNode[] = []
  const toDeleteMissions: OrigMission[] = []
  const toDeleteChecklists: OrigChecklist[] = []
  const toDeleteItems: OrigItem[] = []

  for (let mi = 0; mi < newMissions.length; mi++) {
    const newM = newMissions[mi]
    const origM = origMissions.find((o) => !matchedOrigMIds.has(o.id) && o.title === newM.title)

    const node: PlanNode = {
      newIndex: mi,
      newTitle: newM.title,
      origId: origM?.id,
      origTitle: origM?.title,
      checklists: [],
    }

    if (origM) matchedOrigMIds.add(origM.id)

    const matchedOrigClIds = new Set<string>()
    for (let ci = 0; ci < newM.checklists.length; ci++) {
      const newCl = newM.checklists[ci]
      const origCl = origM?.checklists.find(
        (o) => !matchedOrigClIds.has(o.id) && (o.title ?? "") === newCl.title
      )

      const clNode: PlanNode["checklists"][0] = {
        newIndex: ci,
        newTitle: newCl.title,
        origId: origCl?.id,
        origTitle: origCl?.title ?? undefined,
        items: [],
      }

      if (origCl) matchedOrigClIds.add(origCl.id)

      const matchedOrigItemIds = new Set<string>()
      for (let ii = 0; ii < newCl.items.length; ii++) {
        const newItem = newCl.items[ii]
        const origItem = origCl?.items.find(
          (o) => !matchedOrigItemIds.has(o.id) && o.label === newItem.label
        )
        if (origItem) matchedOrigItemIds.add(origItem.id)
        clNode.items.push({
          newIndex: ii,
          newLabel: newItem.label,
          origId: origItem?.id,
          origLabel: origItem?.label,
        })
      }

      // Suppression des items non matchés dans cette checklist
      if (origCl) {
        for (const oi of origCl.items) {
          if (!matchedOrigItemIds.has(oi.id)) toDeleteItems.push(oi)
        }
      }

      node.checklists.push(clNode)
    }

    // Suppression des checklists non matchées de cette mission
    if (origM) {
      for (const ocl of origM.checklists) {
        if (!matchedOrigClIds.has(ocl.id)) {
          for (const oi of ocl.items) toDeleteItems.push(oi)
          toDeleteChecklists.push(ocl)
        }
      }
    }

    missionNodes.push(node)
  }

  // Suppression des missions non matchées
  for (const origM of origMissions) {
    if (!matchedOrigMIds.has(origM.id)) {
      for (const ocl of origM.checklists) {
        for (const oi of ocl.items) toDeleteItems.push(oi)
        toDeleteChecklists.push(ocl)
      }
      toDeleteMissions.push(origM)
    }
  }

  return { missionNodes, toDeleteMissions, toDeleteChecklists, toDeleteItems }
}

// ── Calcul du diff pour affichage ─────────────────────────────────────────────

function buildDiffLines(result: ReconcileResult, origMissions: OrigMission[]): DiffLine[] {
  const lines: DiffLine[] = []

  for (const m of result.missionNodes) {
    if (!m.origId) {
      lines.push({ kind: "create", type: "mission", description: `Mission « ${m.newTitle} »` })
      for (const cl of m.checklists) {
        lines.push({ kind: "create", type: "checklist", description: `Checklist « ${cl.newTitle || "(sans titre)"} »` })
        for (const item of cl.items) {
          lines.push({ kind: "create", type: "item", description: item.newLabel })
        }
      }
    } else {
      const origM = origMissions.find((o) => o.id === m.origId)
      if (origM && origM.sortOrder !== m.newIndex) {
        lines.push({ kind: "update", type: "mission", description: `Mission « ${m.newTitle} » — réordonné` })
      }
      for (const cl of m.checklists) {
        if (!cl.origId) {
          lines.push({ kind: "create", type: "checklist", description: `Checklist « ${cl.newTitle || "(sans titre)"} » dans « ${m.newTitle} »` })
          for (const item of cl.items) {
            lines.push({ kind: "create", type: "item", description: item.newLabel })
          }
        } else {
          for (const item of cl.items) {
            if (!item.origId) {
              lines.push({ kind: "create", type: "item", description: `Item « ${item.newLabel} »` })
            } else if (item.origId) {
              const origCl = origM?.checklists.find((o) => o.id === cl.origId)
              const origItem = origCl?.items.find((o) => o.id === item.origId)
              if (origItem && origItem.sortOrder !== item.newIndex) {
                lines.push({ kind: "update", type: "item", description: `« ${item.newLabel} » — réordonné` })
              }
            }
          }
        }
      }
    }
  }

  for (const m of result.toDeleteMissions) {
    lines.push({ kind: "delete", type: "mission", description: `Mission « ${m.title} » (et ses checklists)` })
  }
  for (const cl of result.toDeleteChecklists) {
    lines.push({ kind: "delete", type: "checklist", description: `Checklist « ${cl.title ?? "(sans titre)"} » (et ses items)` })
  }
  for (const item of result.toDeleteItems) {
    lines.push({ kind: "delete", type: "item", description: `Item « ${item.label} »` })
  }

  return lines
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  domaine: Domaine
  missions: Mission[]
  checklists: Checklist[]
  items: ChecklistItem[]
}

export function DomaineQuickEditDialog({ domaine, missions, checklists, items }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"edit" | "preview">("edit")
  const [text, setText] = useState("")
  const [diffLines, setDiffLines] = useState<DiffLine[]>([])
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult | null>(null)
  const [applying, setApplying] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const createMission = useCreateMission()
  const updateMission = useUpdateMission()
  const deleteMission = useDeleteMission()
  const createChecklist = useCreateChecklist()
  const deleteChecklist = useDeleteChecklist()
  const createItem = useCreateChecklistItem()
  const updateItem = useUpdateChecklistItem()
  const deleteItem = useDeleteChecklistItem()

  function buildOrigMissions(): OrigMission[] {
    return missions
      .filter((m) => m.domaineId === domaine.id)
      .sort(compareMissions)
      .map((m) => ({
        id: m.id,
        title: m.title,
        sortOrder: m.sortOrder,
        checklists: checklists
          .filter((c) => c.ownerType === "mission" && c.ownerId === m.id)
          .map((cl) => ({
            id: cl.id,
            title: cl.title ?? null,
            items: items
              .filter((i) => i.checklistId === cl.id)
              .sort(compareChecklistItems)
              .map((i) => ({ id: i.id, label: i.label, sortOrder: i.sortOrder })),
          })),
      }))
  }

  useEffect(() => {
    if (!open) return
    const orig = buildOrigMissions()
    setText(serialize(orig))
    setStep("edit")
    setReconcileResult(null)
    setDiffLines([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Gestion Tab / Shift+Tab dans le textarea
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return
    e.preventDefault()
    const ta = taRef.current!
    const { selectionStart: ss, selectionEnd: se, value } = ta

    if (e.shiftKey) {
      // Dedent : supprime jusqu'à 2 espaces au début de la ligne courante
      const lineStart = value.lastIndexOf("\n", ss - 1) + 1
      const leading = value.slice(lineStart).match(/^ {1,2}/)?.[0] ?? ""
      if (!leading) return
      const next = value.slice(0, lineStart) + value.slice(lineStart + leading.length)
      setText(next)
      setTimeout(() => {
        ta.selectionStart = Math.max(ss - leading.length, lineStart)
        ta.selectionEnd = Math.max(se - leading.length, lineStart)
      }, 0)
    } else {
      // Indent : insère 2 espaces au début de la ligne courante
      const lineStart = value.lastIndexOf("\n", ss - 1) + 1
      const next = value.slice(0, lineStart) + "  " + value.slice(lineStart)
      setText(next)
      setTimeout(() => {
        ta.selectionStart = ss + 2
        ta.selectionEnd = se + 2
      }, 0)
    }
  }

  function handlePreview() {
    const origMissions = buildOrigMissions()
    const newMissions = parseText(text)
    const result = reconcile(origMissions, newMissions)
    const lines = buildDiffLines(result, origMissions)
    setReconcileResult(result)
    setDiffLines(lines)
    setStep("preview")
  }

  async function handleApply() {
    if (!reconcileResult) return
    setApplying(true)
    try {
      const origMissions = buildOrigMissions()
      const { missionNodes, toDeleteMissions, toDeleteChecklists, toDeleteItems } = reconcileResult

      // Phase 1 : suppressions séquentielles par niveau (bottom-up)
      // Les mutations TanStack Query ne supportent pas les appels concurrents sur
      // la même instance hook — on séquentialise pour éviter les promises orphelines.
      for (const i of toDeleteItems)      await deleteItem.mutateAsync(i.id)
      for (const c of toDeleteChecklists) await deleteChecklist.mutateAsync(c.id)
      for (const m of toDeleteMissions)   await deleteMission.mutateAsync(m.id)

      // Phase 2 : réordonnement des missions existantes
      for (const n of missionNodes) {
        if (!n.origId) continue
        const orig = origMissions.find((o) => o.id === n.origId)
        if (orig && orig.sortOrder !== n.newIndex) {
          await updateMission.mutateAsync({ id: n.origId, patch: { sortOrder: n.newIndex } })
        }
      }

      // Phase 3 : créations séquentielles (chaîne d'IDs)
      for (const node of missionNodes) {
        const missionId = node.origId
          ?? (await createMission.mutateAsync({
              title: node.newTitle,
              domaineId: domaine.id,
              status: "todo",
              sortOrder: node.newIndex,
             })).id

        for (const clNode of node.checklists) {
          const checklistId = clNode.origId
            ?? (await createChecklist.mutateAsync({
                ownerType: "mission",
                ownerId: missionId,
                title: clNode.newTitle || null,
               })).id

          const origItems = origMissions
            .flatMap((m) => m.checklists)
            .find((c) => c.id === clNode.origId)?.items ?? []

          for (const itemNode of clNode.items) {
            if (!itemNode.origId) {
              await createItem.mutateAsync({
                checklistId,
                label: itemNode.newLabel,
                sortOrder: itemNode.newIndex,
                isDone: false,
                priority: "normal",
                status: "todo",
              })
            } else {
              const orig = origItems.find((o) => o.id === itemNode.origId)
              if (orig && orig.sortOrder !== itemNode.newIndex) {
                await updateItem.mutateAsync({ id: itemNode.origId, patch: { sortOrder: itemNode.newIndex } })
              }
            }
          }
        }
      }

      toast.success("Modifications appliquées.")
      setOpen(false)
    } catch (err) {
      console.error("[DomaineQuickEditDialog] handleApply:", err)
      toast.error("Une erreur est survenue lors de l'application.")
    } finally {
      setApplying(false)
    }
  }

  const DIFF_STYLES = {
    create: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
    delete: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300",
    update: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
  }
  const DIFF_LABELS = { create: "+ Créer", delete: "− Supprimer", update: "↻ Mettre à jour" }
  const TYPE_LABELS = { mission: "Mission", checklist: "Checklist", item: "Item" }

  const counts = diffLines.reduce((acc, l) => { acc[l.kind] = (acc[l.kind] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!applying) setOpen(v) }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Édition rapide missions & checklists">
              <ListTree className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Édition rapide missions &amp; checklists</TooltipContent>
      </Tooltip>

      <DialogContent className="flex flex-col sm:max-w-2xl" style={{ maxHeight: "85vh" }}>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {step === "edit"
              ? <>Édition rapide — <span className="text-muted-foreground font-normal">{domaine.name}</span></>
              : <>Prévisualisation — <span className="text-muted-foreground font-normal">{domaine.name}</span></>}
          </DialogTitle>
        </DialogHeader>

        {step === "edit" ? (
          <>
            {/* Légende */}
            <div className="flex flex-wrap gap-3 rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <span><span className="font-mono font-bold">Mission</span> — pas d&apos;indentation</span>
              <span className="opacity-40">·</span>
              <span><span className="font-mono font-bold">  Checklist</span> — 2 espaces (ou Tab)</span>
              <span className="opacity-40">·</span>
              <span><span className="font-mono font-bold">    Item</span> — 4 espaces (Tab·Tab)</span>
              <span className="opacity-40">·</span>
              <span>Shift+Tab pour dé-indenter</span>
            </div>

            {/* Textarea */}
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => {
                const val = e.target.value
                setText(val.includes("□") ? applyInputTransform(val) : val)
              }}
              onKeyDown={handleKeyDown}
              className="min-h-[320px] flex-1 resize-none rounded-xl border border-border bg-card p-3 font-mono text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/40"
              placeholder={"Mission A\n  Checklist\n    Item 1\n    Item 2\nMission B"}
              spellCheck={false}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handlePreview} disabled={!text.trim()}>
                Prévisualiser les changements
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Résumé */}
            {diffLines.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun changement détecté.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {counts.create ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{counts.create} à créer</span> : null}
                  {counts.delete ? <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">{counts.delete} à supprimer</span> : null}
                  {counts.update ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{counts.update} à mettre à jour</span> : null}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 rounded-xl border border-border p-2">
                  {diffLines.map((line, i) => (
                    <div
                      key={i}
                      className={cn("flex items-baseline gap-2 rounded-lg border px-3 py-1.5 text-xs", DIFF_STYLES[line.kind])}
                    >
                      <span className="shrink-0 font-mono font-semibold text-[10px]">{DIFF_LABELS[line.kind]}</span>
                      <span className="shrink-0 opacity-50">{TYPE_LABELS[line.type]}</span>
                      <span className="min-w-0">{line.description}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("edit")} disabled={applying}>
                <ArrowLeft className="size-3.5" />
                Retour à l&apos;éditeur
              </Button>
              <Button onClick={handleApply} disabled={applying || diffLines.length === 0}>
                {applying && <Loader2 className="size-3.5 animate-spin" />}
                {applying ? "Application en cours…" : "Confirmer et appliquer"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
