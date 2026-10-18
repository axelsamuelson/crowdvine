-- Additive. Run before the app deploy that reads countries.name_sv and producers.country.
-- Idempotent. Does not add CHECK or foreign key; those land in 221 after the app
-- only writes ISO codes that exist in countries.

ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS name_sv text;

UPDATE countries AS c
SET name_sv = v.name_sv
FROM (
  VALUES
    ('SE', 'Sverige'),
    ('NO', 'Norge'),
    ('DK', 'Danmark'),
    ('FI', 'Finland'),
    ('DE', 'Tyskland'),
    ('FR', 'Frankrike'),
    ('GB', 'Storbritannien'),
    ('ES', 'Spanien'),
    ('IT', 'Italien'),
    ('PT', 'Portugal'),
    ('AT', 'Österrike'),
    ('CH', 'Schweiz')
) AS v(code, name_sv)
WHERE c.code = v.code;

-- Used by an existing producer. Do nothing if the row is already there.
INSERT INTO countries (code, name, name_sv)
VALUES ('US', 'United States', 'USA')
ON CONFLICT (code) DO NOTHING;

-- If US already existed without a Swedish name, fill it without overwriting one.
UPDATE countries
SET name_sv = 'USA'
WHERE code = 'US' AND name_sv IS NULL;

-- Column already exists in production. This documents it.
ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS country text;

CREATE OR REPLACE FUNCTION producers_set_country_from_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT c.name_sv
  INTO NEW.country
  FROM countries c
  WHERE c.code = NEW.country_code;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS producers_set_country_from_code ON producers;
CREATE TRIGGER producers_set_country_from_code
  BEFORE INSERT OR UPDATE OF country_code
  ON producers
  FOR EACH ROW
  EXECUTE FUNCTION producers_set_country_from_code();

UPDATE producers
SET country = c.name_sv
FROM countries c
WHERE c.code = producers.country_code;

COMMENT ON COLUMN producers.country_code IS
  'ISO 3166-1 alpha-2, för logik';

COMMENT ON COLUMN producers.country IS
  'Svenskt visningsnamn, sätts av trigger, skriv aldrig direkt';
