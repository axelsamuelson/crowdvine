import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  resolvePalletEarlyBirdContext,
  resolveWineIdForProductHandle,
} from "@/lib/pallet-early-bird-context";

/** Pallzon = `resolveDeliveryAddressForUser` → `profiles.postal_code`, `city`, `country` (samma som `/profile/edit`). */
const SETTINGS_URL = "/profile/edit" as const;

const MEANINGFUL_FILL_RATE_BOTTLES_PER_HOUR = 0.25;
const MIN_PALLET_AGE_HOURS_FOR_ETA = 2;
const FILL_PERCENT_FOR_ETA = 40;

function computeFillPercent(
  bottlesFilled: number,
  bottleCapacity: number,
): number {
  if (bottleCapacity <= 0) return 0;
  return (
    Math.round(Math.min(100, (bottlesFilled / bottleCapacity) * 1000)) / 10
  );
}

function computeEstimatedDays(
  bottlesFilled: number,
  createdAtIso: string | null,
  bottleCapacity: number,
): number | null {
  if (bottleCapacity <= 0) return null;
  if (bottlesFilled < (FILL_PERCENT_FOR_ETA / 100) * bottleCapacity) {
    return null;
  }
  if (!createdAtIso) return null;

  const createdMs = new Date(createdAtIso).getTime();
  if (!Number.isFinite(createdMs)) return null;

  const ageHours = (Date.now() - createdMs) / (1000 * 60 * 60);
  if (ageHours < MIN_PALLET_AGE_HOURS_FOR_ETA) return null;

  const fillRate = bottlesFilled / ageHours;
  if (fillRate < MEANINGFUL_FILL_RATE_BOTTLES_PER_HOUR) return null;

  const remaining = bottleCapacity - bottlesFilled;
  if (remaining <= 0) return null;

  const days = remaining / (fillRate * 24);
  return Math.ceil(days);
}

function emptyOk(body: {
  userZoneName: string;
}): Response {
  return NextResponse.json({
    bottlesFilled: 0,
    bottleCapacity: 0,
    fillPercent: 0,
    discountTier: 0 as const,
    estimatedDays: null,
    userZoneName: body.userZoneName,
    settingsUrl: SETTINGS_URL,
  });
}

export async function GET(request: NextRequest) {
  try {
    const productHandle = request.nextUrl.searchParams.get("productHandle")?.trim();
    if (!productHandle) {
      return emptyOk({ userZoneName: "Stockholm" });
    }

    const user = await getCurrentUser();
    const wineId = await resolveWineIdForProductHandle(productHandle);
    if (!wineId) {
      return emptyOk({ userZoneName: "Stockholm" });
    }

    const ctx = await resolvePalletEarlyBirdContext(
      [wineId],
      user?.id ?? null,
    );

    const bottlesFilled = ctx.bottlesFilled;
    const bottleCapacity = ctx.bottleCapacity;
    const fillPercent = computeFillPercent(bottlesFilled, bottleCapacity);

    const discountTier = ctx.discountTier;
    const estimatedDays = computeEstimatedDays(
      bottlesFilled,
      ctx.activePalletCreatedAt,
      bottleCapacity,
    );

    const userZoneName =
      ctx.deliveryZoneName?.trim() || "Stockholm";

    return NextResponse.json({
      bottlesFilled,
      bottleCapacity,
      fillPercent,
      discountTier,
      estimatedDays,
      userZoneName,
      settingsUrl: SETTINGS_URL,
    });
  } catch {
    return emptyOk({ userZoneName: "Stockholm" });
  }
}
