"use client";

import { useEffect, useMemo, useRef, useState, Suspense, useCallback } from "react";
import { CartMergeModal } from "@/components/cart/cart-merge-modal";
import { CheckoutEmailAuth } from "@/components/checkout/checkout-email-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAgeLimit, meetsAgeRequirement } from "@/lib/age-limits";
import { PRICE_VERSION } from "@/lib/analytics/price-version";
import { pricesFromCheckoutCart } from "@/lib/analytics/cart-event-prices";
import { CHECKOUT_TERMS_VERSION } from "@/lib/checkout/terms-version";
import Link from "next/link";
import type { Cart, CartItem } from "@/lib/shopify/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileInfoModal } from "@/components/checkout/profile-info-modal";
import { PaymentMethodSelectorB2B } from "@/components/checkout/payment-method-selector-b2b";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReservationLoadingModal } from "@/components/checkout/reservation-loading-modal";
import {
  StripePaymentSection,
  warmStripeJs,
  type PrefetchedStripeIntent,
  type StripeConfirmResult,
} from "@/components/checkout/stripe-payment-section";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import { toast } from "sonner";
import {
  MapPin,
  AlertCircle,
  Check,
  ArrowRight,
  FileText,
  ChevronRight,
} from "lucide-react";
import { clearZoneCache } from "@/lib/zone-matching";
import { ensureVisitorIdentity } from "@/lib/analytics/visitor-identity";
import {
  isInternalDevice,
  setInternalDevice,
} from "@/lib/analytics/internal-device";
import {
  CHECKOUT_STARTED_KEY,
  ageVerificationPassedKey,
  ageVerificationShownKey,
  clearCheckoutAnalyticsSession,
  deliveryCapturedEmitKey,
  contactCapturedEmitKey,
  emitOnce,
  termsAcceptedEmitKey,
} from "@/lib/analytics/once-per-session";
import { deliveryLinesForAnalytics } from "@/lib/analytics/checkout-draft-metadata";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { calculateCartShippingCost } from "@/lib/shipping-calculations";
import type { PalletInfo } from "@/lib/zone-matching";
import {
  ShareBottlesDialog,
  type ShareAllocation,
} from "@/components/checkout/share-bottles-dialog";
import {
  allocatePactRedemptionPoints,
  calculateBoostAwareMaxRedemption,
} from "@/lib/membership/pact-points-redemption-math";
import { cn } from "@/lib/utils";
import type { ProducerValidation } from "@/lib/checkout-validation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getCountryCodeFromProfileCountry,
  getCountryDisplayName,
  getCountryMarketMode,
  isValidUsStateCode,
  listUsStateCodesSorted,
} from "@/lib/countries";
import { isUsConditionalReservationsEnabledClient } from "@/lib/market/feature-flags";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import { useDisplayMoney } from "@/lib/hooks/use-display-money";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";
import {
  isZoneDeliveryCompleteForActiveGeo,
  userZoneRowToDeliveryLines,
  type UserZoneAddressTemplate,
  type ZoneDeliveryLines,
} from "@/lib/checkout/user-zone-delivery-template";


interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  region?: string;
  created_at: string;
}

interface UserReward {
  id: string;
  bottles: number;
  discount_percentage: number;
  type: "account_created" | "reservation_made";
  friend_email?: string;
  earned_at: string;
  used: boolean;
}

