-- RLS pour les tables créées en 0120 (event_sequences, guest_sequences,
-- guest_checkins, guest_meal_choices) — même stratégie permissive que 0009.

alter table _20260725_event_sequences    enable row level security;
alter table _20260725_guest_sequences    enable row level security;
alter table _20260725_guest_checkins     enable row level security;
alter table _20260725_guest_meal_choices enable row level security;

alter table _20270628_event_sequences    enable row level security;
alter table _20270628_guest_sequences    enable row level security;
alter table _20270628_guest_checkins     enable row level security;
alter table _20270628_guest_meal_choices enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    '_20260725_event_sequences', '_20260725_guest_sequences',
    '_20260725_guest_checkins',  '_20260725_guest_meal_choices',
    '_20270628_event_sequences', '_20270628_guest_sequences',
    '_20270628_guest_checkins',  '_20270628_guest_meal_choices'
  ]) loop
    execute format(
      'create policy "anon_all" on %I for all to anon using (true) with check (true)',
      t
    );
  end loop;
end $$;
