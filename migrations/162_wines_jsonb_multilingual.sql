-- Konvertera textfält till JSONB med språkstöd
-- Befintligt innehåll migreras till "sv" som default-språk

-- summary
ALTER TABLE wines 
  ALTER COLUMN summary TYPE JSONB 
  USING CASE 
    WHEN summary IS NULL THEN NULL
    ELSE jsonb_build_object('sv', summary)
  END;

-- description  
ALTER TABLE wines 
  ALTER COLUMN description TYPE JSONB 
  USING CASE 
    WHEN description IS NULL THEN NULL
    ELSE jsonb_build_object('sv', description)
  END;

-- tasting_notes
ALTER TABLE wines 
  ALTER COLUMN tasting_notes TYPE JSONB 
  USING CASE 
    WHEN tasting_notes IS NULL THEN NULL
    ELSE jsonb_build_object('sv', tasting_notes)
  END;

-- ageing
ALTER TABLE wines 
  ALTER COLUMN ageing TYPE JSONB 
  USING CASE 
    WHEN ageing IS NULL THEN NULL
    ELSE jsonb_build_object('sv', ageing)
  END;

-- winemaker_notes
ALTER TABLE wines 
  ALTER COLUMN winemaker_notes TYPE JSONB 
  USING CASE 
    WHEN winemaker_notes IS NULL THEN NULL
    ELSE jsonb_build_object('sv', winemaker_notes)
  END;

-- food_pairing (TEXT[] → JSONB)
ALTER TABLE wines 
  ALTER COLUMN food_pairing TYPE JSONB 
  USING CASE 
    WHEN food_pairing IS NULL THEN NULL
    ELSE jsonb_build_object('sv', to_jsonb(food_pairing))
  END;

-- awards (TEXT[] → JSONB)
ALTER TABLE wines 
  ALTER COLUMN awards TYPE JSONB 
  USING CASE 
    WHEN awards IS NULL THEN NULL
    ELSE jsonb_build_object('sv', to_jsonb(awards))
  END;

-- Ta bort gamla index på description (btree på JSONB fungerar inte)
DROP INDEX IF EXISTS idx_wines_description;
DROP INDEX IF EXISTS idx_wines_description_html;

-- Skapa GIN-index för JSONB-sökning
CREATE INDEX IF NOT EXISTS idx_wines_summary_jsonb 
  ON wines USING GIN (summary);
CREATE INDEX IF NOT EXISTS idx_wines_tasting_notes_jsonb 
  ON wines USING GIN (tasting_notes);
