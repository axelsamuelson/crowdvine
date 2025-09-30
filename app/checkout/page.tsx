"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { toast } from "sonner";
import { User, MapPin, CreditCard, Package, AlertCircle } from "lucide-react";
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

function CheckoutContent() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [selectedPallet, setSelectedPallet] = useState<PalletInfo | null>(null);
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState({
    street: "",
    postcode: "",
    city: "",
    countryCode: "",
  });
  const [zoneInfo, setZoneInfo] = useState<{
    pickupZone: string | null;
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
    }>;
    usingFallbackAddress?: boolean;
  }>({ pickupZone: null, deliveryZone: null, selectedDeliveryZoneId: null });

  const searchParams = useSearchParams();

  useEffect(() => {
    fetchCart();
    fetchProfile();
  }, []);

  // Initial zone matching when cart and profile are loaded
  useEffect(() => {
    if (cart && cart.totalQuantity > 0 && !loading) {
      console.log("🚀 Initial zone matching triggered");
      updateZoneInfo();
    }
  }, [cart, loading]);

  useEffect(() => {
    // Update zone info when address changes (with debouncing)
    if (cart && cart.totalQuantity > 0) {
      const timeoutId = setTimeout(() => {
        console.log("🔄 Address change triggered zone matching");
        updateZoneInfo();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [profile, customAddress, useProfileAddress, useCustomAddress]);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/crowdvine/cart");
      if (response.ok) {
        const cartData = await response.json();
        setCart(cartData);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);

        // Check if profile has complete address information
        const hasCompleteAddress =
          profileData.address && profileData.city && profileData.postal_code;
        setUseProfileAddress(hasCompleteAddress);
        setUseCustomAddress(!hasCompleteAddress);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

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

      if (useProfileAddress && profile) {
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
      } else if (useCustomAddress) {
        deliveryAddress = {
          postcode: customAddress.postcode,
          city: customAddress.city,
          countryCode: customAddress.countryCode,
        };
      } else {
        // Fallback: Use Stockholm as default address when no address is provided
        deliveryAddress = {
          postcode: "11129",
          city: "Stockholm",
          countryCode: "SE",
        };
        console.log("📍 No address provided, using Stockholm as fallback");
      }

      const isUsingFallback = !useProfileAddress && !useCustomAddress;

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

        setZoneInfo({
          pickupZone: zoneData.pickupZoneName,
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

  const handleProfileSaved = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setUseProfileAddress(true);
    setUseCustomAddress(false);
    toast.success("Profile information saved!");
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

    // Check if delivery zone is available
    const hasCompleteAddress = useProfileAddress
      ? profile?.address && profile?.city && profile?.postal_code
      : customAddress.street &&
        customAddress.city &&
        customAddress.postcode &&
        customAddress.countryCode;

    if (hasCompleteAddress && !zoneInfo.selectedDeliveryZoneId) {
      toast.error(
        "No delivery zone matches your address. Please contact support or try a different address.",
      );
      return;
    }

    // Check if pallet is available (should be auto-selected)
    if (zoneInfo.pallets && zoneInfo.pallets.length > 0 && !selectedPallet) {
      toast.error("No suitable pallet found for your location. Please contact support.");
      return;
    }

    // Prepare form data
    const formData = new FormData();

    // Customer details
    formData.append("fullName", profile?.full_name || "");
    formData.append("email", profile?.email || "");
    formData.append("phone", profile?.phone || "");

    // Delivery address
    if (useProfileAddress && profile) {
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
    } else {
      formData.append("street", customAddress.street);
      formData.append("postcode", customAddress.postcode);
      formData.append("city", customAddress.city);
      formData.append("countryCode", customAddress.countryCode);
    }

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

    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Reservation placed successfully!");
        // Redirect to confirmation page
        window.location.href = "/checkout/success";
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to place reservation");
      }
    } catch (error) {
      console.error("Error placing reservation:", error);
      toast.error("Failed to place reservation");
    }
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
  const shippingCost = selectedPallet
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

  return (
    <div className="max-w-4xl mx-auto p-6 pt-top-spacing space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600 mt-2">Complete your wine reservation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cart.lines.map((line) => {
                  // Calculate price per bottle (total / quantity)
                  const pricePerBottle = parseFloat(line.cost.totalAmount.amount) / line.quantity;
                  const totalForLine = pricePerBottle * line.quantity;
                  
                  return (
                    <div
                      key={line.id}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium">
                          {line.merchandise.title}
                        </span>
                        <span className="text-gray-600 ml-2">
                          x{line.quantity}
                        </span>
                      </div>
                      <span className="font-medium">
                        {Math.round(totalForLine)}{" "}
                        {line.cost.totalAmount.currencyCode}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="space-y-2">
                  {/* Bottle Cost (including VAT) */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bottle Cost (incl. VAT)</span>
                    <span className="text-sm font-medium">
                      {Math.round(parseFloat(cart.cost.totalAmount.amount))}{" "}
                      {cart.cost.totalAmount.currencyCode}
                    </span>
                  </div>

                  {/* Shipping Cost */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Shipping</span>
                    <span className="text-sm">
                      {shippingCost ? (
                        <span className="font-medium">
                          {formatShippingCost(
                            shippingCost.totalShippingCostCents,
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">No pallet chosen</span>
                      )}
                    </span>
                  </div>

                  {/* Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-sm font-medium">
                      {Math.round(parseFloat(cart.cost.totalAmount.amount))}{" "}
                      {cart.cost.totalAmount.currencyCode}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>
                      {shippingCost ? (
                        <>
                          {Math.round(
                            parseFloat(cart.cost.totalAmount.amount) +
                            shippingCost.totalShippingCostSek
                          )}{" "}
                          {cart.cost.totalAmount.currencyCode}
                        </>
                      ) : (
                        <>
                          {Math.round(parseFloat(cart.cost.totalAmount.amount))}{" "}
                          {cart.cost.totalAmount.currencyCode}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone Information */}
          {(zoneInfo.pickupZone ||
            zoneInfo.deliveryZone ||
            zoneLoading ||
            (useProfileAddress &&
              profile?.address &&
              profile?.city &&
              profile?.postal_code) ||
            (useCustomAddress &&
              customAddress.street &&
              customAddress.city &&
              customAddress.postcode)) && (
            <div className="space-y-4">
              {/* Zone Loading Indicator */}
              {zoneLoading && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      Finding Delivery Zones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-600">
                      Please wait while we determine the best delivery zones for your address...
                    </p>
                  </CardContent>
                </Card>
              )}
              {/* Fallback Address Notice */}
              {zoneInfo.usingFallbackAddress && (
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="w-5 h-5" />
                      Using Default Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-amber-600 mb-3">
                      No delivery address found. Showing zones for Stockholm, Sweden as default.
                    </p>
                    <p className="text-xs text-amber-500">
                      Please add your delivery address below to see zones for your location.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Pickup Zone */}
              {zoneInfo.pickupZone && (
                <ZoneDetails
                  zoneId={zoneInfo.pickupZoneId || ""}
                  zoneName={zoneInfo.pickupZone}
                  zoneType="pickup"
                />
              )}

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
                ((useProfileAddress &&
                  profile?.address &&
                  profile?.city &&
                  profile?.postal_code) ||
                (useCustomAddress &&
                  customAddress.street &&
                  customAddress.city &&
                  customAddress.postcode)) ? (
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      No Delivery Zone Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-600 mb-3">
                      No delivery zone matches this address. Please contact
                      support or try a different address.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        clearZoneCache();
                        updateZoneInfo();
                      }}
                      disabled={zoneLoading}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {zoneLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                          Retrying...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Retry Zone Detection
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          {/* Pallet Information */}
          {(zoneInfo.pallets && zoneInfo.pallets.length > 0) || zoneLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Selected Pallet
                  {zoneLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </h3>
              </div>

              <div className="space-y-3">
                {zoneLoading ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <div>
                        <p className="font-medium text-gray-700">Finding your pallet...</p>
                        <p className="text-sm text-gray-500">Matching your wines with available pallets</p>
                      </div>
                    </div>
                  </div>
                ) : selectedPallet ? (
                  <div className="relative">
                    <PalletDetails pallet={selectedPallet} />
                  </div>
                ) : null}
              </div>

            </div>
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

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasCompleteProfileAddress ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useProfileAddress"
                        checked={useProfileAddress}
                        onCheckedChange={(checked) => {
                          setUseProfileAddress(checked as boolean);
                          setUseCustomAddress(!checked as boolean);
                        }}
                      />
                      <Label
                        htmlFor="useProfileAddress"
                        className="text-sm font-medium"
                      >
                        Use profile address: {profile?.address},{" "}
                        {profile?.postal_code} {profile?.city}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useCustomAddress"
                        checked={useCustomAddress}
                        onCheckedChange={(checked) => {
                          setUseCustomAddress(checked as boolean);
                          setUseProfileAddress(!checked as boolean);
                        }}
                      />
                      <Label
                        htmlFor="useCustomAddress"
                        className="text-sm font-medium"
                      >
                        Use different delivery address
                      </Label>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Delivery address missing from profile
                    </p>
                    <ProfileInfoModal onProfileSaved={handleProfileSaved} />
                  </div>
                )}

                {useCustomAddress && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="customStreet">Street Address</Label>
                      <Input
                        id="customStreet"
                        value={customAddress.street}
                        onChange={(e) =>
                          setCustomAddress({
                            ...customAddress,
                            street: e.target.value,
                          })
                        }
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customPostcode">Postal Code</Label>
                        <Input
                          id="customPostcode"
                          value={customAddress.postcode}
                          onChange={(e) =>
                            setCustomAddress({
                              ...customAddress,
                              postcode: e.target.value,
                            })
                          }
                          placeholder="Enter postal code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customCity">City</Label>
                        <Input
                          id="customCity"
                          value={customAddress.city}
                          onChange={(e) =>
                            setCustomAddress({
                              ...customAddress,
                              city: e.target.value,
                            })
                          }
                          placeholder="Enter city"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="customCountry">Country</Label>
                      <Select
                        value={customAddress.countryCode}
                        onValueChange={(value) =>
                          setCustomAddress({
                            ...customAddress,
                            countryCode: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SE">Sweden</SelectItem>
                          <SelectItem value="NO">Norway</SelectItem>
                          <SelectItem value="DK">Denmark</SelectItem>
                          <SelectItem value="FI">Finland</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
          </form>
        </div>
      </div>
    </div>
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
