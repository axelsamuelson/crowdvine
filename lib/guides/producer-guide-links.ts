/** EN producer deep-dive guides linked from the top-100 producers list. */

export const PRODUCER_GUIDE_HREF_BY_RANK: Readonly<Record<number, string>> = {
  1: "/guides/pierre-overnoy",
  2: "/guides/thierry-allemand",
  3: "/guides/josko-gravner",
  4: "/guides/jean-francois-ganevat",
  8: "/guides/radikon",
  10: "/guides/jean-foillard",
  12: "/guides/marcel-lapierre",
};

export function producerGuideHref(rank: number): string | undefined {
  return PRODUCER_GUIDE_HREF_BY_RANK[rank];
}
