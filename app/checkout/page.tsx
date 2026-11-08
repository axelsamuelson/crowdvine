import { redirect } from "next/navigation";
import { CheckoutClient } from "./checkout-client";
import { isPlatformOpen } from "@/lib/platform-open";
import { isDirtywineInquiryMode } from "@/lib/b2b/flags";
import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";
import { buildDirectBoxUiAvailability } from "@/lib/commerce/direct-box-ui-contract";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";

export default async function CheckoutPage() {
  // Dirtywine inquiry mode: keep checkout-client intact, route B2B hosts to inquiry.
  if (isDirtywineInquiryMode() && (await getIsDirtywineSiteFromHeaders())) {
    redirect("/b2b/inquiry");
  }
  // Server-derived availability — no env secrets; flag stays default OFF.
  const directBoxAvailability = buildDirectBoxUiAvailability();
  // Dual-offer compare: flag OFF by default + production deny (preview/local only).
  const dualOfferCompareSurfaceAllowed = isDualOfferCheckoutSurfaceAllowed();
  return (
    <CheckoutClient
      platformOpen={isPlatformOpen()}
      directBoxCheckoutEnabled={isDirectBoxCheckoutEnabled()}
      directBoxAvailability={directBoxAvailability}
      dualOfferCompareSurfaceAllowed={dualOfferCompareSurfaceAllowed}
    />
  );
}
