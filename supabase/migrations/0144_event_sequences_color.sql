-- 0144_event_sequences_color.sql
-- Couleur d'une séquence, réutilisée partout où son nom apparaît
-- (rétroplanning, missions, invités, conducteur, calendrier…).
-- Format #RRGGBB, configurable dans Paramètres › Séquences.
-- Colonne ajoutée à une table existante : RLS inchangée.

alter table public._20270628_event_sequences
  add column if not exists color text null
    check (color is null or color ~ '^#[0-9a-fA-F]{6}$');

alter table public._20260725_event_sequences
  add column if not exists color text null
    check (color is null or color ~ '^#[0-9a-fA-F]{6}$');

-- Couleurs initiales (modifiables ensuite dans les paramètres).
update public._20270628_event_sequences set color = v.color
from (values
  ('443599cb-aec3-4071-9e55-5af87663ca58'::uuid, '#2563eb'),  -- Mariage civil
  ('579716f5-2616-4dc0-ba77-133ed8826510'::uuid, '#ca8a04'),  -- Goûter d'honneur
  ('5347d0f2-31b0-4e69-9a8f-f6f3d10c0969'::uuid, '#16a34a'),  -- Moment convivial entre amis
  ('52990fa4-fc1e-4b99-b51d-50b1efef38a9'::uuid, '#0891b2'),  -- Pique-nique partagé
  ('493c6164-7ff2-4c87-a037-b59c6bcfe008'::uuid, '#ea580c'),  -- Bénédiction au khane
  ('baf9abc9-74fb-4273-a9ff-cd60a64bf5ec'::uuid, '#db2777'),  -- Bénédiction à l'église
  ('c14a9820-2d9f-466f-9d19-1b732b2733c1'::uuid, '#7c3aed')   -- Célébration de mariage
) as v(id, color)
where public._20270628_event_sequences.id = v.id
  and public._20270628_event_sequences.color is null;

update public._20260725_event_sequences
set color = '#db2777'
where id = '1a2e3bdf-ec22-4263-9bf8-8fe9de5fb576' and color is null;  -- Fiançailles
