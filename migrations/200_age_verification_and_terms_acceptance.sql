-- Migration 200: Age verification snapshot + purchase terms acceptance on reservations.
-- Date: 2026-08-25
--
-- profiles.date_of_birth is self-declared and editable; the compliance snapshot lives
-- on order_reservations at reservation time.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;

COMMENT ON COLUMN profiles.date_of_birth IS
  'Självdeklarerat födelsedatum. Underlag för lagstadgad ålderskontroll enligt alkohollagen (20 år). Bevisvärdet ligger i ögonblicksbilden på order_reservations, inte här, eftersom användaren kan ändra detta fält.';

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS age_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS age_verified_dob date,
  ADD COLUMN IF NOT EXISTS age_verification_method text,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

COMMENT ON COLUMN order_reservations.age_verified_at IS
  'Tidsstämpel när ålderskontrollen godkändes vid reservation. Ögonblicksbild — ändras inte efter insert.';

COMMENT ON COLUMN order_reservations.age_verified_dob IS
  'Födelsedatum som användaren angav vid reservation. Ögonblicksbild — oberoende av framtida ändringar i profiles.date_of_birth.';

COMMENT ON COLUMN order_reservations.age_verification_method IS
  'Hur åldern verifierades. Tills vidare endast self_declared_dob. ID-kontroll vid leverans utförs av fraktpartnern och loggas inte här.';

COMMENT ON COLUMN order_reservations.terms_version IS
  'Version av köpvillkor som kunden godkände vid reservation (t.ex. 2026-09-01). NULL = reservation lagd innan villkoren fanns.';

COMMENT ON COLUMN order_reservations.terms_accepted_at IS
  'Tidsstämpel när kunden godkände köpvillkoren vid reservation.';

CREATE INDEX IF NOT EXISTS idx_order_reservations_age_verified_at
  ON order_reservations (age_verified_at);
