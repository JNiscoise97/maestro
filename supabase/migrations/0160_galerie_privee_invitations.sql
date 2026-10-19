-- 0160_galerie_privee_invitations.sql
-- Suivi « lien de la galerie envoyé » par invité des fiançailles (colonne 2 du kanban de la page Album).
-- Une ligne = le lien a été envoyé à cet invité (_20260725_guests.id). Réservé aux administrateurs.
-- Réexécutable sans risque.

begin;

create table if not exists public._20260725_gal_invitations (
  guest_id uuid primary key,
  sent_at  timestamptz not null default now(),
  sent_by  uuid references public._20260725_gal_members(id) on delete set null
);

alter table public._20260725_gal_invitations enable row level security;
revoke all on public._20260725_gal_invitations from anon;

drop policy if exists "admin_all" on public._20260725_gal_invitations;
create policy "admin_all" on public._20260725_gal_invitations for all to authenticated
  using (public._20260725_gal_is_admin()) with check (public._20260725_gal_is_admin());

commit;

-- Contrôle (attendu : 0 au départ)
select count(*) as liens_envoyes from public._20260725_gal_invitations;
