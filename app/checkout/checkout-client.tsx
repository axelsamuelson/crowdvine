"use client";

import { useEffect, useMemo, useRef, useState, Suspense, useCallback } from "react";
import { CartMergeModal } from "@/components/cart/cart-merge-modal";
import { CheckoutEmailAuth } from "@/components/checkout/checkout-email-auth";
import { getAgeLimit } from "@/lib/age-limits";
import { PRICE_VERSION } from "@/lib/analytics/price-version";
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
import { ProgressionBuffDisplay } from "@/components/membership/progression-buff-display";
import {
  StripePaymentSection,
  type StripeConfirmResult,
} from "@/components/checkout/stripe-payment-section";
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
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { calculateCartShippingCost } from "@/lib/shipping-calculations";
import type { PalletInfo } from "@/lib/zone-matching";
import {
  ShareBottlesDialog,
  type ShareAllocation,
} from "@/components/checkout/share-bottles-dialog";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { setInternalDevice } from "@/lib/analytics/internal-device";
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

interface ProgressionBuffRow {
  buff_percentage: string;
  buff_description?: string;
  earned_at?: string;
}

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
  const { formatDisplay, formatSek, toDisplay } = useDisplayMoney();
  const countryDisplayLocale = shopping.locale === "sv" ? "sv" : "en";
  const uiLocalizationEnabled = shopping.uiLocalizationEnabled;
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoneLoading, setZoneLoading] = useState(false);
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(!platformOpen);
  const [authChecked, setAuthChecked] = useState(!platformOpen);
  const [cartMergeOpen, setCartMergeOpen] = useState(false);
  const [cartMergeLoading, setCartMergeLoading] = useState(false);
  const checkoutStartedTracked = useRef(false);
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
  const checkoutPhaseRef = useRef<"delivery" | "payment_ready">("delivery");
  const zoneInfoFetchInProgressRef = useRef(false);
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [usConditionalAck, setUsConditionalAck] = useState(false);
  const ageShownTracked = useRef(false);

  // v2: Progression buffs state
  const [progressionBuffs, setProgressionBuffs] = useState<ProgressionBuffRow[]>(
    [],
  );
  const [totalBuffPercentage, setTotalBuffPercentage] = useState(0);

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

  const hasProfileInfo = Boolean(profile?.full_name && profile?.email);

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
          isZoneDeliveryCompleteForActiveGeo(activeShop, effectiveDelivery),
      );
    }
    return Boolean(
      profile?.address && profile?.city && profile?.postal_code,
    );
  }, [activeShop, effectiveDelivery, profile]);

  const hasPostalCode = Boolean(
    effectiveDelivery?.postal &&
      (isUsConditional
        ? effectiveDelivery.postal.trim().length >= 3
        : /^\d{5}$/.test(effectiveDelivery.postal.trim())),
  );
  const hasFullAddress = hasZoneDeliveryReady;
  const hasUsState =
    !isUsConditional ||
    isValidUsStateCode(effectiveDelivery?.regionCode?.trim() ?? "");
  const hasZoneSelected = Boolean(zoneInfo.selectedDeliveryZoneId);

  const palletsLength = zoneInfo.pallets?.length ?? 0;
  const deliveryComplete = useMemo(
    () => {
      if (!hasProfileInfo || !hasZoneDeliveryReady) return false;
      if (isUsConditional) {
        if (!hasUsState) return false;
        return palletsLength === 0 || selectedPallet != null;
      }
      return (
        Boolean(zoneInfo.selectedDeliveryZoneId) &&
        (palletsLength === 0 || selectedPallet != null)
      );
    },
    [
      hasZoneDeliveryReady,
      hasProfileInfo,
      hasUsState,
      isUsConditional,
      palletsLength,
      selectedPallet,
      zoneInfo.selectedDeliveryZoneId,
    ],
  );

  useEffect(() => {
    if (!isUsConditional) {
      setUsConditionalAck(false);
    }
  }, [isUsConditional]);

  useEffect(() => {
    if (!deliveryComplete || ageShownTracked.current) return;
    ageShownTracked.current = true;
    void AnalyticsTracker.trackEvent({
      eventType: "age_verification_shown",
      eventCategory: "checkout",
      metadata: {
        country_code: ageCountryCode,
        required_age: requiredAge,
      },
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

  const handleAgeChecked = useCallback(
    (checked: boolean) => {
      setAgeConfirmed(checked);
      void AnalyticsTracker.trackEvent({
        eventType: checked
          ? "age_verification_passed"
          : "age_verification_failed",
        eventCategory: "checkout",
        metadata: {
          country_code: ageCountryCode,
          required_age: requiredAge,
        },
      });
    },
    [ageCountryCode, requiredAge],
  );

  const handleTermsChecked = useCallback((checked: boolean) => {
    setTermsAccepted(checked);
    if (checked) {
      void AnalyticsTracker.trackEvent({
        eventType: "terms_accepted",
        eventCategory: "checkout",
        metadata: { version: CHECKOUT_TERMS_VERSION },
      });
    }
  }, []);

  const zoneOrUsPalletReady =
    Boolean(zoneInfo.selectedDeliveryZoneId) ||
    (isUsConditional &&
      typeof selectedPallet?.delivery_zone_id === "string" &&
      selectedPallet.delivery_zone_id.trim() !== "");

  useEffect(() => {
    checkoutPhaseRef.current = deliveryComplete ? "payment_ready" : "delivery";
    void AnalyticsTracker.trackEvent({
      eventType: "checkout_step_viewed",
      eventCategory: "checkout",
      metadata: { phase: checkoutPhaseRef.current },
    });
  }, [deliveryComplete]);

  useEffect(() => {
    if (checkoutStartedTracked.current || !cart || cart.totalQuantity <= 0) {
      return;
    }
    checkoutStartedTracked.current = true;
    const cartValue =
      parseFloat(String(cart.cost?.totalAmount?.amount ?? "0")) || 0;
    const bottleCount = cart.totalQuantity;
    const unitPrice =
      cart.lines[0] != null
        ? parseFloat(String(cart.lines[0].cost.totalAmount.amount)) /
            Math.max(1, cart.lines[0].quantity) || 0
        : 0;
    void AnalyticsTracker.trackCheckoutStarted(cartValue, bottleCount, {
      cart_value: cartValue,
      bottle_count: bottleCount,
      site: "pact",
      payment_method: platformOpen ? "deferred_link" : "card",
      unit_price: unitPrice,
      price_version: PRICE_VERSION,
    });
  }, [cart, platformOpen]);

  useEffect(() => {
    return () => {
      if (checkoutCompletedRef.current) return;
      void AnalyticsTracker.trackEvent({
        eventType: "checkout_abandoned",
        eventCategory: "checkout",
        metadata: { phase: checkoutPhaseRef.current },
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
      if (platformOpen) setAuthChecked(true);
    }
  }, [platformOpen]);

  const ensureProfileAfterAuth = useCallback(async () => {
    setAuthReady(true);
    await fetchProfile();
    try {
      const conflictRes = await fetch("/api/cart/merge");
      const conflictData = await conflictRes.json().catch(() => null);
      if (conflictData?.conflict) {
        setCartMergeOpen(true);
      } else {
        await fetchCart();
      }
    } catch {
      await fetchCart();
    }
  }, [fetchProfile, fetchCart]);

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
    } catch (e) {
      console.error("Failed to load active zone / zone address:", e);
      setActiveShop(null);
      setZoneAddressRow(null);
    } finally {
      setZoneTemplatesLoaded(true);
    }
  }, []);

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

  const fetchProgressionBuffs = useCallback(async () => {
    try {
      const response = await fetch("/api/user/progression-buffs");
      if (response.ok) {
        const data = await response.json();
        const buffs = (data.buffs || []) as ProgressionBuffRow[];
        setProgressionBuffs(buffs);
        const totalPercentage =
          buffs.reduce(
            (sum, buff) =>
              sum + parseFloat(String(buff.buff_percentage ?? "0")),
            0,
          ) || 0;
        setTotalBuffPercentage(totalPercentage);
      }
    } catch (error) {
      console.error("Failed to fetch progression buffs:", error);
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
    fetchProgressionBuffs(); // v2: fetch progression buffs
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
    fetchProgressionBuffs,
    fetchPactPointsBalance,
  ]);

  useEffect(() => {
    if (!zoneTemplatesLoaded || !activeShop?.geoZoneId) return;
    const fromDb = userZoneRowToDeliveryLines(zoneAddressRow);
    if (fromDb) {
      setDeliveryDraft(null);
      return;
    }
    setDeliveryDraft((prev) => {
      if (prev) return prev;
      return {
        street: "",
        city: "",
        postal: "",
        countryCode: activeShop.countryCode,
        regionCode: activeShop.regionCode ?? null,
        fullName: profile?.full_name?.trim() || "",
        phone: profile?.phone?.trim() || "",
        email: profile?.email?.trim() || "",
      };
    });
  }, [
    zoneTemplatesLoaded,
    activeShop,
    zoneAddressRow,
    profile?.full_name,
    profile?.phone,
    profile?.email,
  ]);

  // Initial zone matching when cart and zone context are loaded
  useEffect(() => {
    if (cart && cart.totalQuantity > 0 && !loading && zoneTemplatesLoaded) {
      console.log("🚀 Initial zone matching triggered");
      updateZoneInfo();
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

    const validateCart = async () => {
      try {
        console.log(
          "🔍 [Checkout] Validating cart with",
          cart.totalQuantity,
          "bottles",
        );
        const response = await fetch("/api/cart/validate");
        if (!response.ok) {
          throw new Error(`cart validate HTTP ${response.status}`);
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("cart validate returned non-JSON");
        }
        const result = await response.json();
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
        console.error("Validation error:", error);
        setValidations([]);
        setIsValidCart(true); // Fail open
      }
    };

    validateCart();
  }, [cart]);

  useEffect(() => {
    // Update zone info when address changes (with debouncing)
    if (cart && cart.totalQuantity > 0) {
      const timeoutId = setTimeout(() => {
        console.log("🔄 Address change triggered zone matching");
        updateZoneInfo();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [profile, activeShop, zoneAddressRow, deliveryDraft]);

  const updateZoneInfo = async () => {
    if (!cart || cart.totalQuantity === 0) return;

    // Prevent multiple simultaneous calls
    if (zoneInfoFetchInProgressRef.current) {
      console.log("⏳ Zone update already in progress, skipping...");
      return;
    }
    zoneInfoFetchInProgressRef.current = true;
    setZoneLoading(true);

    try {
      const eff = userZoneRowToDeliveryLines(zoneAddressRow) ?? deliveryDraft;
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
          city: eff.city,
          countryCode: eff.countryCode,
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
        console.log("⚠️ No complete zone delivery — cannot determine zones");
        setZoneInfo({
          pickupZone: null,
          pickupZoneId: null,
          deliveryZone: null,
          selectedDeliveryZoneId: null,
          availableDeliveryZones: [],
          pallets: [],
          usingFallbackAddress: isUsingFallback,
          zoneError: null,
          zoneErrorMessage: undefined,
        });
        setZoneLoading(false);
        return;
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
        
        setZoneInfo({
          pickupZone: zoneData.pickupZoneName ?? null,
          pickupZoneId: zoneData.pickupZoneId ?? null,
          deliveryZone: selectedDeliveryZoneName,
          selectedDeliveryZoneId: selectedDeliveryZoneId,
          availableDeliveryZones: zoneData.availableDeliveryZones || [],
          pallets: zoneData.pallets || [],
          usingFallbackAddress: isUsingFallback,
          zoneError: null,
          zoneErrorMessage: undefined,
        });

        // Auto-select the best pallet
        if (autoSelectedPallet) {
          setSelectedPallet(autoSelectedPallet);
        }
      } else {
        console.error(
          "❌ Zone response failed:",
          zoneResponse.status,
          await zoneResponse.text(),
        );
      }
    } catch (error) {
      console.error("Failed to update zone info:", error);
    } finally {
      zoneInfoFetchInProgressRef.current = false;
      setZoneLoading(false);
    }
  };

  const handleSaveZoneDelivery = async () => {
    const eff = deliveryDraft;
    if (!activeShop?.geoZoneId || !eff) return;
    if (!isZoneDeliveryCompleteForActiveGeo(activeShop, eff)) {
      toast.error(t("checkout.completeZoneFields"));
      return;
    }
    setZoneLoading(true);
    try {
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
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || t("checkout.saveFailed"));
      }
      const j = (await res.json()) as { address?: UserZoneAddressTemplate };
      if (j.address) setZoneAddressRow(j.address);
      setDeliveryDraft(null);
      toast.success(t("checkout.deliverySaved"));
      await updateZoneInfo();
      if (eff?.postal && eff?.countryCode) {
        void checkBudbeeAvailability(eff.postal, eff.countryCode);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("checkout.saveFailed"));
    } finally {
      setZoneLoading(false);
    }
  };

  const handleProfileSaved = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);

    if (activeShop?.geoZoneId) {
      toast.success(t("checkout.saved"));
      setDeliveryDraft((d) =>
        d
          ? {
              ...d,
              fullName: updatedProfile.full_name?.trim() || d.fullName,
              phone: updatedProfile.phone?.trim() || d.phone,
              email: updatedProfile.email?.trim() || d.email,
            }
          : d,
      );
      return;
    }

    const hasAddress =
      updatedProfile.address &&
      updatedProfile.city &&
      updatedProfile.postal_code;

    if (hasAddress) {
      toast.success(t("checkout.saving"));
      setZoneLoading(true);
      setTimeout(async () => {
        await updateZoneInfo();
        setZoneLoading(false);
        toast.success(t("checkout.zoneUpdated"));
      }, 100);
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
      (isUsConditional &&
        typeof selectedPallet?.delivery_zone_id === "string" &&
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
        window.location.href = redirectUrl || "/checkout/success";
      } else {
        setIsFinalizingReservation(false); // Hide modal on error
        void AnalyticsTracker.trackEvent({
          eventType: "payment_failed",
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
        eventType: "payment_failed",
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
    setStripeError(null);

    if (!ageConfirmed) {
      void AnalyticsTracker.trackEvent({
        eventType: "age_verification_failed",
        eventCategory: "checkout",
        metadata: {
          country_code: ageCountryCode,
          required_age: requiredAge,
        },
      });
      toast.error(
        t("checkout.ageConfirm", { age: String(requiredAge) }),
      );
      return;
    }
    if (!termsAccepted) {
      toast.error(t("checkout.termsAccept"));
      return;
    }

    // Validate required fields
    if (!profile?.email && !platformOpen) {
      toast.error(t("checkout.addProfileFirst"));
      return;
    }

    // Check 6-bottle validation (already validated in useEffect, this is just a safeguard)
    if (!isValidCart) {
      console.error(
        "❌ [Checkout] Cart validation failed - button should be disabled",
      );
      toast.error(t("checkout.sixBottleRequirement"));
      return;
    }

    if (!deliveryComplete) return;
    if (!selectedPallet?.id) {
      toast.error(t("checkout.selectPalletContinue"));
      return;
    }

    const submitConfirm = async (opts: {
      stripeIntentId?: string;
      paymentMode?: "setup_intent" | "payment_intent";
      deferred?: boolean;
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

      if (opts.deferred) {
        formData.append("payment_method", "deferred_link");
      } else if (opts.stripeIntentId && opts.paymentMode) {
        formData.append("stripe_intent_id", opts.stripeIntentId);
        formData.append("stripe_intent_type", opts.paymentMode);
      }

      {
        const { visitorId, firstTouch } = ensureVisitorIdentity();
        if (visitorId) formData.append("visitor_id", visitorId);
        if (firstTouch) {
          formData.append("first_touch", JSON.stringify(firstTouch));
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
          eventType: "payment_failed",
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
      window.location.href = redirectUrl || "/checkout/success";
    };

    if (platformOpen) {
      setIsSubmitting(true);
      try {
        await submitConfirm({ deferred: true });
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : t("checkout.reservationFailed");
        setStripeError(msg);
        toast.error(msg);
        setIsSubmitting(false);
        setIsFinalizingReservation(false);
      }
      return;
    }

    if (!stripeConfirmFn || !paymentMode) {
      setStripeError(t("checkout.paymentNotReady"));
      return;
    }

    // Phase 1: Stripe confirmation/authentication
    setIsSubmitting(true);
    setIsStripeConfirming(true);

    let confirmed: StripeConfirmResult;
    try {
      confirmed = await stripeConfirmFn();
    } catch (e) {
      console.error("[Checkout] stripeConfirmFn threw:", e);
      setStripeError(t("checkout.paymentFailedTryCard"));
      setIsSubmitting(false);
      setIsStripeConfirming(false);
      return;
    }

    if (!confirmed.success) {
      console.warn("[Checkout] Stripe confirmation failed:", {
        intentStatus: confirmed.intentStatus,
        stripeError: confirmed.stripeError,
      });
      setStripeError(friendlyStripeErrorMessage(confirmed));
      toast.error(friendlyStripeErrorMessage(confirmed));
      setIsSubmitting(false);
      setIsStripeConfirming(false);
      return;
    }

    // Phase 2: Backend finalization (only after Stripe success)
    setIsStripeConfirming(false);
    try {
      await submitConfirm({
        stripeIntentId: confirmed.intentId,
        paymentMode,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : t("checkout.reservationFailed");
      setStripeError(msg);
      toast.error(msg);
      void AnalyticsTracker.trackEvent({
        eventType: "payment_failed",
        eventCategory: "checkout",
        metadata: {},
      });
      setIsSubmitting(false);
      setIsFinalizingReservation(false);
    }
  }, [
    ageConfirmed,
    ageCountryCode,
    requiredAge,
    termsAccepted,
    profile,
    platformOpen,
    isValidCart,
    deliveryComplete,
    selectedPallet,
    stripeConfirmFn,
    paymentMode,
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

  // Check if we're on B2B site (dirtywine.se)
  const isB2BSite = useB2BPriceMode();

  // Separate producer and warehouse items (only on B2B sites)
  // On B2C sites (pactwines.com), all items are treated as producer items
  const producerItems = isB2BSite ? (cart?.lines?.filter(
    (line) => line.source === "producer" || !line.source
  ) || []) : (cart?.lines || []);
  const warehouseItems = isB2BSite ? (cart?.lines?.filter(
    (line) => line.source === "warehouse"
  ) || []) : [];
  const hasProducerItems = isB2BSite ? producerItems.length > 0 : (cart?.lines?.length || 0) > 0;
  const hasWarehouseItems = isB2BSite && warehouseItems.length > 0;

  // Merchandise total from cart (matches per-line line.cost.totalAmount, incl. member + pallet early-bird)
  const bottleCost = cart
    ? parseFloat(cart.cost.totalAmount.amount)
    : 0;

  // Old rewards discount (being deprecated)
  const rewardsDiscountAmount = useRewards
    ? selectedRewards.reduce((total, reward) => {
        return total + (bottleCost * reward.discount_percentage) / 100;
      }, 0)
    : 0;

  // v2: Progression buff discount
  const progressionBuffDiscountAmount =
    totalBuffPercentage > 0 ? (bottleCost * totalBuffPercentage) / 100 : 0;

  // Total discount from both sources
  const discountAmount = rewardsDiscountAmount + progressionBuffDiscountAmount;

  const subtotal = bottleCost - discountAmount;
  const shippingDisplay = shippingCost
    ? toDisplay(shippingCost.totalShippingCostSek)
    : 0;
  const total = subtotal + shippingDisplay;

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

  const totalAfterPactPoints = Math.max(0, total - pactPointsSekOff);
  const displayTotal = appliedDiscount
    ? Math.max(0, totalAfterPactPoints - appliedDiscount.discount_amount_sek)
    : totalAfterPactPoints;

  // This is the value we send to /api/checkout/payment-intent as `cart_total_sek`.
  // We intentionally do NOT include client-only discounts here (voucher/rewards/progression),
  // because /api/checkout/confirm is the source of truth and validates the final amount.
  // Applied admin promo codes ARE subtracted so Stripe metadata matches confirm.
  const finalAmountAfterVoucher = useMemo(() => {
    const subtotalSek = parseFloat(cart?.cost?.totalAmount?.amount ?? "0") || 0;
    const shippingSek = shippingCost
      ? shippingCost.totalShippingCostCents / 100
      : 0;
    const promoOff = appliedDiscount?.discount_amount_sek ?? 0;
    return Math.max(0, subtotalSek + shippingSek - promoOff);
  }, [
    cart?.cost?.totalAmount?.amount,
    shippingCost,
    appliedDiscount?.discount_amount_sek,
  ]);

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
    (fn: () => Promise<StripeConfirmResult>) => {
      setStripeConfirmFn(() => fn);
    },
    [],
  );

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

  const handlePostalDraftCommit = useCallback(
    (raw?: string) => {
      const v = (raw ?? postalCodeDraft).trim().replace(/\s+/g, "");
      if (!/^\d{5}$/.test(v)) return;
      setPostalCodeDraft(v);
      void checkBudbeeAvailability(v);
      setPostalModalOpen(true);
    },
    [postalCodeDraft, checkBudbeeAvailability],
  );

  const showPalletPicker = useMemo(
    () => (zoneInfo.pallets?.length ?? 0) > 1,
    [zoneInfo.pallets],
  );

  const { filledBottles, totalCapacity, fillPercent, deliveryEstimateLabel } =
    useMemo(() => {
      const estimateFromFill = (fp: number) => {
        if (fp < 50) return t("checkout.deliveryEstimate2to4Weeks");
        if (fp < 80) return t("checkout.deliveryEstimate1to2Weeks");
        return t("checkout.deliveryEstimateWithin1Week");
      };

      if (!selectedPallet) {
        return {
          filledBottles: 0,
          totalCapacity: 0,
          fillPercent: 0,
          deliveryEstimateLabel: t("checkout.deliveryEstimate2to4Weeks"),
        };
      }
      const f = selectedPallet.currentBottles;
      const cap = selectedPallet.maxBottles;
      if (!Number.isFinite(f) || !Number.isFinite(cap) || cap <= 0) {
        return {
          filledBottles: 0,
          totalCapacity: 0,
          fillPercent: 0,
          deliveryEstimateLabel: t("checkout.deliveryEstimate2to4Weeks"),
        };
      }
      const fp = (f / cap) * 100;
      const st = String(selectedPallet.status ?? "").toLowerCase();
      if (st === "shipping_ordered") {
        return {
          filledBottles: f,
          totalCapacity: cap,
          fillPercent: fp,
          deliveryEstimateLabel: t("checkout.deliveryEstimateShippingOrdered"),
        };
      }
      return {
        filledBottles: f,
        totalCapacity: cap,
        fillPercent: fp,
        deliveryEstimateLabel: estimateFromFill(fp),
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
            ? Math.max(0, Math.min(1, discountAmount / bottleCost))
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
                    {formatDisplay(bottleCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.shipping")}
                  </span>
                  <span className="text-right tabular-nums text-foreground">
                    {shippingCost ? (
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
                      −{formatDisplay(pactPointsSekOff)}
                    </span>
                  </div>
                ) : null}
                {progressionBuffDiscountAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("checkout.progressBonus", {
                        percent: totalBuffPercentage.toFixed(1),
                      })}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      −{formatDisplay(progressionBuffDiscountAmount)}
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
            {progressionBuffs.length > 0 ? (
              <ProgressionBuffDisplay
                totalBuffPercentage={totalBuffPercentage}
                buffDetails={progressionBuffs.map((buff) => ({
                  percentage: parseFloat(String(buff.buff_percentage ?? "0")),
                  description: buff.buff_description,
                  earnedAt: buff.earned_at,
                }))}
                expiresOnUse={true}
                compact={false}
              />
            ) : null}

            <section className="py-6 first:pt-0 border-b border-border last:border-0">
              <div className="space-y-3">
                {activeShop ? (
                  <p className="text-sm text-muted-foreground">
                    {t("checkout.shoppingIn")}{" "}
                    <span className="font-medium text-foreground">
                      {activeShop.displayName}
                    </span>
                    <span className="text-muted-foreground"> · </span>
                    <span>{activeShop.currencyCode}</span>
                  </p>
                ) : !zoneTemplatesLoaded ? (
                  <p className="text-xs text-muted-foreground">
                    {t("checkout.loadingZone")}
                  </p>
                ) : null}

                {activeShop?.geoZoneId &&
                !userZoneRowToDeliveryLines(zoneAddressRow) &&
                deliveryDraft ? (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {t("checkout.addDeliveryFor", {
                        zone: activeShop.displayName,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("checkout.addDeliveryHint")}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="zone-addr1">
                        {t("checkout.streetAddress")}
                      </Label>
                      <Input
                        id="zone-addr1"
                        value={deliveryDraft.street}
                        onChange={(e) =>
                          setDeliveryDraft((d) =>
                            d ? { ...d, street: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="zone-city">{t("checkout.city")}</Label>
                        <Input
                          id="zone-city"
                          value={deliveryDraft.city}
                          onChange={(e) =>
                            setDeliveryDraft((d) =>
                              d ? { ...d, city: e.target.value } : d,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zone-postal">
                          {t("checkout.postalCode")}
                        </Label>
                        <Input
                          id="zone-postal"
                          value={deliveryDraft.postal}
                          onChange={(e) =>
                            setDeliveryDraft((d) =>
                              d ? { ...d, postal: e.target.value } : d,
                            )
                          }
                        />
                      </div>
                    </div>
                    {isUsConditional ? (
                      <div className="space-y-2">
                        <Label>{t("checkout.stateTerritory")}</Label>
                        <Select
                          value={deliveryDraft.regionCode ?? ""}
                          onValueChange={(v) =>
                            setDeliveryDraft((d) =>
                              d ? { ...d, regionCode: v || null } : d,
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("checkout.selectState")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {listUsStateCodesSorted().map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="default"
                      className="w-full"
                      disabled={zoneLoading}
                      onClick={() => void handleSaveZoneDelivery()}
                    >
                      {t("checkout.saveDeliveryDetails")}
                    </Button>
                  </div>
                ) : null}

                <h2 className="text-base font-semibold text-foreground">
                  {t("checkout.deliveryDetails")}
                </h2>

                {!hasPostalCode ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {t("checkout.deliveryPostalCode")}
                      </p>
                      <Input
                        value={postalCodeDraft}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\s+/g, "");
                          setPostalCodeDraft(v);
                          if (/^\d{5}$/.test(v)) {
                            handlePostalDraftCommit(v);
                          }
                        }}
                        placeholder={t("checkout.enterPostalCode")}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
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

                    <ProfileInfoModal
                      open={postalModalOpen}
                      onOpenChange={setPostalModalOpen}
                      initialPostalCode={postalCodeDraft}
                      onProfileSaved={handleProfileSaved}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {t("checkout.addAddress")}
                        </Button>
                      }
                    />
                  </div>
                ) : !hasFullAddress ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("checkout.postalCodeLabel")}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {effectiveDelivery?.postal ?? "—"}
                        </p>
                      </div>
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
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {t("checkout.needFullAddress")}
                    </p>
                    <ProfileInfoModal
                      onProfileSaved={handleProfileSaved}
                      trigger={
                        <Button type="button" variant="outline" className="w-full">
                          {t("checkout.addAddress")}
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("checkout.postalCodeLabel")}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {effectiveDelivery?.postal ?? "—"}
                        </p>
                      </div>
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
                    </div>

                    <div className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {t("checkout.addressLabel")}
                        </p>
                        <p className="text-sm font-medium text-foreground">
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
                      <ProfileInfoModal
                        onProfileSaved={handleProfileSaved}
                        trigger={
                          <button
                            type="button"
                            className="text-xs underline underline-offset-2 text-foreground"
                          >
                            {t("checkout.change")}
                          </button>
                        }
                      />
                    </div>
                  </div>
                )}

                {hasFullAddress ? (
                  <div className="space-y-3 pt-2">
                    {isUsConditional && !hasUsState ? (
                      <p className="text-sm text-destructive">
                        {t("checkout.selectUsState")}
                      </p>
                    ) : null}
                    {zoneLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {t("checkout.updatingDelivery")}
                        </span>
                      </div>
                    ) : null}

                    {!zoneLoading && !zoneInfo.pickupZone ? (
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
                            void updateZoneInfo();
                          }}
                          disabled={zoneLoading}
                        >
                          {t("checkout.tryAgain")}
                        </Button>
                      </div>
                    ) : null}

                    {!zoneLoading && zoneInfo.zoneError === "NO_DELIVERY_ZONE" ? (
                      <p className="text-sm text-destructive mt-2">
                        {isUsConditional
                          ? zoneInfo.zoneErrorMessage?.trim() ||
                            t("checkout.noPalletAvailable")
                          : t("checkout.noDeliveryZoneYet")}
                      </p>
                    ) : null}

                    {!zoneLoading &&
                    zoneInfo.zoneError === "UNSUPPORTED_COUNTRY" ? (
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 whitespace-pre-line">
                        {browseOnlyCountryMessage}
                      </p>
                    ) : null}

                    {!zoneLoading &&
                    !zoneInfo.zoneError &&
                    !zoneInfo.deliveryZone &&
                    !zoneInfo.usingFallbackAddress &&
                    effectiveDelivery?.postal ? (
                      <p className="text-sm text-muted-foreground">
                        {t("checkout.noDeliveryZoneAddress")}
                      </p>
                    ) : null}

                    {hasProducerItems && hasZoneSelected && !zoneLoading && showPalletPicker ? (
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

                    {hasProducerItems &&
                    !hasZoneSelected &&
                    !zoneLoading &&
                    (zoneInfo.pallets?.length ?? 0) > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("checkout.noPalletSelected")}
                      </p>
                    ) : null}

                    {hasWarehouseItems && hasZoneSelected && !zoneLoading ? (
                      <p className="text-sm text-muted-foreground">
                        {t("checkout.warehouseDirectShip")}
                      </p>
                    ) : null}

                    {hasFullAddress &&
                    !zoneLoading &&
                    zoneOrUsPalletReady &&
                    selectedPallet != null ? (
                      <div className="space-y-4 border-t border-border pt-3">
                        {isUsConditional ? (
                          <p className="text-sm text-muted-foreground">
                            {t("checkout.usConditionalCopy")}
                          </p>
                        ) : (
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
                        )}

                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {t("checkout.palletProgress")}
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {t("checkout.palletProgressCount", {
                                filled: String(filledBottles),
                                total: String(totalCapacity),
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
                  </div>
                ) : null}

                {deliveryComplete ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    {t("checkout.deliveryConfirmed")}
                  </p>
                ) : null}
              </div>
            </section>

            <section
              className={cn(
                "py-6 border-b border-border last:border-0",
                !deliveryComplete && "opacity-50",
              )}
            >
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">
                  {t("checkout.payment")}
                </h2>

                {deliveryComplete ? (
                  <div className="space-y-3">
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
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="age-confirm"
                              checked={ageConfirmed}
                              onCheckedChange={(v) =>
                                handleAgeChecked(v === true)
                              }
                            />
                            <label
                              htmlFor="age-confirm"
                              className="text-sm leading-snug text-foreground"
                            >
                              {t("checkout.ageConfirm", {
                                age: String(requiredAge),
                              })}
                            </label>
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
                        {platformOpen && authChecked && !authReady ? (
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
                        {!platformOpen ? (
                        <StripePaymentSection
                          palletId={selectedPallet.id}
                          cartTotalSek={finalAmountAfterVoucher}
                          pactPointsRedeem={redeemPoints}
                          userId={profile?.id}
                          onIntentCreated={handleStripeIntentCreated}
                          onConfirmReady={handleStripeConfirmReady}
                          usConditionalPayment={isUsConditional}
                          usConditionalAck={usConditionalAck}
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
                              (!platformOpen && !stripeConfirmFn) ||
                              isSubmitting ||
                              zoneLoading ||
                              isStripeConfirming ||
                              isFinalizingReservation ||
                              !ageConfirmed ||
                              !termsAccepted ||
                              (platformOpen && !authReady) ||
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
              ) : null}
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
