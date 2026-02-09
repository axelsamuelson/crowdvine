"use client";

import { useEffect, useMemo, useRef, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Cart } from "@/lib/shopify/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProfileInfoModal } from "@/components/checkout/profile-info-modal";
// PaymentMethodSelector removed - using new payment flow
import { PaymentMethodSelectorB2B } from "@/components/checkout/payment-method-selector-b2b";
import { ZoneDetails } from "@/components/checkout/zone-details";
import { PalletDetails } from "@/components/checkout/pallet-details";
import { ReservationLoadingModal } from "@/components/checkout/reservation-loading-modal";
import { MemberPrice } from "@/components/ui/member-price";
import { ProgressionBuffDisplay } from "@/components/membership/progression-buff-display";
import { toast } from "sonner";
import {
  User,
  MapPin,
  CreditCard,
  Package,
  AlertCircle,
  Gift,
  Check,
  ArrowLeft,
  ArrowRight,
  FileText,
} from "lucide-react";
import { clearZoneCache } from "@/lib/zone-matching";
import {
  calculateCartShippingCost,
  formatShippingCost,
} from "@/lib/shipping-calculations";
import type { PalletInfo } from "@/lib/zone-matching";
import { AppleStickyPriceFooter } from "@/components/checkout/apple/sticky-price-footer";
import { AppleImageCarousel } from "@/components/checkout/apple/image-carousel";
import {
  ShareBottlesDialog,
  type ShareAllocation,
} from "@/components/checkout/share-bottles-dialog";

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

// PaymentMethod interface removed - using new payment flow

