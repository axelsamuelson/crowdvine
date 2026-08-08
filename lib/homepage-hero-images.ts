/** Default static assets for the three homepage hero frames. */
export const HOMEPAGE_HERO_IMAGE_DEFAULTS = [
  "/images/hero_bild_5.webp",
  "/images/hero_bild_4.webp",
  "/images/hero-side-2.png",
] as const;

export const HOMEPAGE_HERO_IMAGE_KEYS = [
  "homepage_hero_image_1",
  "homepage_hero_image_2",
  "homepage_hero_image_3",
] as const;

export type HomepageHeroImageKey = (typeof HOMEPAGE_HERO_IMAGE_KEYS)[number];

export const HOMEPAGE_HERO_IMAGE_LABELS: Record<
  HomepageHeroImageKey,
  { title: string; description: string }
> = {
  homepage_hero_image_1: {
    title: "Hero image 1 (left)",
    description: "Left frame in the homepage hero",
  },
  homepage_hero_image_2: {
    title: "Hero image 2 (center)",
    description: "Center frame in the homepage hero",
  },
  homepage_hero_image_3: {
    title: "Hero image 3 (right)",
    description: "Right frame in the homepage hero",
  },
};
