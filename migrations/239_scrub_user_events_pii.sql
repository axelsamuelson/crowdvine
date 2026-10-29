-- =============================================================================
-- GDPR: Scrub personal data from user_events.event_metadata
-- =============================================================================
-- DO NOT run automatically against production from CI/agents.
-- Owner should review and run manually in the Supabase SQL editor (or psql)
-- after deploying the code that stops writing PII.
--
-- Removes plain-text PII that historically landed in checkout analytics:
--   full_name, email, phone, street, city, date_of_birth, and formatted postal
-- (keeps postal digits when the value is digits-only).
-- =============================================================================

BEGIN;

-- Preview (optional): count rows that still look like they contain PII
-- SELECT count(*) FROM user_events
-- WHERE event_metadata ?| array['full_name','email','phone','street','date_of_birth']
--    OR (event_metadata ? 'postal' AND coalesce(event_metadata->>'postal','') !~ '^[0-9]+$');

UPDATE user_events
SET event_metadata =
  (
    -- Drop known PII keys
    (event_metadata
      - 'full_name'
      - 'email'
      - 'phone'
      - 'street'
      - 'city'
      - 'date_of_birth'
      - 'dob'
      - 'name'
      - 'address'
      - 'first_name'
      - 'last_name'
      - 'mobile'
      - 'telephone'
    )
    -- Promote digits-only postal into postal_digits; drop free-text postal
    || CASE
      WHEN event_metadata ? 'postal'
        AND coalesce(event_metadata->>'postal', '') ~ '^[0-9]{2,10}$'
      THEN jsonb_build_object(
        'postal_digits', event_metadata->>'postal',
        'has_postal', true
      )
      WHEN event_metadata ? 'postal'
      THEN jsonb_build_object(
        'has_postal',
        length(trim(coalesce(event_metadata->>'postal', ''))) > 0
      )
      ELSE '{}'::jsonb
    END
    -- Reconstruct field-filled booleans from historical string values when present
    || jsonb_strip_nulls(
      jsonb_build_object(
        'has_full_name',
          CASE
            WHEN event_metadata ? 'full_name'
            THEN length(trim(coalesce(event_metadata->>'full_name', ''))) > 0
            ELSE NULL
          END,
        'has_email',
          CASE
            WHEN event_metadata ? 'email'
            THEN length(trim(coalesce(event_metadata->>'email', ''))) > 0
            ELSE NULL
          END,
        'has_phone',
          CASE
            WHEN event_metadata ? 'phone'
            THEN length(trim(coalesce(event_metadata->>'phone', ''))) > 0
            ELSE NULL
          END,
        'has_street',
          CASE
            WHEN event_metadata ? 'street'
            THEN length(trim(coalesce(event_metadata->>'street', ''))) > 0
            ELSE NULL
          END,
        'has_city',
          CASE
            WHEN event_metadata ? 'city'
            THEN length(trim(coalesce(event_metadata->>'city', ''))) > 0
            ELSE NULL
          END,
        'has_date_of_birth',
          CASE
            WHEN event_metadata ? 'date_of_birth'
              OR event_metadata ? 'dob'
            THEN true
            ELSE NULL
          END
      )
    )
  )
  - 'postal'
WHERE
  event_metadata ?| array[
    'full_name',
    'email',
    'phone',
    'street',
    'city',
    'date_of_birth',
    'dob',
    'name',
    'address',
    'first_name',
    'last_name',
    'mobile',
    'telephone',
    'postal'
  ];

COMMIT;

-- After running, spot-check:
-- SELECT event_type, event_metadata
-- FROM user_events
-- WHERE event_type IN (
--   'checkout_abandoned',
--   'checkout_delivery_captured',
--   'age_confirmed',
--   'age_confirmation_failed',
--   'checkout_postal_started',
--   'checkout_zone_error'
-- )
-- ORDER BY created_at DESC
-- LIMIT 50;
