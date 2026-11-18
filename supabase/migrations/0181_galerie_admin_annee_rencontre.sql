-- 0181_galerie_admin_annee_rencontre.sql
-- Dérogation : le compte administrateur sj18082020@gmail.com se connecte avec l'année de rencontre
-- au lieu du code par mail (même mécanisme que la liste blanche « année de naissance » de 0168).
--
--   · year_kind : 'birth' (année de naissance, invités) ou 'meeting' (année de rencontre) ; l'écran de
--     connexion adapte son texte ;
--   · _20260725_gal_year_attempt accepte désormais un administrateur, seulement avec year_kind = 'meeting' ;
--     pour un administrateur, 2 mauvaises années bloquent la connexion par année 24 h (1 h pour un invité),
--     la personne reçoit alors le code par mail et les admins une alerte.
--
-- Pas de policy anon_all : comme toutes les tables _20260725_gal_*, l'accès passe par la RLS
-- « membre / admin » de 0150. Réexécutable sans risque.
-- Après cette migration : redéployer la fonction gallery-identify.
begin;

alter table public._20260725_gal_members
  add column if not exists year_kind text not null default 'birth';
alter table public._20260725_gal_members drop constraint if exists _20260725_gal_members_year_kind_check;
alter table public._20260725_gal_members
  add constraint _20260725_gal_members_year_kind_check check (year_kind in ('birth', 'meeting'));

comment on column public._20260725_gal_members.year_kind is
  'Nature de birth_year pour la connexion par année : birth (année de naissance) ou meeting (année de rencontre).';

create or replace function public._20260725_gal_year_attempt(p_email text, p_year int)
returns table (result text, remaining int, member_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  m public._20260725_gal_members%rowtype;
  max_failures constant int := 2;
  lock_for interval;
begin
  select * into m from public._20260725_gal_members
  where email = lower(trim(p_email)) for update;

  if not found or m.status <> 'active' or m.birth_year is null
     or not (m.role = 'guest' or (m.role = 'admin' and m.year_kind = 'meeting')) then
    return query select 'unavailable'::text, 0, null::uuid; return;
  end if;

  lock_for := case when m.role = 'admin' then interval '24 hours' else interval '1 hour' end;

  if m.year_locked_until is not null and m.year_locked_until > now() then
    return query select 'locked'::text, 0, m.id; return;
  end if;

  if p_year = m.birth_year then
    update public._20260725_gal_members set year_failures = 0, year_locked_until = null where id = m.id;
    return query select 'ok'::text, max_failures, m.id; return;
  end if;

  if m.year_failures + 1 >= max_failures then
    update public._20260725_gal_members
      set year_failures = 0, year_locked_until = now() + lock_for where id = m.id;
    return query select 'locked'::text, 0, m.id; return;
  end if;

  update public._20260725_gal_members set year_failures = m.year_failures + 1 where id = m.id;
  return query select 'wrong'::text, max_failures - m.year_failures - 1, m.id;
end;
$$;

-- Réservée à la fonction serveur (clé service) : jamais appelable depuis le navigateur.
revoke all on function public._20260725_gal_year_attempt(text, int) from public, anon, authenticated;

commit;

-- À exécuter à part, dans l'éditeur SQL, en remplaçant AAAA par l'année de rencontre
-- (ne pas écrire l'année dans ce fichier : il est versionné) :
--
-- update public._20260725_gal_members
--   set birth_year = AAAA, year_kind = 'meeting', year_failures = 0, year_locked_until = null
-- where email = 'sj18082020@gmail.com';
--
-- Revenir au code par mail : set birth_year = null, year_kind = 'birth'.