interface PalletInfo {
  id: string;
  name: string;
  currentBottles: number;
  maxBottles: number;
  remainingBottles: number;
  pickupZoneName: string;
  deliveryZoneName: string;
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareAllocation, setShareAllocation] = useState<ShareAllocation | null>(
    null,
  );
  const [shareFriendIds, setShareFriendIds] = useState<string[] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "invoice">("card");

  // v2: Progression buffs state
  const [progressionBuffs, setProgressionBuffs] = useState<any[]>([]);
  const [totalBuffPercentage, setTotalBuffPercentage] = useState(0);

  // 6-bottle validation state
  const [validations, setValidations] = useState<any[]>([]);
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

  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement | null>(null);

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
        setProgressionBuffs(data.buffs || []);
        const totalPercentage =
          data.buffs?.reduce(
            (sum: number, buff: any) => sum + parseFloat(buff.buff_percentage),
            0,
          ) || 0;
        setTotalBuffPercentage(totalPercentage);
      }
    } catch (error) {
      console.error("Failed to fetch progression buffs:", error);
    }
  }, []);

  useEffect(() => {
    fetchCart();
    fetchProfile();
    fetchUserRewards();
    fetchProgressionBuffs(); // v2: fetch progression buffs

    // Check if returning from Stripe payment method setup
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment_method_added") === "true") {
      toast.success("Payment method added and selected!");
      // Clean URL and let PaymentMethodSelector auto-select the new method
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [fetchCart, fetchProfile, fetchUserRewards, fetchProgressionBuffs]);

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
        setValidations(result.producerValidations || []);
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
          const data = await response.json().catch(() => null);
          redirectUrl = data?.redirectUrl || null;
        }

        toast.success("Reservation placed successfully!");
        window.location.href = redirectUrl || "/checkout/success";
      } else {
        setIsPlacingOrder(false); // Hide modal on error
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
      console.error("Error placing reservation:", error);
      toast.error("Failed to place reservation");
    }
    // Don't set false on success - keep showing during redirect
  };

  const hasProfileInfo = profile?.full_name && profile?.email;
  const hasCompleteProfileAddress =
    profile?.address && profile?.city && profile?.postal_code;
  
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

  // Separate producer and warehouse items
  const producerItems = cart?.lines?.filter(
    (line) => line.source === "producer" || !line.source
  ) || [];
  const warehouseItems = cart?.lines?.filter(
    (line) => line.source === "warehouse"
  ) || [];
  const hasProducerItems = producerItems.length > 0;
  const hasWarehouseItems = warehouseItems.length > 0;

  // Calculate bottle cost and discount
  const bottleCost = cart?.lines
    ? cart.lines.reduce((total, line) => {
        const pricePerBottle = parseFloat(
          line.merchandise.product.priceRange.minVariantPrice.amount,
        );
        return total + pricePerBottle * line.quantity;
      }, 0)
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

  // Filter available rewards (membership system - no bottle rewards anymore)
  const availableRewards: UserReward[] = [];

  const currencyCode = cart?.cost?.totalAmount?.currencyCode || "SEK";

  const carouselImages = useMemo(() => {
    if (!cart?.lines?.length) return [];
    const urls = cart.lines
      .map((line) => line.merchandise.product?.featuredImage?.url)
      .filter(Boolean) as string[];
    return Array.from(new Set(urls)).slice(0, 6);
  }, [cart?.lines]);

  const stickyLines = useMemo(() => {
    const lines: Array<{ label: string; value: string; subtle?: boolean; accent?: boolean }> = [];
    lines.push({
      label: "Bottles",
      value: `${Math.round(bottleCost)} ${currencyCode}`,
    });
    lines.push({
      label: "Shipping",
      value: shippingCost
        ? formatShippingCost(shippingCost.totalShippingCostCents)
        : "No pallet selected",
      subtle: !shippingCost,
    });
    if (progressionBuffDiscountAmount > 0) {
      lines.push({
        label: `Progress bonus (${totalBuffPercentage.toFixed(1)}%)`,
        value: `-${Math.round(progressionBuffDiscountAmount)} ${currencyCode}`,
        accent: true,
      });
    }
    if (useRewards && selectedRewards.length > 0 && rewardsDiscountAmount > 0) {
      lines.push({
        label: `Rewards (${selectedRewards.length})`,
        value: `-${Math.round(rewardsDiscountAmount)} ${currencyCode}`,
      });
    }
    return lines;
  }, [
    bottleCost,
    currencyCode,
    formatShippingCost,
    progressionBuffDiscountAmount,
    rewardsDiscountAmount,
    selectedRewards.length,
    shippingCost,
    totalBuffPercentage,
    useRewards,
  ]);

  useEffect(() => {
    // Add padding so the mobile sticky footer doesn't cover the final CTA
    document.body.style.paddingBottom = "96px";
    return () => {
      document.body.style.paddingBottom = "0";
    };
  }, []);

  const canProceedToPayment = useCallback(() => {
    if (!hasProfileInfo) {
      toast.error("Please add your customer information first.");
      return false;
    }
    if (!hasCompleteProfileAddress) {
      toast.error("Please add a delivery address first.");
      return false;
    }
    if (!zoneInfo.selectedDeliveryZoneId) {
      toast.error(
        "No delivery zone matches your address. Please contact support or try a different address.",
      );
      return false;
    }
    if (zoneInfo.pallets && zoneInfo.pallets.length > 0 && !selectedPallet) {
      toast.error(
        "No suitable pallet found for your location. Please contact support.",
      );
      return false;
    }
    return true;
  }, [
    hasCompleteProfileAddress,
    hasProfileInfo,
    selectedPallet,
    zoneInfo.pallets,
    zoneInfo.selectedDeliveryZoneId,
  ]);

  const goToStep = useCallback(
    (nextStep: 1 | 2 | 3) => {
      // Always allow going backwards
      if (nextStep <= step) {
        setStep(nextStep);
        return;
      }

      // Forward guards
      if (step === 1 && nextStep === 2) {
        setStep(2);
        return;
      }
      if (step === 2 && nextStep === 3) {
        if (zoneLoading) return;
        if (!canProceedToPayment()) return;
        setStep(3);
      }
    },
    [canProceedToPayment, step, zoneLoading],
  );

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

    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-500">
            Review your reservation and confirm delivery details.
          </p>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:justify-between md:gap-3">
          {[
            { n: 1 as const, title: "Bottles" },
            { n: 2 as const, title: "Delivery" },
            { n: 3 as const, title: "Payment" },
          ].map((s) => {
            const isActive = step === s.n;
            const isComplete = step > s.n;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => goToStep(s.n)}
                className={[
                  "w-full min-w-0 rounded-2xl border px-3 py-2 text-left transition-colors md:flex-1 md:px-4 md:py-3",
                  isActive
                    ? "border-gray-900 bg-white"
                    : "border-gray-200 bg-white/60 hover:bg-white",
                ].join(" ")}
                aria-current={isActive ? "step" : undefined}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                      isComplete
                        ? "bg-gray-900 text-white"
                        : isActive
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600",
                    ].join(" ")}
                  >
                    {s.n}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {s.title}
                    </div>
                    <div className="hidden md:block text-xs text-gray-500 truncate">
                      {s.n === 1
                        ? "Review items"
                        : s.n === 2
                          ? "Address, zones, pallet"
                          : "Confirm & reserve"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {step > 1 && (
          <div className="hidden lg:flex items-center justify-start">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => goToStep((step - 1) as 1 | 2 | 3)}
              className="px-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column */}
          <div
            className={[
              "space-y-6",
              step === 1 ? "lg:col-span-2" : "",
            ].join(" ")}
          >
            {progressionBuffs.length > 0 && (
              <ProgressionBuffDisplay
                totalBuffPercentage={totalBuffPercentage}
                buffDetails={progressionBuffs.map((buff) => ({
                  percentage: buff.buff_percentage,
                  description: buff.buff_description,
                  earnedAt: buff.earned_at,
                }))}
                expiresOnUse={true}
                compact={false}
              />
            )}

            {/* Step 1: Bottles */}
            {(step === 1 || step === 3) && (
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left: Image */}
                  <div className="md:sticky md:top-6">
                    <AppleImageCarousel
                      images={carouselImages}
                      alt="Your reservation"
                    />
                  </div>

                  {/* Right: Text */}
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <h2 className="text-2xl font-medium text-gray-900">
                          Your bottles
                        </h2>
                        <p className="text-gray-500">
                          {cart?.totalQuantity} bottle
                          {cart?.totalQuantity === 1 ? "" : "s"} reserved
                        </p>
                      </div>
                    </div>

                    {/* Producer Items */}
                    {hasProducerItems && (
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                            Producer Order
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Will be placed on a pallet
                          </span>
                        </div>
                        {producerItems.map((line) => {
                          const pricePerBottle = parseFloat(
                            line.merchandise.product.priceRange.minVariantPrice
                              .amount,
                          );
                          const totalForLine = pricePerBottle * line.quantity;

                          return (
                            <div
                              key={line.id}
                              className="flex justify-between text-sm gap-4 pl-2 border-l-2 border-blue-200"
                            >
                              <span className="text-gray-600 min-w-0 truncate">
                                {line.merchandise.title} × {line.quantity}
                              </span>
                              <MemberPrice
                                amount={totalForLine}
                                currencyCode={
                                  line.merchandise.product.priceRange
                                    .minVariantPrice.currencyCode
                                }
                                className="text-gray-900 font-medium text-sm whitespace-nowrap"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Warehouse Items */}
                    {hasWarehouseItems && (
                      <div className="space-y-3">
                        {hasProducerItems && <div className="border-t border-gray-200 pt-3 mt-3" />}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                            Warehouse Order
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Direct delivery from warehouse
                          </span>
                        </div>
                        {warehouseItems.map((line) => {
                          const pricePerBottle = parseFloat(
                            line.merchandise.product.priceRange.minVariantPrice
                              .amount,
                          );
                          const totalForLine = pricePerBottle * line.quantity;

                          return (
                            <div
                              key={line.id}
                              className="flex justify-between text-sm gap-4 pl-2 border-l-2 border-green-200"
                            >
                              <span className="text-gray-600 min-w-0 truncate">
                                {line.merchandise.title} × {line.quantity}
                              </span>
                              <MemberPrice
                                amount={totalForLine}
                                currencyCode={
                                  line.merchandise.product.priceRange
                                    .minVariantPrice.currencyCode
                                }
                                className="text-gray-900 font-medium text-sm whitespace-nowrap"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Shipping</span>
                        <span className="font-medium text-gray-900">
                          {shippingCost ? (
                            formatShippingCost(
                              shippingCost.totalShippingCostCents,
                            )
                          ) : (
                            <span className="text-gray-400">
                              No pallet selected
                            </span>
                          )}
                        </span>
                      </div>

                      {progressionBuffDiscountAmount > 0 && (
                        <div className="flex justify-between mb-2">
                          <span className="text-amber-700">
                            Progress bonus ({totalBuffPercentage.toFixed(1)}%)
                          </span>
                          <span className="font-medium text-amber-700">
                            -{Math.round(progressionBuffDiscountAmount)}{" "}
                            {currencyCode}
                          </span>
                        </div>
                      )}

                      {useRewards && selectedRewards.length > 0 && (
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-500">
                            Rewards ({selectedRewards.length})
                          </span>
                          <span className="font-medium text-gray-900">
                            -{Math.round(rewardsDiscountAmount)} {currencyCode}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-2">
                        <span className="text-lg font-medium">Total</span>
                        <span className="text-xl font-medium">
                          {Math.round(total)} {currencyCode}
                        </span>
                      </div>

                      {step === 1 && (
                        <div className="pt-6">
                          <div className="flex justify-end gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="lg"
                              className="rounded-full px-8"
                              disabled={zoneLoading}
                              onClick={() => setShareDialogOpen(true)}
                            >
                              Share bottles
                            </Button>
                            <Button
                              type="button"
                              size="lg"
                              className="hidden lg:inline-flex bg-black hover:bg-black/90 text-white rounded-full px-10"
                              disabled={zoneLoading}
                              onClick={() => goToStep(2)}
                            >
                              Next
                            </Button>
                          </div>
                          {shareFriendIds && shareFriendIds.length > 0 && (
                            <p className="text-xs text-gray-500 mt-3 text-right">
                              Sharing set up with {shareFriendIds.length}{" "}
                              {shareFriendIds.length === 1
                                ? "friend"
                                : "friends"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 2: Delivery */}
            {step === 2 && (
              <div className="grid grid-cols-1 gap-6">
                {/* Customer info */}
                <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Customer information
                  </h3>
                  {!hasProfileInfo ? (
                    <div className="text-center py-4">
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        Profile information missing
                      </p>
                      <ProfileInfoModal onProfileSaved={handleProfileSaved} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{profile.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4" />
                        <span className="text-gray-600">{profile.email}</span>
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4" />
                          <span className="text-gray-600">{profile.phone}</span>
                        </div>
                      )}
                      <ProfileInfoModal
                        onProfileSaved={handleProfileSaved}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            type="button"
                          >
                            Edit Profile
                          </Button>
                        }
                      />
                    </div>
                  )}
                </Card>

                {/* Delivery address */}
                <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Delivery Address
                  </h3>
                  {!hasCompleteProfileAddress ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        Add delivery address
                      </h4>
                      <p className="text-xs text-gray-600 mb-4">
                        Address required to continue
                      </p>
                      <ProfileInfoModal onProfileSaved={handleProfileSaved} />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.address}
                        </p>
                        <p className="text-xs text-gray-600">
                          {profile?.postal_code} {profile?.city}
                        </p>
                        <p className="text-xs text-gray-600">
                          {profile?.country || "Sweden"}
                        </p>
                      </div>
                      <ProfileInfoModal
                        onProfileSaved={handleProfileSaved}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            type="button"
                          >
                            Change
                          </Button>
                        }
                      />
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className={step === 1 ? "hidden" : "space-y-6"}>
            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {step === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Delivery zones
                    </h3>

                  {zoneLoading && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                        <span className="text-sm text-gray-600">
                          Updating delivery zone...
                        </span>
                      </div>
                    </div>
                  )}

                  {!hasCompleteProfileAddress && !zoneLoading && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                      <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Add delivery address to continue.
                      </p>
                    </div>
                  )}

                  {zoneInfo.pickupZone ? (
                    <ZoneDetails
                      zoneId={zoneInfo.pickupZoneId || ""}
                      zoneName={zoneInfo.pickupZone}
                      zoneType="pickup"
                    />
                  ) : !zoneLoading && hasCompleteProfileAddress ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        No pickup zone found.
                      </p>
                      <p className="text-xs text-gray-500">
                        Producer missing pickup zone. Contact support.
                      </p>
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => {
                            clearZoneCache();
                            updateZoneInfo();
                          }}
                          disabled={zoneLoading}
                          className="text-xs"
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {zoneInfo.deliveryZone ? (
                    <ZoneDetails
                      zoneId={zoneInfo.selectedDeliveryZoneId || ""}
                      zoneName={zoneInfo.deliveryZone}
                      zoneType="delivery"
                      centerLat={
                        zoneInfo.availableDeliveryZones?.find(
                          (z) => z.id === zoneInfo.selectedDeliveryZoneId,
                        )?.centerLat
                      }
                      centerLon={
                        zoneInfo.availableDeliveryZones?.find(
                          (z) => z.id === zoneInfo.selectedDeliveryZoneId,
                        )?.centerLon
                      }
                      radiusKm={
                        zoneInfo.availableDeliveryZones?.find(
                          (z) => z.id === zoneInfo.selectedDeliveryZoneId,
                        )?.radiusKm
                      }
                    />
                  ) : !zoneLoading &&
                    !zoneInfo.usingFallbackAddress &&
                    profile?.address &&
                    profile?.city &&
                    profile?.postal_code ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        No delivery zone found for your address.
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Contact support for help.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          clearZoneCache();
                          updateZoneInfo();
                        }}
                        disabled={zoneLoading}
                        className="text-xs"
                        type="button"
                      >
                        {zoneLoading ? "Updating..." : "Try Again"}
                      </Button>
                    </div>
                  ) : null}
                  </div>
                )}

                {step === 2 && <div className="border-t border-gray-200" />}

                {step === 2 && (
                  <div className="space-y-4">
                    {hasProducerItems && (
                      <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Selected pallet
                        </h3>
                        <div className="text-xs text-gray-500 mb-2">
                          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 mr-2">
                            Producer Order
                          </Badge>
                          Producer orders will be placed on a pallet
                        </div>
                      </>
                    )}
                    {hasWarehouseItems && !hasProducerItems && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700">
                            Warehouse Order
                          </Badge>
                        </div>
                        <p className="text-sm text-green-800">
                          This is a warehouse order. Items will be delivered directly from the warehouse, no pallet required.
                        </p>
                      </div>
                    )}
                    {hasProducerItems && (
                      <>

                  {zoneLoading ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                        <span className="text-sm text-gray-600">
                          Looking for a pallet...
                        </span>
                      </div>
                    </div>
                  ) : zoneInfo.pallets && zoneInfo.pallets.length > 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      {selectedPallet ? (
                        <PalletDetails pallet={selectedPallet} />
                      ) : (
                        <p className="text-sm text-gray-600">
                          No pallet selected
                        </p>
                      )}
                    </div>
                  ) : !zoneLoading &&
                    hasCompleteProfileAddress &&
                    zoneInfo.pickupZone &&
                    zoneInfo.deliveryZone ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        No pallet found for this route.
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        Route: {zoneInfo.pickupZone} → {zoneInfo.deliveryZone}
                      </p>
                      <p className="text-xs text-gray-500">
                        A new pallet should have been created automatically.
                        Contact support if the issue persists.
                      </p>
                    </div>
                  ) : null}
                      </>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="pt-2">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="lg"
                        className="hidden lg:inline-flex bg-black hover:bg-black/90 text-white rounded-full px-10"
                        disabled={zoneLoading}
                        onClick={() => goToStep(3)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

              {/* Rewards Toggle */}
              {availableRewards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Use Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                          id="useRewardsYes"
                          checked={useRewards}
                        onCheckedChange={(checked) => {
                            setUseRewards(checked as boolean);
                            if (!checked) {
                              setSelectedRewards([]);
                            }
                          }}
                        />
                        <Label
                          htmlFor="useRewardsYes"
                          className="text-sm font-medium"
                        >
                          Yes, use my rewards ({availableRewards.length}{" "}
                          available)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                          id="useRewardsNo"
                          checked={!useRewards}
                        onCheckedChange={(checked) => {
                            setUseRewards(!checked as boolean);
                            if (checked) {
                              setSelectedRewards([]);
                            }
                          }}
                        />
                        <Label
                          htmlFor="useRewardsNo"
                          className="text-sm font-medium"
                        >
                          No, don't use rewards
                      </Label>
                    </div>
                  </div>

                    {/* Rewards Selection - Only show when useRewards is true */}
                    {useRewards && (
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            Select Rewards
                          </h4>
                          {selectedRewards.length > 0 && (
                            <span className="text-sm font-medium text-gray-600">
                              {selectedRewards.length} selected
                            </span>
                          )}
                  </div>
                        <div className="grid grid-cols-2 gap-2">
                          {availableRewards.map((reward) => (
                            <div
                              key={reward.id}
                              className={`border rounded-lg p-2 cursor-pointer transition-colors ${
                                selectedRewards.some((r) => r.id === reward.id)
                                  ? "border-gray-600 bg-gray-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() => {
                                const isSelected = selectedRewards.some(
                                  (r) => r.id === reward.id,
                                );
                                if (isSelected) {
                                  setSelectedRewards(
                                    selectedRewards.filter(
                                      (r) => r.id !== reward.id,
                                    ),
                                  );
                                } else {
                                  setSelectedRewards([
                                    ...selectedRewards,
                                    reward,
                                  ]);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    selectedRewards.some(
                                      (r) => r.id === reward.id,
                                    )
                                      ? "border-gray-600 bg-gray-600"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {selectedRewards.some(
                                    (r) => r.id === reward.id,
                                  ) && (
                                    <Check className="w-1.5 h-1.5 text-white" />
                                  )}
                    </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {reward.bottles}b @{" "}
                                    {reward.discount_percentage}%
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {reward.friend_email}
                                  </p>
                      </div>
                      </div>
                    </div>
                          ))}
                    </div>
                        {selectedRewards.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-600">
                              <strong>
                                {selectedRewards.length} reward
                                {selectedRewards.length > 1 ? "s" : ""}
                              </strong>{" "}
                              selected for a total discount of{" "}
                              <strong>{Math.round(discountAmount)} SEK</strong>
                            </p>
                          </div>
                        )}
                  </div>
                )}
              </CardContent>
            </Card>
              )}

                {step === 3 && <div className="border-t border-gray-200" />}

                {step === 3 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Payment
                    </h3>
                    
                    {hasWarehouseItems && (
                      <div className="mb-6">
                        <PaymentMethodSelectorB2B
                          onPaymentMethodSelected={setPaymentMethod}
                          selectedMethod={paymentMethod}
                          hasWarehouseItems={hasWarehouseItems}
                          hasProducerItems={hasProducerItems}
                        />
                      </div>
                    )}

                    {hasProducerItems && (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No Payment Required Yet
                        </h3>
                        <p className="text-gray-600 mb-4">
                          You'll only pay when your pallet reaches 100% and is ready
                          to ship.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>How it works:</strong>
                            <br />
                            • Reserve your bottles for free
                            <br />
                            • When the pallet fills up, you'll receive an email
                            <br />
                            • Complete payment via secure link
                            <br />• Your wine ships to the pickup location
                          </p>
                        </div>
                      </div>
                    )}

                    {hasWarehouseItems && paymentMethod === "invoice" && (
                      <div className="mt-4 text-center py-6 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Invoice Payment
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Your order will be processed and you'll receive an invoice
                          within 30 days.
                        </p>
                        <div className="bg-white border border-amber-200 rounded-lg p-4">
                          <p className="text-sm text-amber-800">
                            <strong>Terms:</strong>
                            <br />
                            • Payment due within 30 days
                            <br />
                            • Direct delivery from warehouse
                            <br />
                            • No pallet required
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Submit Button or Validation Warning */}
              {step === 3 && !isValidCart ? (
                <div className="space-y-4">
                  {/* Header - Clear blocked state */}
                  <div className="flex items-center gap-2 pb-2 border-b border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-600">
                        Order Blocked
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add bottles to meet 6-bottle requirement
                      </p>
                    </div>
                  </div>

                  {/* Action cards per producer */}
                  <div className="space-y-2">
                    {validations
                      .filter((v) => !v.isValid)
                      .map((v, i) => {
                        const href = v.groupId
                          ? `/shop/group/${v.groupId}`
                          : `/shop/${v.producerHandle}`;

                        return (
                          <Link key={i} href={href}>
                            <div className="w-full p-4 bg-background border border-border hover:border-foreground/20 rounded-md transition-all group">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground mb-1.5">
                                    {v.groupName || v.producerName}
                                  </p>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Current: {v.quantity} bottle
                                    {v.quantity > 1 ? "s" : ""} •
                                    <span className="text-red-600 font-medium">
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
              ) : step === 3 ? (
            <Button
              type="submit"
                  className="w-full bg-black hover:bg-black/90 text-white border-black rounded-full"
              size="lg"
                  disabled={zoneLoading}
                >
                  {zoneLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Finding Zones...
                    </>
                  ) : (
                    "Place Reservation"
                  )}
            </Button>
              ) : null}
              </form>
            </Card>
          </div>
        </div>
      </div>
    </main>

    <AppleStickyPriceFooter
      totalLabel="Total"
      totalValue={`${Math.round(total)} ${currencyCode}`}
      lines={stickyLines}
      ctaLabel={
        step === 1
          ? "Continue"
          : step === 2
            ? "Continue to payment"
            : !isValidCart
              ? "Fix order"
              : "Place reservation"
      }
      showPrevious={step > 1}
      previousLabel="Previous"
      onPrevious={() => goToStep((step - 1) as 1 | 2 | 3)}
      disabled={
        zoneLoading || (step === 3 && !isValidCart) || (step === 2 && zoneLoading)
      }
      onCheckout={() => {
        if (step === 1) return goToStep(2);
        if (step === 2) return goToStep(3);
        return formRef.current?.requestSubmit();
      }}
    />
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
