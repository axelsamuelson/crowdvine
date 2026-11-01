import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isB2BHost } from "@/lib/b2b-site";
import {
  resolvePalletEarlyBirdContext,
  resolveWineIdForProductHandle,
} from "@/lib/pallet-early-bird-context";
import { deliveryEstimateLabelFromFillPercent } from "@/lib/pallet-delivery-estimate-label";
import { getPalletDiscountTier } from "@/lib/pallet-discount";
import {
  resolveActiveGeoZoneAnonymous,
  resolveActiveGeoZoneForUser,
  type ResolvedActiveGeoZone,
} from "@/lib/market/resolve-active-geo-zone";
import {
  resolveMarketForCountry,
  type ResolvedMarket,
} from "@/lib/market/resolve-market";
import {
  isCustomerConditionalDrop,
  resolveMarketDropForPallet,
} from "@/lib/market/resolve-market-drop";
import { isVirtualCampaignFromGeoZone } from "@/lib/market/market-drop-eligibility";
import {
  formatPalletDestinationShort,
  formatVirtualDropReadyFromDisplayName,
} from "@/lib/market/market-drop-destination";
import {
  getGeoZoneById,
  resolveGeoZone,
} from "@/lib/market/resolve-geo-zone";
import type { MarketDropRow } from "@/lib/market/market-drop-types";
import {
  DEFAULT_MIN_BOTTLES_TO_COMPLETE,
  DEFAULT_PHYSICAL_BOTTLE_CAPACITY,
  computePalletShipProgress,
} from "@/lib/pallet-ship-progress";
import type { ZoneStatusPayload } from "@/lib/pallet/zone-status";

/** Shopping zone settings (PDP pallet destination link). */
const SETTINGS_URL = "/settings/zone" as const;

const MEANINGFUL_FILL_RATE_BOTTLES_PER_HOUR = 0.25;
const MIN_PALLET_AGE_HOURS_FOR_ETA = 2;
const FILL_PERCENT_FOR_ETA = 40;

type DropState = "existing" | "virtual_available" | "unavailable";

export type ZoneStatusBody = ZoneStatusPayload & {
  bottlesCount: number;
  capacityBottles: number;
  estimatedDelivery: string;
};

function computeEstimatedDays(
  bottlesFilled: number,
  createdAtIso: string | null,
  minBottlesToShip: number,
): number | null {
  if (minBottlesToShip <= 0) return null;
  if (bottlesFilled < (FILL_PERCENT_FOR_ETA / 100) * minBottlesToShip) {
    return null;
  }
  if (!createdAtIso) return null;

  const createdMs = new Date(createdAtIso).getTime();
  if (!Number.isFinite(createdMs)) return null;

  const ageHours = (Date.now() - createdMs) / (1000 * 60 * 60);
  if (ageHours < MIN_PALLET_AGE_HOURS_FOR_ETA) return null;

  const fillRate = bottlesFilled / ageHours;
  if (fillRate < MEANINGFUL_FILL_RATE_BOTTLES_PER_HOUR) return null;

  const remaining = minBottlesToShip - bottlesFilled;
  if (remaining <= 0) return null;

  const days = remaining / (fillRate * 24);
  return Math.ceil(days);
}

function statusPrimaryForExistingConditionalDrop(drop: MarketDropRow): string {
  const dest = drop.display_destination.trim();
  const place = dest.split(",")[0]?.trim() || dest;
  return `${place} pallet · In review`;
}

function shoppingZoneDisplayDestination(
  activeGeo: ResolvedActiveGeoZone,
): string {
  return formatPalletDestinationShort(
    activeGeo.countryCode,
    activeGeo.displayName,
  );
}

function emptyStatus(body: {
  userZoneName: string;
  countryCode?: string;
}): ZoneStatusBody {
  const rawDestination = body.userZoneName;
  const countryCode = body.countryCode?.trim().toUpperCase() || "SE";
  const displayDestination = formatPalletDestinationShort(
    countryCode,
    rawDestination,
  );
  const shipProgress = computePalletShipProgress(
    0,
    DEFAULT_MIN_BOTTLES_TO_COMPLETE,
    DEFAULT_PHYSICAL_BOTTLE_CAPACITY,
  );
  return {
    bottlesFilled: 0,
    bottleCapacity: shipProgress.minBottlesToShip,
    bottlesCount: 0,
    capacityBottles: shipProgress.minBottlesToShip,
    physicalBottleCapacity: shipProgress.physicalBottleCapacity,
    minBottlesToShip: shipProgress.minBottlesToShip,
    bottlesRemainingToShip: shipProgress.bottlesRemainingToShip,
    shipProgressPercent: shipProgress.shipProgressPercent,
    isReadyToShip: shipProgress.isReadyToShip,
    fillPercent: shipProgress.shipProgressPercent,
    discountTier: 0,
    estimatedDays: null,
    estimatedDelivery: deliveryEstimateLabelFromFillPercent(0),
    userZoneName: rawDestination,
    settingsUrl: SETTINGS_URL,
    statusPrimary: "Pallet status",
    bottlesVerb: "ordered",
    logisticsFootnote: null,
    dropState: "existing",
    marketDropId: null,
    displayDestination,
    canStartMarketDrop: true,
    campaignTagline: null,
    showProgressBar: true,
    showEarlyBird: false,
    unavailableMessage: null,
  };
}

