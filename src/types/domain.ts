export type AppRole = "admin" | "referent" | "invite"

/**
 * Réservée à Sarah & Jordan : ce n'est pas une table d'identité générique.
 * Les référents sont des `Guest` affectés à un domaine (voir
 * `domaine_responsables`) — on fait la jointure plutôt que de dupliquer leurs
 * infos ici.
 */
export interface Person {
  id: string
  fullName: string
  nickname?: string | null
  phone?: string
  role: AppRole
  accessCode: string
  avatarUrl?: string | null
  isActive: boolean
  /** Pertinent pour les fiancés : pris en compte dans le comptage repas (page Nourriture). */
  mealChoice?: MealChoice | null
  dietaryConstraints?: string | null
  allergies?: string | null
}

/** Forme unifiée de l'identité connectée, que la personne soit un fiancé (Person) ou un invité délégué (Guest). */
export interface Identity {
  id: string
  fullName: string
  nickname?: string | null
  phone?: string | null
  role: AppRole
  accessCode: string
  avatarUrl?: string | null
  isActive: boolean
  mealChoice?: MealChoice | null
  dietaryConstraints?: string | null
  allergies?: string | null
  /** Toujours `undefined` pour un fiancé (Person) — seuls les invités (Guest) ont une page d'introduction à voir. */
  introductionSeen?: boolean
  /** Surcharge des onglets visibles — si défini, remplace les permissions du rôle. `null` = utilise les defaults du rôle. */
  allowedTabs?: string[] | null
  /** Vrai si l'invité est marqué comme responsable potentiel de domaine (`assignable`). Absent pour les fiancés. */
  assignable?: boolean
}

export interface Pole {
  id: string
  name: string
  sortOrder: number
  /** Responsable global de tout le pôle — uniquement un fiancé, voir 0042_poles_responsible_person.sql. */
  responsiblePersonId?: string | null
}

export type DomainePhase = "avant" | "installation" | "jour_j" | "desinstallation" | "apres"

export interface Domaine {
  id: string
  poleId?: string | null
  name: string
  slug: string
  description?: string | null
  phase?: DomainePhase | null
  icon?: string
  color?: string
  sortOrder: number
  solicitedMilestone?: PlanningMilestone | null
  preferredContactId?: string | null
}

/** Un responsable de domaine est soit un fiancé (`personId`), soit un invité de confiance qui en devient "référent" (`guestId`) — jamais les deux. */
export interface DomaineResponsable {
  id: string
  domaineId: string
  personId?: string | null
  guestId?: string | null
  rank: "principal" | "secondaire"
}

export type ProgressStatus = "todo" | "in_progress" | "done" | "blocked"
export type Priority = "low" | "normal" | "high" | "urgent"

export type MissionSchedulingType = "planifiee" | "en_continu"

export interface Mission {
  id: string
  domaineId?: string | null
  title: string
  description?: string | null
  prerequisites?: string | null
  status: ProgressStatus
  schedulingType?: MissionSchedulingType | null
  scheduledStartDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndDate?: string | null
  scheduledEndTime?: string | null
  sortOrder: number
  /** Responsable explicite : fiancé (personId) ou personne de confiance (guestId) — au plus un des deux. Sans affectation, hérite du domaine puis du pôle. */
  responsiblePersonId?: string | null
  responsibleGuestId?: string | null
}

export type MissionAcceptanceStatus = "pending" | "accepted" | "declined"

/** Réponse d'un invité référent/proche à une mission qui lui est confiée (voir page "Rôle"). */
export interface MissionAcceptance {
  id: string
  missionId: string
  guestId: string
  status: MissionAcceptanceStatus
  respondedAt?: string | null
}

export type ChecklistOwnerType = "mission" | "logistique_item" | "domaine"

export interface Checklist {
  id: string
  ownerType: ChecklistOwnerType
  ownerId?: string | null
  title?: string | null
  /** Délégation fiancé à fiancé d'une checklist entière — voir 0040_checklists_responsible_person.sql. */
  responsiblePersonId?: string | null
}

