-- Refactor cadeaux : un cadeau peut être offert par plusieurs invités.
-- On retire guest_id de gifts et on crée une table de jointure.

ALTER TABLE _20260725_gifts DROP COLUMN IF EXISTS guest_id;

CREATE TABLE _20260725_gift_guests (
  gift_id  uuid NOT NULL REFERENCES _20260725_gifts(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES _20260725_guests(id) ON DELETE CASCADE,
  PRIMARY KEY (gift_id, guest_id)
);

ALTER TABLE _20260725_gift_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiance full access" ON _20260725_gift_guests FOR ALL USING (true);