export type GetZoneStatusOptions = {
  /** Request host — used for B2B early-bird suppression. */
  requestHost?: string | null;
  /** Optional search params string for B2B host detection. */
  searchParams?: URLSearchParams;
  /**
   * Skip auth cookies / user zone. Required for ISR HTML so personalized
   * destination data is never shared across visitors. Client provider refetches.
   */
  anonymousOnly?: boolean;
};

/**
 * Resolve pallet fill / destination status for a product handle.
 * Shared by `/api/pallet/zone-status` and SSR product/list surfaces.
 */
export async function getPalletZoneStatusForHandle(
  productHandle: string | null | undefined,
  options: GetZoneStatusOptions = {},
): Promise<ZoneStatusBody> {
  try {
    const handle = productHandle?.trim();
    if (!handle) {
      return emptyStatus({ userZoneName: "Stockholm, Sweden" });
    }

    const user = options.anonymousOnly
      ? null
      : await getCurrentUser();
    const activeGeoSlice = user?.id
      ? await resolveActiveGeoZoneForUser(user.id)
      : await resolveActiveGeoZoneAnonymous();

    const wineId = await resolveWineIdForProductHandle(handle);
    if (!wineId) {
      return emptyStatus({
        userZoneName: activeGeoSlice.displayName,
        countryCode: activeGeoSlice.countryCode,
      });
    }

    const ctx = await resolvePalletEarlyBirdContext(
      [wineId],
      user?.id ?? null,
    );

    let bottlesFilled = ctx.bottlesFilled;
    const physicalCapacity =
      ctx.bottleCapacity > 0
        ? ctx.bottleCapacity
        : DEFAULT_PHYSICAL_BOTTLE_CAPACITY;
    const minBottlesToShip =
      ctx.minBottlesToShip > 0
        ? ctx.minBottlesToShip
        : DEFAULT_MIN_BOTTLES_TO_COMPLETE;
    let shipProgress =
      ctx.shipProgress ??
      computePalletShipProgress(
        bottlesFilled,
        minBottlesToShip,
        physicalCapacity,
      );
    let discountTier = ctx.discountTier;

    const userZoneName =
      activeGeoSlice.displayName.trim() || "Stockholm, Sweden";
    let statusPrimary = "Pallet status";
    let bottlesVerb: "ordered" | "requested" = "ordered";
    let logisticsFootnote: string | null = null;
    let estimatedDays: number | null = null;

    let dropState: DropState = "existing";
    let marketDropId: string | null = null;
    let canStartMarketDrop = true;
    let campaignTagline: string | null = null;
    let showProgressBar = true;
    let showEarlyBird = true;
    let unavailableMessage: string | null = null;

    const palletId = ctx.activePalletId;
    if (palletId && typeof palletId === "string") {
      const resolvedMarket: ResolvedMarket = await resolveMarketForCountry({
        countryCode: activeGeoSlice.countryCode,
        regionCode: activeGeoSlice.regionCode,
      });

      if (resolvedMarket.marketCode !== "UNKNOWN") {
        const geo = await resolveGeoZone({
          marketCode: activeGeoSlice.marketCode,
          countryCode: activeGeoSlice.countryCode,
          regionCode: activeGeoSlice.regionCode,
          city: activeGeoSlice.city,
        });

        const drop = await resolveMarketDropForPallet({
          sourcePalletId: palletId,
          marketCode: activeGeoSlice.marketCode,
          countryCode: activeGeoSlice.countryCode,
          regionCode: activeGeoSlice.regionCode,
        });

        let dropBlockedByGeo = false;
        if (drop?.geo_zone_id) {
          const linked = await getGeoZoneById(drop.geo_zone_id);
          if (
            linked &&
            (!linked.isActive || linked.eligibilityStatus === "disabled")
          ) {
            dropBlockedByGeo = true;
          }
        }

        if (drop && !dropBlockedByGeo) {
          dropState = "existing";
          marketDropId = drop.id;
          discountTier = getPalletDiscountTier(bottlesFilled);
          showEarlyBird = true;
          if (isCustomerConditionalDrop(drop)) {
            statusPrimary = statusPrimaryForExistingConditionalDrop(drop);
            bottlesVerb = "requested";
            if (
              typeof drop.logistics_status === "string" &&
              drop.logistics_status.toLowerCase() === "pending"
            ) {
              logisticsFootnote = "Logistics pending";
            }
          } else {
            statusPrimary = "Pallet status";
            bottlesVerb = "ordered";
          }
        } else if (drop && dropBlockedByGeo) {
          dropState = "unavailable";
          marketDropId = null;
          statusPrimary = "Not available in your shopping zone yet";
          unavailableMessage =
            "This wine is not currently available for reservations for your shopping zone.";
          bottlesVerb = "ordered";
          bottlesFilled = 0;
          shipProgress = computePalletShipProgress(
            0,
            minBottlesToShip,
            physicalCapacity,
          );
          discountTier = 0;
          showProgressBar = false;
          showEarlyBird = false;
          canStartMarketDrop = false;
          campaignTagline = null;
          logisticsFootnote = null;
        } else if (geo && isVirtualCampaignFromGeoZone(resolvedMarket, geo)) {
          dropState = "virtual_available";
          marketDropId = null;
          statusPrimary = formatVirtualDropReadyFromDisplayName(geo.displayName);
          const virtualConditionalCopy =
            geo.eligibilityStatus === "conditional_reservation";
          if (virtualConditionalCopy) {
            bottlesVerb = "requested";
            campaignTagline =
              "Be the first to request bottles for this pallet.";
          } else {
            bottlesVerb = "ordered";
            campaignTagline =
              "Be the first to reserve bottles for this pallet.";
          }
          bottlesFilled = 0;
          shipProgress = computePalletShipProgress(
            0,
            minBottlesToShip,
            physicalCapacity,
          );
          discountTier = 0;
          showEarlyBird = false;
          canStartMarketDrop = true;
        } else {
          dropState = "unavailable";
          marketDropId = null;
          statusPrimary = "Not available in your shopping zone yet";
          unavailableMessage =
            "This wine is not currently available for reservations for your shopping zone.";
          bottlesVerb =
            resolvedMarket.countryCode === "US" ? "requested" : "ordered";
          bottlesFilled = 0;
          shipProgress = computePalletShipProgress(
            0,
            minBottlesToShip,
            physicalCapacity,
          );
          discountTier = 0;
          showProgressBar = false;
          showEarlyBird = false;
          canStartMarketDrop = false;
          campaignTagline = null;
          logisticsFootnote = null;
        }
      }
    }

    const fillPercent = shipProgress.shipProgressPercent;
    const estimatedDelivery =
      deliveryEstimateLabelFromFillPercent(fillPercent);

    if (bottlesVerb === "ordered" && !shipProgress.isReadyToShip) {
      estimatedDays = computeEstimatedDays(
        bottlesFilled,
        ctx.activePalletCreatedAt,
        shipProgress.minBottlesToShip,
      );
    }

    const displayDestination =
      dropState === "unavailable"
        ? ""
        : shoppingZoneDisplayDestination(activeGeoSlice);

    if (
      isB2BHost(
        options.requestHost ?? null,
        options.searchParams,
      )
    ) {
      discountTier = 0;
      showEarlyBird = false;
    }

    return {
      bottlesFilled,
      bottleCapacity: shipProgress.minBottlesToShip,
      bottlesCount: bottlesFilled,
      capacityBottles: shipProgress.minBottlesToShip,
      physicalBottleCapacity: shipProgress.physicalBottleCapacity,
      minBottlesToShip: shipProgress.minBottlesToShip,
      bottlesRemainingToShip: shipProgress.bottlesRemainingToShip,
      shipProgressPercent: shipProgress.shipProgressPercent,
      isReadyToShip: shipProgress.isReadyToShip,
      fillPercent,
      discountTier,
      estimatedDays,
      estimatedDelivery,
      userZoneName,
      settingsUrl: SETTINGS_URL,
      statusPrimary,
      bottlesVerb,
      logisticsFootnote,
      dropState,
      marketDropId,
      displayDestination,
      canStartMarketDrop,
      campaignTagline,
      showProgressBar,
      showEarlyBird,
      unavailableMessage,
    };
  } catch {
    return emptyStatus({ userZoneName: "Stockholm, Sweden", countryCode: "SE" });
  }
}

/** Per-request memoized lookup for SSR list/PDP. */
export const getCachedPalletZoneStatusForHandle = cache(
  async (
    productHandle: string,
    requestHost?: string | null,
    anonymousOnly = false,
  ) =>
    getPalletZoneStatusForHandle(productHandle, {
      requestHost,
      anonymousOnly,
    }),
);
