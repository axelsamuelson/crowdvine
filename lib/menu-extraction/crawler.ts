/**
 * Starwinelist crawler – orchestrates scraper, storage, menu_documents and extraction.
 * Saves full chain: crawl source → PDF in storage → menu_document → (optional) extraction.
 */

import {
  createMenuDocument,
  getCompletedMenuDocumentByContentHash,
  getMenuDocumentByContentHash,
  getStarwinelistSourceBySlug,
  isStarwinelist404Slug,
  listStarwinelistSourcesForCrawlBatch,
  promoteMenuDocumentToCurrent,
  resetStaleCrawlingSources,
  sourceHasStoredDocument,
  updateStarwinelistSource,
  upsertStarwinelistSource,
} from "./db";
import { extractMenuFromDocument } from "./service";
import { BrowserAdapterError } from "./browser-adapter-error";
import { alertZeroSlugDiscovery } from "./pipeline-alerts";
import { uploadPdfToStorage } from "./storage";
import {
  withBrowserlessUsageTracking,
} from "./browserless-usage";
import { sha256Hex } from "./checksum";
import {
  fetchRestaurantSlugsByCity,
  fetchRestaurantPage,
  downloadPdf,
  CRAWL_DELAY_MS,
} from "./starwinelist-scraper";
import type { StarwinelistSource, CrawlResult, CrawlSessionSummary } from "./types";
import {
  isWrongCityForScope,
  normalizeSwlCitySlug,
  type SwlLocation,
} from "./swl-location";

const MAX_CRAWL_ATTEMPTS = 5;
const STARWINELIST_BASE = "https://starwinelist.com";
const STALE_CRAWLING_MS = 2 * 60 * 60 * 1000;
/** Reset crawling faster on manual admin runs (serverless timeout). */
export const ADMIN_STALE_CRAWLING_MS = 5 * 60 * 1000;
/** Hard stop for cron crawl loop (fits maxDuration=300 with buffer). */
export const CRON_CRAWL_TIME_BUDGET_MS = 240_000;
/** Do not start a new source after this elapsed time. */
export const CRON_CRAWL_SOFT_STOP_MS = 200_000;
/** @deprecated Use time-boxed crawl loop; kept for admin smoke references. */
export const CRON_CRAWL_BATCH_SIZE = 3;

const PDF_POST_DOWNLOAD_PAUSE_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function resolvedCityFromPage(
  page: { swl_location: SwlLocation | null },
  fallback: string,
): string {
  return normalizeSwlCitySlug(page.swl_location?.slug ?? null) ?? fallback;
}

function emptyCrawlSummary(): CrawlSessionSummary {
  return {
    total_found: 0,
    new_pdfs: 0,
    updated_pdfs: 0,
    skipped: 0,
    failed: 0,
    partial: 0,
    rate_limit_429: false,
    document_ids: [],
    extracted: 0,
    extraction_failed: 0,
    auto_correction_attempted: 0,
    auto_correction_improved: 0,
    auto_correction_still_review: 0,
    sources_checked: 0,
    skipped_not_updated: 0,
    fully_crawled: 0,
    elapsed_ms: 0,
  };
}

function applyCrawlResult(
  summary: CrawlSessionSummary,
  result: CrawlResult,
): void {
  summary.sources_checked = (summary.sources_checked ?? 0) + 1;

  if (result.skip_reason === "not_updated") {
    summary.skipped_not_updated = (summary.skipped_not_updated ?? 0) + 1;
    summary.skipped += 1;
    return;
  }

  if (result.skipped) {
    summary.skipped += 1;
    if (result.skip_reason === "no_update") summary.updated_pdfs += 1;
    return;
  }
  if (result.partial) {
    summary.partial = (summary.partial ?? 0) + 1;
    return;
  }
  if (result.rate_limit_429) summary.rate_limit_429 = true;
  if (result.error) {
    summary.failed += 1;
    return;
  }

  if (result.full_crawl) {
    summary.fully_crawled = (summary.fully_crawled ?? 0) + 1;
  }

  if (result.document_id) {
    summary.document_ids.push(result.document_id);
    summary.new_pdfs += 1;
    if (result.extracted) summary.extracted = (summary.extracted ?? 0) + 1;
    if (result.extraction_skipped_reason === "extraction_error") {
      summary.extraction_failed = (summary.extraction_failed ?? 0) + 1;
    }
    if (result.auto_correction) {
      summary.auto_correction_attempted =
        (summary.auto_correction_attempted ?? 0) +
        result.auto_correction.rowsAttempted;
      summary.auto_correction_improved =
        (summary.auto_correction_improved ?? 0) +
        result.auto_correction.rowsImproved;
      summary.auto_correction_still_review =
        (summary.auto_correction_still_review ?? 0) +
        result.auto_correction.rowsStillNeedsReview;
    }
  }
}

function parsedMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Crawl a single restaurant: fetch page, optionally download PDF, create menu_document, optionally trigger extraction (Claude reads PDF from storage).
 * @param extractAfterCrawl When true (default), runs extractMenuFromDocument after upload. Cron crawl passes false.
 */
export async function crawlRestaurant(
  source: StarwinelistSource,
  extractAfterCrawl: boolean = true,
  expectedCity?: string | null,
): Promise<CrawlResult> {
  const result: CrawlResult = {
    slug: source.slug,
    name: source.name,
    pdf_url: source.pdf_url,
    swl_updated_at: null,
    skipped: false,
  };

  if (source.crawl_attempts >= MAX_CRAWL_ATTEMPTS) {
    result.skipped = true;
    result.skip_reason = "too_many_failures";
    console.log("[crawler] Skipped", source.slug, "– reason:", result.skip_reason);
    return result;
  }

  await updateStarwinelistSource(source.id, { crawl_status: "crawling" });

  try {
    const page = await fetchRestaurantPage(source.slug);
    const checkedAt = new Date().toISOString();

    if (!page) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "failed",
        last_error: "Could not fetch restaurant page (403/timeout)",
        last_crawled_at: checkedAt,
        last_checked_at: checkedAt,
        crawl_attempts: source.crawl_attempts + 1,
      });
      result.error = "Could not fetch restaurant page";
      return result;
    }

    result.name = page.name;
    result.pdf_url = page.pdf_url;
    result.swl_updated_at = page.swl_updated_at;

    const resolvedCity = resolvedCityFromPage(page, source.city);
    const pageParsedMs = parsedMs(page.swl_updated_at_parsed);
    const storedParsedMs = parsedMs(source.swl_updated_at_parsed);

    if (expectedCity && page.swl_location) {
      if (isWrongCityForScope(page.swl_location, expectedCity)) {
        const label = page.swl_location.name ?? resolvedCity;
        await updateStarwinelistSource(source.id, {
          city: resolvedCity,
          crawl_status: "skipped",
          last_crawled_at: checkedAt,
          last_checked_at: checkedAt,
          name: page.name,
          pdf_url: page.pdf_url,
          swl_updated_at: page.swl_updated_at,
          swl_updated_at_parsed: page.swl_updated_at_parsed,
          last_error: `Restaurangen tillhör ${label}, inte ${expectedCity}`,
          crawl_attempts: source.crawl_attempts + 1,
        });
        result.skipped = true;
        result.skip_reason = "wrong_city";
        console.log(
          "[crawler] Skipped",
          source.slug,
          "– wrong city:",
          resolvedCity,
          "expected:",
          expectedCity,
        );
        return result;
      }
    }

    const hasDocument = await sourceHasStoredDocument(source);
    if (
      pageParsedMs !== null &&
      storedParsedMs !== null &&
      pageParsedMs <= storedParsedMs &&
      hasDocument
    ) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "completed",
        last_checked_at: checkedAt,
        city: resolvedCity,
        name: page.name,
        pdf_url: page.pdf_url,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: page.swl_updated_at_parsed,
        last_error: null,
        crawl_priority: 0,
      });
      result.skipped = true;
      result.skip_reason = "not_updated";
      console.log(
        "[crawler] Fast-skip",
        source.slug,
        "– max Updated unchanged:",
        page.swl_updated_at_parsed,
      );
      return result;
    }

    if (!page.pdf_url) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "skipped",
        last_crawled_at: checkedAt,
        last_checked_at: checkedAt,
        city: resolvedCity,
        name: page.name,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: page.swl_updated_at_parsed,
        last_error: "No PDF link on page",
      });
      result.skipped = true;
      result.skip_reason = "no_pdf_found";
      console.log("[crawler] Skipped", source.slug, "– reason:", result.skip_reason);
      return result;
    }

    const restaurantUrl = `${STARWINELIST_BASE}/wine-place/${source.slug}`;
    const pdfBuffer = await downloadPdf(restaurantUrl, page.pdf_url);
    result.full_crawl = true;

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.warn("[crawler] PDF download failed for", source.slug, "– URL saved for retry");
      await updateStarwinelistSource(source.id, {
        crawl_status: "partial",
        last_crawled_at: checkedAt,
        last_checked_at: checkedAt,
        last_error: "PDF download failed – URL saved for retry",
        crawl_attempts: source.crawl_attempts + 1,
        city: resolvedCity,
        name: page.name,
        pdf_url: page.pdf_url,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: page.swl_updated_at_parsed,
      });
      result.partial = true;
      return result;
    }

    await sleep(PDF_POST_DOWNLOAD_PAUSE_MS);
    const timestamp = new Date().toISOString();
    const contentHash = sha256Hex(pdfBuffer);

    const alreadyExtracted = await getCompletedMenuDocumentByContentHash(
      source.slug,
      contentHash,
    );
    if (alreadyExtracted) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "completed",
        last_crawled_at: timestamp,
        last_checked_at: timestamp,
        last_error: null,
        city: resolvedCity,
        name: page.name,
        pdf_url: page.pdf_url,
        pdf_last_seen_at: timestamp,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: page.swl_updated_at_parsed,
        latest_document_id: alreadyExtracted.id,
        crawl_attempts: source.crawl_attempts + 1,
        crawl_priority: 0,
      });
      await promoteMenuDocumentToCurrent(alreadyExtracted.id);
      result.skipped = true;
      result.skip_reason = "no_update";
      result.document_id = alreadyExtracted.id;
      console.log(
        "[crawler] Skipped",
        source.slug,
        "– PDF unchanged and already extracted",
      );
      return result;
    }

    const existingSameHash = await getMenuDocumentByContentHash(
      source.slug,
      contentHash,
    );
    if (existingSameHash) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "completed",
        last_crawled_at: timestamp,
        last_checked_at: timestamp,
        last_error: null,
        city: resolvedCity,
        name: page.name,
        pdf_url: page.pdf_url,
        pdf_last_seen_at: timestamp,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: page.swl_updated_at_parsed,
        latest_document_id: existingSameHash.id,
        crawl_attempts: source.crawl_attempts + 1,
        crawl_priority: 0,
      });
      await promoteMenuDocumentToCurrent(existingSameHash.id);
      result.skipped = true;
      result.skip_reason = "no_update";
      result.document_id = existingSameHash.id;
      console.log(
        "[crawler] Skipped",
        source.slug,
        "– same PDF already in storage, awaiting extraction",
      );
      return result;
    }

    const storagePath = await uploadPdfToStorage(source.slug, pdfBuffer, timestamp);
    const fileName = storagePath.split("/").pop() ?? "menu.pdf";

    const doc = await createMenuDocument({
      file_path: storagePath,
      file_name: fileName,
      mime_type: "application/pdf",
      source_type: "starwinelist",
      raw_text: null,
      content_hash: contentHash,
      source_slug: source.slug,
    });

    if (extractAfterCrawl) {
      try {
        const extractionResult = await extractMenuFromDocument(doc.id);
        result.extracted = true;
        if (extractionResult.autoCorrection) {
          result.auto_correction = extractionResult.autoCorrection;
        }
      } catch (extractErr) {
        const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
        console.warn("[crawler] Extraction failed for", source.slug, ":", msg);
        result.extraction_skipped_reason = "extraction_error";
      }
    }

    await updateStarwinelistSource(source.id, {
      crawl_status: "completed",
      last_crawled_at: timestamp,
      last_checked_at: timestamp,
      last_error: null,
      city: resolvedCity,
      name: page.name,
      pdf_url: page.pdf_url,
      pdf_last_seen_at: timestamp,
      swl_updated_at: page.swl_updated_at,
      swl_updated_at_parsed: page.swl_updated_at_parsed,
      latest_document_id: doc.id,
      crawl_attempts: source.crawl_attempts + 1,
      crawl_priority: 0,
    });

    result.document_id = doc.id;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const is429 = err instanceof BrowserAdapterError && err.status === 429;
    await updateStarwinelistSource(source.id, {
      crawl_status: "failed",
      last_crawled_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      last_error: message,
      crawl_attempts: source.crawl_attempts + 1,
    });
    result.error = message;
    if (is429) result.rate_limit_429 = true;
    return result;
  }
}

