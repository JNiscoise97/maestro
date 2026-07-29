-- Schéma complet pour le Mariage S&J (25-29 juin 2027).
-- Même structure que les tables _20260725_, préfixe _20260629_.
-- À exécuter dans le même projet Supabase que les fiançailles.
-- Migration 0089 copie les invités depuis les fiançailles.

-- ── Identités & rôles ─────────────────────────────────────────────────────────

create table _20260629_role_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  icon       text,
  color      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table _20260629_people (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  nickname              text,
  phone                 text,
  role                  app_role not null,
  access_code           text unique,
  referent_category_id  uuid references _20260629_role_categories(id) on delete set null,
  partner_referent_id   uuid references _20260629_people(id) on delete set null,
  avatar_url            text,
  is_active             boolean not null default true,
  meal_choice           text,
  dietary_constraints   text,
  allergies             text,
  created_at            timestamptz not null default now()
);

create table _20260629_app_settings (
  id             text primary key default 'singleton' check (id = 'singleton'),
  event_name     text not null default 'Mariage de Sarah & Jordan',
  event_date     date not null,
  day_of_override text,
  updated_at     timestamptz not null default now()
);

insert into _20260629_app_settings (event_date) values ('2027-06-27');

-- ── Invités ───────────────────────────────────────────────────────────────────

create table _20260629_guest_groups (
  id          uuid primary key default gen_random_uuid(),
  family_name text not null,
  notes       text,
  sort_order  integer not null default 0
);

create table _20260629_guests (
  id                           uuid primary key default gen_random_uuid(),
  group_id                     uuid references _20260629_guest_groups(id) on delete set null,
  first_name                   text not null,
  last_name                    text not null,
  nickname                     text,
  rsvp_status                  text not null default 'pending',
  dietary_constraints          text,
  meal_choice                  text,
  arrival_info                 text,
  departure_info               text,
  accommodation                text,
  accommodation_type           text,
  travel_mode                  text,
  attending_parents_anniversary boolean not null default false,
  attending_montpellier_visit  boolean not null default false,
  has_vehicle                  boolean not null default false,
  needs_late_transport         boolean not null default false,
  is_reduced_mobility          boolean not null default false,
  is_child                     boolean not null default false,
  child_age                    integer,
  in_cortege                   boolean not null default false,
  communication_j30_sent       boolean not null default false,
  communication_j15_sent       boolean not null default false,
  communication_j3_sent        boolean not null default false,
  side                         text,
  age_range                    text,
  relation_category            text,
  city                         text,
  meal_message_sent            boolean not null default false,
  rsvp_responded_at            timestamptz,
  rsvp_channel                 text,
  needs_accommodation          boolean not null default false,
  guide_sent                   boolean not null default false,
  address_change_sent          boolean not null default false,
  reservation_done             boolean not null default false,
  allergies                    text,
  drinks_alcohol               boolean,
  cultural_origin              text,
  primary_language             text,
  has_ceremonial_role          boolean not null default false,
  likely_traditional_attire    boolean not null default false,
  notes                        text,
  access_code                  text unique,
  is_active                    boolean not null default true,
  introduction_seen            boolean not null default false,
  assignable                   boolean not null default false,
  paired_with_id               uuid references _20260629_guests(id) on delete set null,
  parent_id                    uuid references _20260629_guests(id) on delete set null,
  checked_in_at                timestamptz,
  is_unexpected                boolean not null default false,
  allowed_tabs                 text[],
  created_at                   timestamptz not null default now()
);

-- ── Organisation ──────────────────────────────────────────────────────────────

create table _20260629_poles (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  sort_order            integer not null default 0,
  responsible_person_id uuid references _20260629_people(id) on delete set null
);

create table _20260629_domaines (
  id                   uuid primary key default gen_random_uuid(),
  pole_id              uuid references _20260629_poles(id) on delete set null,
  name                 text not null,
  slug                 text not null,
  description          text,
  phase                text,
  icon                 text,
  color                text,
  sort_order           integer not null default 0,
  solicited_milestone  text,
  preferred_contact_id uuid references _20260629_people(id) on delete set null
);

