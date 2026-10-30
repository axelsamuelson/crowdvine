/**
 * Pure helpers for the manual "becomes physical" pickup step:
 * suggestion (≥20% pallet-zone leader), fill trigger, and weight estimate.
 */

import {
  DEFAULT_KG_PER_BOTTLE,
  DEFAULT_PICKUP_SELECTION_TRIGGER_SHARE,
} from "@/lib/pallet-physical-settings";

/** Minimum share of pallet bottles for a pallet-zone producer to win pickup suggestion. */
export const PALLET_ZONE_PRIORITY_THRESHOLD = 0.2;

export type ProducerBottleCount = {
  producerId: string;
  bottles: number;
  isPalletZone: boolean;
  name?: string | null;
};

export type PickupSuggestion = {
  producerId: string | null;
  producerName: string | null;
  bottles: number;
  shareOfPallet: number;
  meetsThreshold: boolean;
  totalBottles: number;
  thresholdBottles: number;
};

export function suggestPickupProducer(
  producers: ProducerBottleCount[],
  totalBottles: number,
  thresholdShare: number = PALLET_ZONE_PRIORITY_THRESHOLD,
): PickupSuggestion {
  const total = Math.max(0, Math.floor(Number(totalBottles) || 0));
  const thresholdBottles = Math.floor(total * thresholdShare);

  if (total === 0) {
    return {
      producerId: null,
      producerName: null,
      bottles: 0,
      shareOfPallet: 0,
      meetsThreshold: false,
      totalBottles: 0,
      thresholdBottles: 0,
    };
  }

  const zoneLeaders = producers
    .filter((p) => p.isPalletZone && p.bottles > 0)
    .sort((a, b) => {
      if (b.bottles !== a.bottles) return b.bottles - a.bottles;
      return a.producerId.localeCompare(b.producerId);
    });

  const leader = zoneLeaders[0] ?? null;
  if (!leader) {
    return {
      producerId: null,
      producerName: null,
      bottles: 0,
      shareOfPallet: 0,
      meetsThreshold: false,
      totalBottles: total,
      thresholdBottles,
    };
  }

  const meetsThreshold = leader.bottles >= thresholdBottles;
  return {
    producerId: meetsThreshold ? leader.producerId : null,
    producerName: meetsThreshold ? (leader.name ?? null) : null,
    bottles: leader.bottles,
    shareOfPallet: total > 0 ? leader.bottles / total : 0,
    meetsThreshold,
    totalBottles: total,
    thresholdBottles,
  };
}

/** True when filled bottles reach triggerShare × min bottles (default 0.8 × 120). */
export function isPickupSelectionTriggerReached(input: {
  bottlesFilled: number;
  minBottlesToShip: number;
  triggerShare?: number;
}): boolean {
  const filled = Math.max(0, Math.floor(Number(input.bottlesFilled) || 0));
  const min = Math.max(1, Math.floor(Number(input.minBottlesToShip) || 0));
  const share =
    input.triggerShare == null || !Number.isFinite(input.triggerShare)
      ? DEFAULT_PICKUP_SELECTION_TRIGGER_SHARE
      : Math.max(0, Number(input.triggerShare));
  const threshold = Math.ceil(min * share);
  return filled >= threshold;
}

export function estimatePalletWeightKg(
  bottles: number,
  kgPerBottle: number = DEFAULT_KG_PER_BOTTLE,
): number {
  const n = Math.max(0, Math.floor(Number(bottles) || 0));
  const kg = Number(kgPerBottle);
  const per = Number.isFinite(kg) && kg > 0 ? kg : DEFAULT_KG_PER_BOTTLE;
  return Math.round(n * per * 1000) / 1000;
}

export function isPalletWeightOverLimit(
  estimatedKg: number,
  weightLimitKg: number | null,
): boolean {
  if (weightLimitKg == null || !Number.isFinite(weightLimitKg)) return false;
  if (weightLimitKg < 0) return false;
  return estimatedKg > weightLimitKg;
}

export function formatPickupSuggestionLabel(suggestion: PickupSuggestion): string | null {
  if (!suggestion.meetsThreshold || !suggestion.producerId) return null;
  const pct = Math.round(suggestion.shareOfPallet * 100);
  const name = suggestion.producerName?.trim() || suggestion.producerId;
  return `${name} (${suggestion.bottles} bottles, ${pct}%)`;
}
