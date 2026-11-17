-- 0180_langue_invitation.sql
-- Langue de l'invitation en ligne (/Sarah-Jordan-2027/invitation), choisie par invité dans
-- Invités › Invitations : 'fr' ou 'en' ; null = français.
-- (primary_language reste la « langue principale » descriptive de la fiche invité.)
-- Pour chaque déploiement ayant des invités. Réexécutable sans risque.

do $$
declare p text; g text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    g := p || 'guests';
    if to_regclass('public.' || g) is null then continue; end if;

    execute format('alter table public.%I add column if not exists invitation_language text', g);
    execute format('alter table public.%I drop constraint if exists %I', g, g || '_invitation_language_check');
    execute format($f$alter table public.%I add constraint %I check (invitation_language in ('fr', 'en'))$f$,
      g, g || '_invitation_language_check');

    execute format('alter table public.%I enable row level security', g);
    execute format('drop policy if exists "anon_all" on public.%I', g);
    execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', g);
  end loop;
end $$;

-- Invités anglophones (mariage) : Pratheeba KUMARAVEL, Matthew HENNESSY, Savita SOOKNARINE
update public._20270628_guests set invitation_language = 'en'
where id in ('45567346-81ba-4669-9bb2-a72c4ac1e1c0', '9af0151a-4d35-4ff6-a2f2-ca5bea86b1cb', '8acdbc25-0d64-4f93-8bb0-05980fff077f');

-- Contrôle (mariage) : répartition des langues
select coalesce(invitation_language, 'fr (défaut)') as langue, count(*) from public._20270628_guests group by 1;
