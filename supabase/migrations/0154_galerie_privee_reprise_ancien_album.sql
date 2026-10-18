-- 0154_galerie_privee_reprise_ancien_album.sql
-- Reprise de l'ancien album : les administrateurs de la galerie privée peuvent lire les originaux
-- du bucket « album-photos » (dossier full-size/) pour les copier côté serveur vers
-- « gallery-private ». La copie de stockage exige ce droit de lecture sur l'objet source.
-- Réexécutable sans risque.

drop policy if exists "album_photos_gallery_admin_read" on storage.objects;
create policy "album_photos_gallery_admin_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'album-photos'
    and split_part(name, '/', 1) = 'full-size'
    and public._20260725_gal_is_admin()
  );
