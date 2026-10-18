-- 0158_galerie_privee_webhook_alertes.sql
-- Branche les alertes de la galerie sur l'edge function gallery-notify (e-mail aux administrateurs
-- pour les signalements et connexions inhabituelles), sans passer par l'écran « Database Webhooks ».
-- Chaque INSERT dans _20260725_gal_notifications envoie la ligne à la fonction via pg_net.
--
-- ⚠ Avant d'exécuter : remplacer COLLER_ICI_LE_GALLERY_WEBHOOK_SECRET par la valeur du secret
--   GALLERY_WEBHOOK_SECRET (Edge Functions › Secrets). Ne pas committer le fichier avec le secret.
-- Réexécutable sans risque.

create extension if not exists pg_net;

create or replace function public._20260725_gal_notify_webhook()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://igyhlwonztzdrciogfuz.supabase.co/functions/v1/gallery-notify',
    body    := jsonb_build_object('type', 'INSERT', 'table', tg_table_name, 'record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Clé publique de l'appli (déjà visible côté navigateur) : exigée par la passerelle des fonctions.
      'apikey', 'sb_publishable_Ut4uTKfG8znpDX0ZXR8U6A_aRa_B81a',
      'x-webhook-secret', 'COLLER_ICI_LE_GALLERY_WEBHOOK_SECRET'
    )
  );
  return new;
end;
$$;

drop trigger if exists _20260725_gal_notifications_webhook on public._20260725_gal_notifications;
create trigger _20260725_gal_notifications_webhook
  after insert on public._20260725_gal_notifications
  for each row execute function public._20260725_gal_notify_webhook();

-- Contrôle : le déclencheur existe (attendu : 1 ligne)
select tgname from pg_trigger where tgname = '_20260725_gal_notifications_webhook';
