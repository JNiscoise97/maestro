-- Dénormalise le statut fiançailles dans _20270628_guests pour éviter des requêtes N+1
-- dans la liste invités. Calculé une fois à la migration, mis à jour manuellement si besoin.

alter table _20270628_guests
  add column source_attendance text
  check (source_attendance in ('present', 'declined', 'no-show'));

update _20270628_guests w
set source_attendance = case
  when f.rsvp_status = 'declined'                                    then 'declined'
  when f.rsvp_status = 'confirmed' and f.checked_in_at is not null   then 'present'
  when f.rsvp_status = 'confirmed' and f.checked_in_at is null       then 'no-show'
  else null
end
from _20260725_guests f
where f.id = w.source_guest_id
  and w.source_guest_id is not null;
