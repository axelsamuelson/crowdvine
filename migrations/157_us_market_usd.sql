-- US commerce: display and charge in USD (was seeded as SEK during phase 1).

UPDATE markets
SET currency_code = 'USD',
    updated_at = now()
WHERE code = 'US'
  AND upper(trim(currency_code)) = 'SEK';

UPDATE geo_zones
SET currency_code = 'USD',
    updated_at = now()
WHERE (upper(trim(country_code)) = 'US' OR upper(trim(market_code)) = 'US')
  AND (currency_code IS NULL OR upper(trim(currency_code)) = 'SEK');
