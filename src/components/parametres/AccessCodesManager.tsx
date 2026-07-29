import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, ChevronRight, Copy, Eye, KeyRound, Pencil, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

import type { Capability } from "@/types/permissions"
import type { AccessCodeEntry } from "@/services/access-codes.service"
import {
  useAccessCodes,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@/hooks/queries/use-access-codes"
import { useGuests, useUpdateGuest } from "@/hooks/queries/use-guests"
import { identityService } from "@/services/identity.service"
import { useIdentity } from "@/context/IdentityContext"
import { NAV_ITEMS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ── Onglets configurables ─────────────────────────────────────────────────────

const CONFIGURABLE_TABS: { capability: Capability; label: string }[] = NAV_ITEMS
  .filter(item => {
    if (!item.capability.startsWith("view:")) return false
    if (item.visibleToRoles?.length === 1 && item.visibleToRoles[0] === "admin") return false
    return true
  })
  .filter((item, i, arr) => arr.findIndex(x => x.capability === item.capability) === i)
  .map(item => ({ capability: item.capability as Capability, label: item.label }))

const INVITE_DEFAULT: Capability[] = ["view:introduction", "view:guest-home"]

// ── Sous-composants utilitaires ───────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" onClick={handleCopy}
          className={cn("shrink-0 transition-colors", copied && "text-vert-vegetal")}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copié !" : "Copier"}</TooltipContent>
    </Tooltip>
  )
}

function DeleteButton({ onConfirm, isPending }: { onConfirm: () => void; isPending: boolean }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <div className="flex items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setConfirming(false)}>
          <X className="size-3.5" />
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={isPending}
          onClick={() => { onConfirm(); setConfirming(false) }}>
          Confirmer
        </Button>
      </div>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setConfirming(true)}>
          <Trash2 className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Révoquer l'accès</TooltipContent>
    </Tooltip>
  )
}

