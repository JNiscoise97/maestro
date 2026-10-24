-- 0163_galerie_privee_fin_reprise.sql
-- Fin de la reprise de l'ancien album : la règle de lecture de album-photos/full-size/ (0154),
-- qui servait à copier les originaux vers gallery-private, n'a plus d'utilité.
-- À lancer après la suppression du dossier album-photos/full-size/. Réexécutable sans risque.

drop policy if exists "album_photos_gallery_admin_read" on storage.objects;

-- Contrôle : plus aucun fichier sous album-photos/full-size/ (attendu : 0)
select count(*) as fichiers_restants
from storage.objects
where bucket_id = 'album-photos' and name like 'full-size/%';
