-- 0159_galerie_privee_lecture_fichiers.sql
-- Correctif : les invités n'obtenaient pas les URL signées des miniatures / versions de consultation.
-- La règle de lecture du stockage interrogeait les tables photos et albums sous la RLS de l'invité
-- (RLS imbriquée). Elle passe désormais par une seule fonction « security definer » qui applique
-- exactement la même règle : compte autorisé + photo visible + catégorie non masquée.
-- Réexécutable sans risque.

begin;

create or replace function public._20260725_gal_can_read_object(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public._20260725_gal_is_admin()
    or (
      split_part(p_name, '/', 1) in ('mini-size', 'medium-size')
      and public._20260725_gal_can_view()
      and exists (
        select 1
        from public._20260725_gal_photos p
        join public._20260725_gal_albums a on a.id = p.album_id
        where p.id::text = split_part(split_part(p_name, '/', 2), '.', 1)
          and p.status = 'visible'
          and not a.hidden
      )
    )
$$;
revoke all on function public._20260725_gal_can_read_object(text) from anon, public;
grant execute on function public._20260725_gal_can_read_object(text) to authenticated;

drop policy if exists "gallery_private_viewer_read" on storage.objects;
create policy "gallery_private_viewer_read" on storage.objects for select to authenticated
  using (bucket_id = 'gallery-private' and public._20260725_gal_can_read_object(name));

commit;

-- Contrôle : la fonction répond (attendu : false hors session, la vérification réelle se fait connecté)
select public._20260725_gal_can_read_object('mini-size/00000000-0000-0000-0000-000000000000.jpg') as test_hors_session;
