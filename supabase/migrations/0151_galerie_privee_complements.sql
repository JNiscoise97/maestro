-- 0151_galerie_privee_complements.sql
-- Compléments au socle 0150 de la galerie privée :
--   · réglages de présentation (direction artistique, mode de défilement) choisis après le prototype ;
--   · détection des connexions inhabituelles (ACC-05) — alerte seulement, sans blocage ;
--   · révocation des sessions d'un compte par un administrateur (ADM-05) ;
--   · déclencheur de notification pour les rattachements automatiques (arbitrage 1).
-- Prérequis : 0150_galerie_privee_socle.sql.

begin;

alter table public._20260725_gal_settings
  add column if not exists theme text not null default 'editorial'
    check (theme in ('editorial', 'cinema', 'tropical')),
  add column if not exists scroll_mode text not null default 'portfolio'
    check (scroll_mode in ('portfolio', 'slideshow', 'immersive')),
  -- Alerte si un compte se connecte depuis plus de N appareils différents en 24 h.
  add column if not exists unusual_login_devices int not null default 4;

-- Journal des actions déclenchées par le navigateur, avec détection des connexions inhabituelles.
-- `details.device` est un identifiant aléatoire d'appareil (pas d'adresse IP : SEC-04 minimisation).
create or replace function public._20260725_gal_log(p_event text, p_photo uuid default null, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_devices int;
  v_limit   int;
begin
  if auth.uid() is null then return; end if;
  if p_event not in ('login', 'logout', 'photo_open', 'search') then
    raise exception 'Événement non journalisable : %', p_event;
  end if;
  if not exists (select 1 from public._20260725_gal_members where id = auth.uid()) then return; end if;

  insert into public._20260725_gal_activity (member_id, event, photo_id, details)
  values (auth.uid(), p_event, p_photo, coalesce(p_details, '{}'::jsonb));

  if p_event = 'login' then
    update public._20260725_gal_members set last_seen_at = now() where id = auth.uid();

    select unusual_login_devices into v_limit from public._20260725_gal_settings where id = 1;
    select count(distinct details ->> 'device') into v_devices
    from public._20260725_gal_activity
    where member_id = auth.uid() and event = 'login' and created_at > now() - interval '24 hours';

    if v_devices >= v_limit and not exists (
      select 1 from public._20260725_gal_notifications
      where kind = 'unusual_login' and payload ->> 'member_id' = auth.uid()::text
        and created_at > now() - interval '24 hours'
    ) then
      insert into public._20260725_gal_notifications (kind, payload)
      select 'unusual_login', jsonb_build_object(
        'member_id', m.id, 'email', m.email, 'name', trim(m.first_name || ' ' || m.last_name), 'devices_24h', v_devices)
      from public._20260725_gal_members m where m.id = auth.uid();
    end if;
  end if;
end;
$$;

-- Révocation des sessions (les jetons d'accès déjà émis expirent d'eux-mêmes ;
-- un compte désactivé perd en plus immédiatement l'accès aux photos via la RLS).
create or replace function public._20260725_gal_revoke_sessions(p_member uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public._20260725_gal_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  delete from auth.sessions where user_id = p_member;
  insert into public._20260725_gal_activity (member_id, event, details)
  values (auth.uid(), 'admin_revoke_sessions', jsonb_build_object('member_id', p_member));
end;
$$;
revoke all on function public._20260725_gal_revoke_sessions(uuid) from anon, public;
grant execute on function public._20260725_gal_revoke_sessions(uuid) to authenticated;

-- Notification et journal à l'ouverture d'un compte par rattachement automatique (arbitrage 1).
create or replace function public._20260725_gal_on_member_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public._20260725_gal_activity (member_id, event, details)
  values (new.id, 'account_created', jsonb_build_object('linked_by', new.linked_by, 'guest_id', new.guest_id));
  if new.linked_by = 'auto_name_match' then
    insert into public._20260725_gal_notifications (kind, payload)
    values ('auto_link', jsonb_build_object(
      'member_id', new.id, 'email', new.email,
      'name', trim(new.first_name || ' ' || new.last_name), 'guest_id', new.guest_id));
  end if;
  return null;
end;
$$;
drop trigger if exists _20260725_gal_members_after_insert on public._20260725_gal_members;
create trigger _20260725_gal_members_after_insert after insert on public._20260725_gal_members
  for each row execute function public._20260725_gal_on_member_insert();

-- Changements de statut / rôle d'un compte par un administrateur (ADM-05).
create or replace function public._20260725_gal_on_member_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status or new.role is distinct from old.role then
    insert into public._20260725_gal_activity (member_id, event, details)
    values (auth.uid(), 'admin_member_update', jsonb_build_object(
      'member_id', new.id, 'status', new.status, 'role', new.role));
  end if;
  return null;
end;
$$;
drop trigger if exists _20260725_gal_members_after_update on public._20260725_gal_members;
create trigger _20260725_gal_members_after_update after update on public._20260725_gal_members
  for each row execute function public._20260725_gal_on_member_update();

-- Décisions sur les signalements.
create or replace function public._20260725_gal_on_report_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public._20260725_gal_activity (member_id, event, photo_id, details)
    values (auth.uid(), 'report_decision', new.photo_id, jsonb_build_object('report_id', new.id, 'decision', new.status));
  end if;
  return null;
end;
$$;
drop trigger if exists _20260725_gal_reports_after_update on public._20260725_gal_reports;
create trigger _20260725_gal_reports_after_update after update on public._20260725_gal_reports
  for each row execute function public._20260725_gal_on_report_update();

-- Sélection d'accueil (NAV-02) : remplace d'un coup la liste ordonnée des photos mises en avant.
-- Atomique, pour ne jamais heurter l'unicité des rangs pendant un réordonnancement.
create or replace function public._20260725_gal_set_home_selection(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._20260725_gal_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if cardinality(p_ids) > 50 then
    raise exception 'La sélection d''accueil est limitée à 50 photos';
  end if;
  update public._20260725_gal_photos set home_rank = null where home_rank is not null;
  update public._20260725_gal_photos p set home_rank = s.rank
  from unnest(p_ids) with ordinality as s(id, rank)
  where p.id = s.id;
  insert into public._20260725_gal_activity (member_id, event, details)
  values (auth.uid(), 'admin_home_selection', jsonb_build_object('count', cardinality(p_ids)));
end;
$$;
revoke all on function public._20260725_gal_set_home_selection(uuid[]) from anon, public;
grant execute on function public._20260725_gal_set_home_selection(uuid[]) to authenticated;

-- Les signalements sont aussi possibles sur une photo déjà masquée par un autre signalement :
-- la contrainte « photo visible » n'est donc pas imposée, seulement le droit de consulter.

commit;
