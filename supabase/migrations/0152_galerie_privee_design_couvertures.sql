-- 0152_galerie_privee_design_couvertures.sql
-- Évolutions de la galerie privée après 0150/0151 (réexécutable sans risque) :
--   1. dossiers du bucket « gallery-private » : mini-size / medium-size / full-size ;
--   2. choix de design validés le 18/10/2026 : cinématographique, accueil en diaporama horizontal ;
--   3. couverture de catégorie : une seule photo par album.
-- Prérequis : 0150_galerie_privee_socle.sql et 0151_galerie_privee_complements.sql.

begin;

-- 1. Lecture des miniatures (mini-size) et versions de consultation (medium-size) :
--    compte autorisé + photo visible. full-size (originaux) reste réservé aux administrateurs ;
--    les invités le reçoivent via l'edge function gallery-download.
drop policy if exists "gallery_private_viewer_read" on storage.objects;
create policy "gallery_private_viewer_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'gallery-private'
    and (
      public._20260725_gal_is_admin()
      or (
        split_part(name, '/', 1) in ('mini-size', 'medium-size')
        and public._20260725_gal_can_view()
        and exists (
          select 1 from public._20260725_gal_photos p
          where p.status = 'visible'
            and p.id::text = split_part(split_part(name, '/', 2), '.', 1)
        )
      )
    )
  );

-- 2. Direction artistique et défilement retenus.
alter table public._20260725_gal_settings alter column theme set default 'cinema';
alter table public._20260725_gal_settings alter column scroll_mode set default 'slideshow';
update public._20260725_gal_settings
set theme = 'cinema', scroll_mode = 'slideshow', updated_at = now()
where id = 1 and theme = 'editorial' and scroll_mode = 'portfolio';

-- 3. Couverture de catégorie (sans choix, la première photo visible de l'album sert de couverture).
alter table public._20260725_gal_albums
  add column if not exists cover_photo_id uuid references public._20260725_gal_photos(id) on delete set null;

commit;

-- Contrôle (attendu : theme = cinema, scroll_mode = slideshow, colonne cover_photo_id présente)
select s.theme, s.scroll_mode,
       exists (select 1 from information_schema.columns
               where table_name = '_20260725_gal_albums' and column_name = 'cover_photo_id') as couverture_ok
from public._20260725_gal_settings s where s.id = 1;