create table _20260629_domaine_responsables (
  id         uuid primary key default gen_random_uuid(),
  domaine_id uuid not null references _20260629_domaines(id) on delete cascade,
  person_id  uuid references _20260629_people(id) on delete cascade,
  guest_id   uuid references _20260629_guests(id) on delete cascade,
  rank       text not null default 'principal',
  constraint chk_exactly_one_responsable check (
    (person_id is null) <> (guest_id is null)
  )
);

-- ── Missions ──────────────────────────────────────────────────────────────────

create table _20260629_missions (
  id                     uuid primary key default gen_random_uuid(),
  domaine_id             uuid references _20260629_domaines(id) on delete set null,
  title                  text not null,
  description            text,
  prerequisites          text,
  status                 text not null default 'todo',
  scheduling_type        text,
  scheduled_start_date   date,
  scheduled_start_time   time,
  scheduled_end_date     date,
  scheduled_end_time     time,
  sort_order             integer not null default 0,
  responsible_person_id  uuid references _20260629_people(id) on delete set null,
  responsible_guest_id   uuid references _20260629_guests(id) on delete set null
);

create table _20260629_mission_acceptances (
  id           uuid primary key default gen_random_uuid(),
  mission_id   uuid not null references _20260629_missions(id) on delete cascade,
  guest_id     uuid not null references _20260629_guests(id) on delete cascade,
  status       text not null default 'pending',
  responded_at timestamptz,
  unique (mission_id, guest_id)
);

-- ── Checklists ────────────────────────────────────────────────────────────────

create table _20260629_checklists (
  id                    uuid primary key default gen_random_uuid(),
  owner_type            text not null,
  owner_id              uuid,
  title                 text,
  responsible_person_id uuid references _20260629_people(id) on delete set null
);

create table _20260629_checklist_items (
  id                    uuid primary key default gen_random_uuid(),
  checklist_id          uuid not null references _20260629_checklists(id) on delete cascade,
  label                 text not null,
  is_done               boolean not null default false,
  sort_order            integer not null default 0,
  priority              text not null default 'normal',
  status                text not null default 'todo',
  estimated_start_date  date,
  estimated_start_time  time,
  estimated_end_date    date,
  estimated_end_time    time,
  assignee_guest_id     uuid references _20260629_guests(id) on delete set null,
  assignee_person_id    uuid references _20260629_people(id) on delete set null,
  task_scheduling_type  text,
  task_phase            text,
  ros_message_id        uuid,
  message               text
);

-- ── Planning ──────────────────────────────────────────────────────────────────

create table _20260629_planning_events (
  id          uuid primary key default gen_random_uuid(),
  milestone   text not null,
  title       text not null,
  description text,
  location    text,
  starts_at   timestamptz,
  ends_at     timestamptz
);

-- ── Déroulé (Run of Show) ─────────────────────────────────────────────────────

create table _20260629_run_of_show_steps (
  id               uuid primary key default gen_random_uuid(),
  time_label       text not null,
  starts_at        time,
  label            text not null,
  duration_minutes integer,
  location         text,
  phase            text,
  music            text,
  notes            text,
  is_highlight     boolean not null default false
);

create table _20260629_run_of_show_responsibles (
  run_of_show_step_id uuid not null references _20260629_run_of_show_steps(id) on delete cascade,
  person_id           uuid not null references _20260629_people(id) on delete cascade,
  primary key (run_of_show_step_id, person_id)
);

create table _20260629_ros_messages (
  id                 uuid primary key default gen_random_uuid(),
  step_id            uuid not null references _20260629_run_of_show_steps(id) on delete cascade,
  subject            text,
  content            text not null,
  sort_order         integer not null default 0,
  sent_at            timestamptz,
  delivery_mode      text,
  deliverer_type     text,
  deliverer_guest_id uuid references _20260629_guests(id) on delete set null,
  deliverer_person_id uuid references _20260629_people(id) on delete set null,
  recipient_type     text,
  recipient_guest_id uuid references _20260629_guests(id) on delete set null,
  recipient_person_id uuid references _20260629_people(id) on delete set null,
  recipient_label    text,
  scheduled_time     time,
  deliverer_status   text,
  not_delivered      boolean
);

create table _20260629_ros_delays (
  id             uuid primary key default gen_random_uuid(),
  step_id        uuid references _20260629_run_of_show_steps(id) on delete set null,
  delay_minutes  integer not null,
  reason         text,
  logged_at      timestamptz not null default now()
);

