import type { AppLocale } from "@/lib/i18n/locale";

const COLOR_CATEGORY_PATHS: Record<
  AppLocale,
  Partial<Record<"Red" | "White" | "Orange", string>>
> = {
  sv: {
    Red: "/vin/rott-naturvin",
    White: "/vin/vitt-naturvin",
    Orange: "/vin/orange-naturvin",
  },
  en: {
    Red: "/wine/red-natural-wine",
    White: "/wine/white-natural-wine",
    Orange: "/wine/orange-natural-wine",
  },
};

const COLOR_CATEGORY_LABELS: Record<
  AppLocale,
  Partial<Record<"Red" | "White" | "Orange", string>>
> = {
  sv: {
    Red: "Se alla röda naturviner →",
    White: "Se alla vita naturviner →",
    Orange: "Se alla orange naturviner →",
  },
  en: {
    Red: "See all red natural wines →",
    White: "See all white natural wines →",
    Orange: "See all orange natural wines →",
  },
};

export function resolveNaturalWineColorCategoryLink(
  locale: AppLocale,
  options: {
    color?: string | null;
    farming?: string | null;
  },
): { href: string; label: string } | null {
  if (options.farming?.trim() !== "natural") return null;

  const color = options.color?.trim();
  if (color !== "Red" && color !== "White" && color !== "Orange") {
    return null;
  }

  const href = COLOR_CATEGORY_PATHS[locale][color];
  const label = COLOR_CATEGORY_LABELS[locale][color];
  if (!href || !label) return null;

  return { href, label };
}
