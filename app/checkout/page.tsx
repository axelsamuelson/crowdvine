"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
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
import { PaymentMethodSelector } from "@/components/checkout/payment-method-selector";
import { ZoneDetails } from "@/components/checkout/zone-details";
import { PalletDetails } from "@/components/checkout/pallet-details";
import { ReservationLoadingModal } from "@/components/checkout/reservation-loading-modal";
import { MemberPrice } from "@/components/ui/member-price";
import { ProgressionBuffDisplay } from "@/components/membership/progression-buff-display";
import { toast } from "sonner";
import { User, MapPin, CreditCard, Package, AlertCircle, Gift, Check } from "lucide-react";
import { clearZoneCache } from "@/lib/zone-matching";
import {
  calculateCartShippingCost,
  formatShippingCost,
} from "@/lib/shipping-calculations";
import type { PalletInfo } from "@/lib/zone-matching";

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

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  last4?: string;
  brand?: string;
  is_default: boolean;
  expiry_month?: number;
  expiry_year?: number;
}

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
  type: 'account_created' | 'reservation_made';
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [selectedPallet, setSelectedPallet] = useState<PalletInfo | null>(null);
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<UserReward[]>([]);
  const [useRewards, setUseRewards] = useState(false);
  
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

  // Define all fetch functions BEFORE useEffects to avoid hoisting issues
  const fetchCart = useCallback(async () => {
    try {
      console.log("🔄 [Checkout] Fetching cart...");
      const response = await fetch("/api/crowdvine/cart");
      if (response.ok) {
        const cartData = await response.json();
        console.log("✅ [Checkout] Cart updated:", {
          totalQuantity: cartData.totalQuantity,
          items: cartData.lines?.length || 0
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
        const totalPercentage = data.buffs?.reduce((sum: number, buff: any) => sum + parseFloat(buff.buff_percentage), 0) || 0;
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
      toast.success("Betalningsmetod tillagd och vald!");
      // Clean URL and let PaymentMethodSelector auto-select the new method
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
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
        console.log("🔍 [Checkout] Validating cart with", cart.totalQuantity, "bottles");
        const response = await fetch("/api/cart/validate");
        const result = await response.json();
        console.log("✅ [Checkout] Validation complete:", {
          isValid: result.isValid,
          validations: result.producerValidations?.length || 0
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
        
        if (zoneData.availableDeliveryZones && zoneData.availableDeliveryZones.length > 0) {
          // Sort by radius (smallest first) to get the most specific zone
          const sortedZones = [...zoneData.availableDeliveryZones].sort((a, b) => a.radiusKm - b.radiusKm);
          selectedDeliveryZoneId = sortedZones[0].id;
          selectedDeliveryZoneName = sortedZones[0].name;
          console.log(`🎯 Auto-selected delivery zone: ${selectedDeliveryZoneName} (${sortedZones[0].radiusKm}km radius)`);
        }

        // Auto-select the pallet with the most reserved bottles
        let autoSelectedPallet = null;
        if (zoneData.pallets && zoneData.pallets.length > 0) {
          // Sort by current bottles (most reserved first)
          const sortedPallets = [...zoneData.pallets].sort((a, b) => b.currentBottles - a.currentBottles);
          autoSelectedPallet = sortedPallets[0];
          console.log(`🎯 Auto-selected pallet: ${autoSelectedPallet.name} (${autoSelectedPallet.currentBottles} bottles reserved)`);
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
    const hasAddress = updatedProfile.address && 
                       updatedProfile.city && 
                       updatedProfile.postal_code;
    
    if (hasAddress) {
      toast.success("Sparar...");
      setZoneLoading(true);
      // Wait a moment for state to update
      setTimeout(async () => {
        await updateZoneInfo();
        setZoneLoading(false);
        toast.success("Klart! Leveranszon uppdaterad.");
      }, 100);
    } else {
      toast.success("Profil sparad. Lägg till adress för att fortsätta.");
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!profile?.email) {
      toast.error("Please add your profile information first");
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Check 6-bottle validation (already validated in useEffect, this is just a safeguard)
    if (!isValidCart) {
      console.error("❌ [Checkout] Cart validation failed - button should be disabled");
      toast.error("Please complete your order to meet the 6-bottle requirement");
      return;
    }

    setIsPlacingOrder(true); // Show loading modal

    // Check if delivery zone is available
    const hasCompleteAddress = profile?.address && profile?.city && profile?.postal_code;

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
      toast.error("No suitable pallet found for your location. Please contact support.");
      return;
    }

    // Prepare form data
    const formData = new FormData();

    // Customer details
    formData.append("fullName", profile?.full_name || "");
    // Use profile email if available, otherwise we'll need to get it from auth
    formData.append("email", profile?.email || "");
    formData.append("phone", profile?.phone || "");

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

    // Payment method
    formData.append("paymentMethodId", selectedPaymentMethod.id);

    // User rewards
    if (useRewards) {
      selectedRewards.forEach((reward, index) => {
        formData.append(`rewardId_${index}`, reward.id);
      });
    }

    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Keep modal open during redirect
        toast.success("Reservation placed successfully!");
        window.location.href = "/checkout/success";
      } else {
        setIsPlacingOrder(false); // Hide modal on error
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to place reservation");
      }
    } catch (error) {
      setIsPlacingOrder(false); // Hide modal on error
      console.error("Error placing reservation:", error);
      toast.error("Failed to place reservation");
    }
    // Don't set false on success - keep showing during redirect
  };

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

  const hasProfileInfo = profile?.full_name && profile?.email;
  const hasCompleteProfileAddress =
    profile?.address && profile?.city && profile?.postal_code;

  // Calculate shipping cost
  const shippingCost = selectedPallet && cart?.lines
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

  // Calculate bottle cost and discount
  const bottleCost = cart?.lines ? cart.lines.reduce((total, line) => {
    const pricePerBottle = parseFloat(line.merchandise.product.priceRange.minVariantPrice.amount);
    return total + (pricePerBottle * line.quantity);
  }, 0) : 0;

  // Old rewards discount (being deprecated)
  const rewardsDiscountAmount = useRewards ? selectedRewards.reduce((total, reward) => {
    return total + (bottleCost * reward.discount_percentage) / 100;
  }, 0) : 0;
  
  // v2: Progression buff discount
  const progressionBuffDiscountAmount = totalBuffPercentage > 0 
    ? (bottleCost * totalBuffPercentage) / 100 
    : 0;
  
  // Total discount from both sources
  const discountAmount = rewardsDiscountAmount + progressionBuffDiscountAmount;

  const subtotal = bottleCost - discountAmount;
  const total = subtotal + (shippingCost ? shippingCost.totalShippingCostSek : 0);

  // Filter available rewards (membership system - no bottle rewards anymore)
  const availableRewards: UserReward[] = [];

  return (
    <>
      <ReservationLoadingModal open={isPlacingOrder} />
      
      <div className="max-w-4xl mx-auto p-6 pt-top-spacing space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600 mt-2">Complete your wine reservation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Order Summary */}
        <div className="space-y-6">
          {/* Progression Buff Display (v2) */}
          {progressionBuffs.length > 0 && (
            <ProgressionBuffDisplay
              totalBuffPercentage={totalBuffPercentage}
              buffDetails={progressionBuffs.map(buff => ({
                percentage: buff.buff_percentage,
                description: buff.buff_description,
                earnedAt: buff.earned_at,
              }))}
              expiresOnUse={true}
              compact={false}
            />
          )}
          
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-900">
                Ordersammanfattning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cart?.lines?.map((line) => {
                  // Get price per bottle from product priceRange
                  const pricePerBottle = parseFloat(line.merchandise.product.priceRange.minVariantPrice.amount);
                  const totalForLine = pricePerBottle * line.quantity;
                  
                  return (
                    <div
                      key={line.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {line.merchandise.title} × {line.quantity}
                      </span>
                      <MemberPrice
                        amount={totalForLine}
                        currencyCode={line.merchandise.product.priceRange.minVariantPrice.currencyCode}
                        className="text-gray-900 font-medium text-sm"
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t border-gray-200 my-3"></div>
              
              <div className="space-y-3">
                {/* Shipping Cost */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frakt</span>
                  <span className="text-gray-900 font-medium">
                    {shippingCost ? (
                      formatShippingCost(shippingCost.totalShippingCostCents)
                    ) : (
                      <span className="text-gray-400">Ingen pall vald</span>
                    )}
                  </span>
                </div>

                {/* Discount (old rewards) */}
                {useRewards && selectedRewards.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rabatt ({selectedRewards.length} belöningar)</span>
                    <span className="text-gray-900 font-medium">
                      -{Math.round(rewardsDiscountAmount)}{" "}
                      {cart.cost.totalAmount.currencyCode}
                    </span>
                  </div>
                )}
                
                {/* Progression buff discount (v2) */}
                {progressionBuffDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 font-medium">Progress bonus ({totalBuffPercentage.toFixed(1)}%)</span>
                    <span className="text-amber-700 font-semibold">
                      -{Math.round(progressionBuffDiscountAmount)}{" "}
                      {cart.cost.totalAmount.currencyCode}
                    </span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delsumma</span>
                  <span className="text-gray-900 font-medium">
                    {Math.round(subtotal)}{" "}
                    {cart.cost.totalAmount.currencyCode}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 my-3"></div>

              {/* Total */}
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <span>Totalt</span>
                <span>
                  {Math.round(total)}{" "}
                  {cart.cost.totalAmount.currencyCode}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                Leveransadress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCompleteProfileAddress ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Lägg till leveransadress
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Adress krävs för att fortsätta
                  </p>
                  <ProfileInfoModal onProfileSaved={handleProfileSaved} />
                </div>
              ) : (
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">{profile?.address}</p>
                    <p className="text-xs text-gray-600">
                      {profile?.postal_code} {profile?.city}
                    </p>
                    <p className="text-xs text-gray-600">{profile?.country || 'Sweden'}</p>
                  </div>
                  <ProfileInfoModal
                    onProfileSaved={handleProfileSaved}
                    trigger={
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                      >
                        Ändra
                      </Button>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zone Information */}
          <div className="space-y-4">
            {/* Zone Loading Indicator */}
            {zoneLoading && (
              <Card className="border border-gray-200">
                <CardContent className="py-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    <span className="text-sm text-gray-600">Uppdaterar leveranszon...</span>
                  </div>
                </CardContent>
              </Card>
            )}
              {/* No Address Message */}
              {!hasCompleteProfileAddress && !zoneLoading && (
                <Card className="border border-gray-200">
                  <CardContent className="py-6">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Lägg till leveransadress för att fortsätta.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pickup Zone */}
              {zoneInfo.pickupZone ? (
                <ZoneDetails
                  zoneId={zoneInfo.pickupZoneId || ""}
                  zoneName={zoneInfo.pickupZone}
                  zoneType="pickup"
                />
              ) : !zoneLoading && hasCompleteProfileAddress ? (
                <Card className="border border-gray-200">
                  <CardContent className="py-6 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Ingen upphämtningszon hittades.
                    </p>
                    <p className="text-xs text-gray-500">
                      Producenten saknar upphämtningszon. Kontakta support.
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              {/* Delivery Zone */}
              {zoneInfo.deliveryZone ? (
                <ZoneDetails
                  zoneId={zoneInfo.selectedDeliveryZoneId || ""}
                  zoneName={zoneInfo.deliveryZone}
                  zoneType="delivery"
                  centerLat={zoneInfo.availableDeliveryZones?.find(
                    (z) => z.id === zoneInfo.selectedDeliveryZoneId
                  )?.centerLat}
                  centerLon={zoneInfo.availableDeliveryZones?.find(
                    (z) => z.id === zoneInfo.selectedDeliveryZoneId
                  )?.centerLon}
                  radiusKm={zoneInfo.availableDeliveryZones?.find(
                    (z) => z.id === zoneInfo.selectedDeliveryZoneId
                  )?.radiusKm}
                />
              ) : !zoneLoading && !zoneInfo.usingFallbackAddress && 
                profile?.address && profile?.city && profile?.postal_code ? (
                <Card className="border border-gray-200">
                  <CardContent className="py-6 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Ingen leveranszon hittades för din adress.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Kontakta support för hjälp.
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
                    >
                      {zoneLoading ? "Uppdaterar..." : "Försök igen"}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
          </div>

          {/* Pallet Information */}
          {(() => {
            console.log("🚚 Pallet visibility check:", {
              hasPallets: zoneInfo.pallets && zoneInfo.pallets.length > 0,
              palletsCount: zoneInfo.pallets?.length || 0,
              pallets: zoneInfo.pallets,
              zoneLoading,
              hasPickupZone: !!zoneInfo.pickupZone,
              hasDeliveryZone: !!zoneInfo.deliveryZone,
              shouldShow: (zoneInfo.pallets && zoneInfo.pallets.length > 0) || zoneLoading,
            });
            return null;
          })()}
          
          {/* Show pallet if we have pallets or loading */}
          {zoneLoading ? (
            <Card className="border border-gray-200">
              <CardContent className="py-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                  <span className="text-sm text-gray-600">Söker efter pall...</span>
                </div>
              </CardContent>
            </Card>
          ) : (zoneInfo.pallets && zoneInfo.pallets.length > 0) ? (
            <Card className="border border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-600" />
                  Vald Pall
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPallet ? (
                  <PalletDetails pallet={selectedPallet} />
                ) : (
                  <p className="text-sm text-gray-600">Ingen pall vald</p>
                )}
              </CardContent>
            </Card>
          ) : !zoneLoading && hasCompleteProfileAddress && zoneInfo.pickupZone && zoneInfo.deliveryZone ? (
            <Card className="border border-gray-200">
              <CardContent className="py-6 text-center">
                <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Ingen pall hittades för denna rutt.
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Rutt: {zoneInfo.pickupZone} → {zoneInfo.deliveryZone}
                </p>
                <p className="text-xs text-gray-500">
                  En ny pall borde ha skapats automatiskt. Kontakta support om problemet kvarstår.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right Column - Checkout Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      <span className="w-4 h-4"></span>
                      <span className="text-gray-600">{profile.email}</span>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4"></span>
                        <span className="text-gray-600">{profile.phone}</span>
                      </div>
                    )}
                    <ProfileInfoModal
                      onProfileSaved={handleProfileSaved}
                      trigger={
                        <Button variant="outline" size="sm" className="mt-2">
                          Edit Profile
                        </Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>


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
                      <Label htmlFor="useRewardsYes" className="text-sm font-medium">
                        Yes, use my rewards ({availableRewards.length} available)
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
                      <Label htmlFor="useRewardsNo" className="text-sm font-medium">
                        No, don't use rewards
                      </Label>
                    </div>
                  </div>

                  {/* Rewards Selection - Only show when useRewards is true */}
                  {useRewards && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Select Rewards</h4>
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
                              selectedRewards.some(r => r.id === reward.id)
                                ? "border-gray-600 bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            onClick={() => {
                              const isSelected = selectedRewards.some(r => r.id === reward.id);
                              if (isSelected) {
                                setSelectedRewards(selectedRewards.filter(r => r.id !== reward.id));
                              } else {
                                setSelectedRewards([...selectedRewards, reward]);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedRewards.some(r => r.id === reward.id)
                                  ? "border-gray-600 bg-gray-600"
                                  : "border-gray-300"
                              }`}>
                                {selectedRewards.some(r => r.id === reward.id) && (
                                  <Check className="w-1.5 h-1.5 text-white" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {reward.bottles}b @ {reward.discount_percentage}%
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
                            <strong>{selectedRewards.length} reward{selectedRewards.length > 1 ? 's' : ''}</strong> selected for a total discount of <strong>{Math.round(discountAmount)} SEK</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodSelector
                  onPaymentMethodSelected={setSelectedPaymentMethod}
                  selectedMethod={selectedPaymentMethod}
                />
              </CardContent>
            </Card>

            {/* Submit Button or Validation Warning */}
            {!isValidCart ? (
              <div className="w-full space-y-3">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-2">
                        Cannot place order
                      </p>
                      <div className="space-y-2">
                        {validations.filter(v => !v.isValid).map((v, i) => {
                          const href = v.groupId 
                            ? `/shop/group/${v.groupId}`
                            : `/shop/${v.producerHandle}`;
                          
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-amber-800">
                                {v.groupName || v.producerName}: Add {v.needed} more bottle{v.needed > 1 ? 's' : ''} for {v.quantity + v.needed} total
                              </span>
                              <Link href={href}>
                                <Button 
                                  type="button"
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7 border-amber-300 hover:bg-amber-100"
                                >
                                  Browse Wines
                                </Button>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type="submit"
                className="w-full bg-black hover:bg-black/90 text-white border-black rounded-md"
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
            )}
          </form>
        </div>
      </div>
    </div>
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
