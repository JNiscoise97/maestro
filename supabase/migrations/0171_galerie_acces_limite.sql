-- 0171_galerie_acces_limite.sql
-- Galerie privée : « accès limité » pour certaines personnes. Un compte invité marqué limited ne voit
-- que les photos de la sélection d'accueil (home_rank non nul, 50 max), et rien d'autre :
--   · lignes de photos (RLS), réactions, commentaires, favoris : via _20260725_gal_photo_visible ;
--   · fichiers mini-size / medium-size : via _20260725_gal_can_read_object ;
--   · téléchargements : contrôle ajouté dans la fonction gallery-download (à redéployer).
-- Modifier la sélection d'accueil change automatiquement ce que ces personnes voient.
-- Pas de policy anon_all : comme toutes les tables _20260725_gal_*, accès « membre / admin » uniquement.
-- Réexécutable sans risque.

begin;

alter table public._20260725_gal_members
  add column if not exists limited boolean not null default false;

comment on column public._20260725_gal_members.limited is
  'Accès limité : ne voit que la sélection d''accueil (photos avec home_rank). Sans effet sur un administrateur.';

-- La personne connectée est un invité en accès limité.
create or replace function public._20260725_gal_member_limited()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public._20260725_gal_members
    where id = auth.uid() and limited and role = 'guest'
  )
$$;
revoke all on function public._20260725_gal_member_limited() from anon, public;
grant execute on function public._20260725_gal_member_limited() to authenticated;

-- Reprise de 0157 + restriction à la sélection d'accueil pour un accès limité.
create or replace function public._20260725_gal_photo_visible(p_photo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public._20260725_gal_photos p
    join public._20260725_gal_albums a on a.id = p.album_id
    where p.id = p_photo and p.status = 'visible' and not a.hidden
      and (p.home_rank is not null or not public._20260725_gal_member_limited())
  )
$$;

-- Reprise de 0159 + même restriction pour les fichiers.
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
          and (p.home_rank is not null or not public._20260725_gal_member_limited())
      )
    )
$$;

commit;

-- Contrôle : colonne présente (attendu : 0 compte limité juste après la migration)
select count(*) filter (where limited) as comptes_limites from public._20260725_gal_members;