function GuestPicker({
  value,
  onChange,
  excludeIds,
}: {
  value: string
  onChange: (id: string) => void
  excludeIds: Set<string>
}) {
  const { data: guests } = useGuests()
  const [search, setSearch] = useState("")

  const available = useMemo(
    () =>
      (guests ?? [])
        .filter((g) => !excludeIds.has(g.id))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [guests, excludeIds]
  )

  const filtered = search.trim()
    ? available.filter((g) => g.fullName.toLowerCase().includes(search.toLowerCase()))
    : available

  const selected = available.find((g) => g.id === value)

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-vert-vegetal/40 bg-vert-vegetal/5 px-3 py-2">
        <p className="flex-1 text-sm font-medium text-foreground">{selected.fullName}</p>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => { onChange(""); setSearch("") }}>
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un invité…"
        autoComplete="off"
      />
      {filtered.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          {available.length === 0 ? "Tous les invités ont déjà un compte." : "Aucun résultat."}
        </p>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted/60"
              onClick={() => onChange(g.id)}
            >
              {g.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dialogs création / édition ────────────────────────────────────────────────

function CreateDialog({ existingGuestIds }: { existingGuestIds: Set<string> }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<"fiance" | "guest">("guest")
  const [fullName, setFullName] = useState("")
  const [guestId, setGuestId] = useState("")
  const [code, setCode] = useState("")
  const create = useCreateAccount()

  function reset() {
    setKind("guest")
    setFullName("")
    setGuestId("")
    setCode("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    const input: CreateAccountInput = { kind, accessCode: code }
    if (kind === "fiance") {
      if (!fullName.trim()) return
      input.fullName = fullName
    } else {
      if (!guestId) return
      input.guestId = guestId
    }
    await create.mutateAsync(input)
    toast.success("Compte créé.")
    reset()
    setOpen(false)
  }

  const canSubmit = code.trim() && (kind === "fiance" ? !!fullName.trim() : !!guestId)

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          Nouveau compte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Nouveau compte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Type de compte</FieldLabel>
              <Select value={kind} onValueChange={(v) => { setKind(v as "fiance" | "guest"); setGuestId(""); setFullName("") }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest">Invité existant</SelectItem>
                  <SelectItem value="fiance">Fiancé(e)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {kind === "fiance" ? (
              <Field>
                <FieldLabel htmlFor="ac-fullname">Nom complet</FieldLabel>
                <Input id="ac-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex. Sarah" required />
              </Field>
            ) : (
              <Field>
                <FieldLabel>Invité</FieldLabel>
                <GuestPicker value={guestId} onChange={setGuestId} excludeIds={existingGuestIds} />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="ac-code">Code d'accès</FieldLabel>
              <Input id="ac-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex. MARIE2026" className="font-mono uppercase" required />
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending || !canSubmit}>Créer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditDialog({ entry }: { entry: AccessCodeEntry }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(entry.accessCode)
  const [isActive, setIsActive] = useState(entry.isActive)
  const update = useUpdateAccount()

  useEffect(() => {
    if (!open) return
    setCode(entry.accessCode)
    setIsActive(entry.isActive)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const patch: UpdateAccountInput = { accessCode: code, isActive }
    await update.mutateAsync({ entry, patch })
    toast.success("Compte mis à jour.")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-xs"><Pencil className="size-3.5" /></Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Modifier</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{entry.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ed-code">Code d'accès</FieldLabel>
              <Input id="ed-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase" required />
            </Field>
            <div className="flex items-center gap-3">
              <FieldLabel className="mb-0">Compte actif</FieldLabel>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={update.isPending || !code.trim()}>Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Ligne fiancé ──────────────────────────────────────────────────────────────

function FianceRow({ entry }: { entry: AccessCodeEntry }) {
  const deleteAccount = useDeleteAccount()
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{entry.fullName}</p>
        {!entry.isActive && <p className="text-xs text-muted-foreground">Inactif</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <code className="rounded-md border border-border bg-muted/60 px-2.5 py-1 font-mono text-xs text-foreground">
          {entry.accessCode}
        </code>
        <CopyButton value={entry.accessCode} />
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <EditDialog entry={entry} />
        <DeleteButton
          isPending={deleteAccount.isPending}
          onConfirm={async () => {
            await deleteAccount.mutateAsync(entry)
            toast.success("Compte supprimé.")
          }}
        />
      </div>
    </div>
  )
}

// ── Ligne invité (expansible + onglets) ───────────────────────────────────────

function GuestRow({ entry }: { entry: AccessCodeEntry }) {
  const [open, setOpen] = useState(false)
  const { data: guests } = useGuests()
  const updateGuest = useUpdateGuest()
  const deleteAccount = useDeleteAccount()
  const { impersonate } = useIdentity()
  const navigate = useNavigate()

  const guest = guests?.find(g => g.id === entry.id)
  const isCustomized = guest?.allowedTabs != null
  const effectiveTabs = useMemo<Capability[]>(
    () => (guest?.allowedTabs ?? INVITE_DEFAULT) as Capability[],
    [guest?.allowedTabs]
  )
  const visibleCount = useMemo(
    () => effectiveTabs.filter(c => CONFIGURABLE_TABS.some(t => t.capability === c)).length,
    [effectiveTabs]
  )

  async function handleToggle(cap: Capability, val: boolean) {
    const knownCaps = new Set(CONFIGURABLE_TABS.map(t => t.capability))
    const base = effectiveTabs.filter(c => knownCaps.has(c))
    const next = val ? [...new Set([...base, cap])] : base.filter(c => c !== cap)
    await updateGuest.mutateAsync({ id: entry.id, patch: { allowedTabs: next } })
  }

  async function handleReset() {
    await updateGuest.mutateAsync({ id: entry.id, patch: { allowedTabs: null } })
    toast.success("Onglets réinitialisés.")
  }

  async function handleImpersonate() {
    const identity = await identityService.getById(entry.id)
    if (!identity) { toast.error("Impossible de charger ce compte."); return }
    impersonate(identity)
    navigate("/")
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={open ? "Réduire" : "Configurer les onglets"}
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{entry.fullName}</p>
          {!entry.isActive && <p className="text-xs text-muted-foreground">Inactif</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <code className="rounded-md border border-border bg-muted/60 px-2.5 py-1 font-mono text-xs text-foreground">
            {entry.accessCode}
          </code>
          <CopyButton value={entry.accessCode} />
        </div>

        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[10px]",
            isCustomized ? "border-dore/40 text-dore" : "text-muted-foreground"
          )}
        >
          {visibleCount} onglet{visibleCount !== 1 ? "s" : ""}
        </Badge>

        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" onClick={handleImpersonate}>
                <Eye className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voir en tant que {entry.fullName}</TooltipContent>
          </Tooltip>
          <EditDialog entry={entry} />
          <DeleteButton
            isPending={deleteAccount.isPending}
            onConfirm={async () => {
              await deleteAccount.mutateAsync(entry)
              toast.success("Accès révoqué.")
            }}
          />
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Onglets accessibles</p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {CONFIGURABLE_TABS.map(({ capability, label }) => (
              <label
                key={capability}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <Switch
                  checked={effectiveTabs.includes(capability)}
                  onCheckedChange={val => handleToggle(capability, val)}
                  className="shrink-0"
                />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
          {isCustomized && (
            <div className="flex justify-end border-t border-border pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleReset}
                disabled={updateGuest.isPending}
              >
                <RotateCcw className="size-3.5" />
                Réinitialiser aux défauts
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function AccountSection({
  title,
  entries,
  badge,
}: {
  title: string
  entries: AccessCodeEntry[]
  badge: "fiance" | "guest"
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            badge === "fiance" ? "border-dore/40 text-dore" : "border-bordeaux/40 text-bordeaux"
          )}
        >
          {entries.length}
        </Badge>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {entries.map((entry) =>
          entry.kind === "fiance"
            ? <FianceRow key={entry.id} entry={entry} />
            : <GuestRow key={entry.id} entry={entry} />
        )}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function AccessCodesManager() {
  const { data: entries, isLoading } = useAccessCodes()

  const fiances = (entries ?? []).filter((e) => e.kind === "fiance")
  const guests = (entries ?? []).filter((e) => e.kind === "guest")

  const existingGuestIds = useMemo(
    () => new Set(guests.map((e) => e.id)),
    [guests]
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-muted-foreground" />
            Comptes et accès
          </CardTitle>
          <CreateDialog existingGuestIds={existingGuestIds} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : !entries || entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun compte avec un code d'accès.</p>
        ) : (
          <div className="space-y-6">
            {fiances.length > 0 && <AccountSection title="Fiancés" entries={fiances} badge="fiance" />}
            {guests.length > 0 && <AccountSection title="Invités" entries={guests} badge="guest" />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
