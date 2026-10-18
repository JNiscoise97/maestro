-- 0150_galerie_privee_socle.sql
-- Galerie privée des photos de fiançailles (CDCF v1.0 du 18/10/2026) — socle de données.
--
-- ⚠ Exception volontaire à la règle « anon_all » du reste de l'appli : ici AUCUN accès
-- anonyme. Toutes les tables exigent un compte Supabase Auth (code par e-mail) et les
-- contrôles sont faits côté serveur (RLS, fonctions security definer, edge functions).
-- Les comptes et demandes d'accès sont créés par l'edge function `gallery-identify`
-- (clé service), jamais directement par le navigateur.
--
-- Contenu :
--   comptes, demandes d'accès, engagement de confidentialité, réglages, albums, photos
--   (identifiant permanent SJ-0001), réactions, commentaires, favoris, signalements,
--   téléchargements, journal d'activité, notifications admin, dossier de stockage privé.

begin;

-- ── Comptes ──────────────────────────────────────────────────────────────────

create table if not exists public._20260725_gal_members (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  first_name   text not null default '',
  last_name    text not null default '',
  -- Invité des fiançailles correspondant (_20260725_guests.id), si rapproché.
  guest_id     uuid,
  role         text not null default 'guest' check (role in ('guest', 'admin')),
  status       text not null default 'active' check (status in ('active', 'disabled')),
  -- Comment le compte a été ouvert (traçabilité de l'arbitrage 1).
  linked_by    text not null default 'admin_approval'
               check (linked_by in ('admin_bootstrap', 'auto_name_match', 'admin_approval', 'admin_manual')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Adresses autorisées à devenir administrateur à leur première connexion.
create table if not exists public._20260725_gal_admin_emails (
  email text primary key check (email = lower(email))
);

create table if not exists public._20260725_gal_access_requests (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  first_name       text not null,
  last_name        text not null,
  matched_guest_id uuid,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       uuid references public._20260725_gal_members(id) on delete set null
);
create index if not exists _20260725_gal_access_requests_status_idx
  on public._20260725_gal_access_requests (status, created_at desc);

-- ── Engagement de confidentialité (CONF-01/02) ───────────────────────────────

create table if not exists public._20260725_gal_consent_versions (
  version      int primary key,
  body         text not null,
  published_at timestamptz not null default now()
);

create table if not exists public._20260725_gal_consents (
  member_id   uuid not null references public._20260725_gal_members(id) on delete cascade,
  version     int not null references public._20260725_gal_consent_versions(version),
  accepted_at timestamptz not null default now(),
  primary key (member_id, version)
);

-- ── Réglages (ADM-04, DL-04, ARC-01) — une seule ligne ───────────────────────

create table if not exists public._20260725_gal_settings (
  id                       int primary key default 1 check (id = 1),
  gallery_open             boolean not null default false,
  opens_at                 timestamptz,
  closes_at                timestamptz,
  download_normal_enabled  boolean not null default true,
  download_hd_enabled      boolean not null default true,
  comments_enabled         boolean not null default true,
  reactions_enabled        boolean not null default true,
  -- Arbitrage 1 : rattachement automatique d'un e-mail inconnu à un invité connu par nom/prénom.
  auto_link_known_names    boolean not null default true,
  welcome_text             text not null default '',
  -- Alerte (sans blocage) au-delà de N téléchargements par personne sur 24 h.
  download_alert_threshold int not null default 60,
  updated_at               timestamptz not null default now()
);
insert into public._20260725_gal_settings (id) values (1) on conflict (id) do nothing;

-- ── Albums et photos (NAV-04, IMG-04/05/06) ──────────────────────────────────

create table if not exists public._20260725_gal_albums (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int not null default 0
);
insert into public._20260725_gal_albums (name, sort_order)
select v.name, v.sort_order
from (values ('Cocktail', 0), ('Photos de groupe', 1), ('Soirée', 2)) as v(name, sort_order)
where not exists (select 1 from public._20260725_gal_albums);

-- Numéro permanent : une séquence ne réattribue jamais un numéro, même après suppression.
create sequence if not exists public._20260725_gal_photo_number_seq;

create table if not exists public._20260725_gal_photos (
  id                uuid primary key default gen_random_uuid(),
  number            int not null unique default nextval('public._20260725_gal_photo_number_seq'),
  code              text generated always as ('SJ-' || lpad(number::text, 4, '0')) stored,
  album_id          uuid not null references public._20260725_gal_albums(id),
  taken_at          timestamptz,
  original_filename text not null,
  -- Empreinte du fichier original : détection des doublons à l'import.
  checksum          text not null unique,
  width             int not null check (width > 0),
  height            int not null check (height > 0),
  thumb_path        text not null,
  display_path      text not null,
  original_path     text not null,
  -- visible : consultable ; hidden : masquée (signalement) ; trashed : corbeille admin.
  status            text not null default 'visible' check (status in ('visible', 'hidden', 'trashed')),
  -- Rang dans la sélection d'accueil (null = hors sélection).
  home_rank         int,
  created_at        timestamptz not null default now()
);
alter sequence public._20260725_gal_photo_number_seq owned by public._20260725_gal_photos.number;
create unique index if not exists _20260725_gal_photos_home_rank_key
  on public._20260725_gal_photos (home_rank) where home_rank is not null;
create index if not exists _20260725_gal_photos_album_idx
  on public._20260725_gal_photos (album_id, taken_at, number);

-- ── Interactions (SOC-01/02, NAV-06) ─────────────────────────────────────────

create table if not exists public._20260725_gal_reactions (
  photo_id   uuid not null references public._20260725_gal_photos(id) on delete cascade,
  member_id  uuid not null references public._20260725_gal_members(id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (photo_id, member_id, emoji)
);

create table if not exists public._20260725_gal_comments (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public._20260725_gal_photos(id) on delete cascade,
  member_id  uuid not null references public._20260725_gal_members(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists _20260725_gal_comments_photo_idx
  on public._20260725_gal_comments (photo_id, created_at);

create table if not exists public._20260725_gal_favorites (
  member_id  uuid not null references public._20260725_gal_members(id) on delete cascade,
  photo_id   uuid not null references public._20260725_gal_photos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, photo_id)
);

-- ── Signalements (MOD-01..06) ────────────────────────────────────────────────

create table if not exists public._20260725_gal_report_reasons (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  sort_order int not null default 0,
  active     boolean not null default true
);
insert into public._20260725_gal_report_reasons (label, sort_order)
select v.label, v.sort_order
from (values
  ('Je n''aime pas cette photo de moi', 0),
  ('Je trouve cette photo inappropriée', 1),
  ('Cette photo concerne une autre personne', 2),
  ('Autre motif', 3)
) as v(label, sort_order)
where not exists (select 1 from public._20260725_gal_report_reasons);

create table if not exists public._20260725_gal_reports (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public._20260725_gal_photos(id) on delete cascade,
  reporter_id uuid not null references public._20260725_gal_members(id) on delete cascade,
  reasons     text[] not null check (cardinality(reasons) > 0),
  for_self    boolean not null default true,
  status      text not null default 'open' check (status in ('open', 'maintained', 'restored', 'deleted')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references public._20260725_gal_members(id) on delete set null
);

-- ── Téléchargements, journal, notifications (DL, ADM-02/03) ──────────────────

create table if not exists public._20260725_gal_downloads (
  id         bigserial primary key,
  photo_id   uuid not null references public._20260725_gal_photos(id) on delete cascade,
  member_id  uuid not null references public._20260725_gal_members(id) on delete cascade,
  quality    text not null check (quality in ('normal', 'hd')),
  created_at timestamptz not null default now()
);
create index if not exists _20260725_gal_downloads_member_idx
  on public._20260725_gal_downloads (member_id, created_at desc);

create table if not exists public._20260725_gal_activity (
  id         bigserial primary key,
  member_id  uuid references public._20260725_gal_members(id) on delete set null,
  event      text not null,
  photo_id   uuid references public._20260725_gal_photos(id) on delete set null,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists _20260725_gal_activity_created_idx on public._20260725_gal_activity (created_at desc);
create index if not exists _20260725_gal_activity_member_idx on public._20260725_gal_activity (member_id, created_at desc);

create table if not exists public._20260725_gal_notifications (
  id         bigserial primary key,
  kind       text not null,  -- report | access_request | auto_link | download_volume | unusual_login
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

-- ── Fonctions d'autorisation ─────────────────────────────────────────────────

create or replace function public._20260725_gal_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public._20260725_gal_members
    where id = auth.uid() and role = 'admin' and status = 'active'
  )
$$;

-- Version en vigueur de l'engagement (0 si aucune publiée).
create or replace function public._20260725_gal_current_consent()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(version), 0) from public._20260725_gal_consent_versions
$$;

-- Peut consulter les photos : compte actif, engagement en vigueur accepté, galerie ouverte.
-- Les administrateurs voient tout, en permanence.
create or replace function public._20260725_gal_can_view()
returns boolean language sql stable security definer set search_path = public as $$
  select public._20260725_gal_is_admin() or exists (
    select 1
    from public._20260725_gal_members m
    cross join public._20260725_gal_settings s
    where m.id = auth.uid()
      and m.status = 'active'
      and s.gallery_open
      and (s.opens_at is null or now() >= s.opens_at)
      and (s.closes_at is null or now() < s.closes_at)
      and public._20260725_gal_current_consent() > 0
      and exists (
        select 1 from public._20260725_gal_consents c
        where c.member_id = m.id and c.version = public._20260725_gal_current_consent()
      )
  )
$$;

create or replace function public._20260725_gal_photo_visible(p_photo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public._20260725_gal_photos where id = p_photo and status = 'visible')
$$;

-- Totaux de réactions par émoji, sans identité des auteurs (SOC-01).
create or replace function public._20260725_gal_reaction_counts(p_photos uuid[])
returns table (photo_id uuid, emoji text, total bigint, mine boolean)
language sql stable security definer set search_path = public as $$
  select r.photo_id, r.emoji, count(*), bool_or(r.member_id = auth.uid())
  from public._20260725_gal_reactions r
  join public._20260725_gal_photos p on p.id = r.photo_id
  where public._20260725_gal_can_view()
    and r.photo_id = any (p_photos)
    and (p.status = 'visible' or public._20260725_gal_is_admin())
  group by r.photo_id, r.emoji
$$;

-- Commentaires d'une photo, anonymes pour les autres invités (SOC-02).
create or replace function public._20260725_gal_photo_comments(p_photo uuid)
returns table (id uuid, body text, created_at timestamptz, updated_at timestamptz, mine boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.body, c.created_at, c.updated_at, c.member_id = auth.uid()
  from public._20260725_gal_comments c
  join public._20260725_gal_photos p on p.id = c.photo_id
  where public._20260725_gal_can_view()
    and c.photo_id = p_photo
    and not c.hidden
    and p.status = 'visible'
  order by c.created_at
$$;

-- Journal des actions déclenchées par le navigateur (ouverture explicite d'une photo, connexion…).
create or replace function public._20260725_gal_log(p_event text, p_photo uuid default null, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if p_event not in ('login', 'logout', 'photo_open', 'search') then
    raise exception 'Événement non journalisable : %', p_event;
  end if;
  insert into public._20260725_gal_activity (member_id, event, photo_id, details)
  values (auth.uid(), p_event, p_photo, coalesce(p_details, '{}'::jsonb));
  if p_event = 'login' then
    update public._20260725_gal_members set last_seen_at = now() where id = auth.uid();
  end if;
end;
$$;

-- ── Déclencheurs : journal, masquage au signalement, notifications ──────────

create or replace function public._20260725_gal_activity_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  -- Ligne en JSON : la même fonction sert à plusieurs tables aux colonnes différentes.
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public._20260725_gal_activity (member_id, event, photo_id, details)
  values (
    coalesce(auth.uid(), (v_row ->> 'member_id')::uuid),
    tg_argv[0] || '_' || lower(tg_op),
    (v_row ->> 'photo_id')::uuid,
    case tg_argv[0]
      when 'reaction' then jsonb_build_object('emoji', v_row ->> 'emoji')
      when 'comment'  then jsonb_build_object('comment_id', v_row ->> 'id', 'hidden', (v_row ->> 'hidden')::boolean)
      else '{}'::jsonb
    end
  );
  return null;
end;
$$;

drop trigger if exists _20260725_gal_reactions_log on public._20260725_gal_reactions;
create trigger _20260725_gal_reactions_log after insert or delete on public._20260725_gal_reactions
  for each row execute function public._20260725_gal_activity_trigger('reaction');
drop trigger if exists _20260725_gal_comments_log on public._20260725_gal_comments;
create trigger _20260725_gal_comments_log after insert or update or delete on public._20260725_gal_comments
  for each row execute function public._20260725_gal_activity_trigger('comment');
drop trigger if exists _20260725_gal_favorites_log on public._20260725_gal_favorites;
create trigger _20260725_gal_favorites_log after insert or delete on public._20260725_gal_favorites
  for each row execute function public._20260725_gal_activity_trigger('favorite');

-- Premier signalement : masquage immédiat, journal et alerte (MOD-03/04).
create or replace function public._20260725_gal_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  update public._20260725_gal_photos set status = 'hidden'
  where id = new.photo_id and status = 'visible'
  returning code into v_code;
  if v_code is null then
    select code into v_code from public._20260725_gal_photos where id = new.photo_id;
  end if;
  insert into public._20260725_gal_activity (member_id, event, photo_id, details)
  values (new.reporter_id, 'report_insert', new.photo_id,
          jsonb_build_object('reasons', new.reasons, 'for_self', new.for_self));
  insert into public._20260725_gal_notifications (kind, payload)
  values ('report', jsonb_build_object(
    'report_id', new.id, 'photo_id', new.photo_id, 'photo_code', v_code,
    'reasons', new.reasons, 'for_self', new.for_self, 'reporter_id', new.reporter_id));
  return null;
end;
$$;
drop trigger if exists _20260725_gal_reports_after_insert on public._20260725_gal_reports;
create trigger _20260725_gal_reports_after_insert after insert on public._20260725_gal_reports
  for each row execute function public._20260725_gal_on_report();

-- Décisions de modération et changements de statut des photos (MOD-05).
create or replace function public._20260725_gal_on_photo_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public._20260725_gal_activity (member_id, event, photo_id, details)
    values (auth.uid(), 'photo_status', new.id, jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return null;
end;
$$;
drop trigger if exists _20260725_gal_photos_status_log on public._20260725_gal_photos;
create trigger _20260725_gal_photos_status_log after update of status on public._20260725_gal_photos
  for each row execute function public._20260725_gal_on_photo_status();

create or replace function public._20260725_gal_on_access_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public._20260725_gal_notifications (kind, payload)
  values ('access_request', jsonb_build_object(
    'request_id', new.id, 'email', new.email, 'first_name', new.first_name, 'last_name', new.last_name,
    'matched_guest_id', new.matched_guest_id));
  return null;
end;
$$;
drop trigger if exists _20260725_gal_access_requests_notify on public._20260725_gal_access_requests;
create trigger _20260725_gal_access_requests_notify after insert on public._20260725_gal_access_requests
  for each row execute function public._20260725_gal_on_access_request();

-- ── Sécurité des lignes (RLS) — aucun accès anonyme ──────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'members', 'admin_emails', 'access_requests', 'consent_versions', 'consents', 'settings',
    'albums', 'photos', 'reactions', 'comments', 'favorites', 'report_reasons', 'reports',
    'downloads', 'activity', 'notifications'
  ] loop
    execute format('alter table public.%I enable row level security', '_20260725_gal_' || t);
    execute format('revoke all on public.%I from anon', '_20260725_gal_' || t);
  end loop;
end $$;

-- Comptes : chacun voit le sien ; les admins gèrent tout.
create policy "self_select" on public._20260725_gal_members for select to authenticated
  using (id = auth.uid() or public._20260725_gal_is_admin());
create policy "admin_update" on public._20260725_gal_members for update to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

create policy "admin_all" on public._20260725_gal_admin_emails for all to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

create policy "admin_all" on public._20260725_gal_access_requests for all to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

-- Engagement : lisible par tout compte (à accepter avant de voir les photos).
create policy "read" on public._20260725_gal_consent_versions for select to authenticated using (true);
create policy "admin_write" on public._20260725_gal_consent_versions for insert to authenticated
  with check (public._20260725_gal_is_admin());

create policy "self_select" on public._20260725_gal_consents for select to authenticated
  using (member_id = auth.uid() or public._20260725_gal_is_admin());
create policy "self_accept" on public._20260725_gal_consents for insert to authenticated
  with check (
    member_id = auth.uid()
    and version = public._20260725_gal_current_consent()
    and exists (select 1 from public._20260725_gal_members m where m.id = auth.uid() and m.status = 'active')
  );

-- Réglages : lisibles par tout compte (l'interface masque les fonctions coupées), modifiables par les admins.
create policy "read" on public._20260725_gal_settings for select to authenticated using (true);
create policy "admin_update" on public._20260725_gal_settings for update to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

create policy "viewer_select" on public._20260725_gal_albums for select to authenticated
  using (public._20260725_gal_can_view());
create policy "admin_all" on public._20260725_gal_albums for all to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

-- Photos : seules les photos visibles, et seulement pour un compte autorisé.
create policy "viewer_select" on public._20260725_gal_photos for select to authenticated
  using (public._20260725_gal_is_admin() or (status = 'visible' and public._20260725_gal_can_view()));
create policy "admin_insert" on public._20260725_gal_photos for insert to authenticated
  with check (public._20260725_gal_is_admin());
create policy "admin_update" on public._20260725_gal_photos for update to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());
create policy "admin_delete" on public._20260725_gal_photos for delete to authenticated
  using (public._20260725_gal_is_admin());

-- Réactions : on ne lit que les siennes (les totaux passent par _20260725_gal_reaction_counts).
create policy "self_select" on public._20260725_gal_reactions for select to authenticated
  using (member_id = auth.uid() or public._20260725_gal_is_admin());
create policy "self_insert" on public._20260725_gal_reactions for insert to authenticated
  with check (
    member_id = auth.uid() and public._20260725_gal_can_view()
    and public._20260725_gal_photo_visible(photo_id)
    and (select reactions_enabled from public._20260725_gal_settings)
  );
create policy "self_delete" on public._20260725_gal_reactions for delete to authenticated
  using (member_id = auth.uid() or public._20260725_gal_is_admin());

-- Commentaires : on ne lit que les siens (la liste anonyme passe par _20260725_gal_photo_comments).
create policy "self_select" on public._20260725_gal_comments for select to authenticated
  using (member_id = auth.uid() or public._20260725_gal_is_admin());
create policy "self_insert" on public._20260725_gal_comments for insert to authenticated
  with check (
    member_id = auth.uid() and not hidden and public._20260725_gal_can_view()
    and public._20260725_gal_photo_visible(photo_id)
    and (select comments_enabled from public._20260725_gal_settings)
  );
create policy "self_or_admin_update" on public._20260725_gal_comments for update to authenticated
  using (member_id = auth.uid() or public._20260725_gal_is_admin())
  with check (
    public._20260725_gal_is_admin()
    or (member_id = auth.uid() and not hidden and (select comments_enabled from public._20260725_gal_settings))
  );
-- Une modification ne touche que le texte (et le masquage, réservé aux admins par la politique ci-dessus).
revoke update on public._20260725_gal_comments from authenticated;
grant update (body, hidden, updated_at) on public._20260725_gal_comments to authenticated;
create policy "self_or_admin_delete" on public._20260725_gal_comments for delete to authenticated
  using (member_id = auth.uid() or public._20260725_gal_is_admin());

create policy "self_select" on public._20260725_gal_favorites for select to authenticated
  using (member_id = auth.uid() or public._20260725_gal_is_admin());
create policy "self_insert" on public._20260725_gal_favorites for insert to authenticated
  with check (member_id = auth.uid() and public._20260725_gal_can_view() and public._20260725_gal_photo_visible(photo_id));
create policy "self_delete" on public._20260725_gal_favorites for delete to authenticated
  using (member_id = auth.uid());

create policy "read" on public._20260725_gal_report_reasons for select to authenticated using (true);
create policy "admin_all" on public._20260725_gal_report_reasons for all to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

create policy "self_select" on public._20260725_gal_reports for select to authenticated
  using (reporter_id = auth.uid() or public._20260725_gal_is_admin());
create policy "self_insert" on public._20260725_gal_reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and public._20260725_gal_can_view());
create policy "admin_update" on public._20260725_gal_reports for update to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

-- Téléchargements : écrits par l'edge function `gallery-download`, lus par les admins.
create policy "admin_select" on public._20260725_gal_downloads for select to authenticated
  using (public._20260725_gal_is_admin());
create policy "admin_select" on public._20260725_gal_activity for select to authenticated
  using (public._20260725_gal_is_admin());
create policy "admin_all" on public._20260725_gal_notifications for all to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

revoke all on function public._20260725_gal_reaction_counts(uuid[]) from anon;
revoke all on function public._20260725_gal_photo_comments(uuid) from anon;
revoke all on function public._20260725_gal_log(text, uuid, jsonb) from anon;

-- ── Stockage privé (SEC-01) ──────────────────────────────────────────────────
-- Chemins : thumb/<photo_id>.jpg · display/<photo_id>.jpg · original/<photo_id>/<fichier>
-- (renommés mini-size / medium-size / full-size par la migration 0152)
-- Miniatures et versions de consultation : URL signées courtes, pour un compte autorisé
-- et une photo visible. Originaux : administrateurs uniquement (les invités passent par
-- l'edge function `gallery-download`, qui vérifie les interrupteurs et journalise).

insert into storage.buckets (id, name, public)
values ('gallery-private', 'gallery-private', false)
on conflict (id) do update set public = false;

drop policy if exists "gallery_private_viewer_read" on storage.objects;
create policy "gallery_private_viewer_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'gallery-private'
    and (
      public._20260725_gal_is_admin()
      or (
        split_part(name, '/', 1) in ('thumb', 'display')
        and public._20260725_gal_can_view()
        and exists (
          select 1 from public._20260725_gal_photos p
          where p.status = 'visible'
            and p.id::text = split_part(split_part(name, '/', 2), '.', 1)
        )
      )
    )
  );

drop policy if exists "gallery_private_admin_write" on storage.objects;
create policy "gallery_private_admin_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery-private' and public._20260725_gal_is_admin());
drop policy if exists "gallery_private_admin_update" on storage.objects;
create policy "gallery_private_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'gallery-private' and public._20260725_gal_is_admin());
drop policy if exists "gallery_private_admin_delete" on storage.objects;
create policy "gallery_private_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery-private' and public._20260725_gal_is_admin());

commit;

-- Après exécution : déclarer les administrateurs (adresses en minuscules), par exemple
--   insert into public._20260725_gal_admin_emails (email) values ('prenom.nom@exemple.com');
-- Leur compte admin est créé à leur première connexion à /photos.