/**
 * Crawl a single restaurant by slug. Fetches or creates source then runs crawlRestaurant.
 * Skips 404-like slugs (numeric only); they are not saved or crawled.
 */
export async function crawlSingleRestaurant(slug: string): Promise<CrawlResult> {
  const trimmed = String(slug).trim();
  if (!trimmed || isStarwinelist404Slug(trimmed)) {
    return {
      slug: trimmed,
      name: null,
      pdf_url: null,
      swl_updated_at: null,
      skipped: true,
      skip_reason: "404_page",
    };
  }
  let source = await getStarwinelistSourceBySlug(trimmed);
  if (!source) {
    source = await upsertStarwinelistSource({
      slug: trimmed,
      source_url: `https://starwinelist.com/wine-place/${trimmed}`,
      city: "stockholm",
    });
  }
  return crawlRestaurant(source, true, "stockholm");
}

/**
 * Run full crawl session for a city: get slugs, upsert sources, crawl each with delay, return summary.
 * @param extractAfterCrawl Passed to crawlRestaurant (false for nightly cron crawl-only job).
 */
export async function runCrawlSession(
  city: "stockholm",
  extractAfterCrawl: boolean = true
): Promise<CrawlSessionSummary> {
  const summary = emptyCrawlSummary();

  const allSlugs = await fetchRestaurantSlugsByCity(city);
  const slugs = allSlugs.filter((s) => !isStarwinelist404Slug(s));
  summary.total_found = slugs.length;

  for (const slug of slugs) {
    await sleep(CRAWL_DELAY_MS);
    const source = await upsertStarwinelistSource({
      slug,
      source_url: `https://starwinelist.com/wine-place/${slug}`,
      city,
    });
    const result = await crawlRestaurant(source, extractAfterCrawl, city);
    applyCrawlResult(summary, result);
  }

  return summary;
}

