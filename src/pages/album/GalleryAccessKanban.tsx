import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { ArrowLeft, ArrowRight, Copy, Search } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGalleryAuth } from "@/context/GalleryAuthContext"
import { KEYS, useAdminList, useMembers } from "@/features/gallery/api"
import { galleryClient, gt } from "@/features/gallery/client"
import { guestLabel, useFiancaillesGuests, type FiancaillesGuest } from "@/features/gallery/guests"
import type { GalleryMember } from "@/features/gallery/types"
import { cn } from "@/lib/utils"

type Invitation = { guest_id: string; sent_at: string; sent_by: string | null }
type Column = "liste" | "lien" | "acces"

type CardData =
  | { kind: "guest"; id: string; guest: FiancaillesGuest; column: Column; invitation?: Invitation; member?: GalleryMember
      /** Lien reçu via le partenaire inséparable (lien envoyé à lui, ou accès déjà ouvert). */
      viaPartner?: string }
  | { kind: "member"; id: string; member: GalleryMember; column: "acces" }

const INVITATIONS_KEY = [...KEYS.admin, "invitations"]
const ALL = "__tous__"
const NO_GROUP = "Sans groupe"

/**
 * Kanban « Qui a accès aux photos » (page Album) :
 *   1. Invités     — la liste des fiançailles, sans lien envoyé ni accès ;
 *   2. Lien envoyé — déplacé à la main (glisser-déposer ou flèche) ;
 *   3. Accès       — automatique : invité lié à un compte de la galerie (rattachement automatique
 *                    ou demande autorisée), plus les personnes hors liste ayant un accès.
 * Chaque personne n'apparaît que dans une colonne.
 */
