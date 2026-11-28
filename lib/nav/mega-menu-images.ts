import type { AppLocale } from "@/lib/i18n/locale";

/**
 * Fifth mega-menu column. Off unless the build is started with
 * NEXT_PUBLIC_MEGA_MENU_IMAGES=1.
 */
export const MEGA_MENU_IMAGES =
  process.env.NEXT_PUBLIC_MEGA_MENU_IMAGES === "1";

export type MegaMenuImageTile = {
  href: string;
  label: string;
  /**
   * Editorial file under /public. Null when nothing on hand depicts that
   * category. Do not substitute a different subject.
   */
  src: string | null;
};

/**
 * Red tile: homepage hero pour of red wine.
 * Orange tile: no editorial photo of orange wine exists in /public.
 */
export const MEGA_MENU_IMAGE_TILES: Record<AppLocale, MegaMenuImageTile[]> = {
  sv: [
    {
      href: "/vin/rott-naturvin",
      label: "Rött naturvin",
      src: "/images/hero_bild_5.webp",
    },
    {
      href: "/vin/orange-naturvin",
      label: "Orange vin",
      src: null,
    },
  ],
  en: [
    {
      href: "/wine/red-natural-wine",
      label: "Red natural wine",
      src: "/images/hero_bild_5.webp",
    },
    {
      href: "/wine/orange-natural-wine",
      label: "Orange wine",
      src: null,
    },
  ],
};

export function visibleMegaMenuImageTiles(
  locale: AppLocale,
): Array<MegaMenuImageTile & { src: string }> {
  if (!MEGA_MENU_IMAGES) return [];
  return MEGA_MENU_IMAGE_TILES[locale].filter(
    (tile): tile is MegaMenuImageTile & { src: string } => Boolean(tile.src),
  );
}
