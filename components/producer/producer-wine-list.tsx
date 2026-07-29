import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/locale";
import { productPublicPath } from "@/lib/i18n/localized-routes";
import { wineColorDotClass } from "@/lib/wine-color";
import { formatPrice } from "@/lib/shopify/utils";
import { cn } from "@/lib/utils";

export type ProducerWineListItem = {
  id: string;
  wine_name: string;
  vintage: string | null;
  handle: string;
  price_sek: number;
  summary: string | null;
  description?: string | null;
  color?: string | null;
  type?: string | null;
};

type ColorGroupKey =
  | "red"
  | "white"
  | "rose"
  | "orange"
  | "sparkling"
  | "other";

const COLOR_GROUP_ORDER: ColorGroupKey[] = [
  "red",
  "white",
  "rose",
  "orange",
  "sparkling",
  "other",
];

const COLOR_GROUP_LABELS: Record<ColorGroupKey, Record<AppLocale, string>> = {
  red: { sv: "Rött", en: "Red" },
  white: { sv: "Vitt", en: "White" },
  rose: { sv: "Rosé", en: "Rosé" },
  orange: { sv: "Orange", en: "Orange" },
  sparkling: { sv: "Mousserande", en: "Sparkling" },
  other: { sv: "Övrigt", en: "Other" },
};

type Props = {
  wines: ProducerWineListItem[];
  locale: AppLocale;
  intlLocale: string;
  emptyMessage: string;
};

function colorGroupKey(color: string | null | undefined): ColorGroupKey {
  const c = (color ?? "").toLowerCase();
  if (c.includes("sparkling") || c.includes("mousserande")) return "sparkling";
  if (c.includes("orange")) return "orange";
  if (c.includes("rose") || c.includes("rosé")) return "rose";
  if (c.includes("white") || c.includes("vit")) return "white";
  if (c.includes("red") || c.includes("röd") || c.includes("rott")) return "red";
  return "other";
}

function groupWinesByColorThenPrice(
  wines: ProducerWineListItem[],
): Array<{ key: ColorGroupKey; wines: ProducerWineListItem[] }> {
  const buckets = new Map<ColorGroupKey, ProducerWineListItem[]>();

  for (const wine of wines) {
    const key = colorGroupKey(wine.color ?? wine.type);
    const list = buckets.get(key) ?? [];
    list.push(wine);
    buckets.set(key, list);
  }

  for (const list of buckets.values()) {
    list.sort(
      (a, b) =>
        a.price_sek - b.price_sek ||
        a.wine_name.localeCompare(b.wine_name, "sv"),
    );
  }

  return COLOR_GROUP_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map(
    (key) => ({ key, wines: buckets.get(key)! }),
  );
}

export function ProducerWineList({
  wines,
  locale,
  intlLocale,
  emptyMessage,
}: Props) {
  if (wines.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const groups = groupWinesByColorThenPrice(wines);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                wineColorDotClass(group.key === "rose" ? "rose" : group.key),
              )}
              aria-hidden
            />
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              {COLOR_GROUP_LABELS[group.key][locale]}
            </h3>
            <span className="text-xs text-muted-foreground">
              {group.wines.length}
            </span>
          </div>

          <ul className="divide-y divide-border">
            {group.wines.map((wine) => {
              const blurb = wine.summary ?? wine.description ?? null;
              const href = productPublicPath(wine.handle, locale);

              return (
                <li key={wine.id}>
                  <Link
                    href={href}
                    className="group flex items-baseline justify-between gap-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground group-hover:underline group-hover:underline-offset-4">
                        {wine.wine_name}
                        {wine.vintage ? (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            {wine.vintage}
                          </span>
                        ) : null}
                      </p>
                      {blurb ? (
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                          {blurb}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 tabular-nums text-sm font-medium text-foreground">
                      {formatPrice(wine.price_sek, "SEK", intlLocale)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
