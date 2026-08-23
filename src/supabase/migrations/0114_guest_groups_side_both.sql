-- Ajoute la valeur 'both' (côté commun) à la contrainte side sur guest_groups.

do $$
declare v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = '_20260725_guest_groups'::regclass and contype = 'c' and conname like '%side%';
  if v_conname is not null then
    execute format('alter table _20260725_guest_groups drop constraint %I', v_conname);
  end if;
  alter table _20260725_guest_groups
    add constraint _20260725_guest_groups_side_chk check (side in ('jordan', 'sarah', 'both'));
end $$;

do $$
declare v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = '_20270628_guest_groups'::regclass and contype = 'c' and conname like '%side%';
  if v_conname is not null then
    execute format('alter table _20270628_guest_groups drop constraint %I', v_conname);
  end if;
  alter table _20270628_guest_groups
    add constraint _20270628_guest_groups_side_chk check (side in ('jordan', 'sarah', 'both'));
end $$;
