import { unstable_cache } from "next/cache";

import type { AppLocale } from "@/lib/i18n/locale";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Manual rank to exact systembolaget_products.producer_name strings.
 * Availability is not stored here. A rank is omitted when no name was verified.
 */
export const SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK: Readonly<
  Record<number, readonly string[]>
> = {
  8: ["Radikon"],
  12: ["Marcel Lapierre"],
  13: ["Azienda Agricola Frank Cornelissen"],
  20: ["Azienda Vitivinicola La Stoppa di Elena Pantaleoni"],
  23: ["Azienda Agricola Valentini"],
  28: ["Domaine Huet"],
  46: ["Weingut Rudolf Fürst"],
  48: ["Gut Oggau"],
  56: ["Weingut Werlitsch - Tscheppe Ewald u. Brigitte"],
  64: ["Les Foulards Rouges"],
  78: ["Milan Nestarec"],
  81: ["Cantina Bartolo Mascarello"],
  86: ["Éric Texier"],
  89: ["Adega Aphros Wine"],
  91: ["Arianna Occhipinti"],
  92: ["Christian Tschida"],
  94: ["Azienda Agricola Foradori"],
  97: ["Ogier"],
  101: ["Domaine Sylvain Pataille"],
  102: ["Domaine Catherine et Pierre Breton"],
  103: ["Domaine Alice et Olivier De Moor"],
  114: ["Testalonga Banditskloof"],
};

const AVAILABILITY_REVALIDATE_SECONDS = 60 * 60 * 24;

export type SystembolagetAvailabilityCounts = Readonly<Record<number, number>>;

export function systembolagetAvailabilityLabel(
  availableCount: number,
  locale: AppLocale,
): string | null {
  if (availableCount < 1) return null;
  if (locale === "sv") {
    return availableCount > 1
      ? `Finns på Systembolaget, ${availableCount} viner`
      : "Finns på Systembolaget";
  }
  return availableCount > 1
    ? `Available at Systembolaget, ${availableCount} wines`
    : "Available at Systembolaget";
}

export function systembolagetRangeNote(locale: AppLocale): {
  before: string;
  link: string;
  after: string;
} {
  if (locale === "sv") {
    return {
      before: "Ikonen visar att producenten har minst ett vin i ",
      link: "Systembolagets sortiment",
      after: " just nu.",
    };
  }
  return {
    before: "The icon shows the producer has at least one wine in ",
    link: "Systembolaget's range",
    after: " right now.",
  };
}

function mappedProducerNames(): string[] {
  return [
    ...new Set(
      Object.values(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK).flatMap((names) => [
        ...names,
      ]),
    ),
  ];
}

async function fetchSystembolagetAvailabilityCounts(): Promise<
  Record<number, number>
> {
  const names = mappedProducerNames();
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_products")
    .select("producer_name, is_available")
    .in("producer_name", names)
    .eq("is_available", true);

  if (error) {
    throw new Error(error.message);
  }

  const availableByName = new Map<string, number>();
  for (const row of data ?? []) {
    const producerName = row.producer_name;
    if (!producerName) continue;
    availableByName.set(
      producerName,
      (availableByName.get(producerName) ?? 0) + 1,
    );
  }

  const counts: Record<number, number> = {};
  for (const [rank, producerNames] of Object.entries(
    SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK,
  )) {
    const available = producerNames.reduce(
      (sum, name) => sum + (availableByName.get(name) ?? 0),
      0,
    );
    if (available > 0) counts[Number(rank)] = available;
  }
  return counts;
}

/**
 * Available product counts for mapped ranks. Cached 24 hours.
 * A failed read returns no counts, so the page renders without icons.
 */
export async function getSystembolagetProducerAvailability(): Promise<SystembolagetAvailabilityCounts> {
  try {
    return await unstable_cache(
      fetchSystembolagetAvailabilityCounts,
      ["top100-systembolaget-producer-availability"],
      { revalidate: AVAILABILITY_REVALIDATE_SECONDS },
    )();
  } catch {
    return {};
  }
}
