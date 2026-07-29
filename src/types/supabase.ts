// Database type écrit à la main, en miroir des migrations dans src/supabase/migrations/.
// À remplacer par `supabase gen types typescript` une fois un vrai projet connecté
// (les noms de colonnes/tables ci-dessous doivent alors rester identiques).

type WithDefaults<Row, OptionalKeys extends keyof Row> = Omit<Row, OptionalKeys> &
  Partial<Pick<Row, OptionalKeys>>

// Relationships: [] requis par le type GenericTable de @supabase/postgrest-js
// pour que l'inférence insert/update/rpc fonctionne ; pas utilisé pour valider
// les jointures (PostgREST infère les FK depuis le vrai schéma à l'exécution).
type TableDef<Row, OptionalOnInsert extends keyof Row> = {
  Row: Row
  Insert: WithDefaults<Row, OptionalOnInsert>
  Update: Partial<WithDefaults<Row, OptionalOnInsert>>
  Relationships: []
}

export type AppRoleRow = "admin" | "fiance" | "referent" | "invite"
export type ProgressStatusRow = "todo" | "in_progress" | "done" | "blocked"
export type PriorityRow = "low" | "normal" | "high" | "urgent"
export type PlanningMilestoneRow = "j_moins_30" | "j_moins_15" | "j_moins_7" | "j_moins_1" | "jour_j" | "j_plus_1"
export type RsvpStatusRow = "pending" | "confirmed" | "declined"
export type NotificationChannelRow = "push" | "email" | "sms" | "whatsapp"
export type NotificationStatusRow = "pending" | "sent" | "failed"
export type MealChoiceRow = "poulet" | "poisson" | "enfant_poulet" | "enfant_poisson"
export type GuestSideRow = "sarah" | "jordan"
export type AccommodationTypeRow = "quartier" | "hotel" | "airbnb"
export type TravelModeRow = "train" | "avion" | "voiture" | "bus"
export type DomainePhaseRow = "avant" | "installation" | "jour_j" | "desinstallation" | "apres"
export type PhotoGroupStatusRow = "pending" | "done" | "skipped"
export type EquipmentStatusRow =
  | "fourni_lieu"
  | "apporte_invite"
  | "a_louer"
  | "a_acheter"
  | "achete"
  | "a_fabriquer"
  | "a_demander_lieu"
  | "non_necessaire"

type PoleRow = {
  id: string
  name: string
  sort_order: number
  responsible_person_id: string | null
  created_at: string
}

type DomaineRow = {
  id: string
  pole_id: string | null
  name: string
  slug: string
  description: string | null
  phase: DomainePhaseRow | null
  icon: string | null
  color: string | null
  sort_order: number
  solicited_milestone: PlanningMilestoneRow | null
  preferred_contact_id: string | null
  created_at: string
}

type DomaineResponsableRow = {
  id: string
  domaine_id: string
  person_id: string | null
  guest_id: string | null
  rank: "principal" | "secondaire"
  created_at: string
}

// Réservée à Sarah & Jordan (voir types/domain.ts) — l'enum app_role reste
// inchangé côté base (utilisé aussi par les anciens RPC), mais seule la
// valeur 'fiance' doit subsister ici une fois la migration 0025 appliquée.
type PersonRow = {
  id: string
  full_name: string
  nickname: string | null
  phone: string | null
  role: AppRoleRow
  access_code: string | null
  avatar_url: string | null
  is_active: boolean
  meal_choice: MealChoiceRow | null
  dietary_constraints: string | null
  allergies: string | null
  created_at: string
}

type AppSettingsRow = {
  id: "singleton"
  event_name: string
  event_date: string
  day_of_override: string | null
  event_type: string
  main_end: string | null
  main_time: string | null
  main_end_time: string | null
  setup_start: string | null
  setup_end: string | null
  setup_time: string | null
  setup_end_time: string | null
  cleanup_start: string | null
  cleanup_end: string | null
  cleanup_time: string | null
  cleanup_end_time: string | null
  updated_at: string
}

