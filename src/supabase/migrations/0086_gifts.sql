-- Suivi des cadeaux reçus par invité et état des remerciements.

create table _20260725_gifts (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references _20260725_guests(id) on delete cascade,
  description text not null,
  amount numeric(10,2),
  thankyou_sent boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table _20260725_gifts enable row level security;
create policy "fiance full access" on _20260725_gifts for all using (true);
