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

const ROW_ARROW = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-[18px] shrink-0 text-foreground/80 transition-transform group-hover:translate-x-0.5"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

type Props = {
  wines: ProducerWineListItem[];
  locale: AppLocale;
  emptyMessage: string;
  /** When true, skip color group headers entirely (e.g. short sibling lists). */
  hideColorGroups?: boolean;
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

/** Same SEK display as PDP ServerListPrice (`280 kr` on EN too). */
function formatWineListPrice(priceSek: number, locale: AppLocale): string {
  const intlLocale = locale === "en" ? "en-SE" : "sv-SE";
  return formatPrice(priceSek, "SEK", intlLocale);
}

function WineRows({
  wines,
  locale,
}: {
  wines: ProducerWineListItem[];
  locale: AppLocale;
}) {
  return (
    <ul className="divide-y divide-border border-t border-border">
      {wines.map((wine) => {
        const blurb = (wine.summary ?? wine.description ?? "").trim() || null;
        const href = productPublicPath(wine.handle, locale);

        return (
          <li key={wine.id} className="border-b border-border">
            <Link
              href={href}
              className="group flex min-h-11 items-center justify-between gap-4 py-3 text-foreground no-underline transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium tracking-[-0.01em] text-foreground">
                  {wine.wine_name}
                  {wine.vintage?.trim() ? (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {wine.vintage.trim()}
                    </span>
                  ) : null}
                </p>
                {blurb ? (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {blurb}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="tabular-nums text-sm font-medium text-foreground">
                  {formatWineListPrice(wine.price_sek, locale)}
                </p>
                {ROW_ARROW}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ProducerWineList({
  wines,
  locale,
  emptyMessage,
  hideColorGroups = false,
}: Props) {
  if (wines.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const groups = groupWinesByColorThenPrice(wines);
  const showColorChips = !hideColorGroups && groups.length > 1;

  if (!showColorChips) {
    const flat = groups.flatMap((group) => group.wines);
    return <WineRows wines={flat} locale={locale} />;
  }

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
          <WineRows wines={group.wines} locale={locale} />
        </section>
      ))}
    </div>
  );
}
