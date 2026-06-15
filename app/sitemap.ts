import { buildSitemapEntries } from "@/lib/sitemap-entries";

const PACT_BASE_URL = "https://pactwines.com";

export default async function sitemap() {
  return buildSitemapEntries(PACT_BASE_URL, "pact");
}
