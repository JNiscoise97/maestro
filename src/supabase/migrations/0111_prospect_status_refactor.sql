-- Refactoring des statuts de l'atelier
-- invite      → main_list, next_event → deferred, no → not_invited
-- Nouveaux : secondary_list, faire_part

-- ── Fiançailles ──────────────────────────────────────────────────────────────

do $$
declare
  v_con text;
begin
  if not exists (select 1 from information_schema.tables where table_name = '_20260725_prospect_guests') then
    return;
  end if;

  select conname into v_con
  from pg_constraint
  where conrelid = '_20260725_prospect_guests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if v_con is not null then
    execute 'alter table _20260725_prospect_guests drop constraint ' || quote_ident(v_con);
  end if;

  update _20260725_prospect_guests set status = 'main_list'   where status = 'invite';
  update _20260725_prospect_guests set status = 'deferred'    where status = 'next_event';
  update _20260725_prospect_guests set status = 'not_invited' where status = 'no';

  alter table _20260725_prospect_guests
    add constraint _20260725_prospect_guests_status_check
    check (status in ('pending', 'main_list', 'secondary_list', 'deferred', 'faire_part', 'not_invited'));
end $$;

-- ── Mariage ───────────────────────────────────────────────────────────────────

do $$
declare
  v_con text;
begin
  if not exists (select 1 from information_schema.tables where table_name = '_20270628_prospect_guests') then
    return;
  end if;

  select conname into v_con
  from pg_constraint
  where conrelid = '_20270628_prospect_guests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if v_con is not null then
    execute 'alter table _20270628_prospect_guests drop constraint ' || quote_ident(v_con);
  end if;

  update _20270628_prospect_guests set status = 'main_list'   where status = 'invite';
  update _20270628_prospect_guests set status = 'deferred'    where status = 'next_event';
  update _20270628_prospect_guests set status = 'not_invited' where status = 'no';

  alter table _20270628_prospect_guests
    add constraint _20270628_prospect_guests_status_check
    check (status in ('pending', 'main_list', 'secondary_list', 'deferred', 'faire_part', 'not_invited'));
end $$;
