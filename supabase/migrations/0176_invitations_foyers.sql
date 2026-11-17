-- 0176_invitations_foyers.sql
-- Préparation des invitations (page Invités › Invitations) :
--   · guests.invitation_name : nom qui figure sur l'invitation (ex. « Tatie Monique ») ;
--     null = surnom s'il existe, sinon prénom.
-- (La notion de foyer, ajoutée un temps ici, a été abandonnée par 0178_suppression_foyers.sql, puis rétablie par 0179_retour_foyers.sql.)
-- Pour chaque déploiement ayant des invités. Réexécutable sans risque.

do $$
declare p text; g text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    g := p || 'guests';
    if to_regclass('public.' || g) is null then continue; end if;
    execute format('alter table public.%I add column if not exists invitation_name text', g);
  end loop;
end $$;