type MissionRow = {
  id: string
  domaine_id: string | null
  title: string
  description: string | null
  prerequisites: string | null
  status: ProgressStatusRow
  scheduling_type: string | null
  scheduled_start_date: string | null
  scheduled_start_time: string | null
  scheduled_end_date: string | null
  scheduled_end_time: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type MissionAcceptanceStatusRow = "pending" | "accepted" | "declined"

type MissionAcceptanceRow = {
  id: string
  mission_id: string
  guest_id: string
  status: MissionAcceptanceStatusRow
  responded_at: string | null
  created_at: string
}

type ChecklistRow = {
  id: string
  owner_type: "mission" | "logistique_item" | "domaine"
  owner_id: string | null
  title: string | null
  responsible_person_id: string | null
  created_at: string
}

type ChecklistItemRow = {
  id: string
  checklist_id: string
  label: string
  is_done: boolean
  sort_order: number
  priority: PriorityRow
  status: ProgressStatusRow
  estimated_start_date: string | null
  estimated_start_time: string | null
  estimated_end_date: string | null
  estimated_end_time: string | null
  done_by: string | null
  done_at: string | null
  assignee_guest_id: string | null
  task_scheduling_type: string | null
  task_phase: string | null
}

type PlanningEventRow = {
  id: string
  milestone: PlanningMilestoneRow
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
  sort_order: number
  created_at: string
}

type RunOfShowStepRow = {
  id: string
  time_label: string
  starts_at: string | null
  label: string
  duration_minutes: number | null
  location: string | null
  phase: string | null
  music: string | null
  notes: string | null
  is_highlight: boolean
  sort_order: number
  created_at: string
}

type RunOfShowResponsibleRow = {
  run_of_show_step_id: string
  person_id: string
}

type LogistiqueItemRow = {
  id: string
  domaine_id: string | null
  name: string
  responsable_id: string | null
  quantity: number | null
  unit: string | null
  notes: string | null
  created_at: string
}

type GuestGroupRow = {
  id: string
  family_name: string
  notes: string | null
  sort_order: number
}

type GuestRow = {
  id: string
  group_id: string | null
  first_name: string
  last_name: string
  rsvp_status: RsvpStatusRow
  dietary_constraints: string | null
  meal_choice: MealChoiceRow | null
  arrival_info: string | null
  departure_info: string | null
  accommodation: string | null
  accommodation_type: AccommodationTypeRow | null
  travel_mode: TravelModeRow | null
  attending_parents_anniversary: boolean
  attending_montpellier_visit: boolean
  has_vehicle: boolean
  needs_late_transport: boolean
  is_reduced_mobility: boolean
  is_child: boolean
  child_age: number | null
  in_cortege: boolean
  communication_j30_sent: boolean
  communication_j15_sent: boolean
  communication_j3_sent: boolean
  side: GuestSideRow | null
  age_range: string | null
  relation_category: string | null
  city: string | null
  meal_message_sent: boolean
  rsvp_responded_at: string | null
  rsvp_channel: string | null
  needs_accommodation: boolean
  guide_sent: boolean
  address_change_sent: boolean
  reservation_done: boolean
  allergies: string | null
  drinks_alcohol: boolean | null
  cultural_origin: string | null
  primary_language: string | null
  has_ceremonial_role: boolean
  likely_traditional_attire: boolean
  notes: string | null
  access_code: string | null
  is_active: boolean
  introduction_seen: boolean
  assignable: boolean
  paired_with_id: string | null
  parent_id: string | null
  allowed_tabs: string[] | null
  checked_in_at: string | null
  is_unexpected: boolean
  nickname: string | null
  created_at: string
}

type PhotoSessionRow = {
  id: string
  label: string
  sort_order: number
  created_at: string
}

type PhotoGroupRow = {
  id: string
  session_id: string
  label: string
  sort_order: number
  is_priority: boolean
  status: PhotoGroupStatusRow
  notes: string | null
  required_fiance_ids: string[]
  created_at: string
}

type PhotoGroupMemberRow = {
  id: string
  photo_group_id: string
  guest_id: string
  is_present: boolean
}

type PrestataireRow = {
  id: string
  name: string
  company: string | null
  role: string | null
  needs_meal: boolean
  meal_choice: MealChoiceRow | null
  dietary_constraints: string | null
  allergies: string | null
  notes: string | null
  created_at: string
}

type TableRow = {
  id: string
  name: string
  capacity: number
  sort_order: number
  pos_x: number | null
  pos_y: number | null
}

type TableAssignmentRow = {
  id: string
  table_id: string
  guest_id: string | null
  person_id: string | null
  prestataire_id: string | null
  seat_number: number | null
}

type AttachmentRow = {
  id: string
  entity_type: string | null
  entity_id: string | null
  file_path: string
  file_name: string
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
}

type DocumentRow = {
  id: string
  attachment_id: string
  title: string
  category: string | null
  visible_to_roles: AppRoleRow[]
  created_at: string
}

type CommentRow = {
  id: string
  entity_type: string
  entity_id: string
  author_id: string | null
  body: string
  created_at: string
}

type NotificationRow = {
  id: string
  recipient_id: string | null
  channel: NotificationChannelRow
  title: string
  body: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  status: NotificationStatusRow
  created_at: string
  sent_at: string | null
}

type NotificationLogRow = {
  id: string
  notification_id: string
  attempted_at: string
  result: string
  error_message: string | null
}

type RosMessageRow = {
  id: string
  step_id: string
  subject: string | null
  content: string
  sort_order: number
  sent_at: string | null
  delivery_mode: string | null
  deliverer_type: string | null
  deliverer_guest_id: string | null
  deliverer_person_id: string | null
  recipient_type: string | null
  recipient_guest_id: string | null
  recipient_person_id: string | null
  recipient_label: string | null
  scheduled_time: string | null
  deliverer_status: string | null
  not_delivered: boolean | null
}

type RosDelayRow = {
  id: string
  step_id: string | null
  delay_minutes: number
  reason: string | null
  logged_at: string
}

type RosLaunchRow = {
  id: string
  step_id: string
  mission_id: string | null
  label: string | null
  scheduled_time: string | null
  launched_at: string | null
  sort_order: number
  created_at: string
}

type EquipmentRow = {
  id: string
  category: string
  label: string
  status: EquipmentStatusRow | null
  guest_name: string | null
  notes: string | null
  sort_order: number
  created_at: string
  // Suivi à demander au lieu
  demande_au_lieu_faite: boolean | null
  // Suivi location
  location_reserve: boolean | null
  location_fournisseur: string | null
  location_entree_at: string | null
  location_entree_lieu: string | null
  location_sortie_at: string | null
  location_sortie_lieu: string | null
  location_caution: string | null
  location_livraison: boolean | null
  // Suivi achats
  achat_receptionne: boolean | null
  // Suivi fabrication
  fabrication_statut: string | null
}

// Tables préfixées par _20260725_ : ce schéma cohabite avec d'autres tables
// dans un projet Supabase partagé, le préfixe évite toute collision de noms.
export interface Database {
  public: {
    Tables: {
      _20260725_poles: TableDef<PoleRow, "id" | "sort_order" | "responsible_person_id" | "created_at">
      _20260725_domaines: TableDef<
        DomaineRow,
        | "id"
        | "pole_id"
        | "description"
        | "phase"
        | "icon"
        | "color"
        | "sort_order"
        | "solicited_milestone"
        | "preferred_contact_id"
        | "created_at"
      >
      _20260725_domaine_responsables: TableDef<
        DomaineResponsableRow,
        "id" | "person_id" | "guest_id" | "rank" | "created_at"
      >
      _20260725_people: TableDef<
        PersonRow,
        | "id"
        | "nickname"
        | "phone"
        | "access_code"
        | "avatar_url"
        | "is_active"
        | "meal_choice"
        | "dietary_constraints"
        | "allergies"
        | "created_at"
      >
      _20260725_app_settings: TableDef<AppSettingsRow, "id" | "day_of_override" | "updated_at">
      _20260725_missions: TableDef<
        MissionRow,
        | "id"
        | "domaine_id"
        | "description"
        | "prerequisites"
        | "status"
        | "scheduling_type"
        | "scheduled_start_date"
        | "scheduled_start_time"
        | "scheduled_end_date"
        | "scheduled_end_time"
        | "sort_order"
        | "created_at"
        | "updated_at"
      >
      _20260725_mission_acceptances: TableDef<
        MissionAcceptanceRow,
        "id" | "status" | "responded_at" | "created_at"
      >
      _20260725_checklists: TableDef<
        ChecklistRow,
        "id" | "owner_id" | "title" | "responsible_person_id" | "created_at"
      >
      _20260725_checklist_items: TableDef<
        ChecklistItemRow,
        | "id"
        | "is_done"
        | "sort_order"
        | "priority"
        | "status"
        | "estimated_start_date"
        | "estimated_start_time"
        | "estimated_end_date"
        | "estimated_end_time"
        | "done_by"
        | "done_at"
        | "assignee_guest_id"
        | "task_scheduling_type"
        | "task_phase"
      >
      _20260725_planning_events: TableDef<
        PlanningEventRow,
        "id" | "description" | "location" | "starts_at" | "ends_at" | "sort_order" | "created_at"
      >
      _20260725_run_of_show_steps: TableDef<
        RunOfShowStepRow,
        | "id"
        | "starts_at"
        | "duration_minutes"
        | "location"
        | "phase"
        | "music"
        | "notes"
        | "is_highlight"
        | "sort_order"
        | "created_at"
      >
      _20260725_run_of_show_responsibles: TableDef<RunOfShowResponsibleRow, never>
      _20260725_logistique_items: TableDef<
        LogistiqueItemRow,
        "id" | "domaine_id" | "responsable_id" | "quantity" | "unit" | "notes" | "created_at"
      >
      _20260725_guest_groups: TableDef<GuestGroupRow, "id" | "notes" | "sort_order">
      _20260725_guests: TableDef<
        GuestRow,
        | "id"
        | "group_id"
        | "rsvp_status"
        | "dietary_constraints"
        | "meal_choice"
        | "arrival_info"
        | "departure_info"
        | "accommodation"
        | "accommodation_type"
        | "travel_mode"
        | "attending_parents_anniversary"
        | "attending_montpellier_visit"
        | "has_vehicle"
        | "needs_late_transport"
        | "is_reduced_mobility"
        | "is_child"
        | "child_age"
        | "in_cortege"
        | "communication_j30_sent"
        | "communication_j15_sent"
        | "communication_j3_sent"
        | "side"
        | "age_range"
        | "relation_category"
        | "city"
        | "meal_message_sent"
        | "rsvp_responded_at"
        | "rsvp_channel"
        | "needs_accommodation"
        | "guide_sent"
        | "address_change_sent"
        | "reservation_done"
        | "allergies"
        | "drinks_alcohol"
        | "cultural_origin"
        | "primary_language"
        | "has_ceremonial_role"
        | "likely_traditional_attire"
        | "notes"
        | "access_code"
        | "is_active"
        | "introduction_seen"
        | "assignable"
        | "paired_with_id"
        | "parent_id"
        | "allowed_tabs"
        | "checked_in_at"
        | "is_unexpected"
        | "nickname"
        | "created_at"
      >
      _20260725_photo_sessions: TableDef<PhotoSessionRow, "id" | "sort_order" | "created_at">
      _20260725_photo_groups: TableDef<
        PhotoGroupRow,
        "id" | "sort_order" | "is_priority" | "status" | "notes" | "required_fiance_ids" | "created_at"
      >
      _20260725_photo_group_members: TableDef<PhotoGroupMemberRow, "id" | "is_present">
      _20260725_prestataires: TableDef<
        PrestataireRow,
        "id" | "company" | "role" | "needs_meal" | "meal_choice" | "dietary_constraints" | "allergies" | "notes" | "created_at"
      >
      _20260725_tables: TableDef<TableRow, "id" | "sort_order" | "pos_x" | "pos_y">
      _20260725_table_assignments: TableDef<
        TableAssignmentRow,
        "id" | "guest_id" | "person_id" | "prestataire_id" | "seat_number"
      >
      _20260725_attachments: TableDef<
        AttachmentRow,
        "id" | "entity_type" | "entity_id" | "mime_type" | "uploaded_by" | "created_at"
      >
      _20260725_documents: TableDef<DocumentRow, "id" | "category" | "visible_to_roles" | "created_at">
      _20260725_comments: TableDef<CommentRow, "id" | "author_id" | "created_at">
      _20260725_notifications: TableDef<
        NotificationRow,
        "id" | "recipient_id" | "body" | "related_entity_type" | "related_entity_id" | "status" | "created_at" | "sent_at"
      >
      _20260725_notification_log: TableDef<NotificationLogRow, "id" | "attempted_at" | "error_message">
      _20260725_equipment: TableDef<
        EquipmentRow,
        "id" | "status" | "guest_name" | "notes" | "sort_order" | "created_at"
      >
      _20260725_ros_messages: TableDef<RosMessageRow, "id" | "sort_order" | "sent_at" | "subject" | "delivery_mode" | "deliverer_type" | "deliverer_guest_id" | "deliverer_person_id" | "recipient_type" | "recipient_guest_id" | "recipient_person_id" | "recipient_label" | "scheduled_time" | "deliverer_status" | "not_delivered">
      _20260725_ros_delays: TableDef<RosDelayRow, "id" | "step_id" | "reason" | "logged_at">
      _20260725_ros_launches: TableDef<RosLaunchRow, "id" | "mission_id" | "label" | "scheduled_time" | "launched_at" | "sort_order" | "created_at">
    }
    Views: Record<string, never>
    Functions: {
      _20260725_resolve_access_code: {
        Args: { code: string }
        Returns: PersonRow[]
      }
      _20260725_create_person: {
        Args: {
          p_full_name: string
          p_role: AppRoleRow
          p_code: string
          p_phone?: string | null
          p_avatar_url?: string | null
          p_is_active?: boolean
        }
        Returns: PersonRow
      }
      _20260725_set_access_code: {
        Args: { p_person_id: string; p_code: string }
        Returns: undefined
      }
      _20260725_resolve_guest_access_code: {
        Args: { code: string }
        Returns: GuestRow[]
      }
      _20260725_set_guest_access_code: {
        Args: { p_guest_id: string; p_code: string }
        Returns: undefined
      }
      _20260725_list_access_codes: {
        Args: Record<string, never>
        Returns: { id: string; full_name: string; kind: string; access_code: string; is_active: boolean }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
