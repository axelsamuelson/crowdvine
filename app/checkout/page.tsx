import { redirect } from "next/navigation";
import { CheckoutClient } from "./checkout-client";
import { isPlatformOpen } from "@/lib/platform-open";
import { isGuestCheckoutEnabled } from "@/lib/checkout/guest-checkout-flag";
import { isDirtywineInquiryMode } from "@/lib/b2b/flags";
import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";
import { buildDirectBoxUiAvailability } from "@/lib/commerce/direct-box-ui-contract";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";
import { resolvePalletCloseSwitchDirectEntry } from "@/lib/checkout/pallet-close/switch-direct";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Dirtywine inquiry mode: keep checkout-client intact, route B2B hosts to inquiry.
  if (isDirtywineInquiryMode() && (await getIsDirtywineSiteFromHeaders())) {
    redirect("/b2b/inquiry");
  }

  const params = searchParams ? await searchParams : {};
  const switchEntry = resolvePalletCloseSwitchDirectEntry({
    palletCloseSwitch: params.pallet_close_switch,
    fulfillment: params.fulfillment,
  });

  // Unreachable when DIRECT_BOX_CHECKOUT_ENABLED is false — strip the attempt.
  if (!switchEntry.ok && switchEntry.reason === "direct_box_disabled") {
    redirect("/checkout");
  }

  // Server-derived availability — no env secrets; flag stays default OFF.
  const directBoxAvailability = buildDirectBoxUiAvailability();
  // Dual-offer compare: flag OFF by default + production deny (preview/local only).
  const dualOfferCompareSurfaceAllowed = isDualOfferCheckoutSurfaceAllowed();
  return (
    <CheckoutClient
      platformOpen={isPlatformOpen()}
      guestCheckoutEnabled={isGuestCheckoutEnabled()}
      directBoxCheckoutEnabled={isDirectBoxCheckoutEnabled()}
      directBoxAvailability={directBoxAvailability}
      dualOfferCompareSurfaceAllowed={dualOfferCompareSurfaceAllowed}
      palletCloseSwitchDirect={
        switchEntry.ok
          ? {
              reservationId: switchEntry.reservationId,
              requireNewQuote: true,
              requireExplicitAcceptance: true,
              preferredFulfillment: "direct_box",
            }
          : null
      }
    />
  );
}
