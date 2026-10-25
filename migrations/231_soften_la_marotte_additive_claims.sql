-- Soften absolute additive claims on La Marotte producer bios (JSONB sv/en).
-- Producer URL slugs are derived from name at runtime; match by name.
UPDATE producers
SET short_description = (
  CASE
    WHEN jsonb_typeof(COALESCE(short_description, '{}'::jsonb)) = 'object'
      THEN short_description
    ELSE jsonb_build_object('sv', COALESCE(short_description::text, ''))
  END
  || jsonb_build_object(
    'sv',
    replace(
      COALESCE(
        CASE
          WHEN jsonb_typeof(COALESCE(short_description, '{}'::jsonb)) = 'object'
            THEN short_description->>'sv'
          ELSE short_description::text
        END,
        ''
      ),
      'utan tillsatser',
      'med få eller inga tillsatser'
    ),
    'en',
    replace(
      replace(
        COALESCE(
          CASE
            WHEN jsonb_typeof(COALESCE(short_description, '{}'::jsonb)) = 'object'
              THEN short_description->>'en'
            ELSE ''
          END,
          ''
        ),
        'without additives',
        'with few or no additives'
      ),
      'with no additives',
      'with few or no additives'
    )
  )
)
WHERE lower(name) = 'la marotte';
