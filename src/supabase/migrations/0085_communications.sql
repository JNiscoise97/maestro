-- Communications (J-30, J-15, rappel menu, etc.) et suivi d'envoi par invité.

create table _20260725_communications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order bigint not null default extract(epoch from now()),
  created_at timestamptz not null default now()
);

create table _20260725_communication_sends (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references _20260725_communications(id) on delete cascade,
  guest_id uuid not null references _20260725_guests(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique(communication_id, guest_id)
);

alter table _20260725_communications enable row level security;
create policy "fiance full access" on _20260725_communications for all using (true);

alter table _20260725_communication_sends enable row level security;
create policy "fiance full access" on _20260725_communication_sends for all using (true);
