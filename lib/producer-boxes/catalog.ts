import {
  DEFAULT_PRODUCER_BOXES,
  type ProducerBoxDefinition,
  type ProducerBoxId,
} from "@/lib/producer-boxes/config";

const BOX_IDS: readonly ProducerBoxId[] = [
  "mas-des-mesures",
  "la-marotte",
  "clos-fantine",
];

export type ProducerBoxesCatalogSource = "site_content" | "default";

export interface ProducerBoxesCatalog {
  boxes: ProducerBoxDefinition[];
  source: ProducerBoxesCatalogSource;
}

function isBoxId(value: string): value is ProducerBoxId {
  return (BOX_IDS as readonly string[]).includes(value);
}

function readLocalized(value: unknown): { sv: string; en: string } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { sv?: unknown; en?: unknown };
  if (typeof record.sv !== "string" || typeof record.en !== "string") return null;
  const sv = record.sv.trim();
  const en = record.en.trim();
  if (!sv || !en) return null;
  return { sv, en };
}

/** Parse an admin JSON payload. Returns null when the shape is not the three boxes. */
export function parseProducerBoxesCatalog(
  raw: unknown,
): ProducerBoxDefinition[] | null {
  const payload = typeof raw === "string" ? safeJson(raw) : raw;
  if (!payload || typeof payload !== "object") return null;
  const boxes = (payload as { boxes?: unknown }).boxes;
  if (!Array.isArray(boxes) || boxes.length !== BOX_IDS.length) return null;

  const parsed: ProducerBoxDefinition[] = [];
  for (const box of boxes) {
    if (!box || typeof box !== "object") return null;
    const row = box as {
      id?: unknown;
      producerName?: unknown;
      name?: unknown;
      story?: unknown;
      wineNames?: unknown;
    };
    if (typeof row.id !== "string" || !isBoxId(row.id)) return null;
    if (typeof row.producerName !== "string" || !row.producerName.trim()) return null;
    const name = readLocalized(row.name);
    const story = readLocalized(row.story);
    if (!name || !story) return null;
    if (!Array.isArray(row.wineNames) || row.wineNames.length !== 6) return null;
    const wineNames = row.wineNames.map((wine) =>
      typeof wine === "string" ? wine.trim() : "",
    );
    if (wineNames.some((wine) => wine.length === 0)) return null;
    parsed.push({
      id: row.id,
      producerName: row.producerName.trim(),
      name,
      story,
      wineNames,
    });
  }

  const ids = new Set(parsed.map((box) => box.id));
  if (ids.size !== BOX_IDS.length) return null;
  return BOX_IDS.map((id) => parsed.find((box) => box.id === id)!);
}

export function serializeProducerBoxesCatalog(
  boxes: readonly ProducerBoxDefinition[],
): string {
  return JSON.stringify({
    boxes: boxes.map((box) => ({
      id: box.id,
      producerName: box.producerName,
      name: box.name,
      story: box.story,
      wineNames: [...box.wineNames],
    })),
  });
}

export function containsEmDash(value: string): boolean {
  return value.includes("\u2014") || value.includes("\u2013");
}

export function catalogContainsEmDash(
  boxes: readonly ProducerBoxDefinition[],
): boolean {
  return boxes.some((box) =>
    [box.producerName, box.name.sv, box.name.en, box.story.sv, box.story.en, ...box.wineNames].some(
      containsEmDash,
    ),
  );
}

export function defaultProducerBoxesCatalog(): ProducerBoxesCatalog {
  return {
    boxes: DEFAULT_PRODUCER_BOXES.map((box) => ({
      ...box,
      wineNames: [...box.wineNames],
    })),
    source: "default",
  };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
