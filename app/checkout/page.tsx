"use client";

import { useEffect, useMemo, useRef, useState, Suspense, useCallback } from "react";
import Link from "next/link";
import type { Cart, CartItem } from "@/lib/shopify/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ProfileInfoModal } from "@/components/checkout/profile-info-modal";
import { PaymentMethodSelectorB2B } from "@/components/checkout/payment-method-selector-b2b";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ReservationLoadingModal } from "@/components/checkout/reservation-loading-modal";
import { ProgressionBuffDisplay } from "@/components/membership/progression-buff-display";
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
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { calculateCartShippingCost } from "@/lib/shipping-calculations";
import type { PalletInfo } from "@/lib/zone-matching";
import {
  ShareBottlesDialog,
  type ShareAllocation,
} from "@/components/checkout/share-bottles-dialog";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import {
  allocatePactRedemptionPoints,
  calculateBoostAwareMaxRedemption,
} from "@/lib/membership/pact-points-redemption-math";
import { cn } from "@/lib/utils";
import type { ProducerValidation } from "@/lib/checkout-validation";

interface ProgressionBuffRow {
  buff_percentage: string;
  buff_description?: string;
  earned_at?: string;
}

/** Step 1 summary: show whole kronor with `kr` suffix (not `SEK`). */
function formatCheckoutKr(amount: number): string {
  return `${Math.round(amount)} kr`;
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

function CheckoutContent() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Payment method selection removed - payment happens when pallet fills
  const [selectedPallet, setSelectedPallet] = useState<PalletInfo | null>(null);
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<UserReward[]>([]);
  const [useRewards, setUseRewards] = useState(false);
  const checkoutCompletedRef = useRef(false);
  const checkoutPhaseRef = useRef<"delivery" | "payment_ready">("delivery");
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [postalCodeDraft, setPostalCodeDraft] = useState("");
  const postalModalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareAllocation, setShareAllocation] = useState<ShareAllocation | null>(
    null,
  );
  const [shareFriendIds, setShareFriendIds] = useState<string[] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "invoice">("card");
  const [pactPointsBalance, setPactPointsBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);

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
    pallets?: Array<{
      id: string;
      name: string;
      currentBottles: number;
      maxBottles: number;
      remainingBottles: number;
      pickupZoneName: string;
      deliveryZoneName: string;
      costCents: number;
    }>;
    usingFallbackAddress?: boolean;
  }>({ pickupZone: null, deliveryZone: null, selectedDeliveryZoneId: null });

  const formRef = useRef<HTMLFormElement | null>(null);

  const hasProfileInfo = Boolean(profile?.full_name && profile?.email);
  const hasCompleteProfileAddress = Boolean(
    profile?.address && profile?.city && profile?.postal_code,
  );

  const hasPostalCode = Boolean(profile?.postal_code && /^\d{5}$/.test(profile.postal_code.trim()));
  const hasFullAddress = hasCompleteProfileAddress;
  const hasZoneSelected = Boolean(zoneInfo.selectedDeliveryZoneId);

  const palletsLength = zoneInfo.pallets?.length ?? 0;
  const deliveryComplete = useMemo(
    () =>
      hasProfileInfo &&
      hasCompleteProfileAddress &&
      Boolean(zoneInfo.selectedDeliveryZoneId) &&
      (palletsLength === 0 || selectedPallet != null),
    [
      hasCompleteProfileAddress,
      hasProfileInfo,
      palletsLength,
      selectedPallet,
      zoneInfo.selectedDeliveryZoneId,
    ],
  );

  useEffect(() => {
    checkoutPhaseRef.current = deliveryComplete ? "payment_ready" : "delivery";
    void AnalyticsTracker.trackEvent({
      eventType: "checkout_step_viewed",
      eventCategory: "checkout",
      metadata: { phase: checkoutPhaseRef.current },
    });
  }, [deliveryComplete]);

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
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
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
    fetchProfile();
    fetchUserRewards();
    fetchProgressionBuffs(); // v2: fetch progression buffs
    fetchPactPointsBalance();

    // Check if returning from Stripe payment method setup
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment_method_added") === "true") {
      toast.success("Payment method added and selected!");
      // Clean URL and let PaymentMethodSelector auto-select the new method
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [
    fetchCart,
    fetchProfile,
    fetchUserRewards,
    fetchProgressionBuffs,
    fetchPactPointsBalance,
  ]);

  // Initial zone matching when cart and profile are loaded
  useEffect(() => {
    if (cart && cart.totalQuantity > 0 && !loading) {
      console.log("🚀 Initial zone matching triggered");
      updateZoneInfo();
    }
  }, [cart, loading]);

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
  }, [profile]);

  const updateZoneInfo = async () => {
    if (!cart || cart.totalQuantity === 0) return;

    // Prevent multiple simultaneous calls
    if (updateZoneInfo.inProgress) {
      console.log("⏳ Zone update already in progress, skipping...");
      return;
    }
    updateZoneInfo.inProgress = true;
    setZoneLoading(true);

    try {
      let deliveryAddress;
      
      if (profile && profile.address && profile.city && profile.postal_code) {
        deliveryAddress = {
          postcode: profile.postal_code || "",
          city: profile.city || "",
          countryCode:
            profile.country === "Sweden"
              ? "SE"
              : profile.country === "Norway"
                ? "NO"
                : profile.country === "Denmark"
                  ? "DK"
                  : profile.country === "Finland"
                    ? "FI"
                    : profile.country === "Germany"
                      ? "DE"
                      : profile.country === "France"
                        ? "FR"
                        : profile.country === "United Kingdom"
                          ? "GB"
                          : "",
        };
      } else {
        // No complete address - cannot determine zones
        console.log("⚠️ No complete address - cannot determine zones");
        setZoneInfo({
          ...zoneInfo,
          usingFallbackAddress: false,
          pickupZone: null,
          deliveryZone: null,
        });
        setZoneLoading(false);
        return;
      }

      const isUsingFallback = !profile?.address;

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
        const zoneData = await zoneResponse.json();
        const hasCompleteAddress =
          deliveryAddress.postcode &&
          deliveryAddress.city &&
          deliveryAddress.countryCode;

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
        let selectedDeliveryZoneId = zoneData.deliveryZoneId;
        let selectedDeliveryZoneName = zoneData.deliveryZoneName;

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
          pickupZone: zoneData.pickupZoneName,
          pickupZoneId: zoneData.pickupZoneId,
          deliveryZone: selectedDeliveryZoneName,
          selectedDeliveryZoneId: selectedDeliveryZoneId,
          availableDeliveryZones: zoneData.availableDeliveryZones || [],
          pallets: zoneData.pallets || [],
          usingFallbackAddress: isUsingFallback,
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
      updateZoneInfo.inProgress = false;
      setZoneLoading(false);
    }
  };

  const handleProfileSaved = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);

    // Check if address is complete
    const hasAddress =
      updatedProfile.address &&
      updatedProfile.city &&
      updatedProfile.postal_code;

    if (hasAddress) {
      toast.success("Saving...");
      setZoneLoading(true);
      // Wait a moment for state to update
      setTimeout(async () => {
        await updateZoneInfo();
        setZoneLoading(false);
        toast.success("Done! Delivery zone updated.");
      }, 100);
    } else {
      toast.success("Profile saved. Add delivery address to continue.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profile?.email) {
      toast.error("Please add your profile information first");
      return;
    }

    // Payment method validation removed - no payment required until pallet fills

    // Check 6-bottle validation (already validated in useEffect, this is just a safeguard)
    if (!isValidCart) {
      console.error(
        "❌ [Checkout] Cart validation failed - button should be disabled",
      );
      toast.error(
        "Please complete your order to meet the 6-bottle requirement",
      );
      return;
    }

    setIsPlacingOrder(true); // Show loading modal

    // Check if delivery zone is available
    const hasCompleteAddress =
      profile?.address && profile?.city && profile?.postal_code;
      
    if (hasCompleteAddress && !zoneInfo.selectedDeliveryZoneId) {
      setIsPlacingOrder(false);
      toast.error(
        "No delivery zone matches your address. Please contact support or try a different address.",
      );
      return;
    }

    // Check if pallet is available (should be auto-selected)
    if (zoneInfo.pallets && zoneInfo.pallets.length > 0 && !selectedPallet) {
      setIsPlacingOrder(false);
      toast.error(
        "No suitable pallet found for your location. Please contact support.",
      );
      return;
    }

    // Prepare form data
    const formData = new FormData();
    
    // Customer details
    formData.append("fullName", profile?.full_name || "");
    // Use profile email if available, otherwise we'll need to get it from auth
    formData.append("email", profile?.email || "");
    formData.append("phone", profile?.phone || "");
    
    // Payment method (only for warehouse orders)
    if (hasWarehouseItems) {
      formData.append("paymentMethodType", paymentMethod);
    }
    
    // Delivery address (always from profile)
    if (profile) {
      formData.append("street", profile.address || "");
      formData.append("postcode", profile.postal_code || "");
      formData.append("city", profile.city || "");
      formData.append(
        "countryCode",
        profile.country === "Sweden"
          ? "SE"
          : profile.country === "Norway"
            ? "NO"
            : profile.country === "Denmark"
              ? "DK"
              : profile.country === "Finland"
                ? "FI"
                : profile.country === "Germany"
                  ? "DE"
                  : profile.country === "France"
                    ? "FR"
                    : profile.country === "United Kingdom"
                      ? "GB"
                      : "",
      );
    }
    // Note: If no profile, form validation will catch missing address
    
    // Zone information
    if (zoneInfo.selectedDeliveryZoneId) {
      formData.append(
        "selectedDeliveryZoneId",
        zoneInfo.selectedDeliveryZoneId,
      );
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

        toast.success("Reservation placed successfully!");

        checkoutCompletedRef.current = true;
        window.location.href = redirectUrl || "/checkout/success";
      } else {
        setIsPlacingOrder(false); // Hide modal on error
        void AnalyticsTracker.trackEvent({
          eventType: "payment_failed",
          eventCategory: "checkout",
          metadata: { phase: "confirm", status: response.status },
        });
        const contentType = response.headers.get("content-type") || "";
        let errorMessage = "Failed to place reservation";

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
      setIsPlacingOrder(false); // Hide modal on error
      void AnalyticsTracker.trackEvent({
        eventType: "payment_failed",
        eventCategory: "checkout",
        metadata: { phase: "confirm", status: 0, network: true },
      });
      console.error("Error placing reservation:", error);
      toast.error("Failed to place reservation");
    }
    // Don't set false on success - keep showing during redirect
  };

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
          },
        )
      : null;

  const deliveryOptionShippingLabel = useMemo(() => {
    if (!shippingCost) return "—";
    if (shippingCost.totalShippingCostCents === 0) return "Free";
    return formatCheckoutKr(shippingCost.totalShippingCostCents / 100);
  }, [shippingCost]);

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
  const total =
    subtotal + (shippingCost ? shippingCost.totalShippingCostSek : 0);

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

  useEffect(() => {
    if (!Number.isFinite(maxRedemption)) return;
    if (redeemPoints > maxRedemption) {
      setRedeemPoints(maxRedemption);
    }
  }, [maxRedemption, redeemPoints]);

  // Filter available rewards (membership system - no bottle rewards anymore)
  const availableRewards: UserReward[] = [];

  const currencyCode = cart?.cost?.totalAmount?.currencyCode || "SEK";

  const orderLines: CartItem[] = cart?.lines ?? [];

  const renderCartLineRow = (line: CartItem) => {
    const totalForLine = parseFloat(line.cost.totalAmount.amount);
    const product = line.merchandise.product;
    const imgUrl = product.featuredImage?.url;
    const producerLabel =
      product.producerName || product.title;
    const showLineDiscount =
      product.hasDiscount === true &&
      typeof product.originalUnitPriceSek === "number";
    const originalLineTotal = showLineDiscount
      ? product.originalUnitPriceSek! * line.quantity
      : null;
    return (
      <div key={line.id} className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt={product.featuredImage?.altText || ""}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground leading-tight">
            {line.merchandise.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{producerLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Qty {line.quantity}
          </p>
          {line.discountLabel ? (
            <span className="mt-1 inline-flex w-fit items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {line.discountLabel}
            </span>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          {showLineDiscount && originalLineTotal !== null ? (
            <div className="flex flex-col items-end">
              <span className="text-sm text-muted-foreground line-through tabular-nums">
                {formatCheckoutKr(originalLineTotal)}
              </span>
              <span className="text-sm font-medium tabular-nums text-foreground">
                {formatCheckoutKr(totalForLine)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium tabular-nums text-foreground">
              {formatCheckoutKr(totalForLine)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const openProfileModalForPostalCode = useCallback(() => {
    // ProfileInfoModal manages its own open state; we open it by triggering its DialogTrigger.
    postalModalTriggerRef.current?.click();
  }, []);

  const handlePostalDraftCommit = useCallback(() => {
    const v = postalCodeDraft.trim();
    if (!/^\d{5}$/.test(v)) return;
    openProfileModalForPostalCode();
  }, [openProfileModalForPostalCode, postalCodeDraft]);

  const showPalletPicker = useMemo(
    () => (zoneInfo.pallets?.length ?? 0) > 1,
    [zoneInfo.pallets],
  );

  const { filledBottles, totalCapacity, fillPercent, deliveryEstimateLabel } =
    useMemo(() => {
      if (!selectedPallet) {
        return {
          filledBottles: 0,
          totalCapacity: 0,
          fillPercent: 0,
          deliveryEstimateLabel: "2-4 weeks" as const,
        };
      }
      const f = selectedPallet.currentBottles;
      const cap = selectedPallet.maxBottles;
      if (!Number.isFinite(f) || !Number.isFinite(cap) || cap <= 0) {
        return {
          filledBottles: 0,
          totalCapacity: 0,
          fillPercent: 0,
          deliveryEstimateLabel: "2-4 weeks" as const,
        };
      }
      const fp = (f / cap) * 100;
      const label: string =
        fp < 50 ? "2-4 weeks" : fp < 80 ? "1-2 weeks" : "Within 1 week";
      return {
        filledBottles: f,
        totalCapacity: cap,
        fillPercent: fp,
        deliveryEstimateLabel: label,
      };
    }, [selectedPallet]);

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
        <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
        <p className="text-gray-600">
          Your cart is empty. Please add some items before proceeding to
          checkout.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <>
      <ReservationLoadingModal open={isPlacingOrder} />
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
          <h1 className="mb-2 text-2xl font-medium text-foreground">Checkout</h1>
          <p className="text-muted-foreground">
            Review your reservation and confirm delivery details.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_400px] lg:items-start">
          <aside className="order-1 w-full min-w-0 lg:sticky lg:top-8 lg:order-2 lg:self-start">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground mb-3">
                Your order ({cart.totalQuantity}{" "}
                {cart.totalQuantity === 1 ? "bottle" : "bottles"})
              </p>
              <div className="space-y-4">
                {orderLines.map(renderCartLineRow)}
              </div>
              <div className="space-y-2 border-t border-border pt-4 mt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums text-foreground">
                    {formatCheckoutKr(bottleCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-right tabular-nums text-foreground">
                    {shippingCost ? (
                      formatCheckoutKr(
                        shippingCost.totalShippingCostCents / 100,
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        Calculated after address
                      </span>
                    )}
                  </span>
                </div>
                {redeemPoints > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      PACT Points discount
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      −{formatCheckoutKr(pactPointsSekOff)}
                    </span>
                  </div>
                ) : null}
                {progressionBuffDiscountAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Progress bonus ({totalBuffPercentage.toFixed(1)}%)
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      −{formatCheckoutKr(progressionBuffDiscountAmount)}
                    </span>
                  </div>
                ) : null}
                {useRewards && selectedRewards.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Voucher ({selectedRewards.length})
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      −{formatCheckoutKr(rewardsDiscountAmount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between pt-2 text-base font-medium text-foreground">
                  <span>Total</span>
                  <span className="tabular-nums text-foreground">
                    {formatCheckoutKr(totalAfterPactPoints)}
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
              <div className="flex gap-2">
                <Input
                  placeholder="Discount code"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  className={cn(
                    "h-9 rounded-md border border-border bg-popover pl-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground",
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {}}
                >
                  Add
                </Button>
              </div>

              {pactPointsBalance > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      Use PACT Points
                    </span>
                    <span className="text-muted-foreground">
                      {pactPointsBalance} available
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
                  {redeemPoints > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        PACT Points discount
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        −{formatCheckoutKr(pactPointsSekOff)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setRedeemPoints(0)}
                      className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
                    >
                      Use none
                    </button>
                    <button
                      type="button"
                      onClick={() => setRedeemPoints(maxRedemption)}
                      className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
                    >
                      Use all
                    </button>
                  </div>
                  {hasBoostedProducerInOrder ? (
                    <p className="mt-1 text-[11px] text-violet-700">
                      Worth 2× against boosted producers in this order
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
                onClick={() => setShareDialogOpen(true)}
              >
                <span>
                  Share bottles
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
                <h2 className="text-base font-semibold text-foreground">
                  1. Delivery
                </h2>

                {!hasPostalCode ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Delivery postal code
                      </p>
                      <Input
                        value={postalCodeDraft}
                        onChange={(e) =>
                          setPostalCodeDraft(e.target.value.replace(/\s+/g, ""))
                        }
                        placeholder="Enter your postal code"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        onBlur={handlePostalDraftCommit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handlePostalDraftCommit();
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll show your delivery options once you enter it
                      </p>
                    </div>

                    <ProfileInfoModal
                      onProfileSaved={handleProfileSaved}
                      trigger={
                        <Button
                          ref={postalModalTriggerRef}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Add address →
                        </Button>
                      }
                    />
                  </div>
                ) : !hasFullAddress ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Postal code
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {profile?.postal_code}
                        </p>
                      </div>
                      <ProfileInfoModal
                        onProfileSaved={handleProfileSaved}
                        trigger={
                          <button
                            type="button"
                            className="text-xs underline underline-offset-2 text-foreground"
                          >
                            Edit
                          </button>
                        }
                      />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      We need your full address to confirm delivery
                    </p>
                    <ProfileInfoModal
                      onProfileSaved={handleProfileSaved}
                      trigger={
                        <Button type="button" variant="outline" className="w-full">
                          Add address →
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Postal code
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {profile?.postal_code}
                        </p>
                      </div>
                      <ProfileInfoModal
                        onProfileSaved={handleProfileSaved}
                        trigger={
                          <button
                            type="button"
                            className="text-xs underline underline-offset-2 text-foreground"
                          >
                            Edit
                          </button>
                        }
                      />
                    </div>

                    <div className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium text-foreground">
                          {profile?.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {profile?.postal_code} {profile?.city}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {profile?.country || "Sweden"}
                        </p>
                      </div>
                      <ProfileInfoModal
                        onProfileSaved={handleProfileSaved}
                        trigger={
                          <button
                            type="button"
                            className="text-xs underline underline-offset-2 text-foreground"
                          >
                            Change
                          </button>
                        }
                      />
                    </div>
                  </div>
                )}

                {hasFullAddress ? (
                  <div className="space-y-3 pt-2">
                    {zoneLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Updating delivery…
                        </span>
                      </div>
                    ) : null}

                    {!zoneLoading && !zoneInfo.pickupZone ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          No pickup zone found.
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
                          Try Again
                        </Button>
                      </div>
                    ) : null}

                    {!zoneLoading &&
                    !zoneInfo.deliveryZone &&
                    !zoneInfo.usingFallbackAddress &&
                    profile?.postal_code ? (
                      <p className="text-sm text-muted-foreground">
                        No delivery zone found for your address.
                      </p>
                    ) : null}

                    {hasProducerItems && hasZoneSelected && !zoneLoading && showPalletPicker ? (
                      <div className="space-y-1.5">
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor="checkout-pallet"
                        >
                          Pallet
                        </Label>
                        <Select
                          value={selectedPallet?.id ?? ""}
                          onValueChange={handleSelectPallet}
                        >
                          <SelectTrigger
                            id="checkout-pallet"
                            className="h-9 w-full"
                          >
                            <SelectValue placeholder="Select pallet" />
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
                        No pallet selected
                      </p>
                    ) : null}

                    {hasWarehouseItems && hasZoneSelected && !zoneLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Warehouse items ship directly; no pallet required.
                      </p>
                    ) : null}

                    {hasFullAddress &&
                    !zoneLoading &&
                    Boolean(zoneInfo.selectedDeliveryZoneId) &&
                    selectedPallet != null ? (
                      <div className="space-y-4 border-t border-border pt-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">
                            Delivery options
                          </p>
                          <RadioGroup
                            value="bring"
                            className="grid gap-0"
                            aria-label="Delivery options"
                          >
                            <div className="rounded-md border border-border bg-background px-3 py-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                <RadioGroupItem
                                  value="bring"
                                  id="checkout-delivery-bring"
                                  className="mt-0.5 h-[18px] w-[18px] shrink-0 border-2 border-foreground bg-background text-foreground shadow-none data-[state=checked]:border-foreground data-[state=checked]:bg-background [&>span>svg]:h-2 [&>span>svg]:w-2 [&>span>svg]:fill-foreground [&>span>svg]:text-foreground"
                                />
                                <div className="min-w-0 flex-1">
                                  <Label
                                    htmlFor="checkout-delivery-bring"
                                    className="cursor-default text-sm font-semibold leading-tight text-foreground"
                                  >
                                    Home delivery via Bring
                                  </Label>
                                  <p className="mt-0.5 text-sm text-muted-foreground">
                                    Estimated delivery: {deliveryEstimateLabel}
                                  </p>
                                  <div className="mt-3 rounded-md border border-sky-200/80 bg-sky-50/60 px-3 py-2.5 dark:border-sky-900/40 dark:bg-sky-950/30">
                                    <p className="text-xs leading-snug text-muted-foreground">
                                      Signature and age verification required at
                                      delivery
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-row items-center gap-2.5 pl-1">
                                  <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                                    {deliveryOptionShippingLabel}
                                  </span>
                                  {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG from /public */}
                                  <img
                                    src="/bring-logo.svg"
                                    alt=""
                                    width={96}
                                    height={36}
                                    className="h-8 w-auto max-w-[120px] shrink-0 object-contain object-right"
                                    aria-hidden
                                  />
                                </div>
                              </div>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Pallet progress
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {filledBottles} of {totalCapacity} bottles
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
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {deliveryComplete ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={zoneLoading || deliveryComplete}
                    onClick={() => {}}
                  >
                    Delivery confirmed ✓
                  </Button>
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
                  2. Payment
                </h2>

                {deliveryComplete ? (
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className="space-y-3"
                  >
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

                  {hasProducerItems ? (
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground">
                        No Payment Required Yet
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll only pay when your pallet reaches 100% and is
                        ready to ship.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reserve your bottles for free. When the pallet fills
                        up, you&apos;ll receive an email with a secure payment
                        link.
                      </p>
                    </div>
                  ) : null}

                  {hasWarehouseItems && paymentMethod === "invoice" ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          Invoice payment
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your order will be processed and you&apos;ll receive an
                        invoice within 30 days.
                      </p>
                    </div>
                  ) : null}

                  {!isValidCart ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-red-200 pb-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-600">Order Blocked</p>
                          <p className="text-xs text-muted-foreground">
                            Add bottles to meet 6-bottle requirement
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {validations
                          .filter((v) => !v.isValid)
                          .map((v, i) => {
                            const href = v.groupId
                              ? `/shop/group/${v.groupId}`
                              : `/shop/${v.producerHandle}`;
                            return (
                              <Link key={i} href={href}>
                                <div className="group w-full rounded-md border border-border bg-background p-4 transition-all hover:border-foreground/20">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="mb-1.5 text-sm font-medium text-foreground">
                                        {v.groupName || v.producerName}
                                      </p>
                                      <p className="mb-2 text-xs text-muted-foreground">
                                        Current: {v.quantity} bottle
                                        {v.quantity > 1 ? "s" : ""} •
                                        <span className="font-medium text-red-600">
                                          {" "}
                                          Need {v.needed} more
                                        </span>{" "}
                                        for {v.quantity + v.needed} total
                                      </p>
                                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground group-hover:underline">
                                        Browse wines from this{" "}
                                        {v.groupId ? "group" : "producer"}
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
                  ) : (
                    <>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-base text-foreground">Total</span>
                        <span className="text-xl font-semibold tabular-nums text-foreground">
                          {formatCheckoutKr(totalAfterPactPoints)}
                        </span>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-black text-white hover:bg-black/90"
                        size="lg"
                        disabled={zoneLoading}
                      >
                        {zoneLoading ? (
                          <>
                            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                            Finding Zones…
                          </>
                        ) : (
                          "Place Reservation"
                        )}
                      </Button>
                    </>
                  )}
                </form>
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

export default function CheckoutPage() {
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
      <CheckoutContent />
    </Suspense>
  );
}
