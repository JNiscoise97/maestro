-- 0157_galerie_privee_categorie_masquee.sql
-- Masquage d'une catégorie entière aux invités (les administrateurs la voient toujours).
-- Une photo n'est visible d'un invité que si elle est « visible » ET que sa catégorie n'est pas
-- masquée : listes, accueil, recherche, favoris, réactions, commentaires, fichiers et téléchargements.
-- Masque « Préparation ». Réexécutable sans risque.

begin;

alter table public._20260725_gal_albums
  add column if not exists hidden boolean not null default false;

update public._20260725_gal_albums set hidden = true where name = 'Préparation';

-- Règle unique « photo consultable par un invité ».
create or replace function public._20260725_gal_photo_visible(p_photo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public._20260725_gal_photos p
    join public._20260725_gal_albums a on a.id = p.album_id
    where p.id = p_photo and p.status = 'visible' and not a.hidden
  )
$$;

-- Catégories : les invités ne voient pas les catégories masquées.
drop policy if exists "viewer_select" on public._20260725_gal_albums;
create policy "viewer_select" on public._20260725_gal_albums for select to authenticated
  using (public._20260725_gal_is_admin() or (not hidden and public._20260725_gal_can_view()));

-- Photos : visibles et dans une catégorie non masquée.
drop policy if exists "viewer_select" on public._20260725_gal_photos;
create policy "viewer_select" on public._20260725_gal_photos for select to authenticated
  using (
    public._20260725_gal_is_admin()
    or (public._20260725_gal_can_view() and public._20260725_gal_photo_visible(id))
  );

-- Fichiers mini-size / medium-size : même règle.
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
          join public._20260725_gal_albums a on a.id = p.album_id
          where p.status = 'visible' and not a.hidden
            and p.id::text = split_part(split_part(name, '/', 2), '.', 1)
        )
      )
    )
  );

-- Totaux de réactions et commentaires : même règle.
create or replace function public._20260725_gal_reaction_counts(p_photos uuid[])
returns table (photo_id uuid, emoji text, total bigint, mine boolean)
language sql stable security definer set search_path = public as $$
  select r.photo_id, r.emoji, count(*), bool_or(r.member_id = auth.uid())
  from public._20260725_gal_reactions r
  where public._20260725_gal_can_view()
    and r.photo_id = any (p_photos)
    and (public._20260725_gal_is_admin() or public._20260725_gal_photo_visible(r.photo_id))
  group by r.photo_id, r.emoji
$$;

create or replace function public._20260725_gal_photo_comments(p_photo uuid)
returns table (id uuid, body text, created_at timestamptz, updated_at timestamptz, mine boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.body, c.created_at, c.updated_at, c.member_id = auth.uid()
  from public._20260725_gal_comments c
  where public._20260725_gal_can_view()
    and c.photo_id = p_photo
    and not c.hidden
    and public._20260725_gal_photo_visible(p_photo)
  order by c.created_at
$$;

commit;

-- Contrôle (attendu : Préparation masquée)
select name, sort_order, hidden from public._20260725_gal_albums order by sort_order, name;
