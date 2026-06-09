import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { extractWineText } from "@/lib/i18n/wine-locale";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type TasteQuizWine = {
  id: string;
  name: string;
  producer: string;
  handle: string | null;
  imageUrl: string;
  color: string;
  grapes: string[];
  soil: string;
  style_scale: number;
  price: number;
  tags: string[];
};

type WineRow = {
  id: string;
  wine_name: string;
  handle: string | null;
  label_image_path: string | null;
  color: string | null;
  grape_varieties: string | string[] | null;
  soil_type: Record<string, string> | string | null;
  style_scale: number | null;
  base_price_cents: number | null;
  tags: string[] | null;
  producer_id: string | null;
};

function toWineImageUrl(path: string | null | undefined): string {
  if (!path) return DEFAULT_WINE_IMAGE_PATH;
  const clean = path.trim().replace(/\n/g, "");
  if (clean.startsWith("http")) return clean;
  if (clean.startsWith("/uploads/")) {
    return `/api/images/${clean.replace("/uploads/", "")}`;
  }
  if (clean.startsWith("/")) return clean;
  return `/api/images/${clean}`;
}

function parseGrapes(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((g) => g.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((g) => g.trim()).filter(Boolean);
  }
  return [];
}

function parseTags(value: string[] | null | undefined): string[] {
  if (!value?.length) return [];
  return value.filter((tag): tag is string => typeof tag === "string");
}

export async function getQuizWines(locale: AppLocale): Promise<TasteQuizWine[]> {
  const t = (key: string) => translate(locale, key);
  const sb = getSupabaseAdmin();

  const { data: wineRows, error: wineError } = await sb
    .from("wines")
    .select(
      "id, wine_name, handle, label_image_path, color, grape_varieties, soil_type, style_scale, base_price_cents, tags, producer_id",
    )
    .eq("is_live", true)
    .not("style_scale", "is", null)
    .not("tags", "is", null);

  if (wineError) {
    throw new Error(wineError.message);
  }

  const rows = (wineRows ?? []) as WineRow[];
  const producerIds = [
    ...new Set(
      rows
        .map((row) => row.producer_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const producerNameById = new Map<string, string>();

  if (producerIds.length > 0) {
    const { data: producers, error: producerError } = await sb
      .from("producers")
      .select("id, name")
      .in("id", producerIds);

    if (producerError) {
      throw new Error(producerError.message);
    }

    for (const producer of producers ?? []) {
      if (producer.id && producer.name) {
        producerNameById.set(producer.id, producer.name);
      }
    }
  }

  return rows
    .map((row) => {
      const styleScale = Number(row.style_scale);
      if (!Number.isFinite(styleScale) || styleScale < 1 || styleScale > 5) {
        return null;
      }

      const tags = parseTags(row.tags);
      if (tags.length === 0) return null;

      const producer =
        (row.producer_id && producerNameById.get(row.producer_id)) ||
        t("tasteQuiz.unknownProducer");

      return {
        id: row.id,
        name: row.wine_name,
        producer,
        handle: row.handle?.trim() || null,
        imageUrl: toWineImageUrl(row.label_image_path),
        color: row.color?.trim() || t("tasteQuiz.unknownColor"),
        grapes: parseGrapes(row.grape_varieties),
        soil: extractWineText(row.soil_type, locale) ?? "",
        style_scale: styleScale,
        price: Math.round((row.base_price_cents ?? 0) / 100),
        tags,
      } satisfies TasteQuizWine;
    })
    .filter((wine): wine is TasteQuizWine => wine != null);
}