export type TaskSchedulingType = "en_continu" | "periode"

export interface ChecklistItem {
  id: string
  checklistId: string
  label: string
  isDone: boolean
  sortOrder: number
  priority: Priority
  status: ProgressStatus
  estimatedStartDate?: string | null
  estimatedStartTime?: string | null
  estimatedEndDate?: string | null
  estimatedEndTime?: string | null
  assigneeGuestId?: string | null
  assigneePersonId?: string | null
  taskSchedulingType?: TaskSchedulingType | null
  taskPhase?: string | null
  rosMessageId?: string | null
}

export type PlanningMilestone = "j_moins_30" | "j_moins_15" | "j_moins_7" | "j_moins_1" | "jour_j" | "j_plus_1"

export interface PlanningEvent {
  id: string
  milestone: PlanningMilestone
  title: string
  description?: string | null
  location?: string | null
  startsAt?: string | null
  endsAt?: string | null
}

export interface RunOfShowStep {
  id: string
  timeLabel: string
  startsAt?: string | null
  label: string
  durationMinutes?: number | null
  location?: string | null
  phase?: string | null
  music?: string | null
  notes?: string | null
  isHighlight: boolean
  responsibleIds: string[]
}

export type RosRecipientType = "guest" | "fiance" | "both_fiances" | "all_guests" | "other"

export type RosDeliveryMode = "micro" | "discret"

export type RosDelivererType = "guest" | "fiance" | "both_fiances"

export interface RosMessage {
  id: string
  stepId: string
  subject: string | null
  content: string
  sortOrder: number
  sentAt: string | null
  deliveryMode: RosDeliveryMode | null
  delivererType: RosDelivererType | null
  delivererGuestId: string | null
  delivererPersonId: string | null
  recipientType: RosRecipientType | null
  recipientGuestId: string | null
  recipientPersonId: string | null
  recipientLabel: string | null
  scheduledTime: string | null
  delivererStatus: MissionAcceptanceStatus | null
  notDelivered: boolean | null
}

export interface RosLaunch {
  id: string
  stepId: string
  missionId: string | null
  label: string | null
  scheduledTime: string | null
  launchedAt: string | null
  sortOrder: number
}

export interface RosDelay {
  id: string
  stepId: string | null
  delayMinutes: number
  reason: string | null
  loggedAt: string
}

export interface LogistiqueItem {
  id: string
  domaineId?: string | null
  name: string
  responsableId?: string | null
  quantity?: number | null
  unit?: string | null
  notes?: string | null
}

export type RsvpStatus = "pending" | "confirmed" | "declined" | "no_show"

export type ProspectStatus = "pending" | "main_list" | "secondary_list" | "deferred" | "faire_part" | "not_invited"

export type MealChoice = "poulet" | "poisson" | "enfant_poulet" | "enfant_poisson"

export type GuestSide = "sarah" | "jordan" | "both"

export type PaperType = "invitation" | "faire_part"

export type AccommodationType = "quartier" | "hotel" | "airbnb"

export type TravelMode = "train" | "avion" | "voiture" | "bus"

export interface GuestGroup {
  id: string
  familyName: string
  notes?: string | null
  sortOrder: number
  side?: GuestSide | null
}

