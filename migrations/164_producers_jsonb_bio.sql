-- short_description = API bio_short; bio_long unchanged

ALTER TABLE producers
  ALTER COLUMN short_description TYPE JSONB
  USING CASE
    WHEN short_description IS NULL THEN NULL
    ELSE jsonb_build_object('sv', short_description)
  END;

ALTER TABLE producers
  ALTER COLUMN bio_long TYPE JSONB
  USING CASE
    WHEN bio_long IS NULL THEN NULL
    ELSE jsonb_build_object('sv', bio_long)
  END;