create table _20260629_ros_launches (
  id             uuid primary key default gen_random_uuid(),
  step_id        uuid references _20260629_run_of_show_steps(id) on delete set null,
  mission_id     uuid references _20260629_missions(id) on delete set null,
  label          text,
  scheduled_time time,
  launched_at    timestamptz,
  sort_order     integer not null default 0
);

-- ── Logistique & matériel ─────────────────────────────────────────────────────

create table _20260629_logistique_items (
  id            uuid primary key default gen_random_uuid(),
  domaine_id    uuid references _20260629_domaines(id) on delete set null,
  name          text not null,
  responsable_id uuid references _20260629_people(id) on delete set null,
  quantity      integer,
  unit          text,
  notes         text
);

create table _20260629_equipment (
  id                      uuid primary key default gen_random_uuid(),
  category                text not null,
  label                   text not null,
  status                  text,
  guest_name              text,
  notes                   text,
  sort_order              integer not null default 0,
  demande_au_lieu_faite   boolean,
  location_reserve        boolean,
  location_fournisseur    text,
  location_entree_at      text,
  location_entree_lieu    text,
  location_sortie_at      text,
  location_sortie_lieu    text,
  location_caution        text,
  location_livraison      boolean,
  achat_receptionne       boolean,
  fabrication_statut      text
);

create table _20260629_prestataires (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  company             text,
  role                text,
  needs_meal          boolean not null default false,
  meal_choice         text,
  dietary_constraints text,
  allergies           text,
  notes               text
);

-- ── Documents ─────────────────────────────────────────────────────────────────

create table _20260629_documents (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  category         text,
  file_name        text not null,
  file_path        text not null,
  visible_to_roles text[] not null default '{}'
);

-- ── Plan de table ─────────────────────────────────────────────────────────────

create table _20260629_tables (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  capacity     integer not null default 8,
  sort_order   integer not null default 0,
  pos_x        float,
  pos_y        float,
  confirmed_at timestamptz
);

create table _20260629_table_assignments (
  id              uuid primary key default gen_random_uuid(),
  table_id        uuid not null references _20260629_tables(id) on delete cascade,
  guest_id        uuid references _20260629_guests(id) on delete cascade,
  person_id       uuid references _20260629_people(id) on delete cascade,
  prestataire_id  uuid references _20260629_prestataires(id) on delete cascade,
  seat_number     integer,
  constraint chk_one_occupant check (
    num_nonnulls(guest_id, person_id, prestataire_id) = 1
  )
);

-- ── Photos de groupe ──────────────────────────────────────────────────────────

create table _20260629_photo_sessions (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  sort_order integer not null default 0
);

create table _20260629_photo_groups (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references _20260629_photo_sessions(id) on delete cascade,
  label               text not null,
  sort_order          integer not null default 0,
  is_priority         boolean not null default false,
  status              text not null default 'pending',
  notes               text,
  required_fiance_ids jsonb not null default '[]'
);

create table _20260629_photo_group_members (
  id             uuid primary key default gen_random_uuid(),
  photo_group_id uuid not null references _20260629_photo_groups(id) on delete cascade,
  guest_id       uuid not null references _20260629_guests(id) on delete cascade,
  is_present     boolean not null default true,
  unique (photo_group_id, guest_id)
);

-- ── Cadeaux ───────────────────────────────────────────────────────────────────

create table _20260629_gifts (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  amount       numeric(10,2),
  thankyou_sent boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now()
);

create table _20260629_gift_guests (
  gift_id  uuid not null references _20260629_gifts(id) on delete cascade,
  guest_id uuid not null references _20260629_guests(id) on delete cascade,
  primary key (gift_id, guest_id)
);

-- ── RLS (permissif — même politique que les fiançailles) ─────────────────────

