-- Journal de l'invitation (Invités › Invitations › Journal) lisible depuis l'appli mariage.
--
-- Le journal de la galerie (_20260725_gal_activity) et ses comptes (_20260725_gal_members) restent en RLS
-- stricte (lecture réservée à une session administrateur de la galerie). L'appli mariage, elle, n'a pas de
-- session galerie : cette fonction expose seulement le strict nécessaire au journal (choix validé) :
--   · connexions et retours sur l'invitation (details.source = 'invitation') ;
--   · pour chaque événement : identifiant du compte, prénom, nom, guest_id et rôle (jamais l'e-mail).
-- Pas de table créée : pas de politique RLS à ajouter.

create or replace function public._20260725_gal_invitation_journal(p_limit int default 1000)
returns table (
  id         bigint,
  created_at timestamptz,
  event      text,
  member_id  uuid,
  first_name text,
  last_name  text,
  guest_id   uuid,
  role       text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.created_at, a.event, a.member_id, m.first_name, m.last_name, m.guest_id, m.role
  from public._20260725_gal_activity a
  left join public._20260725_gal_members m on m.id = a.member_id
  where a.event in ('login', 'visit')
    and a.details->>'source' = 'invitation'
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 1000), 1), 5000)
$$;

revoke all on function public._20260725_gal_invitation_journal(int) from public;
grant execute on function public._20260725_gal_invitation_journal(int) to anon, authenticated;
