-- Wine settings: configurable values for wine display (e.g. few-left threshold)
-- Uses site_content for storage

INSERT INTO site_content (key, value, type, description) VALUES
('wine_few_left_threshold', '5', 'number', 'B2B stock threshold: when b2b_stock <= this value, show "Few left" badge. Default 5.')
ON CONFLICT (key) DO NOTHING;
