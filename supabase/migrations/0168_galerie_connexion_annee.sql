-- Galerie privée : connexion par année de naissance pour une liste blanche de personnes.
--
-- Une personne de la liste blanche (compte invité actif avec birth_year renseignée) saisit son e-mail
-- puis son année de naissance au lieu du code reçu par mail. Le contrôle est fait par la fonction
-- gallery-identify (clé service) via _20260725_gal_year_attempt, qui compte les essais de façon atomique :
-- 2 mauvaises années → blocage 1 h, la personne reçoit alors le code par mail et les admins une alerte.
--
-- Pas de policy anon_all : comme toutes les tables _20260725_gal_*, l'accès passe par la RLS
-- « membre / admin » de 0150 (l'admin modifie ces colonnes via sa policy admin_update).
begin;

alter table public._20260725_gal_members
  add column if not exists birth_year        smallint check (birth_year between 1900 and 2100),
  add column if not exists year_failures     smallint not null default 0,
  add column if not exists year_locked_until timestamptz;

comment on column public._20260725_gal_members.birth_year is
  'Liste blanche : année de naissance acceptée comme code de connexion (null = code par mail uniquement).';

-- Essai de connexion par année. Résultat : ok | wrong | locked | unavailable, et essais restants.
-- La ligne est verrouillée (for update) : des essais simultanés ne peuvent pas contourner la limite.
create or replace function public._20260725_gal_year_attempt(p_email text, p_year int)
returns table (result text, remaining int, member_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  m public._20260725_gal_members%rowtype;
  max_failures constant int := 2;
begin
  select * into m from public._20260725_gal_members
  where email = lower(trim(p_email)) for update;

  if not found or m.status <> 'active' or m.role <> 'guest' or m.birth_year is null then
    return query select 'unavailable'::text, 0, null::uuid; return;
  end if;

  if m.year_locked_until is not null and m.year_locked_until > now() then
    return query select 'locked'::text, 0, m.id; return;
  end if;

  if p_year = m.birth_year then
    update public._20260725_gal_members set year_failures = 0, year_locked_until = null where id = m.id;
    return query select 'ok'::text, max_failures, m.id; return;
  end if;

  if m.year_failures + 1 >= max_failures then
    update public._20260725_gal_members
      set year_failures = 0, year_locked_until = now() + interval '1 hour' where id = m.id;
    return query select 'locked'::text, 0, m.id; return;
  end if;

  update public._20260725_gal_members set year_failures = m.year_failures + 1 where id = m.id;
  return query select 'wrong'::text, max_failures - m.year_failures - 1, m.id;
end;
$$;

-- Réservée à la fonction serveur (clé service) : jamais appelable depuis le navigateur.
revoke all on function public._20260725_gal_year_attempt(text, int) from public, anon, authenticated;

commit;