export interface BatchedCrawlOptions {
  staleCrawlingMs?: number;
  timeBudgetMs?: number;
  softStopMs?: number;
  maxSources?: number;
  /** When true, only sources with crawl_priority > 0 are rotated. */
  boostedOnly?: boolean;
}

export function isCrawlBoostedOnlyEnabled(): boolean {
  const raw = process.env.CRAWL_BOOSTED_ONLY?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/**
 * Time-boxed crawl for serverless cron: register new slugs from discovery (best effort),
 * then rotate sources by crawl_priority DESC, last_checked_at ASC until budget expires.
 */
export async function runBatchedCrawlSession(
  city: "stockholm",
  extractAfterCrawl: boolean = false,
  options: BatchedCrawlOptions = {},
): Promise<CrawlSessionSummary> {
  const { result, browserless } = await withBrowserlessUsageTracking(async () => {
  const staleCrawlingMs = options.staleCrawlingMs ?? STALE_CRAWLING_MS;
  const timeBudgetMs = options.timeBudgetMs ?? CRON_CRAWL_TIME_BUDGET_MS;
  const softStopMs = options.softStopMs ?? CRON_CRAWL_SOFT_STOP_MS;
  const maxSources = options.maxSources;
  const boostedOnly = options.boostedOnly ?? isCrawlBoostedOnlyEnabled();

  const staleReset = await resetStaleCrawlingSources(staleCrawlingMs);
  if (staleReset > 0) {
    console.warn("[crawler] Reset", staleReset, "stale crawling source(s)");
  }

  let slugDiscoveryCount = 0;
  let newSourcesRegistered = 0;
  try {
    const discovered = await fetchRestaurantSlugsByCity(city);

    slugDiscoveryCount = discovered.length;
    if (slugDiscoveryCount === 0) {
      await alertZeroSlugDiscovery(city);
    }
    for (const slug of discovered) {
      if (isStarwinelist404Slug(slug)) continue;
      const existing = await getStarwinelistSourceBySlug(slug);
      if (!existing) {
        await upsertStarwinelistSource({
          slug,
          source_url: `${STARWINELIST_BASE}/wine-place/${slug}`,
          city,
        });
        newSourcesRegistered += 1;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      "[crawler] Slug discovery failed, continuing with DB rotation:",
      message,
    );
  }

  const summary = emptyCrawlSummary();
  summary.slug_discovery_count = slugDiscoveryCount;
  summary.new_sources_registered = newSourcesRegistered;
  summary.crawl_mode = boostedOnly
    ? "boosted_rotation"
    : slugDiscoveryCount > 0
      ? "full_rotation"
      : "db_rotation";

  const sessionStart = Date.now();
  const processedIds = new Set<string>();

  while (Date.now() - sessionStart < timeBudgetMs) {
    if (Date.now() - sessionStart > softStopMs) {
      console.warn("[crawler] Soft stop – not starting another source");
      break;
    }
    if (maxSources != null && (summary.sources_checked ?? 0) >= maxSources) {
      break;
    }

    const batch = await listStarwinelistSourcesForCrawlBatch(5, city, {
      boostedOnly,
    });
    const source = batch.find((s) => !processedIds.has(s.id));
    if (!source) break;
    processedIds.add(source.id);

    await sleep(CRAWL_DELAY_MS);
    const result = await crawlRestaurant(source, extractAfterCrawl, city);
    applyCrawlResult(summary, result);

    if (result.rate_limit_429) {
      console.warn("[crawler] Rate limit 429 – stopping session early");
      break;
    }
  }

  summary.elapsed_ms = Date.now() - sessionStart;
  summary.sources_attempted = summary.sources_checked;
  console.warn("[crawler] Session done:", {
    sources_checked: summary.sources_checked,
    skipped_not_updated: summary.skipped_not_updated,
    fully_crawled: summary.fully_crawled,
    failed: summary.failed,
    partial: summary.partial,
    elapsed_ms: summary.elapsed_ms,
    browserless,
  });

  return summary;
  });

  return { ...result, browserless };
}

/**
 * Run crawl for a fixed list of slugs (no slug discovery). Used for smoke tests and API body.slugs.
 */
export async function runCrawlForSlugs(
  slugs: string[],
  extractAfterCrawl: boolean = true,
  expectedCity: "stockholm" | null = "stockholm",
): Promise<CrawlSessionSummary> {
  const summary = emptyCrawlSummary();
  summary.total_found = slugs.length;

  for (const slug of slugs) {
    const trimmed = typeof slug === "string" ? slug.trim() : "";
    if (!trimmed || isStarwinelist404Slug(trimmed)) continue;
    await sleep(CRAWL_DELAY_MS);
    let source = await getStarwinelistSourceBySlug(trimmed);
    if (!source) {
      source = await upsertStarwinelistSource({
        slug: trimmed,
        source_url: `https://starwinelist.com/wine-place/${trimmed}`,
        city: "stockholm",
      });
    }
    const result = await crawlRestaurant(source, extractAfterCrawl, expectedCity);
    applyCrawlResult(summary, result);
  }

  return summary;
}
