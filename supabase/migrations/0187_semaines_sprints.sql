-- Semaines (page /semaines, fiancés seulement) : organisation agile semaine par semaine jusqu'au mariage.
--   · sprints      : une semaine de travail (jeudi → mercredi), capacité de chacun en points, clôture au point hebdo ;
--   · sprint_tasks : le backlog et les tâches des sprints (sprint_id vide = backlog).
-- Points Fibonacci 1, 2, 3, 5, 8 ; 13 = « trop gros, à découper » (ne peut pas entrer dans un sprint).
-- Porteur (owner) : id d'un fiancé (people) ou 'both' (à deux, compte dans la capacité de chacun).
-- « À valider » → « Terminée » : seulement par l'autre fiancé que celui qui l'a soumise (submitted_by), contrôlé par l'appli.
-- Créé pour les deux déploiements (fiançailles _20260725_ et mariage _20270628_). RLS + politique anon_all
-- (l'appli écrit avec la clé anonyme). Réexécutable.

do $$
declare
  p text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    if to_regclass(format('public.%speople', p)) is null then
      continue;
    end if;

    execute format($f$
      create table if not exists public.%1$ssprints (
        id          uuid primary key default gen_random_uuid(),
        start_date  date not null,
        end_date    date not null,
        -- Capacité de la semaine par fiancé : { "<person id>": points }.
        capacity    jsonb not null default '{}'::jsonb,
        closed_at   timestamptz,
        created_at  timestamptz not null default now()
      )$f$, p);

    execute format($f$
      create table if not exists public.%1$ssprint_tasks (
        id              uuid primary key default gen_random_uuid(),
        title           text not null,
        notes           text,
        points          int check (points in (1, 2, 3, 5, 8, 13)),
        owner           text,
        pole_id         uuid,
        deadline        date,
        status          text not null default 'todo'
                          check (status in ('todo', 'in_progress', 'discuss', 'review', 'done', 'blocked')),
        sort_order      double precision not null default 0,
        sprint_id       uuid references public.%1$ssprints(id) on delete set null,
        blocked_reason  text,
        -- Nombre de fois où la tâche a été reportée d'un sprint au suivant.
        carry_count     int not null default 0,
        -- Tâche d'origine quand elle a été découpée.
        parent_title    text,
        submitted_by    text,
        validated_by    text,
        done_at         timestamptz,
        created_at      timestamptz not null default now(),
        updated_at      timestamptz not null default now()
      )$f$, p);
    execute format('create index if not exists %1$ssprint_tasks_sprint_idx on public.%1$ssprint_tasks (sprint_id)', p);

    execute format('alter table public.%ssprints enable row level security', p);
    execute format('drop policy if exists "anon_all" on public.%ssprints', p);
    execute format('create policy "anon_all" on public.%ssprints for all to anon, authenticated using (true) with check (true)', p);

    execute format('alter table public.%ssprint_tasks enable row level security', p);
    execute format('drop policy if exists "anon_all" on public.%ssprint_tasks', p);
    execute format('create policy "anon_all" on public.%ssprint_tasks for all to anon, authenticated using (true) with check (true)', p);
  end loop;
end
$$;
