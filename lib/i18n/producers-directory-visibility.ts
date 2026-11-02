import { extractWineText } from "@/lib/i18n/wine-locale";

export type ProducerDirectoryVisibilityRow = {
  id: string;
  short_description: Record<string, string> | string | null;
};

/**
 * English /producers: keep producers that have EN short copy AND at least one live wine.
 * Swedish /producenter uses the unfiltered indexable list.
 */
export function filterProducersForDirectoryLocale<
  T extends ProducerDirectoryVisibilityRow,
>(
  producers: T[],
  locale: "en" | "sv",
  producerIdsWithLiveWines: ReadonlySet<string>,
): T[] {
  if (locale !== "en") return producers;

  return producers.filter((producer) => {
    const hasEnglishText = Boolean(
      extractWineText(producer.short_description, "en", { fallback: false }),
    );
    const hasLiveWines = producerIdsWithLiveWines.has(producer.id);
    return hasEnglishText && hasLiveWines;
  });
}
