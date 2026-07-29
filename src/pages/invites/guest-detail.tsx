import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Pencil, Trash2, UserX } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RsvpBadge } from "@/components/invites/RsvpBadge"
import { GuestAccessSection } from "@/components/invites/GuestAccessSection"
import { useDeleteGuest, useGuestGroups, useGuests, useUpdateGuest } from "@/hooks/queries/use-guests"
import { supabase } from "@/supabase/client"
import { MEAL_CHOICE_LABELS } from "@/lib/meal-choice"
import type { Guest, GuestGroup, GuestSide, MealChoice, RsvpStatus } from "@/types/domain"

const NONE = "__none__"
const SIDE_LABEL: Record<string, string> = { sarah: "Sarah", jordan: "Jordan" }
const RSVP_LABEL: Record<RsvpStatus, string> = { pending: "En attente", confirmed: "Confirmé", declined: "Décliné" }

function DeleteGuestButton({ guest }: { guest: Guest }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const deleteGuest = useDeleteGuest()

  async function handleConfirm() {
    await deleteGuest.mutateAsync(guest.id)
    toast.success("Invité supprimé.")
    setOpen(false)
    navigate("/invites")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="size-4" />
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Supprimer {guest.fullName} ?</DialogTitle>
          <DialogDescription>
            Cette action est définitive et retire l'invité de la liste, du plan de table et de tout domaine dont il
            serait responsable.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5 divide-y divide-border/60 rounded-2xl border border-border/60 p-4">
      <p className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge className={value ? "bg-vert-vegetal/15 text-vert-vegetal" : "bg-muted text-muted-foreground"}>
      {value ? "Oui" : "Non"}
    </Badge>
  )
}

function EditField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1 py-2">
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function triFromBool(value: boolean | null | undefined) {
  if (value === true) return "yes"
  if (value === false) return "no"
  return NONE
}

function boolFromTri(value: string): boolean | null {
  if (value === "yes") return true
  if (value === "no") return false
  return null
}

interface GuestEditFormProps {
  guest: Guest
  groups: GuestGroup[]
  allGuests: Guest[]
  onCancel: () => void
  onSaved: () => void
}

