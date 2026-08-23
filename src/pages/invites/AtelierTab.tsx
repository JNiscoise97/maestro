import { useRef, useState } from "react"
import { Trash2, Plus, ChevronDown, ChevronRight, Users, Upload, FileText, X, ArrowRight, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import type { Guest, GuestGroup, GuestSide, ProspectStatus } from "@/types/domain"
import { useGuests, useCreateGuest, useUpdateGuest, useDeleteGuest, useGuestGroups, useCreateGuestGroup } from "@/hooks/queries/use-guests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProspectExportDialog } from "@/components/invites/ProspectExportDialog"

// ── Constantes ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string }> = {
  pending:        { label: "En réflexion",   color: "bg-muted text-muted-foreground" },
  main_list:      { label: "Liste A",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  secondary_list: { label: "Liste B",        color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400" },
  deferred:       { label: "Liste différée", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  faire_part:     { label: "Faire-part",     color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" },
  not_invited:    { label: "Hors liste",     color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
}

const STATUS_ORDER: ProspectStatus[] = ["pending", "main_list", "secondary_list", "deferred", "faire_part", "not_invited"]

const DECIDED_STATUSES: ProspectStatus[] = ["secondary_list", "deferred", "faire_part", "not_invited"]

// Boutons d'action rapide sur une carte "En réflexion"
const QUICK_ACTIONS: { status: ProspectStatus; label: string; className: string }[] = [
  { status: "main_list",      label: "Inviter",    className: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600" },
  { status: "secondary_list", label: "Liste B",    className: "" },
  { status: "faire_part",     label: "Faire-part", className: "" },
  { status: "deferred",       label: "Reporter",   className: "" },
  { status: "not_invited",    label: "Hors liste", className: "text-red-500 border-red-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950/30" },
]

// ── GroupSelect ────────────────────────────────────────────────────────────────

const NONE = "__none__"
const CREATE_KEY = "__create__"

function GroupSelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const { data: groups = [] } = useGuestGroups()
  const createGroup = useCreateGuestGroup()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState("")

  async function confirmNew() {
    const name = draft.trim()
    setDraft("")
    setCreating(false)
    if (!name) return
    const group = await createGroup.mutateAsync({
      familyName: name,
      sortOrder: (Math.max(0, ...groups.map((g) => g.sortOrder)) + 1),
    })
    onChange(group.id)
  }

  if (creating) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Nom du groupe…"
        autoFocus
        className={cn("h-8 text-sm", className)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); confirmNew() }
          if (e.key === "Escape") { setDraft(""); setCreating(false) }
        }}
        onBlur={confirmNew}
      />
    )
  }

  return (
    <Select
      value={value || NONE}
      onValueChange={(v) => {
        if (v === CREATE_KEY) { setCreating(true) }
        else onChange(v === NONE ? "" : v)
      }}
    >
      <SelectTrigger className={cn("h-8 text-sm", className)}>
        <SelectValue placeholder="— aucun groupe —" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— aucun groupe —</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>{g.familyName}</SelectItem>
        ))}
        <SelectItem value={CREATE_KEY} className="text-primary font-medium">
          + Créer un groupe…
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

// ── CSV import ─────────────────────────────────────────────────────────────────

interface RawCsv { headers: string[]; rows: string[][] }
interface Mapping { nom: string; prenom: string; groupe: string }
interface MappedRow { _id: string; nom: string; prenom: string; groupeId: string }

function normHeader(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

const GUESSES: Record<keyof Mapping, string[]> = {
  nom:    ["nom", "last name", "lastname", "name"],
  prenom: ["prenom", "prénom", "first name", "firstname", "given name"],
  groupe: ["groupe", "group", "famille", "family", "contexte"],
}

function guessMapping(headers: string[]): Mapping {
  const normed = headers.map(normHeader)
  function best(field: keyof Mapping): string {
    for (const hint of GUESSES[field]) {
      const i = normed.indexOf(normHeader(hint))
      if (i !== -1) return headers[i]
    }
    return NONE
  }
  return { nom: best("nom"), prenom: best("prenom"), groupe: best("groupe") }
}

function parseRaw(text: string): RawCsv | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return null
  const sep = lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ""))
  const rows = lines.slice(1).map((line) =>
    line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""))
  )
  return { headers, rows }
}