alter table _20260629_role_categories       enable row level security;
alter table _20260629_people                enable row level security;
alter table _20260629_app_settings          enable row level security;
alter table _20260629_guest_groups          enable row level security;
alter table _20260629_guests                enable row level security;
alter table _20260629_poles                 enable row level security;
alter table _20260629_domaines              enable row level security;
alter table _20260629_domaine_responsables  enable row level security;
alter table _20260629_missions              enable row level security;
alter table _20260629_mission_acceptances   enable row level security;
alter table _20260629_checklists            enable row level security;
alter table _20260629_checklist_items       enable row level security;
alter table _20260629_planning_events       enable row level security;
alter table _20260629_run_of_show_steps     enable row level security;
alter table _20260629_run_of_show_responsibles enable row level security;
alter table _20260629_ros_messages          enable row level security;
alter table _20260629_ros_delays            enable row level security;
alter table _20260629_ros_launches          enable row level security;
alter table _20260629_logistique_items      enable row level security;
alter table _20260629_equipment             enable row level security;
alter table _20260629_prestataires          enable row level security;
alter table _20260629_documents             enable row level security;
alter table _20260629_tables                enable row level security;
alter table _20260629_table_assignments     enable row level security;
alter table _20260629_photo_sessions        enable row level security;
alter table _20260629_photo_groups          enable row level security;
alter table _20260629_photo_group_members   enable row level security;
alter table _20260629_gifts                 enable row level security;
alter table _20260629_gift_guests           enable row level security;

create policy "full access" on _20260629_role_categories       for all using (true);
create policy "full access" on _20260629_people                for all using (true);
create policy "full access" on _20260629_app_settings          for all using (true);
create policy "full access" on _20260629_guest_groups          for all using (true);
create policy "full access" on _20260629_guests                for all using (true);
create policy "full access" on _20260629_poles                 for all using (true);
create policy "full access" on _20260629_domaines              for all using (true);
create policy "full access" on _20260629_domaine_responsables  for all using (true);
create policy "full access" on _20260629_missions              for all using (true);
create policy "full access" on _20260629_mission_acceptances   for all using (true);
create policy "full access" on _20260629_checklists            for all using (true);
create policy "full access" on _20260629_checklist_items       for all using (true);
create policy "full access" on _20260629_planning_events       for all using (true);
create policy "full access" on _20260629_run_of_show_steps     for all using (true);
create policy "full access" on _20260629_run_of_show_responsibles for all using (true);
create policy "full access" on _20260629_ros_messages          for all using (true);
create policy "full access" on _20260629_ros_delays            for all using (true);
create policy "full access" on _20260629_ros_launches          for all using (true);
create policy "full access" on _20260629_logistique_items      for all using (true);
create policy "full access" on _20260629_equipment             for all using (true);
create policy "full access" on _20260629_prestataires          for all using (true);
create policy "full access" on _20260629_documents             for all using (true);
create policy "full access" on _20260629_tables                for all using (true);
create policy "full access" on _20260629_table_assignments     for all using (true);
create policy "full access" on _20260629_photo_sessions        for all using (true);
create policy "full access" on _20260629_photo_groups          for all using (true);
create policy "full access" on _20260629_photo_group_members   for all using (true);
create policy "full access" on _20260629_gifts                 for all using (true);
create policy "full access" on _20260629_gift_guests           for all using (true);

-- ── Codes d'accès : masquer la colonne en lecture directe ─────────────────────

revoke select (access_code) on _20260629_people from anon, authenticated;
revoke select (access_code) on _20260629_guests from anon, authenticated;

-- ── RPCs d'authentification ───────────────────────────────────────────────────

create or replace function _20260629_resolve_access_code(code text)
returns setof _20260629_people
language sql
security definer
set search_path = public, extensions
as $$
  select * from _20260629_people where access_code = upper(code) limit 1;
$$;

create or replace function _20260629_set_access_code(p_person_id uuid, p_code text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update _20260629_people set access_code = upper(p_code) where id = p_person_id;
$$;

create or replace function _20260629_create_person(
  p_full_name text,
  p_role app_role,
  p_code text,
  p_phone text default null,
  p_avatar_url text default null,
  p_is_active boolean default true
)
returns _20260629_people
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_row _20260629_people;
begin
  insert into _20260629_people (full_name, role, access_code, phone, avatar_url, is_active)
  values (p_full_name, p_role, upper(p_code), p_phone, p_avatar_url, p_is_active)
  returning * into new_row;
  return new_row;
end;
$$;

create or replace function _20260629_resolve_guest_access_code(code text)
returns setof _20260629_guests
language sql
security definer
set search_path = public, extensions
as $$
  select * from _20260629_guests where is_active and access_code = upper(code) limit 1;
$$;

create or replace function _20260629_set_guest_access_code(p_guest_id uuid, p_code text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update _20260629_guests set access_code = upper(p_code) where id = p_guest_id;
$$;