export function GalleryAccessKanban() {
  const qc = useQueryClient()
  const { member: me } = useGalleryAuth()
  const { data: guests = [], isLoading: guestsLoading } = useFiancaillesGuests()
  const { data: members = [] } = useMembers()
  const { data: invitations = [] } = useAdminList<Invitation>("invitations", "sent_at")
  const [query, setQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState(ALL)
  const [presence, setPresence] = useState<"all" | "present" | "absent">("all")

  // Les accès s'ouvrent depuis la galerie (rattachement automatique, demandes) : rafraîchissement régulier.
  useEffect(() => {
    const timer = window.setInterval(() => void qc.invalidateQueries({ queryKey: [...KEYS.admin, "members"] }), 20_000)
    return () => window.clearInterval(timer)
  }, [qc])

  const toggleInvitation = useMutation({
    mutationFn: async ({ guestId, sent }: { guestId: string; sent: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = galleryClient as any
      const { error } = sent
        ? await db.from(gt("invitations")).upsert({ guest_id: guestId, sent_by: me?.id ?? null })
        : await db.from(gt("invitations")).delete().eq("guest_id", guestId)
      if (error) throw error
    },
    // Déplacement immédiat de la carte, puis confirmation par le serveur.
    onMutate: ({ guestId, sent }) => {
      qc.setQueryData<Invitation[]>(INVITATIONS_KEY, (prev = []) => sent
        ? [...prev.filter((i) => i.guest_id !== guestId), { guest_id: guestId, sent_at: new Date().toISOString(), sent_by: me?.id ?? null }]
        : prev.filter((i) => i.guest_id !== guestId))
    },
    onError: () => toast.error("Déplacement non enregistré."),
    onSettled: () => qc.invalidateQueries({ queryKey: INVITATIONS_KEY }),
  })

  const cards = useMemo(() => {
    const memberByGuest = new Map(members.filter((m) => m.guest_id).map((m) => [m.guest_id!, m]))
    const invitationByGuest = new Map(invitations.map((i) => [i.guest_id, i]))
    const guestById = new Map(guests.map((g) => [g.id, g]))
    const out: CardData[] = guests
      // Sortent de la liste, sauf s'ils ont déjà un accès : les « no-show » et les mineurs
      // (même règle que les communications : enfant, ou tranche d'âge qui finit avant 18 ans).
      .filter((guest) => (guest.rsvp_status !== "no_show" && !guest.minor) || memberByGuest.has(guest.id))
      .map((guest) => {
        const member = memberByGuest.get(guest.id)
        const invitation = invitationByGuest.get(guest.id)
        // Couple inséparable : le lien envoyé à l'un (ou son accès ouvert) vaut pour l'autre.
        const partner = guest.paired_with_id ? guestById.get(guest.paired_with_id) : undefined
        const partnerReached = !!partner && (invitationByGuest.has(partner.id) || memberByGuest.has(partner.id))
        const viaPartner = !member && !invitation && partnerReached ? guestLabel(partner!) : undefined
        return {
          kind: "guest", id: guest.id, guest, member, invitation, viaPartner,
          column: member ? "acces" : invitation || viaPartner ? "lien" : "liste",
        }
      })
    // Personnes hors liste ayant un accès (demande autorisée sans lien avec un invité).
    for (const m of members) {
      if (!m.guest_id && m.role === "guest") out.push({ kind: "member", id: `m:${m.id}`, member: m, column: "acces" })
    }
    return out
  }, [guests, members, invitations])

  // Groupes proposés dans le filtre, dans l'ordre d'Invités.
  const groupOptions = useMemo(() => [...new Set(guests.map((g) => g.groupName ?? NO_GROUP))], [guests])

  const q = query.trim().toLowerCase()
  const visible = cards.filter((c) => {
    if (q && !(c.kind === "guest" ? `${guestLabel(c.guest)} ${c.guest.groupName ?? ""}` : `${c.member.first_name} ${c.member.last_name} ${c.member.email}`).toLowerCase().includes(q)) return false
    // Les personnes hors liste n'ont ni groupe ni présence connue : visibles seulement sans filtre.
    if (groupFilter !== ALL && (c.kind !== "guest" || (c.guest.groupName ?? NO_GROUP) !== groupFilter)) return false
    if (presence !== "all" && (c.kind !== "guest" || c.guest.present !== (presence === "present"))) return false
    return true
  })
  const byColumn = (col: Column) => visible.filter((c) => c.column === col)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  function onDragEnd(e: DragEndEvent) {
    const card = cards.find((c) => c.id === e.active.id)
    const target = e.over?.id as Column | undefined
    if (!card || card.kind !== "guest" || !target || target === card.column) return
    if (target === "acces") { toast.info("La colonne Accès se remplit toute seule quand l'invité obtient son accès."); return }
    if (target === "liste" && card.viaPartner) {
      toast.info(`Lien reçu via ${card.viaPartner} : remettez ${card.viaPartner} dans la liste pour l'annuler.`)
      return
    }
    toggleInvitation.mutate({ guestId: card.guest.id, sent: target === "lien" })
  }

  if (guestsLoading) return <p className="text-sm text-muted-foreground">Chargement des invités…</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 pl-8 text-base sm:text-sm" placeholder="Rechercher une personne ou un groupe" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="h-8 rounded-md border border-input bg-background px-2 text-base sm:text-sm" value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)} aria-label="Filtrer par groupe">
          <option value={ALL}>Tous les groupes</option>
          {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-md border border-input text-sm" role="radiogroup" aria-label="Présence aux fiançailles">
          {([["all", "Tous"], ["present", "Présents"], ["absent", "Absents"]] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={presence === v} onClick={() => setPresence(v)}
              className={cn("px-2.5 py-1", presence === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => {
          void navigator.clipboard.writeText(`${window.location.origin}/photos`)
          toast.success("Lien de la galerie copié.")
        }}>
          <Copy className="size-3.5" /> Copier le lien de la galerie
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <KanbanColumn id="liste" title="Invités" hint="Lien pas encore envoyé" count={byColumn("liste").length} accent="border-t-muted-foreground/40">
            {byColumn("liste").map((c) => (
              <KanbanCard key={c.id} card={c} draggable
                action={c.kind === "guest" && (
                  <button type="button" title="Marquer « lien envoyé »" aria-label="Marquer lien envoyé"
                    onClick={() => toggleInvitation.mutate({ guestId: c.guest.id, sent: true })}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <ArrowRight className="size-3.5" />
                  </button>
                )} />
            ))}
          </KanbanColumn>

          <KanbanColumn id="lien" title="Lien envoyé" hint="Glissez une carte ici quand vous avez envoyé le lien" count={byColumn("lien").length} accent="border-t-dore">
            {byColumn("lien").map((c) => (
              <KanbanCard key={c.id} card={c} draggable={!(c.kind === "guest" && c.viaPartner)}
                action={c.kind === "guest" && !c.viaPartner && (
                  <button type="button" title="Remettre dans la liste" aria-label="Remettre dans la liste"
                    onClick={() => toggleInvitation.mutate({ guestId: c.guest.id, sent: false })}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <ArrowLeft className="size-3.5" />
                  </button>
                )} />
            ))}
          </KanbanColumn>

          <KanbanColumn id="acces" title="Accès" hint="Automatique : compte ouvert dans la galerie" count={byColumn("acces").length} accent="border-t-vert-vegetal" locked>
            {byColumn("acces").map((c) => <KanbanCard key={c.id} card={c} />)}
          </KanbanColumn>
        </div>
      </DndContext>
      <p className="text-xs text-muted-foreground">
        Les demandes d'accès de personnes non reconnues se traitent dans Paramètres › Partage photos › Accès :
        une fois autorisées, elles apparaissent ici dans « Accès ».
      </p>
    </div>
  )
}

function KanbanColumn({ id, title, hint, count, accent, locked = false, children }: {
  id: Column
  title: string
  hint: string
  count: number
  accent: string
  locked?: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: locked })
  return (
    <section ref={setNodeRef} aria-label={title}
      className={cn("flex max-h-[70vh] flex-col rounded-xl border border-t-4 border-border bg-muted/30 transition-colors", accent, isOver && "bg-muted/70")}>
      <header className="flex items-baseline justify-between gap-2 px-3 pb-1 pt-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </header>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">{hint}</p>
      <div className="min-h-24 flex-1 space-y-1.5 overflow-y-auto px-2 pb-2">{children}</div>
    </section>
  )
}

function KanbanCard({ card, draggable = false, action }: { card: CardData; draggable?: boolean; action?: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, disabled: !draggable })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined

  const name = card.kind === "guest" ? guestLabel(card.guest) : `${card.member.first_name} ${card.member.last_name}`.trim() || card.member.email
  const member = card.member
  let detail: ReactNode = null
  if (card.column === "lien" && card.kind === "guest" && card.viaPartner) {
    detail = `Lien reçu via ${card.viaPartner}`
  } else if (card.column === "lien" && card.kind === "guest" && card.invitation) {
    detail = `Lien envoyé le ${new Date(card.invitation.sent_at).toLocaleDateString("fr-FR")}`
  } else if (card.column === "acces" && member) {
    detail = member.last_seen_at
      ? `Connecté le ${new Date(member.last_seen_at).toLocaleDateString("fr-FR")}`
      : "Accès ouvert, pas encore connecté"
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={cn("flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-sm shadow-xs",
        draggable && "cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-70 shadow-lg")}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        {card.kind === "guest" && (
          <p className="truncate text-[11px] text-muted-foreground" title={card.guest.groupName ?? "Sans groupe"}>
            {card.guest.groupName ?? "Sans groupe"}
          </p>
        )}
        {detail && <p className="truncate text-[11px] text-muted-foreground">{detail}</p>}
        <div className="mt-0.5 flex flex-wrap gap-1">
          {card.kind === "member" && <Badge className="bg-dore/20 text-brun">Hors liste</Badge>}
          {member?.linked_by === "auto_name_match" && <Badge className="bg-vert-vegetal/15 text-vert-vegetal">Automatique</Badge>}
          {member?.status === "disabled" && <Badge className="bg-bordeaux/10 text-bordeaux">Désactivé</Badge>}
          {card.kind === "guest" && (card.guest.rsvp_status === "no_show"
            ? <Badge className="bg-muted text-muted-foreground">No-show</Badge>
            : card.guest.present
              ? <Badge className="bg-vert-vegetal/15 text-vert-vegetal">Présent</Badge>
              : <Badge className="bg-muted text-muted-foreground">Absent</Badge>)}
          {card.kind === "guest" && card.guest.is_child && <Badge className="bg-muted text-muted-foreground">Enfant</Badge>}
        </div>
      </div>
      {action && <div onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>{action}</div>}
    </div>
  )
}
