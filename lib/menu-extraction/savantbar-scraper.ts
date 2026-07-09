/**
 * Scraper for Savant Bar's Systemless bottle list (flasklista.savantbar.se).
 * Data is served as Airtable-shaped JSON from public /api/data/* endpoints.
 */

import { createHash } from "crypto";
import type { SavantbarOtherFields, SavantbarVinFields } from "./savantbar-schema";

const BASE_URL = "https://flasklista.savantbar.se";
const SOURCE_SLUG = "savant-bar-kaffe-and-vin";

export const SAVANTBAR_FLASKLISTA_URL = `${BASE_URL}/en`;

export interface SavantbarAirtableRecord<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  createdTime: string;
  fields: T;
}

export type { SavantbarOtherFields, SavantbarVinFields };

export interface SavantbarRawSnapshot {
  fetched_at: string;
  source_url: string;
  source_slug: string;
  wines: SavantbarAirtableRecord<Record<string, unknown>>[];
  other: SavantbarAirtableRecord<Record<string, unknown>>[];
  producers: SavantbarAirtableRecord<Record<string, unknown>>[];
}

/** @deprecated Use SavantbarRawSnapshot + prepareSavantbarSnapshot */
export type SavantbarSnapshot = SavantbarRawSnapshot;

async function fetchEndpoint(
  endpoint: string,
): Promise<SavantbarAirtableRecord<Record<string, unknown>>[]> {
  const res = await fetch(`${BASE_URL}/api/data/${endpoint}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Savantbar API ${endpoint} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as SavantbarAirtableRecord<Record<string, unknown>>[];
}

export async function fetchSavantbarSnapshot(): Promise<SavantbarRawSnapshot> {
  const [wines, other, producers] = await Promise.all([
    fetchEndpoint("Vin"),
    fetchEndpoint("Other"),
    fetchEndpoint("Producer"),
  ]);

  return {
    fetched_at: new Date().toISOString(),
    source_url: SAVANTBAR_FLASKLISTA_URL,
    source_slug: SOURCE_SLUG,
    wines,
    other,
    producers,
  };
}

export function hashSavantbarSnapshot(snapshot: {
  wines: unknown[];
  other: unknown[];
}): string {
  const payload = JSON.stringify({
    wines: snapshot.wines,
    other: snapshot.other,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.replace(/^[\s\t]+/, "").trim() || null;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0].replace(/^[\s\t]+/, "").trim() || null;
  }
  return null;
}
