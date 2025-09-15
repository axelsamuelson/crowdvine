-- Migration to add homepage hero text fields to site_content table

-- Insert new content fields for homepage hero text
INSERT INTO site_content (key, value, type, description) VALUES
('homepage_hero_title', 'Refined. Minimal. Never boring.', 'text', 'Main hero title on homepage'),
('homepage_hero_subtitle', 'Furniture that speaks softly, but stands out loud.', 'text', 'First subtitle line on homepage'),
('homepage_hero_description_1', 'Clean lines, crafted with wit.', 'text', 'Second description line on homepage'),
('homepage_hero_description_2', 'Elegance with a wink — style first', 'text', 'Third description line on homepage')
ON CONFLICT (key) DO NOTHING;