export interface Guest {
  id: string
  groupId?: string | null
  firstName: string
  lastName: string
  nickname?: string | null
  /** Nom d'affichage : surnom (Prénom Nom) si surnom défini, sinon Prénom Nom. */
  fullName: string
  rsvpStatus: RsvpStatus
  dietaryConstraints?: string | null
  mealChoice?: MealChoice | null
  arrivalInfo?: string | null
  /** Jour/heure de départ de Montpellier, en complément de `arrivalInfo` — voir 0053_guests_sejour_fields.sql. */
  departureInfo?: string | null
  accommodation?: string | null
  /** Catégorie d'hébergement (le détail reste dans `accommodation`) — voir 0053_guests_sejour_fields.sql. */
  accommodationType?: AccommodationType | null
  /** Moyen de transport pour venir à Montpellier (distinct de `hasVehicle`, qui concerne la mobilité sur place) — voir 0053_guests_sejour_fields.sql. */
  travelMode?: TravelMode | null
  /** Présence à l'anniversaire de mariage des parents, vendredi soir — voir 0053_guests_sejour_fields.sql. */
  attendingParentsAnniversary: boolean
  /** Présence à la visite de Montpellier, vendredi soir — voir 0053_guests_sejour_fields.sql. */
  attendingMontpellierVisit: boolean
  hasVehicle: boolean
  needsLateTransport: boolean
  isReducedMobility: boolean
  isChild: boolean
  childAge?: number | null
  inCortege: boolean
  communicationJ30Sent: boolean
  communicationJ15Sent: boolean
  communicationJ3Sent: boolean
  ageRange?: string | null
  relationCategory?: string | null
  city?: string | null
  mealMessageSent: boolean
  rsvpRespondedAt?: string | null
  rsvpChannel?: string | null
  needsAccommodation: boolean
  guideSent: boolean
  addressChangeSent: boolean
  reservationDone: boolean
  allergies?: string | null
  drinksAlcohol?: boolean | null
  culturalOrigin?: string | null
  primaryLanguage?: string | null
  hasCeremonialRole: boolean
  likelyTraditionalAttire: boolean
  /** Personne que Jordan/Sarah pense ne pas voir venir (doute sur la présence). */
  likelyAbsent: boolean
  notes?: string | null
  /** Présent uniquement à l'écriture (code en clair saisi dans l'UI) — jamais relu depuis Supabase, voir `services/supabase/guests.ts`. */
  accessCode?: string | null
  /** Référence vers l'invité correspondant dans les fiançailles (_20260725_guests). null = nouvel invité. */
  sourceGuestId?: string | null
  /** Statut de présence aux fiançailles, dénormalisé depuis _20260725_guests. */
  sourceAttendance?: "present" | "declined" | "no-show" | null
  isActive?: boolean
  /** A déjà vu la page Introduction (mot de Sarah & Jordan) lors d'une connexion précédente. */
  introductionSeen?: boolean
  /** Proposé comme candidat responsable de domaine dans Paramètres — voir 0043_guests_assignable.sql. */
  assignable: boolean
  /** Lien symétrique vers l'autre invité d'une paire "inséparable" (ex. couple) — voir 0045_guests_paired_with.sql. Toujours mis à jour des deux côtés ensemble. */
  pairedWithId?: string | null
  /** Parent parmi les autres invités — pointe vers l'un des deux membres de la paire parentale (l'autre se déduit via pairedWithId). Voir 0072_guests_parent_id.sql. */
  parentId?: string | null
  /** Horodatage de pointage à l'accueil le jour J, null si pas encore arrivé — voir 0047_guests_checked_in_at.sql. */
  checkedInAt?: string | null
  /** Invité ajouté sur place à l'accueil, absent de la liste prévue — voir 0048_guests_unexpected.sql. */
  isUnexpected?: boolean
  /** Onglets accessibles dans l'app — surcharge les permissions du rôle si défini. Null = défauts du rôle. Voir 0073_guests_allowed_tabs.sql. */
  allowedTabs?: string[] | null
  /** Statut dans l'atelier de réflexion — main_list = invité confirmé, null/absent = invité historique traité comme main_list. */
  prospectStatus?: ProspectStatus | null
  /** Type de courrier papier à envoyer — invitation formelle ou faire-part. null = non assigné. */
  paperType?: PaperType | null
  /** Le courrier papier a été envoyé. */
  paperSent: boolean
  /** Adresse postale complète pour l'envoi papeterie. */
  postalAddress?: string | null
}

export type IdeaSource = "us" | "pinterest" | "social" | "other"
export type IdeaStatus = "to_study" | "keeping" | "discarded" | "in_progress"

