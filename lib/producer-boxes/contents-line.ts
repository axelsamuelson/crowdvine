import type { AppLocale } from "@/lib/i18n/locale";
import type { ResolvedProducerBoxWine } from "@/lib/producer-boxes/match";

const SV_COUNT = ["", "ett", "två", "tre", "fyra", "fem", "sex"] as const;
const EN_COUNT = ["", "one", "two", "three", "four", "five", "six"] as const;

type Forms = { one: string; many: string };

const CLEAR_COLORS = new Set([
  "red",
  "white",
  "rose",
  "rosé",
  "orange",
  "sparkling",
]);

const COLOR_FORMS: Record<string, { sv: Forms; en: Forms }> = {
  red: { sv: { one: "rött", many: "röda" }, en: { one: "red", many: "red" } },
  white: {
    sv: { one: "vitt", many: "vita" },
    en: { one: "white", many: "white" },
  },
  rose: { sv: { one: "rosé", many: "rosé" }, en: { one: "rosé", many: "rosé" } },
  "rosé": {
    sv: { one: "rosé", many: "rosé" },
    en: { one: "rosé", many: "rosé" },
  },
  orange: {
    sv: { one: "orange", many: "orange" },
    en: { one: "orange", many: "orange" },
  },
  sparkling: {
    sv: { one: "mousserande", many: "mousserande" },
    en: { one: "sparkling", many: "sparkling" },
  },
};

function countWord(count: number, locale: AppLocale): string {
  const table = locale === "sv" ? SV_COUNT : EN_COUNT;
  return table[count] ?? String(count);
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function normalizeColor(color: string | null | undefined): string {
  return (color ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " & ")
    .replace(/\s+/g, " ");
}

function joinList(parts: string[], conjunction: string): string {
  if (parts.length <= 1) return parts[0] ?? "";
  const hasConjunction = parts.some((part) => part.includes(` ${conjunction} `));
  if (hasConjunction) return parts.join(", ");
  if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} ${conjunction} ${parts[parts.length - 1]}`;
}

function typePhrase(
  count: number,
  color: string,
  locale: AppLocale,
): string {
  const word = countWord(count, locale);
  const forms = COLOR_FORMS[color];
  if (!forms) {
    const raw = color.trim();
    if (!raw) {
      return locale === "sv"
        ? `${word} ${count === 1 ? "vin utan angiven typ" : "viner utan angiven typ"}`
        : `${word} ${count === 1 ? "wine with no listed type" : "wines with no listed type"}`;
    }
    return locale === "sv"
      ? `${word} ${count === 1 ? "vin märkt" : "viner märkta"} ${raw}`
      : `${word} ${count === 1 ? "wine labelled" : "wines labelled"} ${raw}`;
  }
  const label = count === 1 ? forms[locale].one : forms[locale].many;
  return `${word} ${label}`;
}

function wineLead(count: number, locale: AppLocale): string {
  const word = capitalize(countWord(count, locale));
  if (locale === "sv") return count === 1 ? "Ett vin" : `${word} viner`;
  return count === 1 ? "One wine" : `${word} wines`;
}

function bottleLead(count: number, locale: AppLocale): string {
  const word = countWord(count, locale);
  if (locale === "sv") return `${word} flaskor`;
  return count === 1 ? `${word} bottle` : `${word} bottles`;
}

function bottleLabel(slot: ResolvedProducerBoxWine): string | null {
  const name = slot.wineName?.trim();
  if (!name) return null;
  const vintage = slot.vintage?.trim();
  if (vintage && !name.includes(vintage)) return `${name} ${vintage}`;
  return name;
}

/**
 * One factual line when every wine has a single type.
 * Blend colors and missing colors return null so the box has no type line.
 */
export function producerBoxContentsLine(
  slots: readonly ResolvedProducerBoxWine[],
  locale: AppLocale,
): string | null {
  if (slots.length === 0) return null;

  const groups: { color: string; wines: number }[] = [];
  const indexByColor = new Map<string, number>();
  let bottles = 0;
  for (const slot of slots) {
    const quantity = slot.quantity > 0 ? slot.quantity : 0;
    bottles += quantity;
    const color = normalizeColor(slot.color);
    if (!CLEAR_COLORS.has(color)) return null;
    const existing = indexByColor.get(color);
    if (existing == null) {
      indexByColor.set(color, groups.length);
      groups.push({ color, wines: 1 });
    } else {
      groups[existing]!.wines += 1;
    }
  }

  const wines = slots.length;
  const conjunction = locale === "sv" ? "och" : "and";
  const types = joinList(
    groups.map((group) => typePhrase(group.wines, group.color, locale)),
    conjunction,
  );
  const lead =
    bottles === wines
      ? wineLead(wines, locale)
      : `${wineLead(wines, locale)}, ${bottleLead(bottles, locale)}`;
  const doubled = slots
    .filter((slot) => slot.quantity > 1)
    .map((slot) => {
      const label = bottleLabel(slot);
      if (!label) return null;
      const word = capitalize(countWord(slot.quantity, locale));
      return locale === "sv"
        ? `${word} av flaskorna är ${label}.`
        : `${word} of the bottles are ${label}.`;
    })
    .filter((line): line is string => Boolean(line));

  return [`${lead}: ${types}.`, ...doubled].join(" ");
}
