import { revalidatePath, revalidateTag } from "next/cache";

import { articlePath } from "@/lib/guides/guide-types";
import { newNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/new-natural-wines-systembolaget";
import { SYSTEMBOLAGET_RANKED_LISTS } from "@/lib/guides/systembolaget-list-links";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { GuideWineCategory } from "@/lib/systembolaget/guide-wines";

export type PublishCuratedResult =
  | {
      ok: true;
      id: number;
      productNumber: string;
      category: GuideWineCategory;
      firstPublishedAt: string;
      alreadyPublished: boolean;
    }
  | {
      ok: false;
      id: number;
      reason:
        | "not_found"
        | "unavailable"
        | "skipped_verdict"
        | "update_failed";
      message: string;
    };

function guidePathsForCategory(category: string): { sv: string; en: string } | null {
  // "new" is a release calendar, not a member of SYSTEMBOLAGET_RANKED_LISTS.
  if (category === "new") {
    return {
      sv: articlePath(newNaturalWinesSystembolagetArticle, "sv"),
      en: articlePath(newNaturalWinesSystembolagetArticle, "en"),
    };
  }
  const list = SYSTEMBOLAGET_RANKED_LISTS.find((row) => row.category === category);
  if (!list) return null;
  return { sv: list.href.sv, en: list.href.en };
}

/** Bust guide wine cache + public list paths for a curated category. */
export function revalidateSystembolagetGuideCategory(category: string): void {
  try {
    revalidateTag(`sb-guide-wines-${category}-recommended`, "max");
    revalidateTag(`sb-guide-wines-${category}-avoid`, "max");
    const paths = guidePathsForCategory(category);
    if (paths) {
      revalidatePath(paths.sv);
      revalidatePath(paths.en);
    }
    // Parent "best" list may surface primary_style from other ranked categories.
    // The release calendar does not feed that list.
    if (category !== "best" && category !== "new") {
      revalidateTag("sb-guide-wines-best-recommended", "max");
      const best = guidePathsForCategory("best");
      if (best) {
        revalidatePath(best.sv);
        revalidatePath(best.en);
      }
    }
    revalidatePath("/sitemap.xml");
  } catch (err) {
    // Outside a Next.js request (local scripts) cache APIs are unavailable.
    console.warn(
      "[systembolaget-publish] revalidate skipped",
      category,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Same publish semantics as /admin/systembolaget toggle:
 * set is_published, stamp first_published_at on first publish, revalidate lists.
 * Refuses skipped verdicts and products that are not currently available.
 */
export async function publishCuratedById(
  id: number,
): Promise<PublishCuratedResult> {
  const sb = getSupabaseAdmin();
  const { data: row, error: readErr } = await sb
    .from("systembolaget_curated")
    .select(
      "id, product_number, category, verdict, is_published, first_published_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (readErr) {
    return {
      ok: false,
      id,
      reason: "update_failed",
      message: readErr.message,
    };
  }
  if (!row) {
    return { ok: false, id, reason: "not_found", message: `No curated row ${id}` };
  }
  if (row.verdict === "skipped") {
    return {
      ok: false,
      id,
      reason: "skipped_verdict",
      message: "Skipped verdict cannot be published",
    };
  }

  const { data: product, error: productErr } = await sb
    .from("systembolaget_products")
    .select("product_number, is_available")
    .eq("product_number", row.product_number)
    .maybeSingle();

  if (productErr) {
    return {
      ok: false,
      id,
      reason: "update_failed",
      message: productErr.message,
    };
  }
  if (!product?.is_available) {
    return {
      ok: false,
      id,
      reason: "unavailable",
      message: `Product ${row.product_number} is not available`,
    };
  }

  if (row.is_published) {
    const firstPublishedAt =
      row.first_published_at ?? new Date().toISOString();
    revalidateSystembolagetGuideCategory(String(row.category));
    return {
      ok: true,
      id,
      productNumber: String(row.product_number),
      category: row.category as GuideWineCategory,
      firstPublishedAt,
      alreadyPublished: true,
    };
  }

  const nowIso = new Date().toISOString();
  const firstPublishedAt = row.first_published_at ?? nowIso;
  const { data: updated, error: updateErr } = await sb
    .from("systembolaget_curated")
    .update({
      is_published: true,
      first_published_at: firstPublishedAt,
    })
    .eq("id", id)
    .select("id, product_number, category, first_published_at")
    .single();

  if (updateErr || !updated) {
    return {
      ok: false,
      id,
      reason: "update_failed",
      message: updateErr?.message ?? "Update returned no row",
    };
  }

  revalidateSystembolagetGuideCategory(String(updated.category));

  return {
    ok: true,
    id,
    productNumber: String(updated.product_number),
    category: updated.category as GuideWineCategory,
    firstPublishedAt: String(updated.first_published_at ?? firstPublishedAt),
    alreadyPublished: false,
  };
}