function UploadZone({ onParsed }: { onParsed: (raw: RawCsv) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const raw = parseRaw(e.target?.result as string)
      if (!raw) { toast.error("Fichier invalide ou trop court."); return }
      onParsed(raw)
    }
    reader.readAsText(file, "UTF-8")
  }

  return (
    <div
      className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
      onClick={() => fileRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".csv")) handleFile(f) }}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload className="size-6 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Déposer un fichier CSV ou cliquer</p>
        <p className="mt-1 text-xs text-muted-foreground">Séparateur <code className="rounded bg-muted px-1">;</code> ou <code className="rounded bg-muted px-1">,</code> — UTF-8</p>
      </div>
      <input ref={fileRef} type="file" accept=".csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

const FIELD_LABELS: Record<keyof Mapping, string> = {
  nom:    "Nom",
  prenom: "Prénom",
  groupe: "Groupe",
}

function MappingStep({
  raw, mapping, onMapping, onConfirm, onBack,
}: {
  raw: RawCsv; mapping: Mapping; onMapping: (m: Mapping) => void; onConfirm: () => void; onBack: () => void
}) {
  const preview = raw.rows.slice(0, 3)
  function colIdx(col: string) { return col === NONE ? -1 : raw.headers.indexOf(col) }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {raw.rows.length} ligne{raw.rows.length > 1 ? "s" : ""} détectée{raw.rows.length > 1 ? "s" : ""}. Choisissez quelle colonne correspond à chaque champ.
      </p>
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40 bg-muted/50">Champ</TableHead>
              <TableHead className="bg-muted/50">Colonne CSV</TableHead>
              <TableHead className="bg-muted/50 text-muted-foreground text-xs font-normal">Aperçu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(["nom", "prenom", "groupe"] as (keyof Mapping)[]).map((field) => {
              const i = colIdx(mapping[field])
              const samples = preview.map((row) => (i >= 0 ? row[i] : "")).filter(Boolean)
              return (
                <TableRow key={field}>
                  <TableCell className="font-medium text-sm">{FIELD_LABELS[field]}</TableCell>
                  <TableCell className="py-2">
                    <Select value={mapping[field]} onValueChange={(v) => onMapping({ ...mapping, [field]: v })}>
                      <SelectTrigger className="h-8 w-52 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— ignorer —</SelectItem>
                        {raw.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {samples.length > 0 ? samples.slice(0, 2).join(", ") : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>Recommencer</Button>
        <Button size="sm" onClick={onConfirm} disabled={mapping.nom === NONE && mapping.prenom === NONE} className="ml-auto">
          Voir le tableau <ArrowRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

function PreviewStep({
  rows, onRows, onBack, onClose,
}: {
  rows: MappedRow[]; onRows: (r: MappedRow[]) => void; onBack: () => void; onClose: () => void
}) {
  const [isImporting, setIsImporting] = useState(false)
  const createGuest = useCreateGuest()

  function updateRow(id: string, field: keyof Omit<MappedRow, "_id">, value: string) {
    onRows(rows.map((r) => r._id === id ? { ...r, [field]: value } : r))
  }

  const validCount = rows.filter((r) => r.nom.trim() || r.prenom.trim()).length

  async function handleImport() {
    const valid = rows.filter((r) => r.nom.trim() || r.prenom.trim())
    if (!valid.length) { toast.error("Aucune ligne avec un nom ou prénom."); return }
    setIsImporting(true)
    try {
      await Promise.all(valid.map((r) => {
        const groupId = r.groupeId || null
        return createGuest.mutateAsync({
          firstName: r.prenom.trim(),
          lastName: r.nom.trim(),
          groupId,
          prospectStatus: "pending",
        })
      }))
      toast.success(`${valid.length} candidat${valid.length > 1 ? "s" : ""} ajouté${valid.length > 1 ? "s" : ""}.`)
      onClose()
    } catch {
      toast.error("Erreur lors de l'import.")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" />
          {rows.length} ligne{rows.length > 1 ? "s" : ""} — vérifiez avant d'importer
        </p>
        <Button variant="ghost" size="sm" onClick={onBack}>← Mapping</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Nom</TableHead>
              <TableHead className="w-40">Prénom</TableHead>
              <TableHead className="w-40">Groupe</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row._id}>
                <TableCell className="p-1">
                  <Input value={row.nom} onChange={(e) => updateRow(row._id, "nom", e.target.value)}
                    placeholder="Dupont"
                    className={cn("h-8 text-sm", !row.nom.trim() && !row.prenom.trim() && "border-destructive")} />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={row.prenom} onChange={(e) => updateRow(row._id, "prenom", e.target.value)}
                    placeholder="Marie" className="h-8 text-sm" />
                </TableCell>
                <TableCell className="p-1">
                  <GroupSelect value={row.groupeId} onChange={(v) => updateRow(row._id, "groupeId", v)} />
                </TableCell>
                <TableCell className="p-1">
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRows(rows.filter((r) => r._id !== row._id))}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => onRows([...rows, { _id: crypto.randomUUID(), nom: "", prenom: "", groupeId: "" }])}>
          <Plus className="size-4" /> Ajouter une ligne
        </Button>
        <Button onClick={handleImport} disabled={isImporting || validCount === 0} className="ml-auto">
          {isImporting ? "Import…" : `Importer ${validCount} candidat${validCount > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  )
}

type CsvStep = "upload" | "mapping" | "preview"

function ProspectCsvImport({ onClose }: { onClose: () => void }) {
  const [step, setStep]       = useState<CsvStep>("upload")
  const [raw, setRaw]         = useState<RawCsv | null>(null)
  const [mapping, setMapping] = useState<Mapping>({ nom: NONE, prenom: NONE, groupe: NONE })
  const [rows, setRows]       = useState<MappedRow[]>([])
  const { data: groups = [] } = useGuestGroups()

  function handleParsed(r: RawCsv) {
    setRaw(r)
    setMapping(guessMapping(r.headers))
    setStep("mapping")
  }

  function handleConfirmMapping() {
    if (!raw) return
    const nomIdx    = mapping.nom    === NONE ? -1 : raw.headers.indexOf(mapping.nom)
    const prenomIdx = mapping.prenom === NONE ? -1 : raw.headers.indexOf(mapping.prenom)
    const groupeIdx = mapping.groupe === NONE ? -1 : raw.headers.indexOf(mapping.groupe)
    const mapped: MappedRow[] = raw.rows
      .map((cells) => {
        const groupeName = groupeIdx >= 0 ? (cells[groupeIdx] ?? "").trim() : ""
        const groupId = groups.find((g) => g.familyName === groupeName)?.id ?? ""
        return {
          _id:      crypto.randomUUID(),
          nom:      nomIdx    >= 0 ? (cells[nomIdx]    ?? "") : "",
          prenom:   prenomIdx >= 0 ? (cells[prenomIdx] ?? "") : "",
          groupeId: groupId,
        }
      })
      .filter((r) => r.nom.trim() || r.prenom.trim())
    if (mapped.length === 0) { toast.error("Aucune ligne valide avec le mapping choisi."); return }
    setRows(mapped)
    setStep("preview")
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Import CSV</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="size-4" /></Button>
      </div>
      {step === "upload" && <UploadZone onParsed={handleParsed} />}
      {step === "mapping" && raw && (
        <MappingStep raw={raw} mapping={mapping} onMapping={setMapping} onConfirm={handleConfirmMapping}
          onBack={() => { setRaw(null); setStep("upload") }} />
      )}
      {step === "preview" && raw && (
        <PreviewStep rows={rows} onRows={setRows}
          onBack={() => setStep("mapping")} onClose={onClose} />
      )}
    </div>
  )
}

// ── Formulaire d'ajout ────────────────────────────────────────────────────────

function AddCandidateForm() {
  const [prenom, setPrenom]   = useState("")
  const [nom, setNom]         = useState("")
  const [groupId, setGroupId] = useState("")
  const [status, setStatus]   = useState<ProspectStatus>("pending")
  const create = useCreateGuest()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() && !prenom.trim()) return
    create.mutate(
      { firstName: prenom.trim(), lastName: nom.trim(), groupId: groupId || null, prospectStatus: status },
      { onSuccess: () => { setNom(""); setPrenom(""); setGroupId(""); setStatus("pending") } }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="w-36 space-y-1">
        <label className="text-xs text-muted-foreground">Prénom</label>
        <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Marie" />
      </div>
      <div className="w-36 space-y-1">
        <label className="text-xs text-muted-foreground">Nom</label>
        <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" />
      </div>
      <div className="w-52 space-y-1">
        <label className="text-xs text-muted-foreground">Groupe</label>
        <GroupSelect value={groupId} onChange={setGroupId} className="w-full" />
      </div>
      <div className="w-44 space-y-1">
        <label className="text-xs text-muted-foreground">Statut initial</label>
        <Select value={status} onValueChange={(v) => setStatus(v as ProspectStatus)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={create.isPending || (!nom.trim() && !prenom.trim())}>
        <Plus className="size-4" /> Ajouter
      </Button>
    </form>
  )
}

// ── Carte "En réflexion" ──────────────────────────────────────────────────────

function CandidateCard({ guest, groupNameMap }: { guest: Guest; groupNameMap: Map<string, string> }) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes]               = useState(guest.notes ?? "")
  const update = useUpdateGuest()
  const remove = useDeleteGuest()

  const groupName = guest.groupId ? (groupNameMap.get(guest.groupId) ?? null) : null

  function saveNotes() {
    setEditingNotes(false)
    const trimmed = notes.trim() || null
    if (trimmed !== guest.notes) update.mutate({ id: guest.id, patch: { notes: trimmed } })
  }

  function applyStatus(status: ProspectStatus) {
    update.mutate(
      { id: guest.id, patch: { prospectStatus: status } },
      {
        onSuccess: () => {
          if (status === "main_list") toast.success(`${guest.fullName} ajouté à la liste.`)
          else toast(`${guest.fullName} → ${STATUS_CONFIG[status].label}`)
        },
      }
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug">{guest.fullName}</p>
          {groupName && <p className="text-xs text-muted-foreground mt-0.5">{groupName}</p>}
        </div>
        <Button variant="ghost" size="icon-sm"
          className="text-muted-foreground hover:text-destructive shrink-0 -mt-0.5"
          onClick={() => remove.mutate(guest.id)}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {editingNotes ? (
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
          autoFocus rows={2} className="text-xs resize-none" placeholder="Notes…" />
      ) : (
        <button type="button" onClick={() => setEditingNotes(true)}
          className={cn(
            "w-full text-left text-xs rounded-sm leading-relaxed transition-colors",
            guest.notes
              ? "text-muted-foreground hover:text-foreground"
              : "italic text-muted-foreground/40 hover:text-muted-foreground/70"
          )}>
          {guest.notes ?? "Ajouter une note…"}
        </button>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1 border-t">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.status} variant="outline" size="sm"
            disabled={update.isPending}
            onClick={() => applyStatus(action.status)}
            className={cn("h-7 text-xs px-2.5", action.className)}>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ── Ligne dans les sections "Décidés" ─────────────────────────────────────────

function DecidedRow({ guest, groupNameMap }: { guest: Guest; groupNameMap: Map<string, string> }) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes]               = useState(guest.notes ?? "")
  const update = useUpdateGuest()
  const remove = useDeleteGuest()

  const status = guest.prospectStatus ?? "pending"

  function saveNotes() {
    setEditingNotes(false)
    const trimmed = notes.trim() || null
    if (trimmed !== guest.notes) update.mutate({ id: guest.id, patch: { notes: trimmed } })
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-sm py-2">{guest.fullName}</TableCell>
      <TableCell className="text-sm text-muted-foreground py-2">
        {guest.groupId ? (groupNameMap.get(guest.groupId) ?? "—") : "—"}
      </TableCell>
      <TableCell className="py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
              STATUS_CONFIG[status]?.color ?? "bg-muted text-muted-foreground"
            )}>
              {STATUS_CONFIG[status]?.label ?? status}
              <ChevronDown className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUS_ORDER.map((s) => (
              <DropdownMenuItem key={s}
                onClick={() => update.mutate({ id: guest.id, patch: { prospectStatus: s } })}
                className={status === s ? "font-medium" : ""}>
                {STATUS_CONFIG[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground py-2 max-w-48">
        {editingNotes ? (
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
            autoFocus rows={2} className="text-xs min-w-40 resize-none" placeholder="Notes…" />
        ) : (
          <button type="button" onClick={() => setEditingNotes(true)}
            className="w-full text-left hover:text-foreground transition-colors truncate block">
            {guest.notes ?? <span className="italic text-muted-foreground/40">—</span>}
          </button>
        )}
      </TableCell>
      <TableCell className="py-2">
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive"
          onClick={() => remove.mutate(guest.id)}>
          <Trash2 className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ── Section accordéon "Décidés" ───────────────────────────────────────────────

function DecidedSection({ status, guests, groupNameMap }: {
  status: ProspectStatus
  guests: Guest[]
  groupNameMap: Map<string, string>
}) {
  const [open, setOpen] = useState(false)
  const { label, color } = STATUS_CONFIG[status]

  return (
    <div className="rounded-lg border overflow-hidden">
      <button type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left">
        {open
          ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        }
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", color)}>{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{guests.length}</span>
      </button>
      {open && (
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((g) => <DecidedRow key={g.id} guest={g} groupNameMap={groupNameMap} />)}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ── Encart stats ─────────────────────────────────────────────────────────────

const SIDE_LABELS: Record<GuestSide, string> = { jordan: "Jordan", sarah: "Sarah", both: "Les deux" }

interface SideBreakdown { jordan: number; sarah: number; both: number; unknown: number }

function computeSideBreakdown(guests: Guest[], groupSideMap: Map<string, GuestSide | null>): SideBreakdown {
  return {
    jordan:  guests.filter((g) => g.groupId && groupSideMap.get(g.groupId) === "jordan").length,
    sarah:   guests.filter((g) => g.groupId && groupSideMap.get(g.groupId) === "sarah").length,
    both:    guests.filter((g) => g.groupId && groupSideMap.get(g.groupId) === "both").length,
    unknown: guests.filter((g) => !g.groupId || !groupSideMap.get(g.groupId)).length,
  }
}

function StatChip({
  label, value, color, breakdown,
}: {
  label: string
  value: number
  color: string
  breakdown?: SideBreakdown
}) {
  const [open, setOpen] = useState(false)

  const chip = (
    <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
      <span className="text-2xl font-bold tabular-nums leading-none">{value}</span>
      <span className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        color,
        breakdown && "cursor-pointer"
      )}>
        {label}
      </span>
    </div>
  )

  if (!breakdown) return chip

  return (
    <>
      <button type="button" className="contents" onClick={() => setOpen(true)}>
        {chip}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", color)}>{label}</span>
              <span className="font-semibold tabular-nums">{value} personne{value > 1 ? "s" : ""}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm pt-1">
            {(["jordan", "sarah", "both"] as GuestSide[]).map((side) => (
              <div key={side} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Côté {SIDE_LABELS[side]}</span>
                <span className="font-semibold tabular-nums text-base">{breakdown[side]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Non précisé</span>
              <span className="font-semibold tabular-nums text-base">{breakdown.unknown}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AtelierStats({ candidates, mainListGuests, groups: guestGroups }: { candidates: Guest[]; mainListGuests: Guest[]; groups: GuestGroup[] }) {
  const groupSideMap = new Map(guestGroups.map((g) => [g.id, g.side ?? null]))
  const buckets = {
    main_list:      mainListGuests,
    pending:        candidates.filter((g) => g.prospectStatus === "pending"),
    secondary_list: candidates.filter((g) => g.prospectStatus === "secondary_list"),
    deferred:       candidates.filter((g) => g.prospectStatus === "deferred"),
    faire_part:     candidates.filter((g) => g.prospectStatus === "faire_part"),
    not_invited:    candidates.filter((g) => g.prospectStatus === "not_invited"),
  }
  const total   = candidates.length
  const decided = total - buckets.pending.length
  const pct     = total > 0 ? Math.round((decided / total) * 100) : 0

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        <StatChip label="Liste A"        value={buckets.main_list.length}      color={STATUS_CONFIG.main_list.color}      breakdown={computeSideBreakdown(buckets.main_list,      groupSideMap)} />
        <StatChip label="En réflexion"   value={buckets.pending.length}        color={STATUS_CONFIG.pending.color}        breakdown={computeSideBreakdown(buckets.pending,        groupSideMap)} />
        <StatChip label="Liste B"        value={buckets.secondary_list.length} color={STATUS_CONFIG.secondary_list.color} breakdown={computeSideBreakdown(buckets.secondary_list, groupSideMap)} />
        <StatChip label="Liste différée" value={buckets.deferred.length}       color={STATUS_CONFIG.deferred.color}       breakdown={computeSideBreakdown(buckets.deferred,       groupSideMap)} />
        <StatChip label="Faire-part"     value={buckets.faire_part.length}     color={STATUS_CONFIG.faire_part.color}     breakdown={computeSideBreakdown(buckets.faire_part,     groupSideMap)} />
        <StatChip label="Hors liste"     value={buckets.not_invited.length}    color={STATUS_CONFIG.not_invited.color}    breakdown={computeSideBreakdown(buckets.not_invited,    groupSideMap)} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{decided} décidé{decided > 1 ? "s" : ""} sur {total}</span>
          <span className="tabular-nums font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Groupe "En réflexion" (accordéon par famille) ────────────────────────────

function PendingGroup({ groupName, guests, groupNameMap }: {
  groupName: string
  guests: Guest[]
  groupNameMap: Map<string, string>
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open
          ? <ChevronDown className="size-3.5 shrink-0" />
          : <ChevronRight className="size-3.5 shrink-0" />
        }
        {groupName}
        <span className="font-normal normal-case tracking-normal tabular-nums">{guests.length}</span>
      </button>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-5">
          {guests.map((g) => (
            <CandidateCard key={g.id} guest={g} groupNameMap={groupNameMap} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function AtelierTab() {
  const { data: allGuests = [], isLoading: guestsLoading } = useGuests()
  const { data: groups = [],    isLoading: groupsLoading  } = useGuestGroups()
  const [showAdd, setShowAdd] = useState(false)
  const [showCsv, setShowCsv] = useState(false)

  const isLoading = guestsLoading || groupsLoading

  const candidates = allGuests.filter((g) => g.prospectStatus && g.prospectStatus !== "main_list")
  const pending    = candidates.filter((g) => g.prospectStatus === "pending")

  const groupOrderMap = new Map(groups.map((g) => [g.id, g.sortOrder]))
  const groupNameMap  = new Map(groups.map((g) => [g.id, g.familyName]))

  function sortByGroup(list: Guest[]) {
    return [...list].sort((a, b) => {
      const orderA = a.groupId ? (groupOrderMap.get(a.groupId) ?? Infinity) : Infinity
      const orderB = b.groupId ? (groupOrderMap.get(b.groupId) ?? Infinity) : Infinity
      if (orderA !== orderB) return orderA - orderB
      return a.fullName.localeCompare(b.fullName, "fr", { sensitivity: "base" })
    })
  }

  // Grouper les pendants par groupe, triés par sortOrder
  const pendingGroupKeys: string[] = []
  const pendingByGroupId = new Map<string, Guest[]>()
  for (const g of sortByGroup(pending)) {
    const key = g.groupId ?? "__none__"
    if (!pendingByGroupId.has(key)) {
      pendingGroupKeys.push(key)
      pendingByGroupId.set(key, [])
    }
    pendingByGroupId.get(key)!.push(g)
  }

  const decidedByStatus = Object.fromEntries(
    DECIDED_STATUSES.map((s) => [s, sortByGroup(candidates.filter((g) => g.prospectStatus === s))])
  ) as Record<ProspectStatus, Guest[]>

  const decidedTotal = candidates.length - pending.length

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">À décider</h2>
          <p className="text-sm text-muted-foreground">
            {pending.length > 0
              ? `${pending.length} personne${pending.length > 1 ? "s" : ""} en attente de décision · ${decidedTotal} décidée${decidedTotal > 1 ? "s" : ""}`
              : decidedTotal > 0
                ? `Tout a été décidé — ${decidedTotal} personne${decidedTotal > 1 ? "s" : ""}`
                : "Aucun candidat pour l'instant"
            }
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {candidates.length > 0 && <ProspectExportDialog guests={candidates} groups={groups} />}
          {!showCsv && !showAdd && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowCsv(true)}>
                <Upload className="size-4" /> Import CSV
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="size-4" /> Ajouter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Panneaux ajout / CSV ── */}
      {showCsv && <ProspectCsvImport onClose={() => setShowCsv(false)} />}

      {showAdd && !showCsv && (
        <div className="rounded-2xl border bg-card px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Nouveau candidat</p>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowAdd(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <AddCandidateForm />
        </div>
      )}

      {/* ── Stats ── */}
      {candidates.length > 0 && (
        <AtelierStats
          candidates={candidates}
          mainListGuests={allGuests.filter((g) => !g.prospectStatus || g.prospectStatus === "main_list")}
          groups={groups}
        />
      )}

      {/* ── Section "En réflexion" ── */}
      {candidates.length === 0 ? (
        <EmptyState icon={Users} title="Aucun candidat pour l'instant"
          description="Ajoutez des personnes via le bouton ou importez un CSV." />
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-6 text-center space-y-2">
          <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
          <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">Tout a été décidé</p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">Toutes les personnes ont reçu un statut.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            En réflexion · {pending.length}
          </p>
          {pendingGroupKeys.map((key) => {
            const groupGuests = pendingByGroupId.get(key) ?? []
            const name = key === "__none__" ? "Sans groupe" : (groupNameMap.get(key) ?? key)
            return (
              <PendingGroup key={key} groupName={name} guests={groupGuests} groupNameMap={groupNameMap} />
            )
          })}
        </div>
      )}

      {/* ── Section "Décidés" ── */}
      {decidedTotal > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Décidés · {decidedTotal}
          </p>
          {DECIDED_STATUSES.map((s) => {
            const list = decidedByStatus[s]
            if (!list || list.length === 0) return null
            return <DecidedSection key={s} status={s} guests={list} groupNameMap={groupNameMap} />
          })}
        </div>
      )}

    </div>
  )
}
