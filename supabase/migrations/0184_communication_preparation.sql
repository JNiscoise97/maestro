-- Invités › Communications : préparation de l'envoi, invité par invité et communication par communication.
--   · ready  : invitation prête à être envoyée (case cochée à la main) ;
--   · sender : qui se charge de l'envoi ('sarah' ou 'jordan', null = pas encore attribué).
-- Les inséparables (paired_with_id) reçoivent les mêmes valeurs (fait par l'appli).
-- Créée pour les deux déploiements (fiançailles _20260725_ et mariage _20270628_), si leur table de
-- communications existe. RLS + politique anon_all (l'appli écrit avec la clé anonyme). Réexécutable.

do $$
declare
  p text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    if to_regclass(format('public.%scommunications', p)) is null then
      continue;
    end if;

    execute format($f$
      create table if not exists public.%1$scommunication_prep (
        communication_id uuid not null references public.%1$scommunications(id) on delete cascade,
        guest_id         uuid not null references public.%1$sguests(id) on delete cascade,
        ready            boolean not null default false,
        sender           text check (sender in ('sarah', 'jordan')),
        updated_at       timestamptz not null default now(),
        primary key (communication_id, guest_id)
      )$f$, p);

    execute format('alter table public.%scommunication_prep enable row level security', p);
    execute format('drop policy if exists "anon_all" on public.%scommunication_prep', p);
    execute format('create policy "anon_all" on public.%scommunication_prep for all to anon, authenticated using (true) with check (true)', p);
  end loop;
end
$$;