function CheckoutContent({ platformOpen }: { platformOpen: boolean }) {
  const { t, context: shopping } = useShoppingContext();
  const paths = localizedPathsForLocale(shopping.locale);
  const { formatDisplay, formatSek } = useDisplayMoney();
  const countryDisplayLocale = shopping.locale === "sv" ? "sv" : "en";
  const uiLocalizationEnabled = shopping.uiLocalizationEnabled;
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [isStripeConfirming, setIsStripeConfirming] = useState(false);
  const [isFinalizingReservation, setIsFinalizingReservation] = useState(false);
  const [paymentMode, setPaymentMode] = useState<
    "setup_intent" | "payment_intent" | null
  >(null);
  const [stripeIntentId, setStripeIntentId] = useState<string | null>(null);
  const [stripeConfirmFn, setStripeConfirmFn] = useState<
    (() => Promise<StripeConfirmResult>) | null
  >(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  /** Stable for this checkout mount — sent on every confirm for server dedupe. */
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `chk_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  /** Open-platform: last ensure-session error (no login wall). */
  const [guestSessionError, setGuestSessionError] = useState<string | null>(
    null,
  );
  const [guestSessionPending, setGuestSessionPending] = useState(false);
  const [guestRetryNonce, setGuestRetryNonce] = useState(0);
  const guestEnsureAttemptedRef = useRef<string | null>(null);
  const [cartMergeOpen, setCartMergeOpen] = useState(false);
  const [cartMergeLoading, setCartMergeLoading] = useState(false);
  const [activeShop, setActiveShop] = useState<ResolvedActiveGeoZone | null>(
    null,
  );
  const [zoneAddressRow, setZoneAddressRow] =
    useState<UserZoneAddressTemplate | null>(null);
  const [zoneTemplatesLoaded, setZoneTemplatesLoaded] = useState(false);
  const [deliveryDraft, setDeliveryDraft] = useState<ZoneDeliveryLines | null>(
    null,
  );
  // Payment method selection removed - payment happens when pallet fills
  const [selectedPallet, setSelectedPallet] = useState<PalletInfo | null>(null);
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<UserReward[]>([]);
  const [useRewards, setUseRewards] = useState(false);
  const checkoutCompletedRef = useRef(false);
  const checkoutPhaseRef = useRef<"delivery" | "compliance" | "payment">(
    "delivery",
  );
  const zoneInfoFetchInProgressRef = useRef(false);
  const zoneInfoNeedsRefetchRef = useRef(false);
  const pendingZoneOverrideRef = useRef<ZoneDeliveryLines | null>(null);
  const lastZoneLocationKeyRef = useRef("");
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discount_code_id: string;
    discount_amount_sek: number;
    final_total_sek: number;
    type: "percent" | "sek";
    value: number;
    purpose: "normal" | "testkop";
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountApplying, setDiscountApplying] = useState(false);
  const [pendingTestkopDiscount, setPendingTestkopDiscount] = useState<{
    code: string;
    discount_code_id: string;
    discount_amount_sek: number;
    final_total_sek: number;
    type: "percent" | "sek";
    value: number;
    purpose: "testkop";
  } | null>(null);
  const [postalCodeDraft, setPostalCodeDraft] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const addressAutoSaveRef = useRef(false);
  const addressPersistedRef = useRef(false);
  const authAddressPersistRef = useRef(false);
  const [complianceStepRevealed, setComplianceStepRevealed] = useState(false);
  const [paymentCardRevealed, setPaymentCardRevealed] = useState(false);
  const [prefetchedStripeIntent, setPrefetchedStripeIntent] =
    useState<PrefetchedStripeIntent | null>(null);
  const stripePrefetchKeyRef = useRef<string | null>(null);
  const complianceSectionRef = useRef<HTMLElement | null>(null);
  const paymentSectionRef = useRef<HTMLElement | null>(null);
  const [postalModalOpen, setPostalModalOpen] = useState(false);
  const [budbeeAvailable, setBudbeeAvailable] = useState<boolean | null>(
    null,
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareAllocation, setShareAllocation] = useState<ShareAllocation | null>(
    null,
  );

  const browseOnlyCountryMessage = t("checkout.browseOnlyUnsupported");
  const [shareFriendIds, setShareFriendIds] = useState<string[] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "invoice">("card");
  const [pactPointsBalance, setPactPointsBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ageDobError, setAgeDobError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [usConditionalAck, setUsConditionalAck] = useState(false);

  // B2B vs B2C cart split — needed early for deliveryComplete / compliance gates.
  // Keep a single definition here (do not redeclare later in the component).
  const isB2BSite = useB2BPriceMode();
  const producerItems = isB2BSite
    ? cart?.lines?.filter(
        (line) => line.source === "producer" || !line.source,
      ) || []
    : cart?.lines || [];
  const warehouseItems = isB2BSite
    ? cart?.lines?.filter((line) => line.source === "warehouse") || []
    : [];
  const hasProducerItems = isB2BSite
    ? producerItems.length > 0
    : (cart?.lines?.length || 0) > 0;
  const hasWarehouseItems = isB2BSite && warehouseItems.length > 0;

  /** Authoritative totals from /api/checkout/quote (or payment-intent). */
  const [serverQuote, setServerQuote] = useState<CheckoutQuote | null>(null);

  // 6-bottle validation state
  const [validations, setValidations] = useState<ProducerValidation[]>([]);
  const [isValidCart, setIsValidCart] = useState(true);
  const [zoneInfo, setZoneInfo] = useState<{
    pickupZone: string | null;
    pickupZoneId?: string | null;
    deliveryZone: string | null;
    selectedDeliveryZoneId: string | null;
    availableDeliveryZones?: Array<{
      id: string;
      name: string;
      centerLat: number;
      centerLon: number;
      radiusKm: number;
    }>;
    pallets?: PalletInfo[];
    usingFallbackAddress?: boolean;
    zoneError?: "NO_DELIVERY_ZONE" | "UNSUPPORTED_COUNTRY" | null;
    zoneErrorMessage?: string;
  }>({ pickupZone: null, deliveryZone: null, selectedDeliveryZoneId: null });
  /** True after at least one /api/checkout/zones response was applied for current postal. */
  const [zoneFetchCompleted, setZoneFetchCompleted] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  const profileCountryCode = useMemo(
    () => getCountryCodeFromProfileCountry(profile?.country ?? "") ?? null,
    [profile?.country],
  );

  const checkoutMarketCountry = activeShop?.countryCode ?? profileCountryCode;

  const isUsConditional =
    isUsConditionalReservationsEnabledClient() &&
    checkoutMarketCountry != null &&
    getCountryMarketMode(checkoutMarketCountry) === "conditional_reservation";

  const effectiveDelivery = useMemo(() => {
    return userZoneRowToDeliveryLines(zoneAddressRow) ?? deliveryDraft;
  }, [zoneAddressRow, deliveryDraft]);

  const ageCountryCode = (
    effectiveDelivery?.countryCode ||
    checkoutMarketCountry ||
    "SE"
  ).toUpperCase();
  const requiredAge = getAgeLimit(ageCountryCode);

  const hasZoneDeliveryReady = useMemo(() => {
    if (activeShop?.geoZoneId) {
      return Boolean(
        effectiveDelivery &&
          effectiveDelivery.street?.trim() &&
          effectiveDelivery.city?.trim() &&
          effectiveDelivery.postal?.trim() &&
          isZoneDeliveryCompleteForActiveGeo(activeShop, effectiveDelivery),
      );
    }
    const fromProfile = Boolean(
      profile?.address && profile?.city && profile?.postal_code,
    );
    const fromDraft = Boolean(
      effectiveDelivery?.street?.trim() &&
        effectiveDelivery?.city?.trim() &&
        effectiveDelivery?.postal?.trim(),
    );
    return fromProfile || fromDraft;
  }, [activeShop, effectiveDelivery, profile]);

  const hasPostalCode = Boolean(
    (() => {
      const postal =
        effectiveDelivery?.postal?.trim() ||
        profile?.postal_code?.trim() ||
        postalCodeDraft.trim();
      if (!postal) return false;
      return isUsConditional ? postal.length >= 3 : /^\d{5}$/.test(postal);
    })(),
  );
  const hasFullAddress = hasZoneDeliveryReady;
  const hasContactForCheckout = Boolean(
    (
      effectiveDelivery?.fullName?.trim() ||
      profile?.full_name?.trim() ||
      ""
    ).length > 1 &&
      (
        effectiveDelivery?.email?.trim() ||
        profile?.email?.trim() ||
        ""
      ).includes("@"),
  );
  const addressStepComplete = hasZoneDeliveryReady && hasContactForCheckout;
  /** Address step unlocks as soon as postal is set — zone loading must not lock the form. */
  const deliveryPreviewReady = hasPostalCode;

  const zoneLocationKey = useMemo(() => {
    const postal =
      effectiveDelivery?.postal?.trim() || postalCodeDraft.trim() || "";
    const city = effectiveDelivery?.city?.trim() || "";
    const cc =
      effectiveDelivery?.countryCode?.trim() ||
      activeShop?.countryCode ||
      "";
    const rc = effectiveDelivery?.regionCode?.trim() || "";
    return `${postal}|${city}|${cc}|${rc}`;
  }, [
    effectiveDelivery?.postal,
    effectiveDelivery?.city,
    effectiveDelivery?.countryCode,
    effectiveDelivery?.regionCode,
    postalCodeDraft,
    activeShop?.countryCode,
  ]);
  const hasUsState =
    !isUsConditional ||
    isValidUsStateCode(effectiveDelivery?.regionCode?.trim() ?? "");
  const hasZoneSelected = Boolean(zoneInfo.selectedDeliveryZoneId);

  const deliveryZoneReady = useMemo(
    () =>
      Boolean(zoneInfo.selectedDeliveryZoneId) ||
      (typeof selectedPallet?.delivery_zone_id === "string" &&
        selectedPallet.delivery_zone_id.trim() !== ""),
    [zoneInfo.selectedDeliveryZoneId, selectedPallet?.delivery_zone_id],
  );
  const deliveryComplete = useMemo(
    () => {
      // Contact (name/email) is collected in payment / auth — do not block step 3.
      if (!hasZoneDeliveryReady) return false;
      if (isUsConditional) {
        if (!hasUsState) return false;
        // US conditional always needs an active pallet for SetupIntent.
        return selectedPallet != null;
      }
      if (!deliveryZoneReady) return false;
      // Producer wines need a matched pallet for shipping + Stripe; warehouse-only can continue.
      if (hasProducerItems) return selectedPallet != null;
      return true;
    },
    [
      hasZoneDeliveryReady,
      hasUsState,
      isUsConditional,
      selectedPallet,
      deliveryZoneReady,
      hasProducerItems,
    ],
  );

  useEffect(() => {
    if (!isUsConditional) {
      setUsConditionalAck(false);
    }
  }, [isUsConditional]);

  useEffect(() => {
    if (!deliveryComplete) return;
    emitOnce(ageVerificationShownKey(ageCountryCode), () => {
      void AnalyticsTracker.trackEvent({
        eventType: "age_confirmation_shown",
        eventCategory: "checkout",
        metadata: {
          country_code: ageCountryCode,
          required_age: requiredAge,
        },
      });
    });
  }, [deliveryComplete, ageCountryCode, requiredAge]);

  useEffect(() => {
    if (!isUsConditional) return;
    const dz = selectedPallet?.delivery_zone_id;
    if (typeof dz === "string" && dz.trim() !== "") {
      const id = dz.trim();
      setZoneInfo((prev) =>
        prev.selectedDeliveryZoneId === id
          ? prev
          : { ...prev, selectedDeliveryZoneId: id },
      );
    }
  }, [isUsConditional, selectedPallet?.delivery_zone_id, selectedPallet?.id]);

  const handleAgeDobChange = useCallback(
    (value: string) => {
      setDateOfBirth(value);
      if (!value.trim()) {
        setAgeConfirmed(false);
        setAgeDobError(null);
        return;
      }
      const ok = meetsAgeRequirement(value, requiredAge);
      if (!ok) {
        setAgeConfirmed(false);
        setAgeDobError(
          t("checkout.ageUnderLimit", { age: String(requiredAge) }),
        );
        void AnalyticsTracker.trackEvent({
          eventType: "age_confirmation_failed",
          eventCategory: "checkout",
          metadata: {
            country_code: ageCountryCode,
            required_age: requiredAge,
            date_of_birth: value,
          },
        });
        return;
      }
      setAgeDobError(null);
      setAgeConfirmed(true);
      emitOnce(ageVerificationPassedKey(ageCountryCode), () => {
        void AnalyticsTracker.trackEvent({
          eventType: "age_confirmed",
          eventCategory: "checkout",
          metadata: {
            country_code: ageCountryCode,
            required_age: requiredAge,
            date_of_birth: value.trim(),
          },
        });
      });
    },
    [ageCountryCode, requiredAge, t],
  );

  const handleTermsChecked = useCallback((checked: boolean) => {
    setTermsAccepted(checked);
    if (checked) {
      emitOnce(termsAcceptedEmitKey(), () => {
        void AnalyticsTracker.trackEvent({
          eventType: "terms_accepted",
          eventCategory: "checkout",
          metadata: { version: CHECKOUT_TERMS_VERSION },
        });
      });
    }
  }, []);

  const zoneOrUsPalletReady = deliveryZoneReady;

  // Keep latest draft/DOB for checkout_abandoned (unmount cannot read stale closures).
  const deliverySnapshotRef = useRef<ZoneDeliveryLines | null>(null);
  const dateOfBirthRef = useRef("");
  useEffect(() => {
    deliverySnapshotRef.current = effectiveDelivery;
  }, [effectiveDelivery]);
  useEffect(() => {
    dateOfBirthRef.current = dateOfBirth;
  }, [dateOfBirth]);

  useEffect(() => {
    if (!deliveryComplete || !effectiveDelivery) return;
    emitOnce(deliveryCapturedEmitKey(), () => {
      void AnalyticsTracker.trackEvent({
        eventType: "checkout_delivery_captured",
        eventCategory: "checkout",
        metadata: {
          ...deliveryLinesForAnalytics(effectiveDelivery),
          phase: "compliance",
          capture: "location",
        },
      });
    });
  }, [deliveryComplete, effectiveDelivery]);

  useEffect(() => {
    if (!deliveryComplete || !hasContactForCheckout || !effectiveDelivery) {
      return;
    }
    emitOnce(contactCapturedEmitKey(), () => {
      void AnalyticsTracker.trackEvent({
        eventType: "checkout_delivery_captured",
        eventCategory: "checkout",
        metadata: {
          ...deliveryLinesForAnalytics(effectiveDelivery),
          phase: "compliance",
          capture: "contact",
        },
      });
    });
  }, [deliveryComplete, hasContactForCheckout, effectiveDelivery]);

  useEffect(() => {
    const phase: "delivery" | "compliance" | "payment" = paymentCardRevealed
      ? "payment"
      : complianceStepRevealed
        ? "compliance"
        : "delivery";
    checkoutPhaseRef.current = phase;
    void AnalyticsTracker.trackEvent({
      eventType: "checkout_step_viewed",
      eventCategory: "checkout",
      metadata: { phase },
    });
  }, [complianceStepRevealed, paymentCardRevealed]);

  useEffect(() => {
    if (!cart || cart.totalQuantity <= 0) {
      return;
    }
    emitOnce(CHECKOUT_STARTED_KEY, () => {
      const cartValue =
        parseFloat(String(cart.cost?.totalAmount?.amount ?? "0")) || 0;
      const bottleCount = cart.totalQuantity;
      const { list_price, unit_price } = pricesFromCheckoutCart(cart);
      void AnalyticsTracker.trackCheckoutStarted(cartValue, bottleCount, {
        cart_value: cartValue,
        bottle_count: bottleCount,
        site: "pact",
        payment_method: "card",
        list_price,
        unit_price,
        price_version: PRICE_VERSION,
      });
    });
  }, [cart]);

  useEffect(() => {
    return () => {
      if (checkoutCompletedRef.current) return;
      const dob = dateOfBirthRef.current.trim();
      void AnalyticsTracker.trackEvent({
        eventType: "checkout_abandoned",
        eventCategory: "checkout",
        metadata: {
          phase: checkoutPhaseRef.current,
          ...(dob ? { date_of_birth: dob } : {}),
          ...deliveryLinesForAnalytics(deliverySnapshotRef.current),
        },
        keepalive: true,
      });
    };
  }, []);

  // Define all fetch functions BEFORE useEffects to avoid hoisting issues
  const fetchCart = useCallback(async () => {
    try {
      console.log("🔄 [Checkout] Fetching cart...");
      const response = await fetch("/api/crowdvine/cart");
      if (response.ok) {
        const cartData = await response.json();
        console.log("✅ [Checkout] Cart updated:", {
          totalQuantity: cartData.totalQuantity,
          items: cartData.lines?.length || 0,
        });
        setCart(cartData);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        const profileData = data.profile || data;
        setProfile(profileData);
        if (profileData?.id || profileData?.email) {
          setAuthReady(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const ensureProfileAfterAuth = useCallback(async () => {
    setAuthReady(true);
    setGuestSessionError(null);
    await fetchProfile();
    try {
      await fetch("/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "auto" }),
      });
      await fetchCart();
    } catch {
      await fetchCart();
    }
  }, [fetchProfile, fetchCart]);

  // Open platform: silent session from delivery email — no mid-checkout login wall.
  useEffect(() => {
    if (!platformOpen) return;
    setGuestSessionError(null);
    guestEnsureAttemptedRef.current = null;
  }, [platformOpen, deliveryDraft?.email]);

  useEffect(() => {
    if (!platformOpen) return;
    if (!deliveryComplete || authReady || !authChecked) return;

    const email = (deliveryDraft?.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) return;
    if (guestEnsureAttemptedRef.current === email) return;
    guestEnsureAttemptedRef.current = email;

    let cancelled = false;
    setGuestSessionPending(true);
    setGuestSessionError(null);
    void (async () => {
      try {
        const res = await fetch("/api/checkout/ensure-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          alreadyAuthenticated?: boolean;
          autoSignedIn?: boolean;
          session?: { access_token: string; refresh_token: string };
          error?: string;
        } | null;

        if (cancelled) return;

        if (data?.alreadyAuthenticated) {
          await ensureProfileAfterAuth();
          return;
        }

        if (data?.autoSignedIn && data.session?.access_token) {
          const supabase = getSupabaseBrowserClient();
          const { error } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (error) {
            console.error("[Checkout] setSession after ensure-session:", error);
            setGuestSessionError(t("checkout.guestSessionFailed"));
            return;
          }
          await ensureProfileAfterAuth();
          return;
        }

        console.warn(
          "[Checkout] ensure-session failed:",
          data?.error ?? res.status,
        );
        setGuestSessionError(
          data?.error?.trim() || t("checkout.guestSessionFailed"),
        );
      } catch (err) {
        console.error("[Checkout] ensure-session error:", err);
        if (!cancelled) setGuestSessionError(t("checkout.guestSessionFailed"));
      } finally {
        if (!cancelled) setGuestSessionPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    platformOpen,
    deliveryComplete,
    authReady,
    authChecked,
    deliveryDraft?.email,
    ensureProfileAfterAuth,
    guestRetryNonce,
    t,
  ]);

  // After magic-link return: session is set, attach/merge anonymous cart once.
  const cartMergedAfterAuthRef = useRef(false);
  useEffect(() => {
    if (!authReady || cartMergedAfterAuthRef.current) return;
    cartMergedAfterAuthRef.current = true;
    void (async () => {
      try {
        await fetch("/api/cart/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategy: "auto" }),
        });
        await fetchCart();
      } catch {
        // cart still available via cv_cart_id
      }
    })();
  }, [authReady, fetchCart]);

  const handleCartMerge = useCallback(
    async (strategy: "keep_session" | "keep_user" | "merge") => {
      setCartMergeLoading(true);
      try {
        await fetch("/api/cart/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategy }),
        });
        setCartMergeOpen(false);
        await fetchCart();
      } finally {
        setCartMergeLoading(false);
      }
    },
    [fetchCart],
  );

  const fetchZoneShopContext = useCallback(async () => {
    setZoneTemplatesLoaded(false);
    try {
      const ar = await fetch("/api/user/active-zone");
      if (!ar.ok) {
        setActiveShop(null);
        setZoneAddressRow(null);
        return;
      }
      const aj = await ar.json();
      const az = aj.activeZone as ResolvedActiveGeoZone | undefined;
      setActiveShop(az ?? null);
      const gid = az?.geoZoneId?.trim();
      if (!gid) {
        setZoneAddressRow(null);
        return;
      }
      const zr = await fetch(
        `/api/user/zone-addresses?geoZoneId=${encodeURIComponent(gid)}`,
      );
      if (!zr.ok) {
        setZoneAddressRow(null);
        return;
      }
      const zj = await zr.json();
      setZoneAddressRow(
        zj.address && typeof zj.address === "object"
          ? (zj.address as UserZoneAddressTemplate)
          : null,
      );
      if (zj.address && typeof zj.address === "object") {
        addressPersistedRef.current = true;
        addressAutoSaveRef.current = true;
      }
    } catch (e) {
      console.error("Failed to load active zone / zone address:", e);
      setActiveShop(null);
      setZoneAddressRow(null);
    } finally {
      setZoneTemplatesLoaded(true);
    }
  }, []);

  // After auth, reload shopping geo + saved zone address (guest → logged-in).
  const zoneContextAfterAuthRef = useRef(false);
  useEffect(() => {
    if (!authReady || zoneContextAfterAuthRef.current) return;
    zoneContextAfterAuthRef.current = true;
    void fetchZoneShopContext();
  }, [authReady, fetchZoneShopContext]);

  const fetchUserRewards = useCallback(async () => {
    try {
      const response = await fetch("/api/user/rewards");
      if (response.ok) {
        const data = await response.json();
        setUserRewards(data.rewards || []);
      }
    } catch (error) {
      console.error("Failed to fetch rewards:", error);
    }
  }, []);

  const fetchPactPointsBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/user/membership");
      if (res.status === 401) {
        setPactPointsBalance(0);
        return;
      }
      if (!res.ok) return;
      const data: unknown = await res.json();
      const balance =
        data &&
        typeof data === "object" &&
        "pactPoints" in data &&
        (data as { pactPoints?: unknown }).pactPoints &&
        typeof (data as { pactPoints: { balance?: unknown } }).pactPoints
          .balance === "number"
          ? (data as { pactPoints: { balance: number } }).pactPoints.balance
          : 0;
      setPactPointsBalance(balance);
    } catch {
      // never break checkout
      setPactPointsBalance(0);
    }
  }, []);

  useEffect(() => {
    fetchCart();
    void fetchProfile().then(() => void fetchZoneShopContext());
    fetchUserRewards();
    fetchPactPointsBalance();

    // Check if returning from Stripe payment method setup
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment_method_added") === "true") {
      toast.success(t("checkout.paymentMethodAdded"));
      // Clean URL and let PaymentMethodSelector auto-select the new method
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [
    fetchCart,
    fetchProfile,
    fetchZoneShopContext,
    fetchUserRewards,
    fetchPactPointsBalance,
  ]);

  useEffect(() => {
    if (!hasPostalCode) return;

    const fromDb = userZoneRowToDeliveryLines(zoneAddressRow);
    const contactOk = Boolean(
      (
        fromDb?.fullName?.trim() ||
        profile?.full_name?.trim() ||
        ""
      ).length > 1 &&
        (fromDb?.email?.trim() || profile?.email?.trim() || "").includes("@"),
    );

    if (fromDb && contactOk && !editingAddress) {
      setDeliveryDraft(null);
      return;
    }

    setDeliveryDraft((prev) => {
      if (prev) {
        // Keep typing; only backfill postal/city if empty.
        if (!prev.postal.trim() && (postalCodeDraft.trim() || fromDb?.postal)) {
          return {
            ...prev,
            postal: postalCodeDraft.trim() || fromDb?.postal || prev.postal,
          };
        }
        return prev;
      }
      if (fromDb) {
        return {
          ...fromDb,
          fullName:
            fromDb.fullName || profile?.full_name?.trim() || null,
          email: fromDb.email || profile?.email?.trim() || null,
          phone: fromDb.phone || profile?.phone?.trim() || null,
        };
      }
      return {
        street: "",
        city: activeShop?.city?.trim() || profile?.city?.trim() || "",
        postal:
          postalCodeDraft.trim() ||
          profile?.postal_code?.trim() ||
          "",
        countryCode:
          activeShop?.countryCode ||
          checkoutMarketCountry ||
          "SE",
        regionCode: activeShop?.regionCode ?? null,
        fullName: profile?.full_name?.trim() || null,
        phone: profile?.phone?.trim() || null,
        email: profile?.email?.trim() || null,
      };
    });
  }, [
    hasPostalCode,
    zoneAddressRow,
    activeShop,
    profile?.full_name,
    profile?.phone,
    profile?.email,
    profile?.city,
    profile?.postal_code,
    postalCodeDraft,
    editingAddress,
    checkoutMarketCountry,
  ]);

  // Auto-save progressive address when all required fields are filled.
  // Short settle delay so the last field doesn't vanish the instant it's typed.
  // Never auto-save while editing via "Byt", after payment is open, or once persisted.
  useEffect(() => {
    if (!hasPostalCode || !deliveryDraft || addressSaving) return;
    if (editingAddress) return;
    if (complianceStepRevealed || deliveryComplete) return;
    if (addressPersistedRef.current || addressAutoSaveRef.current) return;

    const nameOk = (deliveryDraft.fullName ?? "").trim().length > 1;
    const emailOk = (deliveryDraft.email ?? "").includes("@");
    const phoneOk = (deliveryDraft.phone ?? "").trim().length >= 6;
    const streetOk = deliveryDraft.street.trim().length > 0;
    const cityOk = deliveryDraft.city.trim().length > 0;
    const postalOk = deliveryDraft.postal.trim().length > 0;
    const stateOk =
      !isUsConditional ||
      isValidUsStateCode(deliveryDraft.regionCode?.trim() ?? "");

    if (
      !nameOk ||
      !emailOk ||
      !phoneOk ||
      !streetOk ||
      !cityOk ||
      !postalOk ||
      !stateOk
    ) {
      return;
    }

    const settleTimer = window.setTimeout(() => {
      if (
        addressAutoSaveRef.current ||
        addressPersistedRef.current ||
        editingAddress ||
        complianceStepRevealed
      ) {
        return;
      }
      addressAutoSaveRef.current = true;
      void handleSaveZoneDelivery({ silent: false });
    }, 280);

    return () => window.clearTimeout(settleTimer);
  }, [
    hasPostalCode,
    deliveryDraft,
    addressSaving,
    editingAddress,
    isUsConditional,
    complianceStepRevealed,
    deliveryComplete,
  ]);

  // After auth in payment: persist guest draft to DB quietly (no toast flash).
  useEffect(() => {
    if (!authReady || !paymentCardRevealed) return;
    if (editingAddress || addressSaving) return;
    if (!activeShop?.geoZoneId || zoneAddressRow) return;
    if (!deliveryDraft || authAddressPersistRef.current) return;

    const nameOk = (deliveryDraft.fullName ?? "").trim().length > 1;
    const emailOk = (deliveryDraft.email ?? "").includes("@");
    const phoneOk = (deliveryDraft.phone ?? "").trim().length >= 6;
    const streetOk = deliveryDraft.street.trim().length > 0;
    const cityOk = deliveryDraft.city.trim().length > 0;
    const postalOk = deliveryDraft.postal.trim().length > 0;
    const stateOk =
      !isUsConditional ||
      isValidUsStateCode(deliveryDraft.regionCode?.trim() ?? "");
    if (
      !nameOk ||
      !emailOk ||
      !phoneOk ||
      !streetOk ||
      !cityOk ||
      !postalOk ||
      !stateOk
    ) {
      return;
    }

    authAddressPersistRef.current = true;
    void handleSaveZoneDelivery({ silent: true });
  }, [
    authReady,
    paymentCardRevealed,
    editingAddress,
    addressSaving,
    activeShop?.geoZoneId,
    zoneAddressRow,
    deliveryDraft,
    isUsConditional,
  ]);

  // Soft handoff: reveal age/terms after delivery is complete.
  useEffect(() => {
    if (!deliveryComplete) {
      setComplianceStepRevealed(false);
      setPaymentCardRevealed(false);
      return;
    }
    const revealTimer = window.setTimeout(() => {
      setComplianceStepRevealed(true);
      complianceSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 420);
    return () => window.clearTimeout(revealTimer);
  }, [deliveryComplete]);

  const complianceComplete =
    ageConfirmed &&
    termsAccepted &&
    (!isUsConditional || usConditionalAck);

  // Warm Stripe.js + create Setup/PaymentIntent while the customer is on age/terms.
  useEffect(() => {
    if (!deliveryComplete || !authReady || !selectedPallet?.id) {
      return;
    }
    if (isUsConditional && !usConditionalAck) {
      setPrefetchedStripeIntent(null);
      stripePrefetchKeyRef.current = null;
      return;
    }

    warmStripeJs();

    const promoSek = appliedDiscount?.discount_amount_sek ?? 0;
    const key = [
      selectedPallet.id,
      String(redeemPoints),
      String(promoSek),
      isUsConditional ? "1" : "0",
    ].join("|");
    if (stripePrefetchKeyRef.current === key) return;
    stripePrefetchKeyRef.current = key;
    setPrefetchedStripeIntent(null);

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/checkout/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pallet_id: selectedPallet.id,
            pact_points_redeem: redeemPoints,
            ...(promoSek > 0 ? { promo_discount_sek: promoSek } : {}),
            ...(isUsConditional ? { us_conditional_ack: true } : {}),
          }),
          signal: controller.signal,
        });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok || !data || typeof data !== "object") return;

        const d = data as {
          paymentMode?: unknown;
          clientSecret?: unknown;
          intentId?: unknown;
          bottlesFilled?: unknown;
          amountInOre?: unknown;
          quote?: unknown;
        };
        const mode =
          d.paymentMode === "setup_intent" || d.paymentMode === "payment_intent"
            ? d.paymentMode
            : null;
        const cs = typeof d.clientSecret === "string" ? d.clientSecret : null;
        const id = typeof d.intentId === "string" ? d.intentId : null;
        if (!mode || !cs || !id) return;

        const filled =
          typeof d.bottlesFilled === "number" ? d.bottlesFilled : 0;
        const ore =
          typeof d.amountInOre === "number" && Number.isFinite(d.amountInOre)
            ? d.amountInOre
            : null;

        let quote: PrefetchedStripeIntent["quote"];
        if (d.quote && typeof d.quote === "object") {
          const q = d.quote as Record<string, unknown>;
          const num = (v: unknown) =>
            typeof v === "number" && Number.isFinite(v) ? v : 0;
          quote = {
            total_sek: num(q.total_sek),
            total_ore: num(q.total_ore),
            subtotal_sek: num(q.subtotal_sek),
            shipping_sek: num(q.shipping_sek),
            promo_discount_sek: num(q.promo_discount_sek),
            pact_points_sek: num(q.pact_points_sek),
          };
          setServerQuote({
            subtotal_sek: quote.subtotal_sek,
            shipping_sek: quote.shipping_sek,
            promo_discount_sek: quote.promo_discount_sek,
            voucher_discount_sek: 0,
            pact_points_sek: quote.pact_points_sek,
            pact_points_redeem: redeemPoints,
            total_sek: quote.total_sek,
            total_ore: quote.total_ore,
          });
        }

        setPrefetchedStripeIntent({
          paymentMode: mode,
          clientSecret: cs,
          intentId: id,
          bottlesFilled: filled,
          amountInOre: ore,
          quote,
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (e instanceof Error && e.name === "AbortError") return;
        if (stripePrefetchKeyRef.current === key) {
          stripePrefetchKeyRef.current = null;
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    deliveryComplete,
    authReady,
    selectedPallet?.id,
    redeemPoints,
    appliedDiscount?.discount_amount_sek,
    isUsConditional,
    usConditionalAck,
  ]);

  // If age/terms become incomplete again, collapse payment.
  useEffect(() => {
    if (!complianceStepRevealed || !complianceComplete) {
      setPaymentCardRevealed(false);
    }
  }, [complianceStepRevealed, complianceComplete]);

  const handleContinueToPayment = useCallback(() => {
    if (!complianceComplete) return;
    setPaymentCardRevealed(true);
    window.setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 80);
  }, [complianceComplete]);

  // Initial zone matching when cart and zone context are loaded
  useEffect(() => {
    if (cart && cart.totalQuantity > 0 && !loading && zoneTemplatesLoaded) {
      console.log("🚀 Initial zone matching triggered");
      void updateZoneInfo(undefined, {
        // Avoid spinner flash when reloading zone context after OTP/auth.
        silent: zoneFetchCompleted,
      });
    }
  }, [cart, loading, zoneTemplatesLoaded]);

  // Validate cart on load and when cart changes
  useEffect(() => {
    if (!cart || cart.totalQuantity === 0) {
      console.log("🔍 [Checkout] Cart empty, skipping validation");
      setValidations([]);
      setIsValidCart(true);
      return;
    }

    const controller = new AbortController();

    const validateCart = async () => {
      try {
        console.log(
          "🔍 [Checkout] Validating cart with",
          cart.totalQuantity,
          "bottles",
        );
        const response = await fetch("/api/cart/validate", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`cart validate HTTP ${response.status}`);
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("cart validate returned non-JSON");
        }
        const result = await response.json();
        if (controller.signal.aborted) return;
        console.log("✅ [Checkout] Validation complete:", {
          isValid: result.isValid,
          validations: result.producerValidations?.length || 0,
        });
        setValidations(
          (result.producerValidations || []) as ProducerValidation[],
        );
        setIsValidCart(result.isValid);
        console.log("🎯 [Checkout] Updated isValidCart to:", result.isValid);
      } catch (error) {
        if (controller.signal.aborted) return;
        const isAbort =
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error && error.name === "AbortError");
        if (isAbort) return;
        // HMR / offline / transient network — fail open without red overlay noise.
        const msg = error instanceof Error ? error.message : String(error);
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          console.warn("[Checkout] Cart validation skipped (network):", msg);
          setValidations([]);
          setIsValidCart(true);
          return;
        }
        console.error("Validation error:", error);
        setValidations([]);
        setIsValidCart(true); // Fail open
      }
    };

    void validateCart();
    return () => controller.abort();
  }, [cart]);

  useEffect(() => {
    // Only rematch zones when location fields change — not name/email/phone.
    if (!cart || cart.totalQuantity === 0) return;
    const postal = zoneLocationKey.split("|")[0];
    if (!postal) return;
    if (zoneLocationKey === lastZoneLocationKeyRef.current) return;

    const timeoutId = setTimeout(() => {
      console.log("🔄 Location change triggered zone matching");
      void updateZoneInfo();
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [zoneLocationKey, cart, activeShop?.geoZoneId]);

  const updateZoneInfo = async (
    overrideEff?: ZoneDeliveryLines | null,
    opts?: { silent?: boolean },
  ) => {
    if (overrideEff) {
      pendingZoneOverrideRef.current = overrideEff;
    }

    if (!cart || cart.totalQuantity === 0) {
      setZoneLoading(false);
      setZoneFetchCompleted(true);
      return;
    }

    if (zoneInfoFetchInProgressRef.current) {
      console.log("⏳ Zone update already in progress, queuing refetch...");
      zoneInfoNeedsRefetchRef.current = true;
      return;
    }
    zoneInfoFetchInProgressRef.current = true;

    const queuedOverride = pendingZoneOverrideRef.current;
    pendingZoneOverrideRef.current = null;

    const eff =
      overrideEff ??
      queuedOverride ??
      userZoneRowToDeliveryLines(zoneAddressRow) ??
      deliveryDraft;

    const nextLocationKey = [
      eff?.postal?.trim() || "",
      eff?.city?.trim() || "",
      eff?.countryCode?.trim() || "",
      eff?.regionCode?.trim() || "",
    ].join("|");

    const silent =
      opts?.silent === true ||
      (Boolean(nextLocationKey.split("|")[0]) &&
        nextLocationKey === lastZoneLocationKeyRef.current &&
        zoneFetchCompleted);

    if (!silent) {
      setZoneLoading(true);
    }

    try {
      const isUsingFallback = Boolean(
        activeShop?.geoZoneId &&
          (!eff || !isZoneDeliveryCompleteForActiveGeo(activeShop, eff)),
      );

      let deliveryAddress: {
        postcode: string;
        city: string;
        countryCode: string;
      } | null = null;

      if (
        activeShop?.geoZoneId &&
        eff &&
        isZoneDeliveryCompleteForActiveGeo(activeShop, eff)
      ) {
        deliveryAddress = {
          postcode: eff.postal,
          city: eff.city?.trim() || activeShop.city?.trim() || eff.city,
          countryCode: eff.countryCode,
        };
      } else if (
        !activeShop?.geoZoneId &&
        eff?.postal?.trim() &&
        eff?.city?.trim() &&
        eff?.countryCode?.trim()
      ) {
        // Guest / no shopping geo: still match zones from draft or saved lines.
        deliveryAddress = {
          postcode: eff.postal.trim(),
          city: eff.city.trim(),
          countryCode: eff.countryCode.trim().toUpperCase(),
        };
      } else if (
        !activeShop?.geoZoneId &&
        profile?.address &&
        profile?.city &&
        profile?.postal_code
      ) {
        const countryCode = getCountryCodeFromProfileCountry(
          profile.country ?? "",
        );
        if (!countryCode) {
          setZoneInfo({
            pickupZone: null,
            pickupZoneId: null,
            deliveryZone: null,
            selectedDeliveryZoneId: null,
            availableDeliveryZones: [],
            pallets: [],
            usingFallbackAddress: !profile?.address,
            zoneError: "UNSUPPORTED_COUNTRY",
            zoneErrorMessage:
              browseOnlyCountryMessage,
          });
          setSelectedPallet(null);
          setZoneLoading(false);
          return;
        }
        deliveryAddress = {
          postcode: profile.postal_code || "",
          city: profile.city || "",
          countryCode,
        };
      } else {
        // Postal-first: match delivery options before street is known.
        const postalOnly = (
          eff?.postal?.trim() ||
          postalCodeDraft.trim() ||
          profile?.postal_code?.trim() ||
          ""
        ).replace(/\s+/g, "");
        const cityGuess =
          eff?.city?.trim() ||
          activeShop?.city?.trim() ||
          profile?.city?.trim() ||
          "";
        const ccGuess = (
          eff?.countryCode?.trim() ||
          activeShop?.countryCode ||
          getCountryCodeFromProfileCountry(profile?.country ?? "") ||
          "SE"
        ).toUpperCase();
        const postalOk = isUsConditional
          ? postalOnly.length >= 3
          : /^\d{5}$/.test(postalOnly);

        if (postalOk && cityGuess && ccGuess.length === 2) {
          deliveryAddress = {
            postcode: postalOnly,
            city: cityGuess,
            countryCode: ccGuess,
          };
        } else if (postalOk && ccGuess.length === 2) {
          // City missing (e.g. guest / geo not loaded) — still geocode via postcode.
          deliveryAddress = {
            postcode: postalOnly,
            city: ccGuess === "SE" ? "Stockholm" : postalOnly,
            countryCode: ccGuess,
          };
        } else {
          console.log(
            "⚠️ No complete zone delivery — keeping previous zone info",
          );
          setZoneInfo((prev) => ({
            ...prev,
            usingFallbackAddress: isUsingFallback,
          }));
          setZoneFetchCompleted(true);
          setZoneLoading(false);
          return;
        }
      }

      console.log("🚀 Sending zone request:", {
        cartItems: cart.lines,
        deliveryAddress,
      });

      const zoneResponse = await fetch("/api/checkout/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartItems: cart.lines,
          deliveryAddress,
        }),
      });

      if (zoneResponse.ok) {
        const rawJson: unknown = await zoneResponse.json();
        const hasCompleteAddress =
          deliveryAddress.postcode &&
          deliveryAddress.city &&
          deliveryAddress.countryCode;

        const zd =
          rawJson && typeof rawJson === "object"
            ? (rawJson as Record<string, unknown>)
            : null;

        if (zd?.error === "UNSUPPORTED_COUNTRY") {
          setZoneFetchCompleted(true);
          setZoneInfo({
            pickupZone:
              typeof zd.pickupZoneName === "string" ? zd.pickupZoneName : null,
            pickupZoneId:
              typeof zd.pickupZoneId === "string"
                ? zd.pickupZoneId
                : zd.pickupZoneId === null
                  ? null
                  : undefined,
            deliveryZone: null,
            selectedDeliveryZoneId: null,
            availableDeliveryZones: [],
            pallets: [],
            usingFallbackAddress: isUsingFallback,
            zoneError: "UNSUPPORTED_COUNTRY",
            zoneErrorMessage:
              browseOnlyCountryMessage,
          });
          setSelectedPallet(null);
          return;
        }

        if (zd?.error === "NO_DELIVERY_ZONE") {
          const msg =
            typeof zd.message === "string" && zd.message.trim()
              ? zd.message
              : t("checkout.noDeliveryArea");
          console.log("✅ Zone response: no delivery zone", { msg, zd });
          setZoneFetchCompleted(true);
          setZoneInfo({
            pickupZone:
              typeof zd.pickupZoneName === "string" ? zd.pickupZoneName : null,
            pickupZoneId:
              typeof zd.pickupZoneId === "string"
                ? zd.pickupZoneId
                : zd.pickupZoneId === null
                  ? null
                  : undefined,
            deliveryZone: null,
            selectedDeliveryZoneId: null,
            availableDeliveryZones: [],
            pallets: [],
            usingFallbackAddress: isUsingFallback,
            zoneError: "NO_DELIVERY_ZONE",
            zoneErrorMessage: msg,
          });
          setSelectedPallet(null);
          return;
        }

        if (!zd) {
          return;
        }

        type ZonesApiOk = {
          pickupZoneId?: string | null;
          deliveryZoneId?: string | null;
          pickupZoneName?: string | null;
          deliveryZoneName?: string | null;
          availableDeliveryZones?: Array<{
            id: string;
            name: string;
            centerLat: number;
            centerLon: number;
            radiusKm: number;
          }>;
          pallets?: PalletInfo[];
        };

        const zoneData = zd as ZonesApiOk;

        console.log("✅ Zone response received:", {
          zoneData,
          hasCompleteAddress,
          deliveryAddress,
          isUsingFallback,
          pickupZone: zoneData.pickupZoneName,
          deliveryZone: zoneData.deliveryZoneName,
          pallets: zoneData.pallets,
        });

        // Auto-select the best delivery zone (closest/smallest radius)
        let selectedDeliveryZoneId = zoneData.deliveryZoneId ?? null;
        let selectedDeliveryZoneName = zoneData.deliveryZoneName ?? null;

        if (
          zoneData.availableDeliveryZones &&
          zoneData.availableDeliveryZones.length > 0
        ) {
          // Sort by radius (smallest first) to get the most specific zone
          const sortedZones = [...zoneData.availableDeliveryZones].sort(
            (a, b) => a.radiusKm - b.radiusKm,
          );
          selectedDeliveryZoneId = sortedZones[0].id;
          selectedDeliveryZoneName = sortedZones[0].name;
          console.log(
            `🎯 Auto-selected delivery zone: ${selectedDeliveryZoneName} (${sortedZones[0].radiusKm}km radius)`,
          );
        }

        // Auto-select the pallet with the most reserved bottles
        let autoSelectedPallet = null;
        if (zoneData.pallets && zoneData.pallets.length > 0) {
          // Sort by current bottles (most reserved first)
          const sortedPallets = [...zoneData.pallets].sort(
            (a, b) => b.currentBottles - a.currentBottles,
          );
          autoSelectedPallet = sortedPallets[0];
          console.log(
            `🎯 Auto-selected pallet: ${autoSelectedPallet.name} (${autoSelectedPallet.currentBottles} bottles reserved)`,
          );
        }

        console.log("📦 Setting zone info:", {
          pickupZone: zoneData.pickupZoneName,
          pickupZoneId: zoneData.pickupZoneId,
          deliveryZone: selectedDeliveryZoneName,
          selectedDeliveryZoneId,
          pallets: zoneData.pallets?.length || 0,
        });

        const nextPickup =
          typeof zoneData.pickupZoneName === "string" &&
          zoneData.pickupZoneName.trim()
            ? zoneData.pickupZoneName.trim()
            : null;
        const nextPallets = zoneData.pallets || [];
        const hasRouting = Boolean(
          nextPickup ||
            nextPallets.length > 0 ||
            selectedDeliveryZoneId ||
            selectedDeliveryZoneName,
        );

        setZoneFetchCompleted(true);
        lastZoneLocationKeyRef.current = nextLocationKey;

        if (!hasRouting) {
          // Empty result (e.g. cart race) — keep a previous successful match.
          setZoneInfo((prev) => {
            if (
              prev.pickupZone ||
              (prev.pallets?.length ?? 0) > 0 ||
              prev.selectedDeliveryZoneId
            ) {
              return prev;
            }
            return {
              pickupZone: null,
              pickupZoneId: null,
              deliveryZone: null,
              selectedDeliveryZoneId: null,
              availableDeliveryZones: [],
              pallets: [],
              usingFallbackAddress: isUsingFallback,
              zoneError: null,
              zoneErrorMessage: undefined,
            };
          });
        } else {
          setZoneInfo({
            pickupZone: nextPickup,
            pickupZoneId: zoneData.pickupZoneId ?? null,
            deliveryZone: selectedDeliveryZoneName,
            selectedDeliveryZoneId: selectedDeliveryZoneId,
            availableDeliveryZones: zoneData.availableDeliveryZones || [],
            pallets: nextPallets,
            usingFallbackAddress: isUsingFallback,
            zoneError: null,
            zoneErrorMessage: undefined,
          });

          if (autoSelectedPallet) {
            setSelectedPallet(autoSelectedPallet);
          } else {
            setSelectedPallet(null);
          }
        }
      } else {
        console.error(
          "❌ Zone response failed:",
          zoneResponse.status,
          await zoneResponse.text(),
        );
        setZoneFetchCompleted(true);
      }
    } catch (error) {
      console.error("Failed to update zone info:", error);
      setZoneFetchCompleted(true);
    } finally {
      zoneInfoFetchInProgressRef.current = false;
      setZoneLoading(false);
      if (zoneInfoNeedsRefetchRef.current) {
        zoneInfoNeedsRefetchRef.current = false;
        const again = pendingZoneOverrideRef.current;
        void updateZoneInfo(again);
      }
    }
  };

  const handleSaveZoneDelivery = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const eff = deliveryDraft;
    if (!eff?.street?.trim() || !eff.city?.trim() || !eff.postal?.trim()) {
      return;
    }
    if (
      activeShop?.geoZoneId &&
      !isZoneDeliveryCompleteForActiveGeo(activeShop, eff)
    ) {
      if (!silent) toast.error(t("checkout.completeZoneFields"));
      return;
    }

    setAddressSaving(true);
    try {
      if (activeShop?.geoZoneId) {
        const res = await fetch(
          `/api/user/zone-addresses/${encodeURIComponent(activeShop.geoZoneId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: eff.fullName || undefined,
              phone: eff.phone || undefined,
              email: eff.email || undefined,
              address_line1: eff.street,
              city: eff.city,
              postal_code: eff.postal,
              country_code: eff.countryCode,
              region_code: eff.regionCode || null,
            }),
          },
        );
        if (res.status === 401) {
          // Guest: keep draft as source of truth
          addressPersistedRef.current = true;
          addressAutoSaveRef.current = true;
          setEditingAddress(false);
          if (!silent) toast.success(t("checkout.deliverySaved"));
          await updateZoneInfo(eff, { silent: true });
          if (eff.postal && eff.countryCode) {
            void checkBudbeeAvailability(eff.postal, eff.countryCode);
          }
          return;
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || t("checkout.saveFailed"));
        }
        const j = (await res.json()) as { address?: UserZoneAddressTemplate };
        if (j.address) {
          setZoneAddressRow({
            ...j.address,
            full_name: j.address.full_name || eff.fullName,
            email: j.address.email || eff.email,
            phone: j.address.phone || eff.phone,
          });
        }
        setDeliveryDraft(null);
        setEditingAddress(false);
        addressPersistedRef.current = true;
        addressAutoSaveRef.current = true;
        if (!silent) toast.success(t("checkout.deliverySaved"));
        const savedLines =
          userZoneRowToDeliveryLines(
            j.address && typeof j.address === "object"
              ? {
                  ...j.address,
                  full_name: j.address.full_name || eff.fullName,
                  email: j.address.email || eff.email,
                  phone: j.address.phone || eff.phone,
                }
              : null,
          ) ?? eff;
        await updateZoneInfo(savedLines, { silent: true });
        if (eff.postal && eff.countryCode) {
          void checkBudbeeAvailability(eff.postal, eff.countryCode);
        }
        return;
      }

      // No shopping geo — persist via profile (or guest draft).
      await handleProfileSaved({
        full_name: eff.fullName || "",
        email: eff.email || "",
        phone: eff.phone || "",
        address: eff.street,
        city: eff.city,
        postal_code: eff.postal,
        country: eff.countryCode,
        region: eff.regionCode || "",
      });
      setEditingAddress(false);
      addressPersistedRef.current = true;
      addressAutoSaveRef.current = true;
    } catch (e) {
      addressAutoSaveRef.current = false;
      if (!silent) {
        toast.error(e instanceof Error ? e.message : t("checkout.saveFailed"));
      }
    } finally {
      setAddressSaving(false);
    }
  };

  const handleProfileSaved = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);

    const countryCode =
      getCountryCodeFromProfileCountry(updatedProfile.country ?? null) ??
      activeShop?.countryCode ??
      "SE";

    setDeliveryDraft((d) => {
      const base = d ?? {
        street: "",
        city: "",
        postal: "",
        countryCode,
        regionCode: activeShop?.regionCode ?? null,
        fullName: "",
        phone: "",
        email: "",
      };
      return {
        ...base,
        fullName: updatedProfile.full_name?.trim() || base.fullName,
        phone: updatedProfile.phone?.trim() || base.phone,
        email: updatedProfile.email?.trim() || base.email,
        street: updatedProfile.address?.trim() || base.street,
        city: updatedProfile.city?.trim() || base.city,
        postal: updatedProfile.postal_code?.trim() || base.postal,
        countryCode: countryCode || base.countryCode,
        regionCode:
          updatedProfile.region?.trim() ||
          base.regionCode ||
          activeShop?.regionCode ||
          null,
      };
    });

    if (updatedProfile.postal_code) {
      setPostalCodeDraft(updatedProfile.postal_code.trim());
    }

    const hasAddress =
      updatedProfile.address &&
      updatedProfile.city &&
      updatedProfile.postal_code;

    if (hasAddress) {
      toast.success(t("checkout.saved"));
      // Zone refresh runs via profile/deliveryDraft effect; nudge Budbee check.
      void checkBudbeeAvailability(
        updatedProfile.postal_code!.trim(),
        countryCode,
      );
    } else {
      toast.success(t("checkout.profileSavedAddAddress"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profile?.email) {
      toast.error(t("checkout.addProfileFirst"));
      return;
    }

    // Payment method validation removed - no payment required until pallet fills

    // Check 6-bottle validation (already validated in useEffect, this is just a safeguard)
    if (!isValidCart) {
      console.error(
        "❌ [Checkout] Cart validation failed - button should be disabled",
      );
      toast.error(t("checkout.sixBottleRequirement"));
      return;
    }

    setIsFinalizingReservation(true); // legacy path: show finalizing modal

    if (zoneInfo.zoneError === "UNSUPPORTED_COUNTRY") {
      setIsFinalizingReservation(false);
      toast.error(
        zoneInfo.zoneErrorMessage?.trim() ||
          browseOnlyCountryMessage,
      );
      return;
    }

    if (zoneInfo.zoneError === "NO_DELIVERY_ZONE") {
      setIsFinalizingReservation(false);
      toast.error(
        zoneInfo.zoneErrorMessage?.trim() ||
          t("checkout.noDeliveryArea"),
      );
      return;
    }

    const deliveryZoneReady =
      Boolean(zoneInfo.selectedDeliveryZoneId) ||
      (typeof selectedPallet?.delivery_zone_id === "string" &&
        selectedPallet.delivery_zone_id.trim() !== "");

    if (hasZoneDeliveryReady && !deliveryZoneReady) {
      setIsFinalizingReservation(false);
      toast.error(t("checkout.noDeliveryZoneMatch"));
      return;
    }

    // Check if pallet is available (should be auto-selected)
    if (zoneInfo.pallets && zoneInfo.pallets.length > 0 && !selectedPallet) {
      setIsFinalizingReservation(false);
      toast.error(t("checkout.noPalletLocation"));
      return;
    }

    // Prepare form data
    const formData = new FormData();
    
    const effSubmit =
      userZoneRowToDeliveryLines(zoneAddressRow) ?? deliveryDraft;

    // Customer details
    formData.append(
      "fullName",
      effSubmit?.fullName || profile?.full_name || "",
    );
    formData.append("email", effSubmit?.email || profile?.email || "");
    formData.append("phone", effSubmit?.phone || profile?.phone || "");

    // Payment method (only for warehouse orders)
    if (hasWarehouseItems) {
      formData.append("paymentMethodType", paymentMethod);
    }

    if (effSubmit) {
      formData.append("street", effSubmit.street);
      formData.append("postcode", effSubmit.postal);
      formData.append("city", effSubmit.city);
      formData.append("countryCode", effSubmit.countryCode);
      if (effSubmit.regionCode) {
        formData.append("regionCode", effSubmit.regionCode);
      }
    }

    // Zone information
    const zoneIdForSubmit =
      zoneInfo.selectedDeliveryZoneId ||
      (isUsConditional ? selectedPallet?.delivery_zone_id?.trim() ?? "" : "");
    if (zoneIdForSubmit) {
      formData.append("selectedDeliveryZoneId", zoneIdForSubmit);
    }
    
    // Pallet information
    if (selectedPallet) {
      formData.append("selectedPalletId", selectedPallet.id);
    }
    
    // Payment method removed - using new payment flow

    // User rewards
    if (useRewards) {
      selectedRewards.forEach((reward, index) => {
        formData.append(`rewardId_${index}`, reward.id);
      });
    }

    // Optional: share allocations
    if (shareAllocation && shareFriendIds && shareFriendIds.length > 0) {
      formData.append(
        "shareBottles",
        JSON.stringify({
          friendIds: shareFriendIds,
          allocations: shareAllocation,
        }),
      );
    }

    if (Number.isFinite(redeemPoints) && redeemPoints > 0) {
      formData.append("pact_points_redeem", String(Math.floor(redeemPoints)));
    }

    {
      const { visitorId, firstTouch } = ensureVisitorIdentity();
      if (visitorId) formData.append("visitor_id", visitorId);
      if (firstTouch) {
        formData.append("first_touch", JSON.stringify(firstTouch));
      }
      if (isInternalDevice()) {
        formData.append("internal", "true");
      }
      formData.append("idempotency_key", idempotencyKey);
    }

    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Successful API call returns JSON with redirectUrl (do not rely on fetch redirects)
        const contentType = response.headers.get("content-type") || "";
        let redirectUrl: string | null = null;
        if (contentType.includes("application/json")) {
          const data: unknown = await response.json().catch(() => null);
          if (data && typeof data === "object") {
            const d = data as Record<string, unknown>;
            redirectUrl =
              typeof d.redirectUrl === "string" ? d.redirectUrl : null;
          }
        }

        toast.success(t("checkout.reservationSuccess"));

        checkoutCompletedRef.current = true;
        clearCheckoutAnalyticsSession();
        window.location.href = redirectUrl || "/checkout/success";
      } else {
        setIsFinalizingReservation(false); // Hide modal on error
        void AnalyticsTracker.trackEvent({
          eventType: "checkout_confirm_failed",
          eventCategory: "checkout",
          metadata: { phase: "confirm", status: response.status },
        });
        const contentType = response.headers.get("content-type") || "";
        let errorMessage = t("checkout.reservationFailed");

        if (contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData?.error || errorMessage;
            if (errorData?.debug) {
              console.error("❌ [Checkout] /api/checkout/confirm debug:", errorData.debug);
            }
          } catch {
            // fall through to generic message
          }
        } else {
          // In dev, Next.js can return an HTML error page for 500s (or an access page).
          const text = await response.text();
          console.error(
            `❌ [Checkout] /api/checkout/confirm returned non-JSON error: status=${response.status} content-type=${contentType} bodyStart=${JSON.stringify(
              text.slice(0, 200),
            )}`,
          );
        }

        toast.error(errorMessage);
      }
    } catch (error) {
      setIsFinalizingReservation(false); // Hide modal on error
      void AnalyticsTracker.trackEvent({
        eventType: "checkout_confirm_failed",
        eventCategory: "checkout",
        metadata: { phase: "confirm", status: 0, network: true },
      });
      console.error("Error placing reservation:", error);
      toast.error(t("checkout.reservationFailed"));
    }
    // Don't set false on success - keep showing during redirect
  };

  const friendlyStripeErrorMessage = useCallback(
    (result: Extract<StripeConfirmResult, { success: false }>): string => {
      const code = result.stripeError?.code;
      const type = result.stripeError?.type;
      const decline = result.stripeError?.decline_code;
      const status = result.intentStatus;

      if (code === "setup_intent_authentication_failure") {
        return t("checkout.cardAuthFailed");
      }

      if (code === "card_declined" || decline === "do_not_honor") {
        return t("checkout.cardDeclined");
      }

      if (status === "requires_payment_method") {
        return t("checkout.paymentFailedTryCard");
      }

      const base =
        typeof result.error === "string" && result.error.trim()
          ? result.error.trim()
          : t("checkout.paymentFailed");
      const meta = [type ? `type=${type}` : null, code ? `code=${code}` : null, decline ? `decline=${decline}` : null]
        .filter(Boolean)
        .join(" ");
      return meta ? `${base} (${meta})` : base;
    },
    [t],
  );

  const handlePlaceReservation = useCallback(async () => {
    // Layer 1: sync ref blocks double-click before React re-renders disabled state.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setStripeError(null);

    const releaseSubmit = () => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setIsFinalizingReservation(false);
      setIsStripeConfirming(false);
    };

    if (!ageConfirmed) {
      void AnalyticsTracker.trackEvent({
        eventType: "age_confirmation_failed",
        eventCategory: "checkout",
        metadata: {
          country_code: ageCountryCode,
          required_age: requiredAge,
          ...(dateOfBirth.trim()
            ? { date_of_birth: dateOfBirth.trim() }
            : {}),
        },
      });
      toast.error(
        dateOfBirth.trim() && ageDobError
          ? ageDobError
          : t("checkout.ageUnderLimit", { age: String(requiredAge) }),
      );
      releaseSubmit();
      return;
    }
    if (!termsAccepted) {
      toast.error(t("checkout.termsAccept"));
      releaseSubmit();
      return;
    }

    // Validate required fields
    if (!profile?.email && !platformOpen) {
      toast.error(t("checkout.addProfileFirst"));
      releaseSubmit();
      return;
    }

    // Check 6-bottle validation (already validated in useEffect, this is just a safeguard)
    if (!isValidCart) {
      console.error(
        "❌ [Checkout] Cart validation failed - button should be disabled",
      );
      toast.error(t("checkout.sixBottleRequirement"));
      releaseSubmit();
      return;
    }

    if (!deliveryComplete) {
      releaseSubmit();
      return;
    }
    if (!selectedPallet?.id) {
      toast.error(t("checkout.selectPalletContinue"));
      releaseSubmit();
      return;
    }

    const submitConfirm = async (opts: {
      stripeIntentId?: string;
      paymentMode?: "setup_intent" | "payment_intent";
    }) => {
      setIsFinalizingReservation(true);
      const formData = new FormData();

      const effConfirm =
        userZoneRowToDeliveryLines(zoneAddressRow) ?? deliveryDraft;

      formData.append(
        "fullName",
        effConfirm?.fullName || profile?.full_name || "",
      );
      formData.append("email", effConfirm?.email || profile?.email || "");
      formData.append("phone", effConfirm?.phone || profile?.phone || "");

      if (effConfirm) {
        formData.append("street", effConfirm.street);
        formData.append("postcode", effConfirm.postal);
        formData.append("city", effConfirm.city);
        formData.append("countryCode", effConfirm.countryCode);
        if (effConfirm.regionCode) {
          formData.append("regionCode", effConfirm.regionCode);
        }
      }

      if (zoneInfo.selectedDeliveryZoneId) {
        formData.append(
          "selectedDeliveryZoneId",
          zoneInfo.selectedDeliveryZoneId,
        );
      }
      if (selectedPallet?.id) {
        formData.append("selectedPalletId", selectedPallet.id);
      }
      if (shareFriendIds && shareAllocation) {
        formData.append(
          "shareBottles",
          JSON.stringify({
            friendIds: shareFriendIds,
            allocations: shareAllocation,
          }),
        );
      }
      if (appliedDiscount) {
        formData.append("promo_code", appliedDiscount.code);
        formData.append("discount_code_id", appliedDiscount.discount_code_id);
      } else if (discountCodeInput.trim()) {
        formData.append("voucher_code", discountCodeInput.trim());
      }
      if (redeemPoints > 0) {
        formData.append("pact_points_redeem", String(redeemPoints));
      }

      if (opts.stripeIntentId && opts.paymentMode) {
        formData.append("stripe_intent_id", opts.stripeIntentId);
        formData.append("stripe_intent_type", opts.paymentMode);
      }

      formData.append("idempotency_key", idempotencyKey);

      {
        const { visitorId, firstTouch } = ensureVisitorIdentity();
        if (visitorId) formData.append("visitor_id", visitorId);
        if (firstTouch) {
          formData.append("first_touch", JSON.stringify(firstTouch));
        }
        if (isInternalDevice()) {
          formData.append("internal", "true");
        }
      }

      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = t("checkout.reservationFailed");
        try {
          const errorData = await response.json();
          if (typeof errorData?.error === "string") {
            errorMessage = errorData.error;
          }
        } catch {
          // fall through
        }
        void AnalyticsTracker.trackEvent({
          eventType: "checkout_confirm_failed",
          eventCategory: "checkout",
          metadata: { status: response.status },
        });
        throw new Error(errorMessage);
      }

      const d = await response.json().catch(() => null);
      const redirectUrl =
        d && typeof d === "object" && typeof d.redirectUrl === "string"
          ? d.redirectUrl
          : null;
      checkoutCompletedRef.current = true;
      clearCheckoutAnalyticsSession();
      // Do not releaseSubmit — navigate away; keep button disabled.
      window.location.href = redirectUrl || "/checkout/success";
    };

    if (!stripeConfirmFn || !paymentMode || !stripeIntentId) {
      setStripeError(t("checkout.paymentNotReady"));
      toast.error(t("checkout.paymentNotReady"));
      releaseSubmit();
      return;
    }

    // Phase 1: Stripe confirmation/authentication
    setIsStripeConfirming(true);

    let confirmed: StripeConfirmResult;
    try {
      confirmed = await stripeConfirmFn();
    } catch (e) {
      console.error("[Checkout] stripeConfirmFn threw:", e);
      setStripeError(t("checkout.paymentFailedTryCard"));
      releaseSubmit();
      return;
    }

    if (!confirmed.success) {
      console.warn("[Checkout] Stripe confirmation failed:", {
        intentStatus: confirmed.intentStatus,
        stripeError: confirmed.stripeError,
      });
      setStripeError(friendlyStripeErrorMessage(confirmed));
      toast.error(friendlyStripeErrorMessage(confirmed));
      releaseSubmit();
      return;
    }

    const intentId = confirmed.intentId?.trim() || stripeIntentId;
    const intentType = confirmed.intentType || paymentMode;
    if (!intentId || !intentType) {
      setStripeError(t("checkout.paymentNotReady"));
      toast.error(t("checkout.paymentNotReady"));
      releaseSubmit();
      return;
    }

    // Phase 2: Backend finalization (only after Stripe success)
    setIsStripeConfirming(false);
    try {
      await submitConfirm({
        stripeIntentId: intentId,
        paymentMode: intentType,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : t("checkout.reservationFailed");
      setStripeError(msg);
      toast.error(msg);
      void AnalyticsTracker.trackEvent({
        eventType: "checkout_confirm_failed",
        eventCategory: "checkout",
        metadata: {},
      });
      releaseSubmit();
    }
  }, [
    ageConfirmed,
    ageCountryCode,
    requiredAge,
    dateOfBirth,
    ageDobError,
    termsAccepted,
    profile,
    platformOpen,
    isValidCart,
    deliveryComplete,
    selectedPallet,
    stripeConfirmFn,
    paymentMode,
    stripeIntentId,
    idempotencyKey,
    zoneAddressRow,
    deliveryDraft,
    zoneInfo.selectedDeliveryZoneId,
    shareFriendIds,
    shareAllocation,
    discountCodeInput,
    appliedDiscount,
    redeemPoints,
    t,
    friendlyStripeErrorMessage,
  ]);

  // Calculate shipping cost
  const shippingCost =
    selectedPallet && cart?.lines
      ? calculateCartShippingCost(
          cart.lines.map((line) => ({ quantity: line.quantity })),
    {
      id: selectedPallet.id,
      name: selectedPallet.name,
      costCents: selectedPallet.costCents,
      bottleCapacity: selectedPallet.maxBottles,
      currentBottles: selectedPallet.currentBottles,
      remainingBottles: selectedPallet.remainingBottles,
      lastMileCostCentsPerBottle: selectedPallet.lastMileCostCentsPerBottle,
          },
        )
      : null;

  const deliveryOptionShippingLabel = useMemo(() => {
    if (!shippingCost) return "—";
    if (shippingCost.totalShippingCostCents === 0) return t("checkout.shippingFree");
    return formatSek(shippingCost.totalShippingCostCents / 100);
  }, [shippingCost, t, formatSek]);

  // Merchandise total from cart (matches per-line line.cost.totalAmount, incl. member + pallet early-bird)
  const bottleCost = cart
    ? parseFloat(cart.cost.totalAmount.amount)
    : 0;

  // Old rewards discount (being deprecated) — display only; not in payment total
  const rewardsDiscountAmount = useRewards
    ? selectedRewards.reduce((total, reward) => {
        return total + (bottleCost * reward.discount_percentage) / 100;
      }, 0)
    : 0;

  const { boostedLineTotal, nonBoostedLineTotal } = useMemo(() => {
    if (!cart?.lines?.length) {
      return { boostedLineTotal: 0, nonBoostedLineTotal: 0 };
    }
    let boosted = 0;
    let nonBoosted = 0;
    for (const line of cart.lines) {
      const amt = parseFloat(line.cost.totalAmount.amount) || 0;
      if (line.merchandise.product.producerBoostActive === true) {
        boosted += amt;
      } else {
        nonBoosted += amt;
      }
    }
    return { boostedLineTotal: boosted, nonBoostedLineTotal: nonBoosted };
  }, [cart?.lines]);

  const maxRedemption = useMemo(
    () =>
      calculateBoostAwareMaxRedemption(
        boostedLineTotal,
        nonBoostedLineTotal,
        pactPointsBalance,
      ).maxPoints,
    [boostedLineTotal, nonBoostedLineTotal, pactPointsBalance],
  );

  const pactPointsSekOff = useMemo(
    () =>
      allocatePactRedemptionPoints(
        redeemPoints,
        boostedLineTotal,
        nonBoostedLineTotal,
      ).sekDiscount,
    [redeemPoints, boostedLineTotal, nonBoostedLineTotal],
  );

  const hasBoostedProducerInOrder = boostedLineTotal > 0;

  const selectedPalletId = selectedPallet?.id ?? "";
  const promoDiscountSek = appliedDiscount?.discount_amount_sek ?? 0;

  // Authoritative breakdown for display (same math as payment-intent).
  useEffect(() => {
    if (!cart?.lines?.length) {
      setServerQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/checkout/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(selectedPalletId ? { pallet_id: selectedPalletId } : {}),
              pact_points_redeem: redeemPoints,
              ...(promoDiscountSek > 0
                ? { promo_discount_sek: promoDiscountSek }
                : {}),
            }),
            signal: controller.signal,
          });
          if (!res.ok) return;
          const data: unknown = await res.json().catch(() => null);
          if (
            data &&
            typeof data === "object" &&
            "quote" in data &&
            (data as { quote?: unknown }).quote &&
            typeof (data as { quote: unknown }).quote === "object"
          ) {
            setServerQuote((data as { quote: CheckoutQuote }).quote);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (e instanceof Error && e.name === "AbortError") return;
        }
      })();
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    cart?.id,
    cart?.cost?.totalAmount?.amount,
    cart?.lines?.length,
    selectedPalletId,
    redeemPoints,
    promoDiscountSek,
  ]);

  const displaySubtotal = serverQuote?.subtotal_sek ?? bottleCost;
  const displayShippingSek = serverQuote?.shipping_sek;
  const displayPactOff = serverQuote?.pact_points_sek ?? pactPointsSekOff;
  const displayTotal =
    serverQuote?.total_sek ??
    Math.max(
      0,
      bottleCost +
        (shippingCost ? shippingCost.totalShippingCostCents / 100 : 0) -
        pactPointsSekOff -
        promoDiscountSek,
    );
  const commitAppliedDiscount = (data: {
    code: string;
    discount_code_id: string;
    discount_amount_sek: number;
    final_total_sek: number;
    type: "percent" | "sek";
    value: number;
    purpose: "normal" | "testkop";
  }) => {
    setAppliedDiscount(data);
    if (data.purpose === "testkop") {
      setInternalDevice(true);
    }
    setDiscountError(null);
    setPendingTestkopDiscount(null);
  };

  const applyDiscountCode = async () => {
    const code = discountCodeInput.trim();
    if (!code) return;
    setDiscountError(null);
    setDiscountApplying(true);
    try {
      const items =
        cart?.lines?.map((line) => {
          const qty = Number(line.quantity) || 0;
          const lineTotal =
            parseFloat(String(line.cost.totalAmount.amount)) || 0;
          return {
            wine_id: String(line.merchandise.id),
            quantity: qty,
            unit_price: qty > 0 ? lineTotal / qty : 0,
          };
        }) ?? [];
      const cart_value_sek =
        (parseFloat(cart?.cost?.totalAmount?.amount ?? "0") || 0) +
        (shippingCost ? shippingCost.totalShippingCostCents / 100 : 0);

      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, cart_value_sek, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAppliedDiscount(null);
        setPendingTestkopDiscount(null);
        setDiscountError(
          typeof data?.error === "string"
            ? data.error
            : "Kunde inte tillämpa koden.",
        );
        return;
      }

      const next = {
        code: String(data.code ?? code).toUpperCase(),
        discount_code_id: String(data.discount_code_id),
        discount_amount_sek: Number(data.discount_amount_sek) || 0,
        final_total_sek: Number(data.final_total_sek) || 0,
        type: (data.type === "sek" ? "sek" : "percent") as "percent" | "sek",
        value: Number(data.value) || 0,
        purpose: (data.purpose === "testkop" ? "testkop" : "normal") as
          | "normal"
          | "testkop",
      };

      if (next.purpose === "testkop") {
        // Do not apply until the user confirms the permanent analytics exclusion.
        setPendingTestkopDiscount({ ...next, purpose: "testkop" });
        return;
      }

      commitAppliedDiscount(next);
    } catch {
      setDiscountError("Kunde inte tillämpa koden.");
      setAppliedDiscount(null);
      setPendingTestkopDiscount(null);
    } finally {
      setDiscountApplying(false);
    }
  };

  const clearAppliedDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError(null);
    setDiscountCodeInput("");
    setPendingTestkopDiscount(null);
  };

  const handleStripeIntentCreated = useCallback(
    (data: {
      paymentMode: "setup_intent" | "payment_intent";
      intentId: string;
      bottlesFilled: number;
    }) => {
      setPaymentMode(data.paymentMode);
      setStripeIntentId(data.intentId);
    },
    [],
  );

  const handleStripeConfirmReady = useCallback(
    (fn: (() => Promise<StripeConfirmResult>) | null) => {
      setStripeConfirmFn(() => fn);
    },
    [],
  );

  // After login / auth flip, drop any stale Stripe confirm closure from a prior mount.
  useEffect(() => {
    if (!authReady) {
      setStripeConfirmFn(null);
      setPaymentMode(null);
      setStripeIntentId(null);
    }
  }, [authReady]);

  useEffect(() => {
    if (!Number.isFinite(maxRedemption)) return;
    if (redeemPoints > maxRedemption) {
      setRedeemPoints(maxRedemption);
    }
  }, [maxRedemption, redeemPoints]);

  // Filter available rewards (membership system - no bottle rewards anymore)
  const availableRewards: UserReward[] = [];

  const currencyCode =
    shopping.currencyCode || cart?.cost?.totalAmount?.currencyCode || "SEK";

  const orderLines: CartItem[] = cart?.lines ?? [];

  const renderCartLineRow = (line: CartItem) => {
    const totalForLine = parseFloat(line.cost.totalAmount.amount);
    const product = line.merchandise.product;
    const imgUrl = product.featuredImage?.url;
    const lineTitle = product.title || line.merchandise.title;
    const producerLabel = product.producerName ?? "";
    const showLineDiscount =
      product.hasDiscount === true &&
      typeof product.originalUnitPriceSek === "number";
    const originalLineTotalSek = showLineDiscount
      ? product.originalUnitPriceSek! * line.quantity
      : null;
    return (
      <div
        key={line.id}
        className="flex items-start gap-3 border-b border-border py-3 last:border-0"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt={product.featuredImage?.altText || lineTitle}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{lineTitle}</p>
          {producerLabel ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{producerLabel}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("checkout.qty", { count: String(line.quantity) })}
          </p>
          {line.discountLabel ? (
            <span className="mt-1 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              {line.discountLabel}
            </span>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          {showLineDiscount && originalLineTotalSek !== null ? (
            <>
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {formatSek(originalLineTotalSek)}
              </p>
              <p className="text-sm font-medium tabular-nums text-foreground">
                {formatDisplay(totalForLine)}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium tabular-nums text-foreground">
              {formatDisplay(totalForLine)}
            </p>
          )}
        </div>
      </div>
    );
  };

  const checkBudbeeAvailability = useCallback(
    async (postalCode: string, countryCode: string = "SE") => {
      if (!/^\d{5}$/.test(postalCode)) return;
      try {
        const res = await fetch(
          `/api/checkout/validate-delivery` +
            `?postalCode=${encodeURIComponent(postalCode)}` +
            `&countryCode=${encodeURIComponent(countryCode)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { available?: unknown };
        setBudbeeAvailable(data.available === true);
      } catch {
        // Vid nätverksfel: visa inget — blockera inte checkout
        setBudbeeAvailable(null);
      }
    },
    [],
  );

  const handlePostalDraftCommit = (raw?: string) => {
    const v = (raw ?? postalCodeDraft).trim().replace(/\s+/g, "");
    const ok = isUsConditional ? v.length >= 3 : /^\d{5}$/.test(v);
    if (!ok) return;
    setPostalCodeDraft(v);
    setZoneLoading(true);
    setZoneFetchCompleted(false);

    const countryCode =
      deliveryDraft?.countryCode ||
      activeShop?.countryCode ||
      checkoutMarketCountry ||
      "SE";
    const city =
      deliveryDraft?.city?.trim() ||
      activeShop?.city?.trim() ||
      (countryCode === "SE" ? "Stockholm" : "") ||
      "Stockholm";

    const lines: ZoneDeliveryLines = {
      street: deliveryDraft?.street ?? "",
      city,
      postal: v,
      countryCode,
      regionCode:
        deliveryDraft?.regionCode ?? activeShop?.regionCode ?? null,
      fullName:
        deliveryDraft?.fullName || profile?.full_name?.trim() || null,
      phone: deliveryDraft?.phone || profile?.phone?.trim() || null,
      email: deliveryDraft?.email || profile?.email?.trim() || null,
    };
    setDeliveryDraft(lines);
    void checkBudbeeAvailability(v, countryCode);
    // Match zones immediately so shipping + pallet show before address step.
    void updateZoneInfo(lines);
  };

  const showPalletPicker = useMemo(
    () => (zoneInfo.pallets?.length ?? 0) > 1,
    [zoneInfo.pallets],
  );

  const { fillPercent, deliveryEstimateLabel, isReadyToShip, bottlesRemaining } =
    useMemo(() => {
      const estimateFromFill = (fp: number) => {
        if (fp < 50) return t("checkout.deliveryEstimate2to4Weeks");
        if (fp < 80) return t("checkout.deliveryEstimate1to2Weeks");
        return t("checkout.deliveryEstimateWithin1Week");
      };

      if (!selectedPallet) {
        return {
          fillPercent: 0,
          deliveryEstimateLabel: t("checkout.deliveryEstimate2to4Weeks"),
          isReadyToShip: false,
          bottlesRemaining: 0,
        };
      }

      const progress = selectedPallet.shipProgress;
      const f = progress?.bottlesFilled ?? selectedPallet.currentBottles;
      const minToShip =
        progress?.minBottlesToShip ??
        selectedPallet.minBottlesToShip ??
        selectedPallet.maxBottles;
      if (!Number.isFinite(f) || !Number.isFinite(minToShip) || minToShip <= 0) {
        return {
          fillPercent: 0,
          deliveryEstimateLabel: t("checkout.deliveryEstimate2to4Weeks"),
          isReadyToShip: false,
          bottlesRemaining: 0,
        };
      }
      const fp =
        progress?.shipProgressPercent ??
        Math.min(100, (f / minToShip) * 100);
      const ready =
        progress?.isReadyToShip ?? f >= minToShip;
      const remaining =
        progress?.bottlesRemainingToShip ??
        Math.max(0, minToShip - f);
      const st = String(selectedPallet.status ?? "").toLowerCase();
      if (st === "shipping_ordered") {
        return {
          fillPercent: fp,
          deliveryEstimateLabel: t("checkout.deliveryEstimateShippingOrdered"),
          isReadyToShip: true,
          bottlesRemaining: 0,
        };
      }
      return {
        fillPercent: fp,
        deliveryEstimateLabel: ready
          ? t("checkout.palletShipmentReady")
          : estimateFromFill(fp),
        isReadyToShip: ready,
        bottlesRemaining: remaining,
      };
    }, [selectedPallet, t]);

  const handleSelectPallet = useCallback(
    (palletId: string) => {
      const p = zoneInfo.pallets?.find((x) => x.id === palletId);
      if (p) {
        setSelectedPallet(p);
      }
    },
    [zoneInfo.pallets],
  );

  // TODO: When more delivery zones are supported, switch carrier
  // text based on zone (Bring for Stockholm, others for other zones).

  // IMPORTANT: keep these conditional returns AFTER all hooks above to preserve hook order
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 pt-top-spacing">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!cart || cart.totalQuantity === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 pt-top-spacing">
        <h1 className="text-2xl font-semibold mb-4">{t("checkout.title")}</h1>
        <p className="text-gray-600">{t("checkout.emptyCart")}</p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {t("checkout.continueShopping")}
        </a>
      </div>
    );
  }

  return (
    <>
      <CartMergeModal
        open={cartMergeOpen}
        loading={cartMergeLoading}
        onChoose={(s) => {
          void handleCartMerge(s);
        }}
      />
      <Dialog
        open={pendingTestkopDiscount != null}
        onOpenChange={(open) => {
          if (!open) setPendingTestkopDiscount(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detta är en testköpskod</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Kontot{" "}
                  <span className="font-medium text-foreground">
                    {profile?.email?.trim() || "okänt"}
                  </span>{" "}
                  kommer att exkluderas permanent från all analysdata. Alla
                  framtida besök och köp från det här kontot räknas inte i
                  statistiken.
                </p>
                <p>Använd endast dedikerade testkonton.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingTestkopDiscount(null)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingTestkopDiscount) {
                  commitAppliedDiscount(pendingTestkopDiscount);
                }
              }}
            >
              Jag förstår, använd koden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReservationLoadingModal
        open={isStripeConfirming || isFinalizingReservation}
        title={
          isStripeConfirming
            ? t("checkout.authenticatingCard")
            : isFinalizingReservation
              ? t("checkout.confirmingReservation")
              : undefined
        }
        description={
          isStripeConfirming
            ? t("checkout.bankPrompt")
            : isFinalizingReservation
              ? t("checkout.processingOrder")
              : undefined
        }
      />
      <ShareBottlesDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        userId={profile?.id || null}
        currencyCode={currencyCode}
        discountRate={
          bottleCost > 0
            ? Math.max(0, Math.min(1, rewardsDiscountAmount / bottleCost))
            : 0
        }
        cartLines={(cart?.lines || []).map((l) => ({
          id: l.id,
          title: l.merchandise.title,
          quantity: l.quantity,
          unitPrice: parseFloat(
            l.merchandise.product.priceRange.minVariantPrice.amount,
          ),
        }))}
        onConfirm={({ selectedFriends, allocations }) => {
          setShareFriendIds(selectedFriends.map((f) => f.id));
          setShareAllocation(allocations);
        }}
      />

    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-8 p-6 pt-top-spacing">
        <div>
          <h1 className="mb-2 text-2xl font-medium text-foreground">
            {t("checkout.title")}
          </h1>
          <p className="text-muted-foreground">{t("checkout.subtitle")}</p>
        </div>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_400px] lg:items-start">
          <aside className="order-1 w-full min-w-0 lg:sticky lg:top-8 lg:order-2 lg:self-start">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground mb-3">
                {t("checkout.yourOrder")} ({cart.totalQuantity}{" "}
                {cart.totalQuantity === 1
                  ? t("checkout.bottle")
                  : t("checkout.bottles")})
              </p>
              <div>{orderLines.map(renderCartLineRow)}</div>
              <div className="space-y-2 border-t border-border pt-4 mt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.subtotal")}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatDisplay(displaySubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.shipping")}
                  </span>
                  <span className="text-right tabular-nums text-foreground">
                    {displayShippingSek != null && selectedPalletId ? (
                      formatDisplay(displayShippingSek)
                    ) : shippingCost ? (
                      formatSek(shippingCost.totalShippingCostCents / 100)
                    ) : (
                      <span className="text-muted-foreground">
                        {t("checkout.shippingAfterAddress")}
                      </span>
                    )}
                  </span>
                </div>
                {pactPointsBalance > 0 ? (
                  <div className="space-y-2 border-b border-border/60 pb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {t("checkout.usePactPoints")}
                      </span>
                      <span className="text-muted-foreground">
                        {t("checkout.pointsAvailable", {
                          balance: String(pactPointsBalance),
                        })}
                      </span>
                    </div>
                    <Slider
                      value={[redeemPoints]}
                      onValueChange={([v]) =>
                        setRedeemPoints(typeof v === "number" ? v : 0)
                      }
                      max={maxRedemption}
                      step={10}
                      className="my-1"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setRedeemPoints(0)}
                        className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
                      >
                        {t("checkout.useNone")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRedeemPoints(maxRedemption)}
                        className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
                      >
                        {t("checkout.useAll")}
                      </button>
                    </div>
                    {hasBoostedProducerInOrder ? (
                      <p className="text-[11px] text-violet-700">
                        {t("checkout.boostWorth2x")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {redeemPoints > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("checkout.pactPointsDiscount")}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      −{formatDisplay(displayPactOff)}
                    </span>
                  </div>
                ) : null}
                {useRewards && selectedRewards.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("checkout.voucher", {
                        count: String(selectedRewards.length),
                      })}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      −{formatDisplay(rewardsDiscountAmount)}
                    </span>
                  </div>
                ) : null}

                {appliedDiscount ? (
                  <div className="flex items-center justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                    <span>
                      {t("checkout.discountApplied", {
                        code: appliedDiscount.code,
                        amount:
                          appliedDiscount.type === "percent"
                            ? `−${Math.round(appliedDiscount.discount_amount_sek)} kr (−${appliedDiscount.value}%)`
                            : `−${Math.round(appliedDiscount.discount_amount_sek)} kr`,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={clearAppliedDiscount}
                      className="shrink-0 text-lg leading-none text-muted-foreground hover:text-foreground"
                      aria-label={t("checkout.removeDiscount")}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("checkout.discountCode")}
                        value={discountCodeInput}
                        onChange={(e) => {
                          setDiscountCodeInput(e.target.value);
                          setDiscountError(null);
                        }}
                        className="h-9 rounded-md border border-zinc-200 bg-white pl-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-500 focus-visible:ring-zinc-300"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={discountApplying || !discountCodeInput.trim()}
                        onClick={() => void applyDiscountCode()}
                      >
                        {t("checkout.applyDiscount")}
                      </Button>
                    </div>
                    {discountError ? (
                      <p className="text-xs text-red-600">{discountError}</p>
                    ) : null}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 text-base font-medium text-foreground">
                  <span>{t("checkout.total")}</span>
                  <span className="tabular-nums text-foreground">
                    {formatDisplay(displayTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="border-b border-border my-6"
              role="separator"
              aria-hidden="true"
            />

            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
                onClick={() => setShareDialogOpen(true)}
              >
                <span>
                  {t("checkout.shareBottles")}
                  {(shareFriendIds?.length ?? 0) > 0
                    ? ` (${shareFriendIds?.length})`
                    : ""}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
          </aside>

          <div className="order-2 min-w-0 space-y-4 lg:order-1">
            {/* 1. Postnummer → leveransalternativ */}
            <section className="py-6 first:pt-0 border-b border-border last:border-0">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {t("checkout.deliveryDetails")}
                  </h2>
                  {activeShop ? (
                    <p className="text-xs text-muted-foreground">
                      {t("checkout.shoppingIn")}{" "}
                      <span className="font-medium text-foreground/80">
                        {activeShop.displayName}
                      </span>
                      <span> · </span>
                      <span>{activeShop.currencyCode}</span>
                    </p>
                  ) : !zoneTemplatesLoaded ? (
                    <p className="text-xs text-muted-foreground">
                      {t("checkout.loadingZone")}
                    </p>
                  ) : null}
                </div>

                {!hasPostalCode ? (
                  <div className="space-y-1">
                    <Label htmlFor="checkout-postal">
                      {t("checkout.deliveryPostalCode")}
                    </Label>
                    <Input
                      id="checkout-postal"
                      value={postalCodeDraft}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\s+/g, "");
                        setPostalCodeDraft(v);
                        if (
                          isUsConditional
                            ? v.length >= 3
                            : /^\d{5}$/.test(v)
                        ) {
                          handlePostalDraftCommit(v);
                        }
                      }}
                      placeholder={t("checkout.enterPostalCode")}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={isUsConditional ? 10 : 5}
                      onBlur={() => handlePostalDraftCommit()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handlePostalDraftCommit();
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("checkout.postalCodeHint")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("checkout.postalCodeLabel")}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {effectiveDelivery?.postal?.trim() ||
                            postalCodeDraft.trim() ||
                            "—"}
                        </p>
                      </div>
                      {hasFullAddress ? (
                        <ProfileInfoModal
                          onProfileSaved={handleProfileSaved}
                          trigger={
                            <button
                              type="button"
                              className="text-xs underline underline-offset-2 text-foreground"
                            >
                              {t("checkout.edit")}
                            </button>
                          }
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-xs underline underline-offset-2 text-foreground"
                          onClick={() => {
                            setPostalCodeDraft("");
                            setZoneFetchCompleted(false);
                            setDeliveryDraft((d) =>
                              d ? { ...d, postal: "" } : d,
                            );
                            setBudbeeAvailable(null);
                          }}
                        >
                          {t("checkout.edit")}
                        </button>
                      )}
                    </div>

                    {zoneLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {t("checkout.updatingDelivery")}
                        </span>
                      </div>
                    ) : null}

                    {!isUsConditional &&
                    (selectedPallet != null ||
                      Boolean(zoneInfo.deliveryZone) ||
                      zoneInfo.selectedDeliveryZoneId != null) ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          {t("checkout.deliveryOptions")}
                        </p>
                        <div
                          className="flex items-start justify-between border-b border-border py-3"
                          role="group"
                          aria-label={t("checkout.deliveryOptionAria")}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-foreground"
                              aria-hidden
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {t("checkout.homeDeliveryBring")}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t("checkout.deliveryBringHint", {
                                  estimate: deliveryEstimateLabel,
                                })}
                              </p>
                              {budbeeAvailable === false && (
                                <p className="mt-1 text-xs text-amber-500">
                                  {t("checkout.budbeeUnavailable")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="whitespace-nowrap text-sm tabular-nums text-foreground">
                              {deliveryOptionShippingLabel}
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset from /public */}
                            <img
                              src="/budbee-logo.png"
                              alt="Budbee"
                              width={96}
                              height={36}
                              className="h-5 w-auto max-w-[100px] shrink-0 object-contain object-right mix-blend-multiply"
                              aria-hidden
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedPallet != null ? (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {t("checkout.palletProgress")}
                          </p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {isReadyToShip
                              ? t("checkout.palletShipmentReady")
                              : t("checkout.palletBottlesToGo", {
                                  remaining: String(bottlesRemaining),
                                })}
                          </p>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/50">
                          <div
                            className="h-full min-w-[2px] rounded-full bg-foreground transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, fillPercent))}%`,
                            }}
                          />
                        </div>
                        {selectedPallet.current_pickup_producer?.name ? (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("checkout.collectedFrom", {
                              name: selectedPallet.current_pickup_producer.name,
                            })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {!zoneLoading &&
                    zoneFetchCompleted &&
                    hasPostalCode &&
                    hasProducerItems &&
                    !selectedPallet &&
                    (zoneInfo.pallets?.length ?? 0) === 0 &&
                    (Boolean(zoneInfo.deliveryZone) ||
                      zoneInfo.selectedDeliveryZoneId != null ||
                      Boolean(zoneInfo.pickupZone)) &&
                    zoneInfo.zoneError == null ? (
                      <p className="text-sm text-destructive">
                        {t("checkout.noPickupForCart")}
                      </p>
                    ) : null}

                    {!zoneLoading &&
                    zoneFetchCompleted &&
                    hasPostalCode &&
                    !zoneInfo.pickupZone &&
                    !zoneInfo.deliveryZone &&
                    !zoneInfo.selectedDeliveryZoneId &&
                    (zoneInfo.pallets?.length ?? 0) === 0 &&
                    !selectedPallet &&
                    zoneInfo.zoneError == null ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {t("checkout.noPickupZone")}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => {
                            clearZoneCache();
                            setZoneFetchCompleted(false);
                            void updateZoneInfo();
                          }}
                          disabled={zoneLoading}
                        >
                          {t("checkout.tryAgain")}
                        </Button>
                      </div>
                    ) : null}

                    {!zoneLoading &&
                    zoneInfo.zoneError === "NO_DELIVERY_ZONE" ? (
                      <p className="text-sm text-destructive">
                        {isUsConditional
                          ? zoneInfo.zoneErrorMessage?.trim() ||
                            t("checkout.noPalletAvailable")
                          : t("checkout.noDeliveryZoneYet")}
                      </p>
                    ) : null}

                    {!zoneLoading &&
                    zoneInfo.zoneError === "UNSUPPORTED_COUNTRY" ? (
                      <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-line">
                        {browseOnlyCountryMessage}
                      </p>
                    ) : null}

                    {hasProducerItems &&
                    hasZoneSelected &&
                    !zoneLoading &&
                    showPalletPicker ? (
                      <div className="space-y-1.5">
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor="checkout-pallet"
                        >
                          {t("checkout.pallet")}
                        </Label>
                        <Select
                          value={selectedPallet?.id ?? ""}
                          onValueChange={handleSelectPallet}
                        >
                          <SelectTrigger
                            id="checkout-pallet"
                            className="h-9 w-full"
                          >
                            <SelectValue
                              placeholder={t("checkout.selectPallet")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {zoneInfo.pallets?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    {isUsConditional &&
                    !zoneLoading &&
                    deliveryPreviewReady ? (
                      <p className="text-sm text-muted-foreground">
                        {t("checkout.usConditionalCopy")}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            {/* 2. Leveransadress — ett fält i taget */}
            <section
              className={cn(
                "py-6 border-b border-border last:border-0",
                !deliveryPreviewReady && "opacity-50",
              )}
            >
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">
                  {t("checkout.stepAddress")}
                </h2>

                {!hasPostalCode ? (
                  <p className="text-sm text-muted-foreground">
                    {t("checkout.stepAddressLocked")}
                  </p>
                ) : !deliveryPreviewReady ? (
                  <p className="text-sm text-muted-foreground">
                    {t("checkout.stepAddressWaitingDelivery")}
                  </p>
                ) : addressStepComplete && !editingAddress ? (
                  <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 fill-mode-both">
                    <div className="flex items-start justify-between gap-3 py-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {effectiveDelivery?.fullName ||
                            profile?.full_name ||
                            "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {effectiveDelivery?.email || profile?.email || ""}
                        </p>
                        <p className="text-sm font-medium text-foreground mt-2">
                          {effectiveDelivery?.street ?? "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {effectiveDelivery?.postal ?? ""}{" "}
                          {effectiveDelivery?.city ?? ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {effectiveDelivery?.countryCode
                            ? getCountryDisplayName(
                                effectiveDelivery.countryCode,
                                countryDisplayLocale,
                              )
                            : "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs underline underline-offset-2 text-foreground"
                        onClick={() => {
                          addressAutoSaveRef.current = false;
                          addressPersistedRef.current = false;
                          setEditingAddress(true);
                          const fromDb =
                            userZoneRowToDeliveryLines(zoneAddressRow);
                          setDeliveryDraft(
                            fromDb ??
                              deliveryDraft ?? {
                                street: effectiveDelivery?.street || "",
                                city: effectiveDelivery?.city || "",
                                postal: effectiveDelivery?.postal || "",
                                countryCode:
                                  effectiveDelivery?.countryCode || "SE",
                                regionCode:
                                  effectiveDelivery?.regionCode ?? null,
                                fullName:
                                  effectiveDelivery?.fullName ||
                                  profile?.full_name ||
                                  null,
                                phone:
                                  effectiveDelivery?.phone ||
                                  profile?.phone ||
                                  null,
                                email:
                                  effectiveDelivery?.email ||
                                  profile?.email ||
                                  null,
                              },
                          );
                        }}
                      >
                        {t("checkout.change")}
                      </button>
                    </div>
                    {isUsConditional && !hasUsState ? (
                      <p className="text-sm text-destructive">
                        {t("checkout.selectUsState")}
                      </p>
                    ) : null}
                    <p
                      className={cn(
                        "text-sm text-muted-foreground transition-opacity duration-300",
                        deliveryComplete ? "opacity-100" : "opacity-70",
                      )}
                    >
                      {t("checkout.deliveryConfirmed")}
                    </p>
                  </div>
                ) : deliveryDraft ? (
                  <div className="space-y-3">
                    {(() => {
                      const nameOk =
                        (deliveryDraft.fullName ?? "").trim().length > 1;
                      const emailOk = (deliveryDraft.email ?? "").includes(
                        "@",
                      );
                      const phoneOk =
                        (deliveryDraft.phone ?? "").trim().length >= 6;
                      const streetOk = deliveryDraft.street.trim().length > 0;
                      const cityOk = deliveryDraft.city.trim().length > 0;
                      const stateOk =
                        !isUsConditional ||
                        isValidUsStateCode(
                          deliveryDraft.regionCode?.trim() ?? "",
                        );
                      const editMode = editingAddress;
                      const canSaveEdit =
                        nameOk &&
                        emailOk &&
                        phoneOk &&
                        streetOk &&
                        cityOk &&
                        stateOk;

                      type FieldId =
                        | "fullName"
                        | "email"
                        | "phone"
                        | "street"
                        | "city"
                        | "regionCode";

                      const fields: Array<{
                        id: FieldId;
                        label: string;
                        unlocked: boolean;
                        done: boolean;
                      }> = [
                        {
                          id: "fullName",
                          label: t("checkout.fullName"),
                          unlocked: true,
                          done: nameOk,
                        },
                        {
                          id: "email",
                          label: t("checkout.email"),
                          unlocked: editMode || nameOk,
                          done: emailOk,
                        },
                        {
                          id: "phone",
                          label: t("checkout.phone"),
                          unlocked: editMode || (nameOk && emailOk),
                          done: phoneOk,
                        },
                        {
                          id: "street",
                          label: t("checkout.streetAddress"),
                          unlocked:
                            editMode || (nameOk && emailOk && phoneOk),
                          done: streetOk,
                        },
                        {
                          id: "city",
                          label: t("checkout.city"),
                          unlocked:
                            editMode ||
                            (nameOk && emailOk && phoneOk && streetOk),
                          done: cityOk,
                        },
                      ];
                      if (isUsConditional) {
                        fields.push({
                          id: "regionCode",
                          label: t("checkout.stateTerritory"),
                          unlocked:
                            editMode ||
                            (nameOk &&
                              emailOk &&
                              phoneOk &&
                              streetOk &&
                              cityOk),
                          done: stateOk,
                        });
                      }

                      const activeId = editMode
                        ? null
                        : (fields.find((f) => f.unlocked && !f.done)?.id ??
                          null);

                      const patch = (partial: Partial<ZoneDeliveryLines>) =>
                        setDeliveryDraft((d) =>
                          d ? { ...d, ...partial } : d,
                        );

                      return (
                        <>
                          {fields.map((field) => {
                            const isActive = field.id === activeId;
                            const isUpcoming = !editMode && !field.unlocked;
                            const isDone =
                              !editMode && field.unlocked && field.done;

                            return (
                              <div
                                key={field.id}
                                className={cn(
                                  "transition-all duration-300 origin-top",
                                  isUpcoming &&
                                    "pointer-events-none select-none scale-[0.92] opacity-40",
                                  isDone && "opacity-80",
                                  (isActive || editMode) && "opacity-100",
                                )}
                                aria-hidden={isUpcoming || undefined}
                              >
                                <div
                                  className={cn(
                                    "space-y-1.5",
                                    isUpcoming && "space-y-1",
                                  )}
                                >
                                  <Label
                                    htmlFor={
                                      isUpcoming
                                        ? undefined
                                        : `checkout-${field.id}`
                                    }
                                    className={cn(
                                      isUpcoming &&
                                        "text-[10px] leading-none text-muted-foreground/80",
                                      isDone && "text-xs text-muted-foreground",
                                      (isActive || editMode) && "text-sm",
                                    )}
                                  >
                                    {field.label}
                                  </Label>

                                  {field.id === "regionCode" ? (
                                    isUpcoming ? (
                                      <div className="h-7 rounded-md border border-border/60 bg-muted/20" />
                                    ) : (
                                      <Select
                                        value={
                                          deliveryDraft.regionCode ?? ""
                                        }
                                        onValueChange={(v) =>
                                          patch({
                                            regionCode: v || null,
                                          })
                                        }
                                      >
                                        <SelectTrigger
                                          className={cn(
                                            isDone && "h-8 text-sm",
                                          )}
                                        >
                                          <SelectValue
                                            placeholder={t(
                                              "checkout.selectState",
                                            )}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {listUsStateCodesSorted().map(
                                            (c) => (
                                              <SelectItem key={c} value={c}>
                                                {c}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectContent>
                                      </Select>
                                    )
                                  ) : isUpcoming ? (
                                    <div className="h-7 rounded-md border border-border/60 bg-muted/20" />
                                  ) : (
                                    <Input
                                      id={`checkout-${field.id}`}
                                      type={
                                        field.id === "email"
                                          ? "email"
                                          : field.id === "phone"
                                            ? "tel"
                                            : "text"
                                      }
                                      value={
                                        field.id === "fullName"
                                          ? (deliveryDraft.fullName ?? "")
                                          : field.id === "email"
                                            ? (deliveryDraft.email ?? "")
                                            : field.id === "phone"
                                              ? (deliveryDraft.phone ?? "")
                                              : field.id === "street"
                                                ? deliveryDraft.street
                                                : deliveryDraft.city
                                      }
                                      autoComplete={
                                        field.id === "fullName"
                                          ? "name"
                                          : field.id === "email"
                                            ? "email"
                                            : field.id === "phone"
                                              ? "tel"
                                              : field.id === "street"
                                                ? "street-address"
                                                : "address-level2"
                                      }
                                      autoFocus={isActive}
                                      className={cn(
                                        isDone && "h-8 text-sm",
                                      )}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (field.id === "fullName")
                                          patch({ fullName: v });
                                        else if (field.id === "email")
                                          patch({ email: v });
                                        else if (field.id === "phone")
                                          patch({ phone: v });
                                        else if (field.id === "street")
                                          patch({ street: v });
                                        else if (field.id === "city")
                                          patch({ city: v });
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {editMode ? (
                            <div className="flex items-center gap-3 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                disabled={addressSaving || !canSaveEdit}
                                onClick={() => void handleSaveZoneDelivery()}
                              >
                                {addressSaving
                                  ? t("checkout.updatingDelivery")
                                  : t("checkout.saveDeliveryDetails")}
                              </Button>
                              <button
                                type="button"
                                className="text-xs underline underline-offset-2 text-muted-foreground"
                                disabled={addressSaving}
                                onClick={() => {
                                  setEditingAddress(false);
                                  setDeliveryDraft(null);
                                  addressAutoSaveRef.current = true;
                                  addressPersistedRef.current = true;
                                }}
                              >
                                {t("checkout.cancel")}
                              </button>
                            </div>
                          ) : addressSaving ? (
                            <p className="text-xs text-muted-foreground">
                              {t("checkout.updatingDelivery")}
                            </p>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t("checkout.loadingZone")}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section
              ref={complianceSectionRef}
              className={cn(
                "py-6 border-b border-border last:border-0 transition-[opacity,transform] duration-500 ease-out",
                deliveryComplete && complianceStepRevealed
                  ? "opacity-100 translate-y-0"
                  : "opacity-50 translate-y-1",
              )}
            >
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">
                  {t("checkout.stepCompliance")}
                </h2>

                {!deliveryComplete ? (
                  <p className="text-sm text-muted-foreground">
                    {t("checkout.stepComplianceLocked")}
                  </p>
                ) : !complianceStepRevealed ? (
                  <p className="text-sm text-muted-foreground animate-in fade-in-0 duration-300">
                    {t("checkout.openingCompliance")}
                  </p>
                ) : (
                  <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 fill-mode-both">
                    {hasProducerItems && selectedPallet ? (
                      <>
                        {isUsConditional ? (
                          <div className="space-y-3 rounded-md border border-border bg-background p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="us-conditional-ack"
                                checked={usConditionalAck}
                                onCheckedChange={(v) =>
                                  setUsConditionalAck(v === true)
                                }
                              />
                              <label
                                htmlFor="us-conditional-ack"
                                className="text-sm leading-snug text-foreground"
                              >
                                {t("checkout.usConditionalAck")}
                              </label>
                            </div>
                          </div>
                        ) : null}
                        <div className="space-y-3 rounded-md border border-border bg-background p-4">
                          <div className="space-y-2">
                            <Label htmlFor="age-dob" className="text-sm">
                              {t("checkout.ageDateOfBirth")}
                            </Label>
                            <Input
                              id="age-dob"
                              type="date"
                              value={dateOfBirth}
                              max={new Date().toISOString().slice(0, 10)}
                              onChange={(e) =>
                                handleAgeDobChange(e.target.value)
                              }
                              className="max-w-xs"
                              autoComplete="bday"
                            />
                            <p className="text-xs text-muted-foreground">
                              {t("checkout.ageConfirm", {
                                age: String(requiredAge),
                              })}
                            </p>
                            {ageDobError ? (
                              <p className="text-xs text-destructive">
                                {ageDobError}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="terms-accept"
                              checked={termsAccepted}
                              onCheckedChange={(v) =>
                                handleTermsChecked(v === true)
                              }
                            />
                            <label
                              htmlFor="terms-accept"
                              className="text-sm leading-snug text-foreground"
                            >
                              {t("checkout.termsAccept")}{" "}
                              <Link
                                href="/vilkor"
                                className="underline underline-offset-2"
                              >
                                Köpvillkor
                              </Link>
                            </label>
                          </div>
                        </div>
                        {!paymentCardRevealed ? (
                          <Button
                            type="button"
                            className="w-full border-transparent bg-black text-white shadow-none ring-0 hover:border-transparent hover:bg-black/90 hover:shadow-none focus-visible:border-transparent focus-visible:bg-black/90 focus-visible:ring-white/40"
                            disabled={!complianceComplete}
                            onClick={handleContinueToPayment}
                          >
                            {t("checkout.continueToPayment")}
                          </Button>
                        ) : null}
                      </>
                    ) : hasProducerItems && !selectedPallet ? (
                      <p className="text-sm text-destructive">
                        {t("checkout.noPickupForCart")}
                      </p>
                    ) : null}

                    {!isValidCart ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-red-200 pb-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-600">
                              {t("checkout.orderBlocked")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("checkout.addBottlesRequirement")}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {validations
                            .filter((v) => !v.isValid)
                            .map((v, i) => {
                              const href = v.groupId
                                ? paths.shopGroup(v.groupId)
                                : paths.shopCollection(v.producerHandle ?? "");
                              return (
                                <Link key={i} href={href}>
                                  <div className="group w-full rounded-md border border-border bg-background p-4 transition-all hover:border-foreground/20">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="mb-1.5 text-sm font-medium text-foreground">
                                          {v.groupName || v.producerName}
                                        </p>
                                        <p className="mb-2 text-xs text-muted-foreground">
                                          {v.quantity === 1
                                            ? t("checkout.validationCurrent", {
                                                count: String(v.quantity),
                                              })
                                            : t(
                                                "checkout.validationCurrentPlural",
                                                { count: String(v.quantity) },
                                              )}{" "}
                                          •
                                          <span className="font-medium text-red-600">
                                            {" "}
                                            {t("checkout.validationNeedMore", {
                                              needed: String(v.needed),
                                            })}
                                          </span>{" "}
                                          {t("checkout.validationForTotal", {
                                            total: String(
                                              v.quantity + v.needed,
                                            ),
                                          })}
                                        </p>
                                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground group-hover:underline">
                                          {t("checkout.browseWinesFrom", {
                                            type: v.groupId
                                              ? t("checkout.group")
                                              : t("checkout.producer"),
                                          })}
                                          <ArrowRight className="h-3 w-3" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            <section
              ref={paymentSectionRef}
              className={cn(
                "py-6 border-b border-border last:border-0 transition-[opacity,transform] duration-500 ease-out",
                complianceComplete && paymentCardRevealed
                  ? "opacity-100 translate-y-0"
                  : "opacity-50 translate-y-1",
              )}
            >
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">
                  {t("checkout.payment")}
                </h2>

                {!paymentCardRevealed ? (
                  <p className="text-sm text-muted-foreground">
                    {t("checkout.stepPaymentLocked")}
                  </p>
                ) : (
                  <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 fill-mode-both">
                    {hasWarehouseItems ? (
                      <div className="mb-2">
                        <PaymentMethodSelectorB2B
                          onPaymentMethodSelected={setPaymentMethod}
                          selectedMethod={paymentMethod}
                          hasWarehouseItems={hasWarehouseItems}
                          hasProducerItems={hasProducerItems}
                        />
                      </div>
                    ) : null}

                    {hasProducerItems && selectedPallet ? (
                      <>
                        {authChecked && !authReady && !platformOpen ? (
                          <CheckoutEmailAuth
                            emailHint={t("checkout.otpEmailHint")}
                            checkInbox={t("checkout.otpCheckInbox")}
                            emailLabel={t("checkout.otpEmailLabel")}
                            sendLinkLabel={t("checkout.otpSendLink")}
                            onAuthenticated={() => {
                              void ensureProfileAfterAuth();
                            }}
                          />
                        ) : null}
                        {authChecked && !authReady && platformOpen ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {guestSessionPending
                                ? t("checkout.preparingCheckout")
                                : guestSessionError
                                  ? guestSessionError
                                  : t("checkout.preparingCheckout")}
                            </p>
                            {guestSessionError ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  guestEnsureAttemptedRef.current = null;
                                  setGuestSessionError(null);
                                  setGuestRetryNonce((n) => n + 1);
                                }}
                              >
                                {t("checkout.tryAgain")}
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                        {authReady ? (
                          <StripePaymentSection
                            key={`stripe-${selectedPallet.id}`}
                            palletId={selectedPallet.id}
                            pactPointsRedeem={redeemPoints}
                            promoDiscountSek={
                              appliedDiscount?.discount_amount_sek ?? 0
                            }
                            userId={profile?.id}
                            onIntentCreated={handleStripeIntentCreated}
                            onConfirmReady={handleStripeConfirmReady}
                            onQuote={(q) =>
                              setServerQuote({
                                subtotal_sek: q.subtotal_sek,
                                shipping_sek: q.shipping_sek,
                                promo_discount_sek: q.promo_discount_sek,
                                voucher_discount_sek: 0,
                                pact_points_sek: q.pact_points_sek,
                                pact_points_redeem: redeemPoints,
                                total_sek: q.total_sek,
                                total_ore: q.total_ore,
                              })
                            }
                            usConditionalPayment={isUsConditional}
                            usConditionalAck={usConditionalAck}
                            prefetchedIntent={prefetchedStripeIntent}
                          />
                        ) : null}

                        {stripeError ? (
                          <p className="mt-3 text-sm text-destructive">
                            {stripeError}
                          </p>
                        ) : null}

                        <div className="mt-6 space-y-4 border-t border-border pt-4">
                          <p className="text-xs text-muted-foreground">
                            {t("checkout.sellingEntity")}
                          </p>
                          <div className="flex items-center justify-between py-4">
                            <span className="text-base font-semibold text-foreground">
                              {t("checkout.total")}
                            </span>
                            <span className="text-2xl font-bold tabular-nums text-foreground">
                              {formatDisplay(displayTotal)}
                            </span>
                          </div>

                          <Button
                            type="button"
                            className="w-full border-transparent bg-black text-white shadow-none ring-0 hover:border-transparent hover:bg-black/90 hover:shadow-none focus-visible:border-transparent focus-visible:bg-black/90 focus-visible:ring-white/40"
                            disabled={
                              !stripeConfirmFn ||
                              !paymentMode ||
                              !stripeIntentId ||
                              isSubmitting ||
                              zoneLoading ||
                              isStripeConfirming ||
                              isFinalizingReservation ||
                              !ageConfirmed ||
                              !termsAccepted ||
                              !authReady ||
                              (isUsConditional && !usConditionalAck)
                            }
                            onClick={handlePlaceReservation}
                          >
                            {isSubmitting
                              ? t("checkout.processing")
                              : paymentMode === "payment_intent"
                                ? t("checkout.payNow")
                                : isUsConditional
                                  ? t("checkout.usConditionalButton")
                                  : t("checkout.placeReservation")}
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

export function CheckoutClient({
  platformOpen = false,
}: {
  platformOpen?: boolean;
}) {
  return (
    <Suspense
      fallback={
      <div className="max-w-4xl mx-auto p-6 pt-top-spacing">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
      }
    >
      <CheckoutContent platformOpen={platformOpen} />
      {/* merge modal portal host is inside CheckoutContent */}
    </Suspense>
  );
}
