-- Konvertera soil_type och additives till JSONB

ALTER TABLE wines
  ALTER COLUMN soil_type TYPE JSONB
  USING CASE
    WHEN soil_type IS NULL THEN NULL
    ELSE jsonb_build_object('sv', soil_type)
  END;

ALTER TABLE wines
  ALTER COLUMN additives TYPE JSONB
  USING CASE
    WHEN additives IS NULL THEN NULL
    ELSE jsonb_build_object('sv', additives)
  END;
