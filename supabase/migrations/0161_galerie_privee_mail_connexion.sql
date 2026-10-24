-- 0161_galerie_privee_mail_connexion.sql
-- E-mail aux administrateurs à chaque connexion d'un invité (saisie du code reçu par e-mail).
-- La connexion crée une notification « login » (déjà marquée lue pour ne pas encombrer les alertes) ;
-- le webhook 0158 la transmet à gallery-notify, qui envoie l'e-mail.
-- Désactivable dans Réglages (notify_on_login). Les connexions des administrateurs ne déclenchent rien.
-- Réexécutable sans risque.

begin;

alter table public._20260725_gal_settings
  add column if not exists notify_on_login boolean not null default true;

create or replace function public._20260725_gal_log(p_event text, p_photo uuid default null, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_devices int;
  v_limit   int;
  v_notify  boolean;
  v_member  public._20260725_gal_members%rowtype;
  v_logins  int;
begin
  if auth.uid() is null then return; end if;
  if p_event not in ('login', 'logout', 'photo_open', 'search') then
    raise exception 'Événement non journalisable : %', p_event;
  end if;
  select * into v_member from public._20260725_gal_members where id = auth.uid();
  if not found then return; end if;

  insert into public._20260725_gal_activity (member_id, event, photo_id, details)
  values (auth.uid(), p_event, p_photo, coalesce(p_details, '{}'::jsonb));

  if p_event = 'login' then
    update public._20260725_gal_members set last_seen_at = now() where id = auth.uid();

    select unusual_login_devices, notify_on_login into v_limit, v_notify from public._20260725_gal_settings where id = 1;

    -- Connexions inhabituelles (alerte seulement).
    select count(distinct details ->> 'device') into v_devices
    from public._20260725_gal_activity
    where member_id = auth.uid() and event = 'login' and created_at > now() - interval '24 hours';
    if v_devices >= v_limit and not exists (
      select 1 from public._20260725_gal_notifications
      where kind = 'unusual_login' and payload ->> 'member_id' = auth.uid()::text
        and created_at > now() - interval '24 hours'
    ) then
      insert into public._20260725_gal_notifications (kind, payload)
      values ('unusual_login', jsonb_build_object(
        'member_id', v_member.id, 'email', v_member.email,
        'name', trim(v_member.first_name || ' ' || v_member.last_name), 'devices_24h', v_devices));
    end if;

    -- E-mail de connexion (invités uniquement).
    if v_notify and v_member.role = 'guest' then
      select count(*) into v_logins from public._20260725_gal_activity where member_id = auth.uid() and event = 'login';
      insert into public._20260725_gal_notifications (kind, payload, read_at)
      values ('login', jsonb_build_object(
        'member_id', v_member.id, 'email', v_member.email,
        'name', trim(v_member.first_name || ' ' || v_member.last_name),
        'first_login', v_logins <= 1, 'login_count', v_logins), now());
    end if;
  end if;
end;
$$;

commit;

-- Contrôle (attendu : true)
select notify_on_login from public._20260725_gal_settings where id = 1;
