import { fetchIndexableWines } from "@/lib/sitemap-urls";

/** ISR interval for product PDPs (1 hour). */
export const PDP_REVALIDATE_SECONDS = 3600;

/** Pre-render indexable wine handles at build time; new handles still work via dynamicParams. */
export async function generateIndexablePdpStaticParams(): Promise<
  { handle: string }[]
> {
  const wines = await fetchIndexableWines();
  return wines
    .filter((wine) => Boolean(wine.handle?.trim()))
    .map((wine) => ({ handle: wine.handle }));
}