function GuestEditForm({ guest, groups, allGuests, onCancel, onSaved }: GuestEditFormProps) {
  const [firstName, setFirstName] = useState(guest.firstName)
  const [lastName, setLastName] = useState(guest.lastName)
  const [nickname, setNickname] = useState(guest.nickname ?? "")
  const [groupId, setGroupId] = useState(guest.groupId ?? NONE)
  const [side, setSide] = useState<GuestSide | typeof NONE>(guest.side ?? NONE)
  const [ageRange, setAgeRange] = useState(guest.ageRange ?? "")
  const [relationCategory, setRelationCategory] = useState(guest.relationCategory ?? "")
  const [city, setCity] = useState(guest.city ?? "")
  const [parentId, setParentId] = useState(guest.parentId ?? NONE)
  const [isChild, setIsChild] = useState(guest.isChild)
  const [childAge, setChildAge] = useState(guest.childAge != null ? String(guest.childAge) : "")
  const [isReducedMobility, setIsReducedMobility] = useState(guest.isReducedMobility)
  const [assignable, setAssignable] = useState(guest.assignable)
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(guest.rsvpStatus)
  const [rsvpRespondedAt, setRsvpRespondedAt] = useState(guest.rsvpRespondedAt ?? "")
  const [rsvpChannel, setRsvpChannel] = useState(guest.rsvpChannel ?? "")
  const [mealMessageSent, setMealMessageSent] = useState(guest.mealMessageSent)
  const [mealChoice, setMealChoice] = useState<MealChoice | typeof NONE>(guest.mealChoice ?? NONE)
  const [dietaryConstraints, setDietaryConstraints] = useState(guest.dietaryConstraints ?? "")
  const [allergies, setAllergies] = useState(guest.allergies ?? "")
  const [drinksAlcohol, setDrinksAlcohol] = useState(triFromBool(guest.drinksAlcohol))
  const [needsAccommodation, setNeedsAccommodation] = useState(guest.needsAccommodation)
  const [accommodation, setAccommodation] = useState(guest.accommodation ?? "")
  const [reservationDone, setReservationDone] = useState(guest.reservationDone)
  const [hasVehicle, setHasVehicle] = useState(guest.hasVehicle)
  const [needsLateTransport, setNeedsLateTransport] = useState(guest.needsLateTransport)
  const [arrivalInfo, setArrivalInfo] = useState(guest.arrivalInfo ?? "")
  const [guideSent, setGuideSent] = useState(guest.guideSent)
  const [addressChangeSent, setAddressChangeSent] = useState(guest.addressChangeSent)
  const [communicationJ30Sent, setCommunicationJ30Sent] = useState(guest.communicationJ30Sent)
  const [communicationJ15Sent, setCommunicationJ15Sent] = useState(guest.communicationJ15Sent)
  const [communicationJ3Sent, setCommunicationJ3Sent] = useState(guest.communicationJ3Sent)
  const [culturalOrigin, setCulturalOrigin] = useState(guest.culturalOrigin ?? "")
  const [primaryLanguage, setPrimaryLanguage] = useState(guest.primaryLanguage ?? "")
  const [inCortege, setInCortege] = useState(guest.inCortege)
  const [hasCeremonialRole, setHasCeremonialRole] = useState(guest.hasCeremonialRole)
  const [likelyTraditionalAttire, setLikelyTraditionalAttire] = useState(guest.likelyTraditionalAttire)
  const [notes, setNotes] = useState(guest.notes ?? "")

  const updateGuest = useUpdateGuest()

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) return
    await updateGuest.mutateAsync({
      id: guest.id,
      patch: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || null,
        groupId: groupId === NONE ? null : groupId,
        side: side === NONE ? null : side,
        ageRange: ageRange.trim() || null,
        relationCategory: relationCategory.trim() || null,
        city: city.trim() || null,
        parentId: parentId === NONE ? null : parentId,
        isChild,
        childAge: isChild && childAge.trim() ? Number(childAge) : null,
        isReducedMobility,
        assignable,
        rsvpStatus,
        rsvpRespondedAt: rsvpRespondedAt || null,
        rsvpChannel: rsvpChannel.trim() || null,
        mealMessageSent,
        mealChoice: mealChoice === NONE ? null : mealChoice,
        dietaryConstraints: dietaryConstraints.trim() || null,
        allergies: allergies.trim() || null,
        drinksAlcohol: boolFromTri(drinksAlcohol),
        needsAccommodation,
        accommodation: accommodation.trim() || null,
        reservationDone,
        hasVehicle,
        needsLateTransport,
        arrivalInfo: arrivalInfo.trim() || null,
        guideSent,
        addressChangeSent,
        communicationJ30Sent,
        communicationJ15Sent,
        communicationJ3Sent,
        culturalOrigin: culturalOrigin.trim() || null,
        primaryLanguage: primaryLanguage.trim() || null,
        inCortege,
        hasCeremonialRole,
        likelyTraditionalAttire,
        notes: notes.trim() || null,
      },
    })
    toast.success("Invité mis à jour.")
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          Enregistrer
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Identité">
          <EditField label="Prénom" htmlFor="edit-first-name">
            <Input id="edit-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </EditField>
          <EditField label="Nom" htmlFor="edit-last-name">
            <Input id="edit-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </EditField>
          <EditField label="Surnom" htmlFor="edit-nickname">
            <Input id="edit-nickname" placeholder="Optionnel" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </EditField>
          <EditField label="Groupe">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sans groupe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sans groupe</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.familyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="Côté">
            <Select value={side} onValueChange={(v: GuestSide | typeof NONE) => setSide(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non renseigné</SelectItem>
                <SelectItem value="sarah">{SIDE_LABEL.sarah}</SelectItem>
                <SelectItem value="jordan">{SIDE_LABEL.jordan}</SelectItem>
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="Âge" htmlFor="edit-age-range">
            <Input
              id="edit-age-range"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              placeholder="Ex. 30-40"
            />
          </EditField>
          <EditField label="Relation" htmlFor="edit-relation">
            <Input
              id="edit-relation"
              value={relationCategory}
              onChange={(e) => setRelationCategory(e.target.value)}
              placeholder="Ex. Ami, cousin..."
            />
          </EditField>
          <EditField label="Ville" htmlFor="edit-city">
            <Input id="edit-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </EditField>
          <EditField label="Parent (parmi les invités)" htmlFor="edit-parent-id">
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="edit-parent-id">
                <SelectValue placeholder="Aucun parent invité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun</SelectItem>
                {allGuests
                  .filter(g => g.id !== guest.id)
                  .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
                  .map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="Enfant" htmlFor="edit-is-child">
            <div className="flex items-center gap-2">
              <Switch id="edit-is-child" checked={isChild} onCheckedChange={setIsChild} />
              {isChild ? (
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="Âge"
                />
              ) : null}
            </div>
          </EditField>
          <EditField label="Mobilité réduite / personne âgée" htmlFor="edit-reduced-mobility">
            <Switch id="edit-reduced-mobility" checked={isReducedMobility} onCheckedChange={setIsReducedMobility} />
          </EditField>
          <EditField label="Candidat responsable de domaine" htmlFor="edit-assignable">
            <Switch id="edit-assignable" checked={assignable} onCheckedChange={setAssignable} />
          </EditField>
        </Section>

        <Section title="RSVP">
          <EditField label="Présence">
            <Select value={rsvpStatus} onValueChange={(v: RsvpStatus) => setRsvpStatus(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RSVP_LABEL) as RsvpStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {RSVP_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="Date de réponse" htmlFor="edit-rsvp-date">
            <Input
              id="edit-rsvp-date"
              type="date"
              value={rsvpRespondedAt}
              onChange={(e) => setRsvpRespondedAt(e.target.value)}
            />
          </EditField>
          <EditField label="Canal" htmlFor="edit-rsvp-channel">
            <Input
              id="edit-rsvp-channel"
              value={rsvpChannel}
              onChange={(e) => setRsvpChannel(e.target.value)}
              placeholder="Ex. SMS, téléphone..."
            />
          </EditField>
        </Section>

        <Section title="Repas">
          <EditField label="Message envoyé" htmlFor="edit-meal-message-sent">
            <Switch id="edit-meal-message-sent" checked={mealMessageSent} onCheckedChange={setMealMessageSent} />
          </EditField>
          <EditField label="Plat choisi">
            <Select value={mealChoice} onValueChange={(v: MealChoice | typeof NONE) => setMealChoice(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non renseigné</SelectItem>
                {(Object.keys(MEAL_CHOICE_LABELS) as MealChoice[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {MEAL_CHOICE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="Régime alimentaire" htmlFor="edit-dietary">
            <Input id="edit-dietary" value={dietaryConstraints} onChange={(e) => setDietaryConstraints(e.target.value)} />
          </EditField>
          <EditField label="Allergies" htmlFor="edit-allergies">
            <Input id="edit-allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
          </EditField>
          <EditField label="Alcool">
            <Select value={drinksAlcohol} onValueChange={setDrinksAlcohol}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non renseigné</SelectItem>
                <SelectItem value="yes">Oui</SelectItem>
                <SelectItem value="no">Non</SelectItem>
              </SelectContent>
            </Select>
          </EditField>
        </Section>

        <Section title="Logistique">
          <EditField label="Hébergement nécessaire" htmlFor="edit-needs-accommodation">
            <Switch
              id="edit-needs-accommodation"
              checked={needsAccommodation}
              onCheckedChange={setNeedsAccommodation}
            />
          </EditField>
          <EditField label="Hôtel / logement" htmlFor="edit-accommodation">
            <Input id="edit-accommodation" value={accommodation} onChange={(e) => setAccommodation(e.target.value)} />
          </EditField>
          <EditField label="Réservation effectuée" htmlFor="edit-reservation-done">
            <Switch id="edit-reservation-done" checked={reservationDone} onCheckedChange={setReservationDone} />
          </EditField>
          <EditField label="Véhiculé" htmlFor="edit-has-vehicle">
            <Switch id="edit-has-vehicle" checked={hasVehicle} onCheckedChange={setHasVehicle} />
          </EditField>
          <EditField label="Besoin retour tardif" htmlFor="edit-late-transport">
            <Switch id="edit-late-transport" checked={needsLateTransport} onCheckedChange={setNeedsLateTransport} />
          </EditField>
          <EditField label="Heure / jour d'arrivée" htmlFor="edit-arrival-info">
            <Input id="edit-arrival-info" value={arrivalInfo} onChange={(e) => setArrivalInfo(e.target.value)} />
          </EditField>
        </Section>

        <Section title="Communications">
          <EditField label="Guide invité envoyé" htmlFor="edit-guide-sent">
            <Switch id="edit-guide-sent" checked={guideSent} onCheckedChange={setGuideSent} />
          </EditField>
          <EditField label="Changement d'adresse envoyé" htmlFor="edit-address-change-sent">
            <Switch id="edit-address-change-sent" checked={addressChangeSent} onCheckedChange={setAddressChangeSent} />
          </EditField>
          <EditField label="Communication J-30" htmlFor="edit-comm-j30">
            <Switch id="edit-comm-j30" checked={communicationJ30Sent} onCheckedChange={setCommunicationJ30Sent} />
          </EditField>
          <EditField label="Communication J-15" htmlFor="edit-comm-j15">
            <Switch id="edit-comm-j15" checked={communicationJ15Sent} onCheckedChange={setCommunicationJ15Sent} />
          </EditField>
          <EditField label="Communication J-3" htmlFor="edit-comm-j3">
            <Switch id="edit-comm-j3" checked={communicationJ3Sent} onCheckedChange={setCommunicationJ3Sent} />
          </EditField>
        </Section>

        <Section title="Culture & cérémonie">
          <EditField label="Origine / culture" htmlFor="edit-cultural-origin">
            <Input id="edit-cultural-origin" value={culturalOrigin} onChange={(e) => setCulturalOrigin(e.target.value)} />
          </EditField>
          <EditField label="Langue principale" htmlFor="edit-primary-language">
            <Input id="edit-primary-language" value={primaryLanguage} onChange={(e) => setPrimaryLanguage(e.target.value)} />
          </EditField>
          <EditField label="Fait partie du cortège" htmlFor="edit-in-cortege">
            <Switch id="edit-in-cortege" checked={inCortege} onCheckedChange={setInCortege} />
          </EditField>
          <EditField label="Rôle cérémoniel" htmlFor="edit-has-ceremonial-role">
            <Switch id="edit-has-ceremonial-role" checked={hasCeremonialRole} onCheckedChange={setHasCeremonialRole} />
          </EditField>
          <EditField label="Tenue traditionnelle probable" htmlFor="edit-traditional-attire">
            <Switch
              id="edit-traditional-attire"
              checked={likelyTraditionalAttire}
              onCheckedChange={setLikelyTraditionalAttire}
            />
          </EditField>
        </Section>

        <Section title="Notes">
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2"
            placeholder="Notes libres sur cet invité..."
          />
        </Section>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}

function useSourceGuest(sourceGuestId: string | null | undefined) {
  return useQuery({
    queryKey: ["fiancailles-guest", sourceGuestId],
    enabled: !!sourceGuestId && !!supabase,
    queryFn: async () => {
      const db = supabase as any
      const { data, error } = await db
        .from("_20260725_guests")
        .select("rsvp_status, dietary_constraints, allergies, notes, rsvp_responded_at")
        .eq("id", sourceGuestId)
        .single()
      if (error) throw error
      return data as {
        rsvp_status: string
        dietary_constraints: string | null
        allergies: string | null
        notes: string | null
        rsvp_responded_at: string | null
      }
    },
  })
}

function FiancaillesSection({ sourceGuestId }: { sourceGuestId: string }) {
  const { data, isLoading } = useSourceGuest(sourceGuestId)
  if (isLoading) return <Section title="Fiançailles"><p className="py-2 text-sm text-muted-foreground">Chargement…</p></Section>
  if (!data) return null
  return (
    <Section title="Fiançailles (données historiques)">
      <Field label="Présence" value={<RsvpBadge status={data.rsvp_status as "pending" | "confirmed" | "declined"} />} />
      <Field label="Date de réponse" value={data.rsvp_responded_at} />
      <Field label="Régime alimentaire" value={data.dietary_constraints} />
      <Field label="Allergies" value={data.allergies} />
      <Field label="Notes fiançailles" value={data.notes} />
    </Section>
  )
}

export function GuestDetailPage() {
  const { guestId } = useParams<{ guestId: string }>()
  const navigate = useNavigate()
  const { data: guests, isLoading: guestsLoading } = useGuests()
  const { data: groups, isLoading: groupsLoading } = useGuestGroups()
  const [isEditing, setIsEditing] = useState(false)

  const isLoading = guestsLoading || groupsLoading
  const guest: Guest | undefined = guests?.find((g) => g.id === guestId)
  const group = guest?.groupId ? groups?.find((g) => g.id === guest.groupId) : null

  if (isLoading) {
    return <Skeleton className="h-96 rounded-2xl" />
  }

  if (!guest) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invites")} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Retour à la liste
        </Button>
        <EmptyState icon={UserX} title="Invité introuvable" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/invites")} className="gap-1.5">
        <ArrowLeft className="size-4" />
        Retour à la liste
      </Button>

      {isEditing ? (
        <>
          <PageHeader title={`Modifier ${guest.fullName}`} description="Mettez à jour la fiche de l'invité." />
          <GuestEditForm
            guest={guest}
            groups={groups ?? []}
            allGuests={guests ?? []}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        </>
      ) : (
        <>
          <PageHeader
            title={guest.fullName}
            description={`${group ? group.familyName : "Sans groupe"}${guest.side ? ` · Côté ${SIDE_LABEL[guest.side]}` : ""}`}
            actions={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditing(true)}>
                  <Pencil className="size-4" />
                  Modifier
                </Button>
                <DeleteGuestButton guest={guest} />
              </div>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Identité">
              <Field label="Âge" value={guest.ageRange} />
              <Field label="Relation" value={guest.relationCategory} />
              <Field label="Ville" value={guest.city} />
              <Field
                label="Parent (parmi les invités)"
                value={guest.parentId ? (guests ?? []).find(g => g.id === guest.parentId)?.fullName ?? null : null}
              />
              <Field label="Enfant" value={guest.isChild ? <YesNo value={true} /> : null} />
              {guest.isChild && guest.childAge != null ? (
                <Field label="Âge de l'enfant" value={guest.childAge} />
              ) : null}
              <Field
                label="Mobilité réduite / personne âgée"
                value={guest.isReducedMobility ? <YesNo value={true} /> : null}
              />
              <Field label="Candidat responsable de domaine" value={<YesNo value={guest.assignable} />} />
            </Section>

            <Section title="RSVP">
              <Field label="Présence" value={<RsvpBadge status={guest.rsvpStatus} />} />
              <Field label="Date de réponse" value={guest.rsvpRespondedAt} />
              <Field label="Canal" value={guest.rsvpChannel} />
            </Section>

            <Section title="Repas">
              <Field label="Message envoyé" value={<YesNo value={guest.mealMessageSent} />} />
              <Field label="Plat choisi" value={guest.mealChoice ? MEAL_CHOICE_LABELS[guest.mealChoice] : null} />
              <Field label="Régime alimentaire" value={guest.dietaryConstraints} />
              <Field label="Allergies" value={guest.allergies} />
              <Field label="Alcool" value={guest.drinksAlcohol == null ? null : <YesNo value={guest.drinksAlcohol} />} />
            </Section>

            <Section title="Logistique">
              <Field label="Hébergement nécessaire" value={<YesNo value={guest.needsAccommodation} />} />
              <Field label="Hôtel / logement" value={guest.accommodation} />
              <Field label="Réservation effectuée" value={<YesNo value={guest.reservationDone} />} />
              <Field label="Véhiculé" value={<YesNo value={guest.hasVehicle} />} />
              <Field label="Besoin retour tardif" value={<YesNo value={guest.needsLateTransport} />} />
              <Field label="Heure / jour d'arrivée" value={guest.arrivalInfo} />
            </Section>

            <Section title="Communications">
              <Field label="Guide invité envoyé" value={<YesNo value={guest.guideSent} />} />
              <Field label="Changement d'adresse envoyé" value={<YesNo value={guest.addressChangeSent} />} />
              <Field label="Communication J-30" value={<YesNo value={guest.communicationJ30Sent} />} />
              <Field label="Communication J-15" value={<YesNo value={guest.communicationJ15Sent} />} />
              <Field label="Communication J-3" value={<YesNo value={guest.communicationJ3Sent} />} />
            </Section>

            <Section title="Culture & cérémonie">
              <Field label="Origine / culture" value={guest.culturalOrigin} />
              <Field label="Langue principale" value={guest.primaryLanguage} />
              <Field label="Fait partie du cortège" value={<YesNo value={guest.inCortege} />} />
              <Field label="Rôle cérémoniel" value={<YesNo value={guest.hasCeremonialRole} />} />
              <Field label="Tenue traditionnelle probable" value={<YesNo value={guest.likelyTraditionalAttire} />} />
            </Section>

            {guest.notes ? (
              <Section title="Notes">
                <p className="py-2 text-sm text-foreground">{guest.notes}</p>
              </Section>
            ) : null}

            {guest.sourceGuestId ? (
              <FiancaillesSection sourceGuestId={guest.sourceGuestId} />
            ) : null}

            <GuestAccessSection guest={guest} />
          </div>
        </>
      )}
    </div>
  )
}
