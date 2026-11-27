-- Semaines : lancement d'une semaine en une seule opération (tout ou rien), au point hebdo.
--   <prefixe>sprint_launch(p_current, p_start, p_end, p_capacity, p_carry, p_to_backlog, p_picked) → id de la nouvelle semaine
--   · clôture la semaine en cours (p_current) — refusé si elle est déjà clôturée (point hebdo fait sur l'autre téléphone) ;
--     sans semaine en cours (premier lancement) : refusé si une semaine est déjà ouverte ;
--   · crée la nouvelle semaine avec la capacité de chacun ;
--   · p_carry : tâches reportées (compteur de reports + 1) ; p_to_backlog : renvoyées au backlog ; p_picked : prises du backlog.
-- Une erreur à n'importe quelle étape annule tout : aucune tâche ne peut rester rattachée à une semaine fermée.
-- Les deux déploiements (_20260725_ et _20270628_), si les tables de 0187 existent. Réexécutable.

-- Délimiteur nommé ($do$) : le corps contient « $fn$ » suivi de « $f$ », qui ne doivent pas former « $$ ».
do $do$
declare
  p text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    if to_regclass(format('public.%ssprints', p)) is null then
      continue;
    end if;

    execute format($f$
      create or replace function public.%1$ssprint_launch(
        p_current uuid, p_start date, p_end date, p_capacity jsonb,
        p_carry uuid[], p_to_backlog uuid[], p_picked uuid[]
      ) returns uuid language plpgsql as $fn$
      declare
        v_id uuid;
      begin
        if p_current is not null then
          update public.%1$ssprints set closed_at = now() where id = p_current and closed_at is null;
          if not found then raise exception 'sprint_already_closed'; end if;
        elsif exists (select 1 from public.%1$ssprints where closed_at is null) then
          raise exception 'sprint_already_open';
        end if;

        insert into public.%1$ssprints (start_date, end_date, capacity)
          values (p_start, p_end, coalesce(p_capacity, '{}'::jsonb)) returning id into v_id;

        update public.%1$ssprint_tasks set sprint_id = v_id, carry_count = carry_count + 1, updated_at = now()
          where id = any(coalesce(p_carry, '{}'::uuid[]));
        update public.%1$ssprint_tasks set sprint_id = null, status = 'todo', submitted_by = null, blocked_reason = null, updated_at = now()
          where id = any(coalesce(p_to_backlog, '{}'::uuid[]));
        update public.%1$ssprint_tasks set sprint_id = v_id, status = 'todo', updated_at = now()
          where id = any(coalesce(p_picked, '{}'::uuid[]));
        return v_id;
      end
      $fn$
    $f$, p);

    execute format('grant execute on function public.%ssprint_launch(uuid, date, date, jsonb, uuid[], uuid[], uuid[]) to anon, authenticated', p);
  end loop;
end
$do$;
