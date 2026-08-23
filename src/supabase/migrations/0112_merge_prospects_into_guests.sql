-- Fusion prospect_guests → guests
-- Ajoute prospect_status sur guests (défaut main_list = invités historiques confirmés)
-- Migre les candidats de l'atelier dans guests
-- Supprime prospect_guests

-- ── Fiançailles ───────────────────────────────────────────────────────────────

do $$ begin

  if exists (select 1 from information_schema.tables where table_name = '_20260725_guests') then

    alter table _20260725_guests
      add column if not exists prospect_status text not null default 'main_list'
      check (prospect_status in ('pending','main_list','secondary_list','deferred','faire_part','not_invited'));

  end if;

  if exists (select 1 from information_schema.tables where table_name = '_20260725_prospect_guests') then

    insert into _20260725_guests (first_name, last_name, group_id, prospect_status, notes)
    select
      pg.full_name,
      '',
      gg.id,
      case pg.status
        when 'invite'      then 'main_list'
        when 'next_event'  then 'deferred'
        when 'no'          then 'not_invited'
        else pg.status
      end,
      pg.notes
    from _20260725_prospect_guests pg
    left join _20260725_guest_groups gg on gg.family_name = pg.group_name;

    drop table _20260725_prospect_guests;

  end if;

end $$;

-- ── Mariage ───────────────────────────────────────────────────────────────────

do $$ begin

  if exists (select 1 from information_schema.tables where table_name = '_20270628_guests') then

    alter table _20270628_guests
      add column if not exists prospect_status text not null default 'main_list'
      check (prospect_status in ('pending','main_list','secondary_list','deferred','faire_part','not_invited'));

  end if;

  if exists (select 1 from information_schema.tables where table_name = '_20270628_prospect_guests') then

    insert into _20270628_guests (first_name, last_name, group_id, prospect_status, notes)
    select
      pg.full_name,
      '',
      gg.id,
      case pg.status
        when 'invite'      then 'main_list'
        when 'next_event'  then 'deferred'
        when 'no'          then 'not_invited'
        else pg.status
      end,
      pg.notes
    from _20270628_prospect_guests pg
    left join _20270628_guest_groups gg on gg.family_name = pg.group_name;

    drop table _20270628_prospect_guests;

  end if;

end $$;
