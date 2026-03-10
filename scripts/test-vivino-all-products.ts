/**
 * Test Vivino adapter against products.
 * - If Vivino sells the wine: show price (and rating if available).
 * - If Vivino has the wine but doesn't sell it: show rating + number of ratings.
 *
 * Usage:
 *   pnpm exec tsx scripts/test-vivino-all-products.ts [--limit=N]
 *     Testar alla viner via sökning. Vivino laddar sökresultat med JS, så ofta 0 PDP-länkar.
 *   pnpm exec tsx scripts/test-vivino-all-products.ts --from-offers [--limit=N]
 *     Testar endast viner som redan har en Vivino-offer i DB (återhämtar PDP och visar pris/betyg).
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { listPriceSources } from "@/lib/external-prices/db";
import { vivinoAdapter } from "@/lib/external-prices/adapters/vivino";
import { delay } from "@/lib/external-prices/fetch-with-retries";
import type { WineForMatch, PriceSource } from "@/lib/external-prices/types";

const RATE_LIMIT_MS = 2000;

const mockSource: PriceSource = {
  id: "test",
  base_url: "https://www.vivino.com",
  rate_limit_delay_ms: RATE_LIMIT_MS,
  search_url_template: null,
  sitemap_url: null,
  name: "Vivino",
  slug: "vivino",
  adapter_type: "vivino",
  is_active: true,
} as PriceSource;

function isPdpUrl(url: string): boolean {
  return /\/w\/\d+/.test(url) && !url.includes("/search/wines");
}

async function runFromOffers(limit: number | undefined) {
  const sources = await listPriceSources(false);
  const vivino = sources.find((s) => s.adapter_type === "vivino");
  if (!vivino) {
    console.log("Ingen Vivino-källa hittad i price_sources. Lägg till Vivino som källa i admin först.");
    return;
  }

  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("external_offers")
    .select("id, wine_id, pdp_url, wines(wine_name, vintage)")
    .eq("price_source_id", vivino.id)
    .not("pdp_url", "is", null);
  const { data: rows, error } = await q;

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  const offers = (rows ?? []) as { id: string; wine_id: string; pdp_url: string; wines: { wine_name: string; vintage: string } | null }[];
  if (offers.length === 0) {
    console.log("Inga Vivino-offers i databasen. Lägg till en Vivino-källa och matcha viner i admin (price-sources) först. Kör sedan med --from-offers.");
    return;
  }
  const toTest = limit ? offers.slice(0, limit) : offers;
  console.log(`Testar ${toTest.length} befintliga Vivino-offers (av ${offers.length}).\n`);

  let withPrice = 0;
  let ratingOnly = 0;
  let noMatch = 0;
  const results: { line: string }[] = [];

  for (let i = 0; i < toTest.length; i++) {
    const o = toTest[i];
    const label = o.wines ? `${o.wines.wine_name} ${o.wines.vintage}`.trim() : o.wine_id;
    try {
      const offer = await vivinoAdapter.fetchOffer(o.pdp_url, mockSource);
      await delay(RATE_LIMIT_MS);

      if (!offer) {
        noMatch++;
        results.push({ line: `${label} | Kunde inte parsa PDP` });
        process.stdout.write("F");
        continue;
      }

      const hasPrice = offer.priceAmount != null && offer.priceAmount > 0;
      const ratingStr = offer.rating != null ? offer.rating.toFixed(1) : null;
      const countStr = offer.ratingCount != null ? offer.ratingCount.toLocaleString("sv-SE") : null;

      if (hasPrice) {
        withPrice++;
        const pricePart = `${offer.priceAmount} ${offer.currency}`;
        const ratingPart = ratingStr ? ` | Betyg ${ratingStr}${countStr ? ` (${countStr} betyg)` : ""}` : "";
        results.push({ line: `${label} | Vivino säljer: ${pricePart}${ratingPart}` });
      } else {
        ratingOnly++;
        if (ratingStr || countStr) {
          const part = [ratingStr && `Betyg ${ratingStr}`, countStr && `${countStr} betyg`].filter(Boolean).join(" ");
          results.push({ line: `${label} | ${part} (Vivino säljer inte)` });
        } else {
          results.push({ line: `${label} | Träff men inget pris eller betyg` });
        }
      }
      process.stdout.write(hasPrice ? "P" : "R");
    } catch (err) {
      noMatch++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ line: `${label} | Fel: ${msg}` });
      process.stdout.write("F");
    }
  }

  console.log("\n\n--- Resultat per vin ---\n");
  results.forEach((r) => console.log(r.line));
  console.log("\n--- Sammanfattning ---");
  console.log(`Totalt:           ${toTest.length}`);
  console.log(`Med pris:         ${withPrice} (Vivino säljer)`);
  console.log(`Endast betyg:     ${ratingOnly} (Vivino säljer inte)`);
  console.log(`Fel/ingen data:   ${noMatch}`);
}

async function runFromSearch(limit: number | undefined) {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("wines")
    .select("id, wine_name, vintage, producer_id, producers(name)")
    .order("wine_name", { ascending: true });

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  type Row = (typeof rows)[0] & { producers: { name: string } | null };
  const wines = (rows ?? []) as Row[];
  const total = limit ? Math.min(wines.length, limit) : wines.length;
  const toTest = wines.slice(0, total);

  console.log(`Testar Vivino-sökning för ${toTest.length} viner (av ${wines.length} total).`);
  console.log("(Vivino laddar sökresultat med JS, så ofta 0 PDP-länkar i HTML – många \"Ingen träff\" är förväntat.)\n");

  let withPrice = 0;
  let ratingOnly = 0;
  let noMatch = 0;
  const results: { name: string; vintage: string; line: string }[] = [];

  for (let i = 0; i < toTest.length; i++) {
    const w = toTest[i];
    const producerName = (w.producers as { name: string } | null)?.name ?? "";
    const wineForMatch: WineForMatch = {
      id: w.id,
      wine_name: w.wine_name ?? "",
      vintage: String(w.vintage ?? ""),
      producer: producerName ? { name: producerName } : undefined,
    };

    const label = `${w.wine_name} ${w.vintage}`.trim();
    try {
      const candidates = await vivinoAdapter.searchCandidates(wineForMatch, mockSource);
      const pdpUrls = candidates.filter(isPdpUrl);

      if (pdpUrls.length === 0) {
        noMatch++;
        results.push({ name: w.wine_name ?? "", vintage: String(w.vintage ?? ""), line: `${label} | Ingen träff (inga PDP-länkar i sökresultat)` });
        await delay(RATE_LIMIT_MS);
        process.stdout.write(".");
        continue;
      }

      const offer = await vivinoAdapter.fetchOffer(pdpUrls[0], mockSource);
      await delay(RATE_LIMIT_MS);

      if (!offer) {
        noMatch++;
        results.push({ name: w.wine_name ?? "", vintage: String(w.vintage ?? ""), line: `${label} | Ingen träff (kunde inte parsa sidan)` });
        process.stdout.write(".");
        continue;
      }

      const hasPrice = offer.priceAmount != null && offer.priceAmount > 0;
      const ratingStr = offer.rating != null ? offer.rating.toFixed(1) : null;
      const countStr = offer.ratingCount != null ? offer.ratingCount.toLocaleString("sv-SE") : null;

      if (hasPrice) {
        withPrice++;
        const pricePart = `${offer.priceAmount} ${offer.currency}`;
        const ratingPart = ratingStr ? ` | Betyg ${ratingStr}${countStr ? ` (${countStr} betyg)` : ""}` : "";
        results.push({ name: w.wine_name ?? "", vintage: String(w.vintage ?? ""), line: `${label} | Vivino säljer: ${pricePart}${ratingPart}` });
      } else {
        ratingOnly++;
        if (ratingStr || countStr) {
          const part = [ratingStr && `Betyg ${ratingStr}`, countStr && `${countStr} betyg`].filter(Boolean).join(" ");
          results.push({ name: w.wine_name ?? "", vintage: String(w.vintage ?? ""), line: `${label} | ${part} (Vivino säljer inte)` });
        } else {
          results.push({ name: w.wine_name ?? "", vintage: String(w.vintage ?? ""), line: `${label} | Träff men inget pris eller betyg` });
        }
      }
      process.stdout.write(hasPrice ? "P" : "R");
    } catch (err) {
      noMatch++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: w.wine_name ?? "", vintage: String(w.vintage ?? ""), line: `${label} | Fel: ${msg}` });
      process.stdout.write("F");
    }
  }

  console.log("\n\n--- Resultat per vin ---\n");
  results.forEach((r) => console.log(r.line));
  console.log("\n--- Sammanfattning ---");
  console.log(`Totalt viner:     ${toTest.length}`);
  console.log(`Med pris:         ${withPrice} (Vivino säljer)`);
  console.log(`Endast betyg:     ${ratingOnly} (Vivino säljer inte)`);
  console.log(`Ingen träff/fel:  ${noMatch}`);
  if (noMatch === toTest.length && toTest.length > 0) {
    console.log("\nTip: Vivino sökresultat innehåller sällan PDP-länkar i HTML. Kör med --from-offers för att testa befintliga Vivino-offers.");
  }
}

async function main() {
  const fromOffers = process.argv.includes("--from-offers");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

  if (fromOffers) {
    await runFromOffers(limit);
  } else {
    await runFromSearch(limit);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
