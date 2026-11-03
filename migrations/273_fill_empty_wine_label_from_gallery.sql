-- PDP reads wine_images. Shop cards, producer pages, search and cart read
-- wines.label_image_path. A gallery photo with a blank label therefore shows
-- on the product page and nowhere else. Fill those blanks from the primary
-- gallery image, and keep a later save from clearing the label while a
-- gallery photo still exists. Existing non-empty labels are left as they are.

UPDATE wines w
SET label_image_path = img.image_path
FROM (
  SELECT DISTINCT ON (wine_id)
    wine_id,
    image_path
  FROM wine_images
  WHERE image_path IS NOT NULL
    AND btrim(image_path) <> ''
  ORDER BY wine_id, is_primary DESC NULLS LAST, sort_order ASC NULLS LAST
) img
WHERE w.id = img.wine_id
  AND (w.label_image_path IS NULL OR btrim(w.label_image_path) = '');

CREATE OR REPLACE FUNCTION public.fill_empty_wine_label_from_gallery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_path text;
BEGIN
  IF NEW.label_image_path IS NOT NULL AND btrim(NEW.label_image_path) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT i.image_path
  INTO next_path
  FROM wine_images i
  WHERE i.wine_id = NEW.id
    AND i.image_path IS NOT NULL
    AND btrim(i.image_path) <> ''
  ORDER BY i.is_primary DESC NULLS LAST, i.sort_order ASC NULLS LAST
  LIMIT 1;

  IF next_path IS NOT NULL THEN
    NEW.label_image_path := next_path;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_empty_wine_label_after_gallery_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target uuid;
  next_path text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.wine_id;
  ELSE
    target := NEW.wine_id;
  END IF;

  SELECT i.image_path
  INTO next_path
  FROM wine_images i
  WHERE i.wine_id = target
    AND i.image_path IS NOT NULL
    AND btrim(i.image_path) <> ''
  ORDER BY i.is_primary DESC NULLS LAST, i.sort_order ASC NULLS LAST
  LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    UPDATE wines
    SET label_image_path = COALESCE(next_path, '')
    WHERE id = target
      AND (
        label_image_path IS NULL
        OR btrim(label_image_path) = ''
        OR label_image_path = OLD.image_path
      );
  ELSE
    UPDATE wines
    SET label_image_path = next_path
    WHERE id = target
      AND next_path IS NOT NULL
      AND (label_image_path IS NULL OR btrim(label_image_path) = '');
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wines_fill_empty_label_from_gallery ON wines;
CREATE TRIGGER wines_fill_empty_label_from_gallery
  BEFORE INSERT OR UPDATE OF label_image_path ON wines
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_empty_wine_label_from_gallery();

DROP TRIGGER IF EXISTS wine_images_sync_empty_label ON wine_images;
CREATE TRIGGER wine_images_sync_empty_label
  AFTER INSERT OR UPDATE OR DELETE ON wine_images
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_empty_wine_label_after_gallery_write();

REVOKE EXECUTE ON FUNCTION public.fill_empty_wine_label_from_gallery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_empty_wine_label_after_gallery_write() FROM PUBLIC, anon, authenticated;
