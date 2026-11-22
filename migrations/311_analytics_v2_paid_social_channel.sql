-- Analytics V2 etapp 2 H12: treat paid_social / paid-social / paidsocial as Kampanj (paid)
-- ONLY in analytics_v2_channel. Prod analytics_channel is intentionally unchanged.

CREATE OR REPLACE FUNCTION analytics_v2_channel(
  referrer text,
  utm_source text,
  utm_medium text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
DECLARE
  host text;
  src text;
  med text;
BEGIN
  host := lower(
    regexp_replace(
      COALESCE(
        substring(nullif(btrim(referrer), '') FROM '://([^/?#:]+)'),
        CASE
          WHEN nullif(btrim(referrer), '') IS NULL THEN NULL
          WHEN btrim(referrer) ~* '^https?://' THEN NULL
          ELSE split_part(split_part(lower(btrim(referrer)), '/', 1), '?', 1)
        END
      ),
      '^www\.',
      ''
    )
  );
  IF host = '' THEN
    host := NULL;
  END IF;

  src := nullif(lower(btrim(COALESCE(utm_source, ''))), '');
  med := nullif(lower(btrim(COALESCE(utm_medium, ''))), '');

  -- 1. Internal
  IF host IS NOT NULL AND (
    host = 'pactwines.com'
    OR host LIKE '%.pactwines.com'
    OR host = 'dirtywine.se'
    OR host LIKE '%.dirtywine.se'
  ) THEN
    RETURN 'internal';
  END IF;

  -- 2. Paid
  IF med IN ('cpc', 'ppc', 'paid', 'paid_social', 'paid-social', 'paidsocial', 'display') THEN
    RETURN 'paid';
  END IF;

  -- 3. Social — host/domain boundaries; utm exact tokens (incl. exact "x");
  --    NEVER substring t\.co (would match chatgpt.com). Use host = t.co.
  IF med IN ('social', 'social-organic')
     OR (
       host IS NOT NULL AND (
         host = 't.co'
         OR host ~ '(^|\.)t\.co$'
         OR host ~* '(^|\.)(instagram\.com|facebook\.com|fb\.com|tiktok\.com|linkedin\.com|twitter\.com|x\.com|threads\.net|pinterest\.com|reddit\.com|snapchat\.com)$'
         OR host ~* '(^|\.)(instagram|facebook|tiktok|linkedin|twitter|threads|pinterest|reddit|snapchat)\.'
       )
     )
     OR (
       src IS NOT NULL AND (
         src IN (
           'instagram', 'facebook', 'fb', 'ig', 'tiktok', 'linkedin',
           'twitter', 'x', 'x.com', 'twitter.com', 'pinterest',
           'threads', 'snapchat', 'reddit'
         )
         OR src ~ '^(ig|fb|tt)$'
       )
     )
  THEN
    RETURN 'social';
  END IF;

  -- 4. Organic (incl. brave, qwant)
  IF med IN ('organic', 'seo')
     OR (
       src IS NOT NULL AND src IN (
         'google', 'bing', 'duckduckgo', 'yahoo', 'baidu', 'ecosia',
         'yandex', 'brave', 'qwant'
       )
     )
     OR (
       host IS NOT NULL AND (
         host ~* '(^|\.)(google\.|bing\.|duckduckgo\.|yahoo\.|baidu\.|ecosia\.|yandex\.|brave\.|qwant\.)'
         OR host ~* '(brave|qwant)'
       )
     )
  THEN
    RETURN 'organic';
  END IF;

  -- 5. AI (after social/organic; chatgpt.com is AI, not social)
  IF (
       src IS NOT NULL AND src ~* '(chatgpt|openai|perplexity|claude|gemini|copilot|you\.com|phind)'
     )
     OR (
       host IS NOT NULL AND host ~* '(chatgpt|openai|perplexity|claude|gemini|copilot|you\.com|phind)'
     )
  THEN
    RETURN 'ai';
  END IF;

  -- 6. Referral: other external host, or tagged UTM that did not match above
  IF host IS NOT NULL OR src IS NOT NULL OR med IS NOT NULL THEN
    RETURN 'referral';
  END IF;

  -- 7. Direct
  RETURN 'direct';
END;
$$;


COMMENT ON FUNCTION analytics_v2_channel(text, text, text) IS
  'V2 channel classifier. Order: internal, paid (incl. paid_social/paid-social/paidsocial), social, organic, ai, referral, direct. Prod analytics_channel unchanged.';

REVOKE ALL ON FUNCTION analytics_v2_channel(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_channel(text, text, text) TO service_role;
