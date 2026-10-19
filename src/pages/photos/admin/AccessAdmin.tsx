import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  revokeSessions, useAccessRequests, useAdminAction, useAdminDelete, useAdminEmails, useAdminInsert,
  useAdminUpdate, useMembers,
} from "@/features/gallery/api"
import { GalleryError } from "@/features/gallery/client"
import { useFiancaillesGuests, type FiancaillesGuest } from "@/features/gallery/guests"
import type { AccessRequest } from "@/features/gallery/types"
import { useAdminNav } from "@/context/GalleryAdminNavContext"
import { memberName } from "./format"

const LINKED_LABELS: Record<string, string> = {
  admin_bootstrap: "Admin déclaré",
  auto_name_match: "Rattachement automatique",
  admin_approval: "Demande approuvée",
  admin_manual: "Ajout manuel",
}

/** Comptes et demandes d'accès (CDCF ACC-04/06, ADM-05). */
export function AccessAdmin() {
  const { data: requests = [] } = useAccessRequests()
  const { data: members = [] } = useMembers()
  const action = useAdminAction()
  const nav = useAdminNav()
  const update = useAdminUpdate("members")
  const [filter, setFilter] = useState("")
  const pending = requests.filter((r) => r.status === "pending")
  // Invités déjà liés à un compte : on ne peut pas les lier une seconde fois.
  const takenGuestIds = new Set(members.map((m) => m.guest_id).filter((id): id is string => !!id))

  async function run(body: Record<string, unknown>, ok: string) {
    try { await action.mutateAsync(body); toast.success(ok) } catch (err) {
      toast.error(err instanceof GalleryError
        ? err.code === "guest_taken" ? "Cet invité est déjà lié à un autre compte." : `Échec (${err.code}).`
        : "Action impossible.")
    }
  }

  const shown = members.filter((m) => !filter.trim()
    || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(filter.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Demandes en attente ({pending.length})</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">Aucune demande.</p> : (
            <ul className="divide-y divide-border">
              {pending.map((r) => (
                <PendingRequest key={r.id} request={r} busy={action.isPending}
                  takenGuestIds={takenGuestIds}
                  onApprove={(guestId) => run({ action: "approve_request", requestId: r.id, guestId },
                    guestId ? "Accès ouvert et lié à l'invité, la personne est prévenue." : "Accès ouvert (nouvelle personne), la personne est prévenue.")}
                  onReject={() => run({ action: "reject_request", requestId: r.id }, "Demande refusée.")} />
              ))}
            </ul>
          )}
          {requests.some((r) => r.status !== "pending") && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">Demandes traitées ({requests.filter((r) => r.status !== "pending").length})</summary>
              <ul className="mt-2 space-y-1 text-xs">
                {requests.filter((r) => r.status !== "pending").map((r) => (
                  <li key={r.id}>{r.first_name} {r.last_name} · {r.email} — {r.status === "approved" ? "autorisée" : "refusée"} le {r.decided_at ? new Date(r.decided_at).toLocaleDateString("fr-FR") : "?"}</li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      <AddMember onAdd={(b) => run({ action: "create_member", ...b }, "Compte créé : la personne peut se connecter avec son e-mail.")} busy={action.isPending} />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Comptes ({members.length})</CardTitle>
          <Input className="h-8 w-56" placeholder="Rechercher" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-1">Personne</th><th>Origine</th><th>Dernière connexion</th><th>Statut</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((m) => (
                <tr key={m.id}>
                  <td className="py-2">
                    <b>{memberName(m)}</b>{m.role === "admin" && <Badge className="ml-2">admin</Badge>}
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="text-xs">{LINKED_LABELS[m.linked_by] ?? m.linked_by}</td>
                  <td className="text-xs">{m.last_seen_at ? new Date(m.last_seen_at).toLocaleString("fr-FR") : "—"}</td>
                  <td>
                    <Badge className={m.status === "active" ? "bg-vert-vegetal/15 text-vert-vegetal" : "bg-bordeaux/10 text-bordeaux"}>
                      {m.status === "active" ? "Actif" : "Désactivé"}
                    </Badge>
                  </td>
                  <td className="space-x-1 whitespace-nowrap text-right">
                    <Button size="xs" variant="ghost" onClick={() => nav.go("journal", { membre: m.id })}>Historique</Button>
                    <Button size="xs" variant="ghost" onClick={async () => {
                      try { await revokeSessions(m.id); toast.success("Sessions révoquées.") } catch { toast.error("Révocation impossible.") }
                    }}>Révoquer les sessions</Button>
                    <Button size="xs" variant="outline" onClick={() => update.mutate({ match: { id: m.id }, patch: { status: m.status === "active" ? "disabled" : "active" } })}>
                      {m.status === "active" ? "Désactiver" : "Réactiver"}
                    </Button>
                    <Button size="xs" variant="ghost" className="text-bordeaux" onClick={() => {
                      if (window.confirm(`Supprimer le compte de ${memberName(m)} ? Ses réactions, commentaires et favoris seront effacés.`)) {
                        void run({ action: "delete_member", memberId: m.id }, "Compte supprimé.")
                      }
                    }}>Supprimer</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AdminEmails />
    </div>
  )
}

/**
 * Demande d'accès en attente : l'admin choisit l'invité de la liste correspondant (suggestion
 * pré-sélectionnée si le nom correspond) ou « nouvelle personne » (hors liste), puis autorise ou refuse.
 * Liée à un invité, la personne passe dans la colonne « Accès » du kanban de la page Album à la place
 * de cet invité ; sinon une nouvelle carte y est ajoutée.
 */
function PendingRequest({ request: r, busy, takenGuestIds, onApprove, onReject }: {
  request: AccessRequest
  busy: boolean
  takenGuestIds: Set<string>
  onApprove: (guestId: string | null) => void
  onReject: () => void
}) {
  const { data: guests = [] } = useFiancaillesGuests()
  const [choice, setChoice] = useState<string>(r.matched_guest_id ?? NEW_PERSON)
  const free = guests.filter((g) => !takenGuestIds.has(g.id) || g.id === r.matched_guest_id)
  return (
    <li className="space-y-2 py-3 text-sm">
      <div>
        <b>{r.first_name} {r.last_name}</b> · {r.email}
        <span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</span>
        {r.matched_guest_id && <Badge className="ml-2 bg-vert-vegetal/15 text-vert-vegetal">Correspond à un invité</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
          Lier à
          <select className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value={NEW_PERSON}>— Nouvelle personne (pas dans la liste des invités) —</option>
            {/* Même ordre que dans Invités : par groupe, puis par nom. */}
            {groupsOf(free).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName}{g.id === r.matched_guest_id ? "  ✓ suggéré" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Button size="sm" disabled={busy} onClick={() => onApprove(choice === NEW_PERSON ? null : choice)}>Autoriser</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>Refuser</Button>
      </div>
    </li>
  )
}

const NEW_PERSON = "__nouvelle_personne__"

/** Invités déjà triés, regroupés par groupe en gardant l'ordre d'apparition. */
function groupsOf(guests: FiancaillesGuest[]): [string, FiancaillesGuest[]][] {
  const map = new Map<string, FiancaillesGuest[]>()
  for (const g of guests) {
    const key = g.groupName ?? "Sans groupe"
    map.set(key, [...(map.get(key) ?? []), g])
  }
  return [...map.entries()]
}

function AddMember({ onAdd, busy }: { onAdd: (b: { email: string; firstName: string; lastName: string }) => void; busy: boolean }) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Ouvrir un compte manuellement</CardTitle></CardHeader>
      <CardContent>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => {
          e.preventDefault()
          onAdd({ email, firstName, lastName })
          setEmail(""); setFirstName(""); setLastName("")
        }}>
          <Input className="w-40" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input className="w-40" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input className="w-64" type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={busy || !email.trim()}>Créer</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Un compte par personne, même au sein d'un foyer (chaque action doit être attribuable).</p>
      </CardContent>
    </Card>
  )
}

function AdminEmails() {
  const { data: emails = [] } = useAdminEmails()
  const add = useAdminInsert("admin_emails")
  const remove = useAdminDelete("admin_emails")
  const [email, setEmail] = useState("")
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Adresses administrateurs</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">Une adresse listée ici devient administrateur à sa première connexion.</p>
        <ul className="space-y-1 text-sm">
          {emails.map((e) => (
            <li key={e.email} className="flex items-center justify-between">
              {e.email}
              <Button size="xs" variant="ghost" onClick={() => remove.mutate({ email: e.email })}>Retirer</Button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate({ email: email.trim().toLowerCase() }); setEmail("") }}>
          <Input type="email" required className="w-64" placeholder="adresse@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="outline">Ajouter</Button>
        </form>
      </CardContent>
    </Card>
  )
}
