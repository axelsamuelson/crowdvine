import {
  DEFAULT_PRODUCER_BOXES,
  PRODUCER_BOX_BOTTLE_COUNT,
  PRODUCER_BOX_MAX_PER_WINE,
  type ProducerBoxDefinition,
  type ProducerBoxId,
  type ProducerBoxLine,
} from "@/lib/producer-boxes/config";

const BOX_IDS: readonly ProducerBoxId[] = [
  "mas-des-mesures",
  "la-marotte",
  "clos-fantine",
  "chateau-del-ranq",
  "hors-saison",
  "le-bouc-a-trois-pattes",
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

function readLines(value: unknown): ProducerBoxLine[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const lines: ProducerBoxLine[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const wineId = (row as { wineId?: unknown }).wineId;
    const quantity = (row as { quantity?: unknown }).quantity;
    if (typeof wineId !== "string" || !wineId.trim()) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity)) return null;
    if (quantity < 1 || quantity > PRODUCER_BOX_MAX_PER_WINE) return null;
    lines.push({ wineId: wineId.trim(), quantity });
  }
  const ids = new Set(lines.map((line) => line.wineId));
  if (ids.size !== lines.length) return null;
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (total !== PRODUCER_BOX_BOTTLE_COUNT) return null;
  return lines;
}

/** Parse an admin JSON payload. Returns null when a box is not six bottles. */
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
      lines?: unknown;
    };
    if (typeof row.id !== "string" || !isBoxId(row.id)) return null;
    if (typeof row.producerName !== "string" || !row.producerName.trim()) return null;
    const name = readLocalized(row.name);
    const story = readLocalized(row.story);
    const lines = readLines(row.lines);
    if (!name || !story || !lines) return null;
    parsed.push({
      id: row.id,
      producerName: row.producerName.trim(),
      name,
      story,
      lines,
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
      lines: box.lines.map((line) => ({
        wineId: line.wineId,
        quantity: line.quantity,
      })),
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
    [box.producerName, box.name.sv, box.name.en, box.story.sv, box.story.en].some(
      containsEmDash,
    ),
  );
}

export function defaultProducerBoxesCatalog(): ProducerBoxesCatalog {
  return {
    boxes: DEFAULT_PRODUCER_BOXES.map((box) => ({
      ...box,
      lines: box.lines.map((line) => ({ ...line })),
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
