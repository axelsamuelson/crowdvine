-- Remove Starwinelist sources that are 404 page ids (numeric slug only).
-- These should not be shown or stored; listStarwinelistSources and crawler now filter them.
DELETE FROM starwinelist_sources
WHERE slug ~ '^\d+$';
