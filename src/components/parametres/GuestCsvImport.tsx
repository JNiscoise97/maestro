import { useRef, useState } from "react"
import { Upload, Trash2, Plus, FileText } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"
import { guestsService } from "@/services/guests.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// ── Types ─────────────────────────────────────────────────────────────────────

interface CsvRow {
  _id: string
  famille: string
  prenom: string
  nom: string
  surnom: string
  regime: string
}

function emptyRow(): CsvRow {
  return { _id: crypto.randomUUID(), famille: "", prenom: "", nom: "", surnom: "", regime: "" }
}

// ── Parsing CSV ───────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

const COLUMN_MAP: Record<string, keyof Omit<CsvRow, "_id">> = {
  famille: "famille", family: "famille",
  prenom: "prenom", firstname: "prenom", "first name": "prenom",
  nom: "nom", lastname: "nom", "last name": "nom",
  surnom: "surnom", nickname: "surnom",
  regime: "regime", "regime alimentaire": "regime", dietary: "regime",
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const sep = lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(sep).map(normalize)
  const fieldMap = headers.map((h) => COLUMN_MAP[h] ?? null)

  return lines.slice(1).map((line) => {
    const cells = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""))
    const row = emptyRow()
    fieldMap.forEach((field, i) => {
      if (field && cells[i]) (row as any)[field] = cells[i]
    })
    return row
  }).filter((r) => r.prenom || r.nom)
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function GuestCsvImport() {
  const [rows, setRows] = useState<CsvRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCsv(text)
      if (parsed.length === 0) {
        toast.error("Aucune ligne valide trouvée dans le fichier.")
        return
      }
      setRows(parsed)
    }
    reader.readAsText(file, "UTF-8")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith(".csv")) handleFile(file)
  }

  function updateRow(id: string, field: keyof Omit<CsvRow, "_id">, value: string) {
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, [field]: value } : r))
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r._id !== id))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  async function handleImport() {
    const valid = rows.filter((r) => r.prenom.trim() && r.nom.trim())
    if (valid.length === 0) {
      toast.error("Aucune ligne avec prénom + nom.")
      return
    }
    setIsImporting(true)
    try {
      // 1. Charger les groupes existants
      const existingGroups = await guestsService.listGroups()
      const groupByName = new Map(existingGroups.map((g) => [g.familyName.toLowerCase(), g.id]))

      // 2. Créer les groupes manquants
      const uniqueFamilles = [...new Set(valid.map((r) => r.famille.trim()).filter(Boolean))]
      for (const famille of uniqueFamilles) {
        if (!groupByName.has(famille.toLowerCase())) {
          const created = await guestsService.createGroup({
            familyName: famille,
            sortOrder: existingGroups.length + uniqueFamilles.indexOf(famille),
          })
          groupByName.set(famille.toLowerCase(), created.id)
        }
      }

      // 3. Insérer les invités en batch
      const db = supabase as any
      const inserts = valid.map((r) => ({
        first_name: r.prenom.trim(),
        last_name: r.nom.trim(),
        nickname: r.surnom.trim() || null,
        dietary_constraints: r.regime.trim() || null,
        group_id: r.famille.trim() ? (groupByName.get(r.famille.trim().toLowerCase()) ?? null) : null,
      }))
      const { error } = await db.from(tbl("guests") as any).insert(inserts)
      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ["guests"] })
      await queryClient.invalidateQueries({ queryKey: ["guest-groups"] })
      toast.success(`${valid.length} invité${valid.length > 1 ? "s" : ""} ajouté${valid.length > 1 ? "s" : ""}.`)
      setRows([])
    } catch (err) {
      toast.error("Erreur lors de l'import.")
      console.error(err)
    } finally {
      setIsImporting(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <div
          className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Déposer un fichier CSV ou cliquer pour parcourir</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Colonnes attendues : <code className="rounded bg-muted px-1">famille</code>,{" "}
              <code className="rounded bg-muted px-1">prénom</code>,{" "}
              <code className="rounded bg-muted px-1">nom</code>,{" "}
              <code className="rounded bg-muted px-1">surnom</code>,{" "}
              <code className="rounded bg-muted px-1">régime</code>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Séparateur virgule ou point-virgule, UTF-8</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Ajouter une ligne manuellement
        </Button>
      </div>
    )
  }

  const validCount = rows.filter((r) => r.prenom.trim() && r.nom.trim()).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" />
          {rows.length} ligne{rows.length > 1 ? "s" : ""} — vérifiez et corrigez avant d'importer
        </p>
        <Button variant="ghost" size="sm" onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = "" }}>
          Recommencer
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Famille</TableHead>
              <TableHead className="w-36">Prénom *</TableHead>
              <TableHead className="w-36">Nom *</TableHead>
              <TableHead className="w-32">Surnom</TableHead>
              <TableHead className="w-44">Régime alimentaire</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row._id}>
                <TableCell className="p-1">
                  <Input value={row.famille} onChange={(e) => updateRow(row._id, "famille", e.target.value)} placeholder="Dupont" className="h-8 text-sm" />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={row.prenom} onChange={(e) => updateRow(row._id, "prenom", e.target.value)} placeholder="Marie" className={`h-8 text-sm ${!row.prenom.trim() ? "border-destructive" : ""}`} />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={row.nom} onChange={(e) => updateRow(row._id, "nom", e.target.value)} placeholder="Dupont" className={`h-8 text-sm ${!row.nom.trim() ? "border-destructive" : ""}`} />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={row.surnom} onChange={(e) => updateRow(row._id, "surnom", e.target.value)} placeholder="—" className="h-8 text-sm" />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={row.regime} onChange={(e) => updateRow(row._id, "regime", e.target.value)} placeholder="végétarien…" className="h-8 text-sm" />
                </TableCell>
                <TableCell className="p-1">
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => deleteRow(row._id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Ajouter une ligne
        </Button>
        <Button
          onClick={handleImport}
          disabled={isImporting || validCount === 0}
          className="ml-auto"
        >
          {isImporting ? "Import en cours…" : `Importer ${validCount} invité${validCount > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  )
}
