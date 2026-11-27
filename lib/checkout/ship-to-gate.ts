import { NextResponse } from "next/server";

import { GEO_COUNTRY_COOKIE } from "@/lib/analytics/visitor-identity";
import {
  countryPolicy,
  normalizeCountryCode,
  type CountryPolicy,
} from "@/lib/market/country-registry";

export const SHIP_TO_COOKIE = "pact_ship_to";

export type ShipToBlock = {
  status: 409;
  code: "ship_to_not_live" | "ship_to_address_mismatch";
  country: string;
  policy: CountryPolicy;
};

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Ship-to for a checkout request.
 * Cookie wins. Otherwise the Vercel geo cookie / header. No value means the
 * caller has not named a country (legacy SE requests omit it).
 */
export function readRequestShipTo(request: Request): string | null {
  const explicit = normalizeCountryCode(request.headers.get("x-pact-ship-to"));
  if (explicit) return explicit;
  const cookieHeader = request.headers.get("cookie");
  const fromShip = normalizeCountryCode(
    cookieValue(cookieHeader, SHIP_TO_COOKIE),
  );
  if (fromShip) return fromShip;
  const fromGeo = normalizeCountryCode(
    cookieValue(cookieHeader, GEO_COUNTRY_COOKIE),
  );
  if (fromGeo) return fromGeo;
  return normalizeCountryCode(request.headers.get("x-vercel-ip-country"));
}

/**
 * Block checkout when ship-to is not live, or the delivery address country
 * differs from ship-to. Missing ship-to and missing address does not block,
 * so existing Sweden requests stay on the previous path.
 */
export function evaluateShipToCheckout(input: {
  shipTo?: string | null;
  addressCountry?: string | null;
}): ShipToBlock | null {
  const shipTo = normalizeCountryCode(input.shipTo);
  const address = normalizeCountryCode(input.addressCountry);
  if (!shipTo && !address) return null;

  const country = shipTo ?? address!;
  const policy = countryPolicy(country);
  if (policy.status !== "live") {
    return {
      status: 409,
      code: "ship_to_not_live",
      country,
      policy,
    };
  }
  if (shipTo && address && shipTo !== address) {
    return {
      status: 409,
      code: "ship_to_address_mismatch",
      country: shipTo,
      policy: countryPolicy(shipTo),
    };
  }
  return null;
}

export function shipToCheckoutResponse(
  request: Request,
  addressCountry?: string | null,
): NextResponse | null {
  const block = evaluateShipToCheckout({
    shipTo: readRequestShipTo(request),
    addressCountry,
  });
  if (!block) return null;
  return NextResponse.json(
    {
      error:
        block.code === "ship_to_address_mismatch"
          ? "Delivery country must match Ship to."
          : "We don't deliver to this country yet.",
      code: block.code,
      country: block.country,
    },
    { status: 409 },
  );
}
