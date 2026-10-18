-- Run only after the app that normalizes producer country codes is deployed.
-- Aborts if any producer row would violate the new rules.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM producers
    WHERE country_code !~ '^[A-Z]{2}$'
       OR country_code NOT IN (SELECT code FROM countries)
  ) THEN
    RAISE EXCEPTION 'Ogiltiga country_code finns';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'producers_country_code_iso_check'
  ) THEN
    ALTER TABLE producers
      ADD CONSTRAINT producers_country_code_iso_check
      CHECK (country_code ~ '^[A-Z]{2}$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'producers_country_code_fkey'
  ) THEN
    ALTER TABLE producers
      ADD CONSTRAINT producers_country_code_fkey
      FOREIGN KEY (country_code) REFERENCES countries (code);
  END IF;
END $$;
