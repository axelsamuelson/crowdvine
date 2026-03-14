/**
 * Starwinelist crawler – orchestrates scraper, storage, menu_documents and extraction.
 * Saves full chain: crawl source → PDF in storage → menu_document → (optional) extraction.
 */

import {
  createMenuDocument,
  getStarwinelistSourceBySlug,
  listStarwinelistSources,
  updateStarwinelistSource,
  upsertStarwinelistSource,
} from "./db";
import { extractMenuFromDocument } from "./service";
import { BrowserlessError } from "./browserless-adapter";
import { uploadPdfToStorage } from "./storage";
import { sha256Hex } from "./checksum";
import {
  fetchRestaurantSlugsByCity,
  fetchRestaurantPage,
  downloadPdf,
  parseSwlUpdatedAt,
  CRAWL_DELAY_MS,
} from "./starwinelist-scraper";
import type { StarwinelistSource, CrawlResult, CrawlSessionSummary } from "./types";

const MAX_CRAWL_ATTEMPTS = 5;
const STARWINELIST_BASE = "https://starwinelist.com";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Crawl a single restaurant: fetch page, optionally download PDF, create menu_document, trigger extraction (Claude reads PDF from storage).
 */
export async function crawlRestaurant(
  source: StarwinelistSource
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
    if (!page) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "failed",
        last_error: "Could not fetch restaurant page (403/timeout)",
        last_crawled_at: new Date().toISOString(),
        crawl_attempts: source.crawl_attempts + 1,
      });
      result.error = "Could not fetch restaurant page";
      return result;
    }

    result.name = page.name;
    result.pdf_url = page.pdf_url;
    result.swl_updated_at = page.swl_updated_at;

    const parsedDate = page.swl_updated_at
      ? parseSwlUpdatedAt(page.swl_updated_at)
      : null;
    const sameUpdate =
      source.swl_updated_at_parsed &&
      parsedDate &&
      new Date(source.swl_updated_at_parsed).getTime() === parsedDate.getTime();
    if (sameUpdate && source.latest_document_id) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "completed",
        last_crawled_at: new Date().toISOString(),
        name: page.name,
        pdf_url: page.pdf_url,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: parsedDate?.toISOString() ?? null,
      });
      result.skipped = true;
      result.skip_reason = "no_update";
      console.log("[crawler] Skipped", source.slug, "– reason:", result.skip_reason, "(latest_document_id:", source.latest_document_id, ")");
      return result;
    }

    if (!page.pdf_url) {
      await updateStarwinelistSource(source.id, {
        crawl_status: "skipped",
        last_crawled_at: new Date().toISOString(),
        name: page.name,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: parsedDate?.toISOString() ?? null,
        last_error: "No PDF link on page",
      });
      result.skipped = true;
      result.skip_reason = "no_pdf_found";
      console.log("[crawler] Skipped", source.slug, "– reason:", result.skip_reason);
      return result;
    }

    const restaurantUrl = `${STARWINELIST_BASE}/wine-place/${source.slug}`;
    const pdfBuffer = await downloadPdf(restaurantUrl, page.pdf_url);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.warn("[crawler] PDF download failed for", source.slug, "– URL saved for retry");
      await updateStarwinelistSource(source.id, {
        crawl_status: "partial",
        last_crawled_at: new Date().toISOString(),
        last_error: "PDF download failed – URL saved for retry",
        crawl_attempts: source.crawl_attempts + 1,
        name: page.name,
        pdf_url: page.pdf_url,
        swl_updated_at: page.swl_updated_at,
        swl_updated_at_parsed: parsedDate?.toISOString() ?? null,
      });
      result.partial = true;
      return result;
    }

    await sleep(8000);
    const timestamp = new Date().toISOString();
    const contentHash = sha256Hex(pdfBuffer);
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

    try {
      await extractMenuFromDocument(doc.id);
      result.extracted = true;
    } catch (extractErr) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
      console.warn("[crawler] Extraction failed for", source.slug, ":", msg);
      result.extraction_skipped_reason = "extraction_error";
    }

    await updateStarwinelistSource(source.id, {
      crawl_status: "completed",
      last_crawled_at: new Date().toISOString(),
      last_error: null,
      name: page.name,
      pdf_url: page.pdf_url,
      pdf_last_seen_at: timestamp,
      swl_updated_at: page.swl_updated_at,
      swl_updated_at_parsed: parsedDate?.toISOString() ?? null,
      latest_document_id: doc.id,
      crawl_attempts: source.crawl_attempts + 1,
    });

    result.document_id = doc.id;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const is429 = err instanceof BrowserlessError && err.status === 429;
    await updateStarwinelistSource(source.id, {
      crawl_status: "failed",
      last_crawled_at: new Date().toISOString(),
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
 */
export async function crawlSingleRestaurant(slug: string): Promise<CrawlResult> {
  let source = await getStarwinelistSourceBySlug(slug);
  if (!source) {
    source = await upsertStarwinelistSource({
      slug,
      source_url: `https://starwinelist.com/wine-place/${slug}`,
      city: "stockholm",
    });
  }
  return crawlRestaurant(source);
}

/**
 * Run full crawl session for a city: get slugs, upsert sources, crawl each with delay, return summary.
 */
export async function runCrawlSession(
  city: "stockholm"
): Promise<CrawlSessionSummary> {
  const summary: CrawlSessionSummary = {
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
  };

  const slugs = await fetchRestaurantSlugsByCity(city);
  summary.total_found = slugs.length;

  for (const slug of slugs) {
    await sleep(CRAWL_DELAY_MS);
    const source = await upsertStarwinelistSource({
      slug,
      source_url: `https://starwinelist.com/wine-place/${slug}`,
      city,
    });
    const result = await crawlRestaurant(source);
    if (result.skipped) {
      summary.skipped += 1;
      if (result.skip_reason === "no_update") summary.updated_pdfs += 1;
      continue;
    }
    if (result.partial) {
      summary.partial = (summary.partial ?? 0) + 1;
      continue;
    }
    if (result.rate_limit_429) summary.rate_limit_429 = true;
    if (result.error) {
      summary.failed += 1;
      continue;
    }
    if (result.document_id) {
      summary.document_ids.push(result.document_id);
      summary.new_pdfs += 1;
      if (result.extracted) summary.extracted = (summary.extracted ?? 0) + 1;
      if (result.extraction_skipped_reason === "extraction_error") {
        summary.extraction_failed = (summary.extraction_failed ?? 0) + 1;
      }
    }
  }

  return summary;
}

/**
 * Run crawl for a fixed list of slugs (no slug discovery). Used for smoke tests and API body.slugs.
 */
export async function runCrawlForSlugs(
  slugs: string[]
): Promise<CrawlSessionSummary> {
  const summary: CrawlSessionSummary = {
    total_found: slugs.length,
    new_pdfs: 0,
    updated_pdfs: 0,
    skipped: 0,
    failed: 0,
    partial: 0,
    rate_limit_429: false,
    document_ids: [],
    extracted: 0,
    extraction_failed: 0,
  };

  for (const slug of slugs) {
    const trimmed = typeof slug === "string" ? slug.trim() : "";
    if (!trimmed) continue;
    await sleep(CRAWL_DELAY_MS);
    let source = await getStarwinelistSourceBySlug(trimmed);
    if (!source) {
      source = await upsertStarwinelistSource({
        slug: trimmed,
        source_url: `https://starwinelist.com/wine-place/${trimmed}`,
        city: "stockholm",
      });
    }
    const result = await crawlRestaurant(source);
    if (result.skipped) {
      summary.skipped += 1;
      if (result.skip_reason === "no_update") summary.updated_pdfs += 1;
      continue;
    }
    if (result.partial) {
      summary.partial = (summary.partial ?? 0) + 1;
      continue;
    }
    if (result.rate_limit_429) summary.rate_limit_429 = true;
    if (result.error) {
      summary.failed += 1;
      continue;
    }
    if (result.document_id) {
      summary.document_ids.push(result.document_id);
      summary.new_pdfs += 1;
      if (result.extracted) summary.extracted = (summary.extracted ?? 0) + 1;
      if (result.extraction_skipped_reason === "extraction_error") {
        summary.extraction_failed = (summary.extraction_failed ?? 0) + 1;
      }
    }
  }

  return summary;
}