export interface Idea {
  id: string
  title: string
  description?: string | null
  source: IdeaSource
  sourceDetail?: string | null
  category?: string | null
  status: IdeaStatus
  notes?: string | null
  createdAt: string
}

export type PhotoGroupStatus = "pending" | "done" | "skipped"

/** Une séance photo (ex. "Avant cérémonie", "Cocktail") — purement organisationnelle, juste un nom et un ordre, voir 0052_photo_sessions.sql. Chaque groupe de photo appartient à une séance et son `sortOrder` est scopé à celle-ci. */
export interface PhotoSession {
  id: string
  label: string
  sortOrder: number
}

/** Un groupe de photo de mariage : `label` décrit le reste du groupe attendu (ex. "Famille proche de Sarah") — voir 0046_photo_groups.sql. `requiredFianceIds` liste les fiancés requis sur la photo ; un tableau vide signifie "tous les fiancés" (comportement historique, voir 0051_photo_groups_required_fiances.sql). `sortOrder` est scopé à `sessionId`, pas global. */
export interface PhotoGroup {
  id: string
  sessionId: string
  label: string
  sortOrder: number
  isPriority: boolean
  status: PhotoGroupStatus
  notes?: string | null
  requiredFianceIds: string[]
}

/** Invité attendu sur un groupe de photo — `isPresent` est coché en direct le jour J, indépendamment du statut (faite/passée) du groupe. */
export interface PhotoGroupMember {
  id: string
  photoGroupId: string
  guestId: string
  isPresent: boolean
}

export interface Prestataire {
  id: string
  name: string
  company?: string | null
  role?: string | null
  /** Doit-il être nourri ? (ex. photographe et vidéaste de la même société, même devis). */
  needsMeal: boolean
  mealChoice?: MealChoice | null
  dietaryConstraints?: string | null
  allergies?: string | null
  notes?: string | null
}

export interface SeatingTable {
  id: string
  name: string
  capacity: number
  sortOrder: number
  posX?: number | null
  posY?: number | null
  confirmedAt?: string | null
}

/** Le siège est attribué à un invité, un fiancé ou un prestataire — jamais plusieurs à la fois. */
export interface TableAssignment {
  id: string
  tableId: string
  guestId?: string | null
  personId?: string | null
  prestataireId?: string | null
  seatNumber?: number | null
}

export interface DocumentItem {
  id: string
  title: string
  category?: string | null
  fileName: string
  filePath: string
  visibleToRoles: AppRole[]
}

export type EquipmentStatus =
  | "fourni_lieu"
  | "apporte_invite"
  | "a_louer"
  | "a_acheter"
  | "achete"
  | "a_fabriquer"
  | "a_demander_lieu"
  | "non_necessaire"

export type FabricationStatut = "non_commence" | "en_cours" | "termine"

/** Un article de la checklist matériel à louer/prévoir pour l'événement — voir 0055_equipment.sql. */
export interface EquipmentItem {
  id: string
  category: string
  label: string
  status?: EquipmentStatus | null
  /** Renseigné uniquement quand `status === "apporte_invite"`. */
  guestName?: string | null
  notes?: string | null
  sortOrder: number

  // --- Suivi "à demander au lieu" ---
  demandeAuLieuFaite?: boolean | null

  // --- Suivi "à louer" ---
  locationReserve?: boolean | null
  locationFournisseur?: string | null
  /** Datetime-local (YYYY-MM-DDTHH:mm) — prise en charge. */
  locationEntreeAt?: string | null
  locationEntreeLieu?: string | null
  /** Datetime-local (YYYY-MM-DDTHH:mm) — restitution. */
  locationSortieAt?: string | null
  locationSortieLieu?: string | null
  /** Montant de la caution, ex. "200 €". */
  locationCaution?: string | null
  locationLivraison?: boolean | null

  // --- Suivi "à acheter / acheté" ---
  achatReceptionne?: boolean | null

  // --- Suivi "à fabriquer" ---
  fabricationStatut?: FabricationStatut | null
}
