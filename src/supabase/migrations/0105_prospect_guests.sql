-- Vivier de candidats invités : liste de réflexion pré-invitation

create table _20270628_prospect_guests (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  group_name  text,
  notes       text,
  status      text not null default 'pending'
              check (status in ('pending', 'no', 'next_event', 'invite')),
  created_at  timestamptz not null default now()
);

alter table _20270628_prospect_guests enable row level security;
create policy "full access" on _20270628_prospect_guests for all using (true);
