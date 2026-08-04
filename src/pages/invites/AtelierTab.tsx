import { useRef, useState } from "react"
import { Trash2, Plus, ChevronDown, Users, Upload, FileText, X, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import type { Prospect, ProspectStatus } from "@/services/supabase/prospects"
import { useProspects, useCreateProspect, useUpdateProspect, useDeleteProspect } from "@/hooks/queries/use-prospects"
import { useCreateGuestGroup, useGuestGroups } from "@/hooks/queries/use-guests"
import { useIdentity } from "@/context/IdentityContext"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"
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

// ── Constantes ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string }> = {
  pending:    { label: "Pas encore réfléchi",        color: "bg-muted text-muted-foreground" },
  no:         { label: "On ne les invitera pas",      color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  next_event: { label: "Pour un prochain événement", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  invite:     { label: "On les invite !",            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
}

const STATUS_ORDER: ProspectStatus[] = ["pending", "invite", "next_event", "no"]

type Filter = "all" | ProspectStatus

// ── GroupSelect ────────────────────────────────────────────────────────────────

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
    await createGroup.mutateAsync({
      familyName: name,
      sortOrder: (Math.max(0, ...groups.map((g) => g.sortOrder)) + 1),
    })
    onChange(name)
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
          <SelectItem key={g.id} value={g.familyName}>{g.familyName}</SelectItem>
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
interface MappedRow { _id: string; nom: string; prenom: string; groupe: string }

const NONE = "__none__"

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

function applyMapping(raw: RawCsv, mapping: Mapping): MappedRow[] {
  const idx = (col: string) => col === NONE ? -1 : raw.headers.indexOf(col)
  const nomIdx    = idx(mapping.nom)
  const prenomIdx = idx(mapping.prenom)
  const groupeIdx = idx(mapping.groupe)
  return raw.rows
    .map((cells) => ({
      _id:    crypto.randomUUID(),
      nom:    nomIdx    >= 0 ? (cells[nomIdx]    ?? "") : "",
      prenom: prenomIdx >= 0 ? (cells[prenomIdx] ?? "") : "",
      groupe: groupeIdx >= 0 ? (cells[groupeIdx] ?? "") : "",
    }))
    .filter((r) => r.nom.trim() || r.prenom.trim())
}

// ── Étape 1 : upload ───────────────────────────────────────────────────────────

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

// ── Étape 2 : mapping des colonnes ─────────────────────────────────────────────

const FIELD_LABELS: Record<keyof Mapping, string> = {
  nom:    "Nom",
  prenom: "Prénom",
  groupe: "Groupe",
}

function MappingStep({
  raw,
  mapping,
  onMapping,
  onConfirm,
  onBack,
}: {
  raw: RawCsv
  mapping: Mapping
  onMapping: (m: Mapping) => void
  onConfirm: () => void
  onBack: () => void
}) {
  const preview = raw.rows.slice(0, 3)

  function colIdx(col: string) {
    return col === NONE ? -1 : raw.headers.indexOf(col)
  }

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
                    <Select
                      value={mapping[field]}
                      onValueChange={(v) => onMapping({ ...mapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 w-52 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— ignorer —</SelectItem>
                        {raw.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
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

// ── Étape 3 : tableau éditable + import ────────────────────────────────────────

function PreviewStep({
  rows,
  onRows,
  onBack,
  onClose,
}: {
  rows: MappedRow[]
  onRows: (r: MappedRow[]) => void
  onBack: () => void
  onClose: () => void
}) {
  const [isImporting, setIsImporting] = useState(false)
  const queryClient = useQueryClient()
  const { realPerson } = useIdentity()

  function updateRow(id: string, field: keyof Omit<MappedRow, "_id">, value: string) {
    onRows(rows.map((r) => r._id === id ? { ...r, [field]: value } : r))
  }

  const validCount = rows.filter((r) => r.nom.trim() || r.prenom.trim()).length

  async function handleImport() {
    const valid = rows.filter((r) => r.nom.trim() || r.prenom.trim())
    if (!valid.length) { toast.error("Aucune ligne avec un nom ou prénom."); return }
    setIsImporting(true)
    try {
      const inserts = valid.map((r) => ({
        full_name:     [r.prenom.trim(), r.nom.trim()].filter(Boolean).join(" "),
        group_name:    r.groupe.trim() || null,
        notes:         null,
        added_by_name: realPerson?.fullName ?? null,
      }))
      const { error } = await (supabase as any).from(tbl("prospect_guests") as any).insert(inserts)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ["prospects"] })
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
                  <GroupSelect
                    value={row.groupe}
                    onChange={(v) => updateRow(row._id, "groupe", v)}
                  />
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
        <Button variant="outline" size="sm" onClick={() => onRows([...rows, { _id: crypto.randomUUID(), nom: "", prenom: "", groupe: "" }])}>
          <Plus className="size-4" /> Ajouter une ligne
        </Button>
        <Button onClick={handleImport} disabled={isImporting || validCount === 0} className="ml-auto">
          {isImporting ? "Import…" : `Importer ${validCount} candidat${validCount > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

type CsvStep = "upload" | "mapping" | "preview"

function ProspectCsvImport({ onClose }: { onClose: () => void }) {
  const [step, setStep]       = useState<CsvStep>("upload")
  const [raw, setRaw]         = useState<RawCsv | null>(null)
  const [mapping, setMapping] = useState<Mapping>({ nom: NONE, prenom: NONE, groupe: NONE })
  const [rows, setRows]       = useState<MappedRow[]>([])

  function handleParsed(r: RawCsv) {
    setRaw(r)
    setMapping(guessMapping(r.headers))
    setStep("mapping")
  }

  function handleConfirmMapping() {
    if (!raw) return
    const mapped = applyMapping(raw, mapping)
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
        <MappingStep
          raw={raw}
          mapping={mapping}
          onMapping={setMapping}
          onConfirm={handleConfirmMapping}
          onBack={() => { setRaw(null); setStep("upload") }}
        />
      )}

      {step === "preview" && (
        <PreviewStep
          rows={rows}
          onRows={setRows}
          onBack={() => setStep("mapping")}
          onClose={onClose}
        />
      )}
    </div>
  )
}

// ── Formulaire d'ajout rapide ──────────────────────────────────────────────────

function AddProspectForm() {
  const [nom, setNom]       = useState("")
  const [prenom, setPrenom] = useState("")
  const [groupe, setGroupe] = useState("")
  const create = useCreateProspect()
  const { realPerson } = useIdentity()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() && !prenom.trim()) return
    const fullName = [prenom.trim(), nom.trim()].filter(Boolean).join(" ")
    create.mutate(
      { fullName, groupName: groupe || null, addedByName: realPerson?.fullName ?? null },
      { onSuccess: () => { setNom(""); setPrenom(""); setGroupe("") } }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card px-4 py-3">
      <div className="w-36 space-y-1">
        <label className="text-xs text-muted-foreground">Nom</label>
        <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" />
      </div>
      <div className="w-36 space-y-1">
        <label className="text-xs text-muted-foreground">Prénom</label>
        <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Marie" />
      </div>
      <div className="w-52 space-y-1">
        <label className="text-xs text-muted-foreground">Groupe</label>
        <GroupSelect
          value={groupe}
          onChange={setGroupe}
          className="w-full"
        />
      </div>
      <Button type="submit" size="sm" disabled={create.isPending || (!nom.trim() && !prenom.trim())}>
        <Plus className="size-4" /> Ajouter
      </Button>
    </form>
  )
}

// ── Carte prospect ─────────────────────────────────────────────────────────────

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes]               = useState(prospect.notes ?? "")
  const update = useUpdateProspect()
  const remove = useDeleteProspect()

  function saveNotes() {
    setEditingNotes(false)
    const trimmed = notes.trim() || null
    if (trimmed !== prospect.notes) update.mutate({ id: prospect.id, patch: { notes: trimmed } })
  }

  return (
    <div className="rounded-2xl border bg-card px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug">{prospect.fullName}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0">
            {prospect.groupName && <p className="text-xs text-muted-foreground">{prospect.groupName}</p>}
            {prospect.addedByName && (
              <p className="text-xs text-muted-foreground/60">ajouté par {prospect.addedByName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
                STATUS_CONFIG[prospect.status].color
              )}>
                {STATUS_CONFIG[prospect.status].label}
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_ORDER.map((s) => (
                <DropdownMenuItem key={s} onClick={() => update.mutate({ id: prospect.id, patch: { status: s } })}
                  className={prospect.status === s ? "font-medium" : ""}>
                  {STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive"
            onClick={() => remove.mutate(prospect.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {editingNotes ? (
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
          autoFocus rows={2} className="text-xs" placeholder="Notes…" />
      ) : (
        <button type="button" onClick={() => setEditingNotes(true)}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors">
          {prospect.notes ?? <span className="italic">Ajouter une note…</span>}
        </button>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<Filter, string> = {
  all:        "Tous",
  pending:    "À décider",
  invite:     "Invités",
  next_event: "Prochain événement",
  no:         "Écartés",
}

export function AtelierTab() {
  const { data: prospects = [], isLoading } = useProspects()
  const [filter, setFilter]     = useState<Filter>("all")
  const [showCsv, setShowCsv]   = useState(false)

  const filtered = filter === "all" ? prospects : prospects.filter((p) => p.status === filter)

  const counts: Record<Filter, number> = {
    all:        prospects.length,
    pending:    prospects.filter((p) => p.status === "pending").length,
    invite:     prospects.filter((p) => p.status === "invite").length,
    next_event: prospects.filter((p) => p.status === "next_event").length,
    no:         prospects.filter((p) => p.status === "no").length,
  }

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Atelier invités</h2>
          <p className="text-sm text-muted-foreground">Liste de réflexion — les candidats qu'on n'a pas encore tranchés.</p>
        </div>
        {!showCsv && (
          <Button variant="outline" size="sm" onClick={() => setShowCsv(true)}>
            <Upload className="size-4" /> Import CSV
          </Button>
        )}
      </div>

      {showCsv ? (
        <ProspectCsvImport onClose={() => setShowCsv(false)} />
      ) : (
        <AddProspectForm />
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}>
            {FILTER_LABELS[f]}
            {counts[f] > 0 && <span className="ml-1.5 tabular-nums">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users}
          title={filter === "all" ? "Aucun candidat pour l'instant" : "Aucun candidat dans cette catégorie"}
          description={filter === "all" ? "Ajoutez des personnes via le formulaire ou importez un CSV." : undefined}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((p) => <ProspectCard key={p.id} prospect={p} />)}
        </div>
      )}
    </div>
  )
}
