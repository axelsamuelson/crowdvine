import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  PRODUCER_BOXES_CONTENT_KEY,
  type ProducerBoxDefinition,
} from "@/lib/producer-boxes/config";
import {
  defaultProducerBoxesCatalog,
  parseProducerBoxesCatalog,
  type ProducerBoxesCatalog,
} from "@/lib/producer-boxes/catalog";
import {
  resolveProducerBox,
  type ProducerBoxProducerRow,
  type ProducerBoxWineRow,
  type ResolvedProducerBox,
} from "@/lib/producer-boxes/match";

export async function loadProducerBoxesCatalog(): Promise<ProducerBoxesCatalog> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("site_content")
      .select("value")
      .eq("key", PRODUCER_BOXES_CONTENT_KEY)
      .maybeSingle();

    if (error || !data?.value) return defaultProducerBoxesCatalog();
    const boxes = parseProducerBoxesCatalog(data.value);
    if (!boxes) return defaultProducerBoxesCatalog();
    return { boxes, source: "site_content" };
  } catch (error) {
    console.error("[producer-boxes] catalog load failed:", error);
    return defaultProducerBoxesCatalog();
  }
}

export async function loadResolvedProducerBoxes(): Promise<{
  boxes: ResolvedProducerBox[];
  source: ProducerBoxesCatalog["source"];
  loadError: boolean;
}> {
  const catalog = await loadProducerBoxesCatalog();
  try {
    const resolved = await resolveCatalog(catalog.boxes);
    return { boxes: resolved, source: catalog.source, loadError: false };
  } catch (error) {
    console.error("[producer-boxes] wine lookup failed:", error);
    return {
      boxes: catalog.boxes.map((definition) =>
        resolveProducerBox(definition, [], []),
      ),
      source: catalog.source,
      loadError: true,
    };
  }
}

async function resolveCatalog(
  definitions: readonly ProducerBoxDefinition[],
): Promise<ResolvedProducerBox[]> {
  const sb = getSupabaseAdmin();
  const { data: producers, error: producerError } = await sb
    .from("producers")
    .select("id, name");

  if (producerError) throw new Error(producerError.message);

  const producerRows = (producers ?? []) as ProducerBoxProducerRow[];
  const matchedIds = definitions.flatMap((definition) => {
    const resolved = resolveProducerBox(definition, producerRows, []);
    return resolved.producerId ? [resolved.producerId] : [];
  });

  let wineRows: ProducerBoxWineRow[] = [];
  if (matchedIds.length > 0) {
    const { data: wines, error: wineError } = await sb
      .from("wines")
      .select(
        "id, producer_id, wine_name, handle, color, vintage, base_price_cents, is_live, available_for_sale",
      )
      .in("producer_id", matchedIds);
    if (wineError) throw new Error(wineError.message);
    wineRows = (wines ?? []) as ProducerBoxWineRow[];
  }

  return definitions.map((definition) =>
    resolveProducerBox(definition, producerRows, wineRows),
  );
}
