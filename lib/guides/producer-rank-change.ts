import type { AppLocale } from "@/lib/i18n/locale";

export type ProducerRankChange =
  | { kind: "new" }
  | { kind: "same" }
  | { kind: "up"; places: number }
  | { kind: "down"; places: number };

export function producerRankChange(producer: {
  rank: number;
  previousRank?: number | null;
}): ProducerRankChange {
  if (producer.previousRank == null) return { kind: "new" };
  const delta = producer.previousRank - producer.rank;
  if (delta > 0) return { kind: "up", places: delta };
  if (delta < 0) return { kind: "down", places: -delta };
  return { kind: "same" };
}

export function rankChangePresentation(
  change: ProducerRankChange,
  locale: AppLocale,
): { text: string; ariaLabel: string; tone: ProducerRankChange["kind"] } {
  if (change.kind === "new") {
    return {
      text: locale === "sv" ? "NY" : "NEW",
      ariaLabel: locale === "sv" ? "Ny på listan" : "New to the list",
      tone: "new",
    };
  }
  if (change.kind === "same") {
    return {
      text: "-",
      ariaLabel: locale === "sv" ? "Oförändrad" : "Unchanged",
      tone: "same",
    };
  }
  const places = change.places;
  if (change.kind === "up") {
    return {
      text: `▲ +${places}`,
      ariaLabel:
        locale === "sv"
          ? `Upp ${places} ${places === 1 ? "placering" : "placeringar"}`
          : `Up ${places} ${places === 1 ? "place" : "places"}`,
      tone: "up",
    };
  }
  return {
    text: `▼ -${places}`,
    ariaLabel:
      locale === "sv"
        ? `Ned ${places} ${places === 1 ? "placering" : "placeringar"}`
        : `Down ${places} ${places === 1 ? "place" : "places"}`,
    tone: "down",
  };
}
