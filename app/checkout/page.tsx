"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Cart } from "@/lib/shopify/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileInfoModal } from "@/components/checkout/profile-info-modal";
import { PaymentMethodSelector } from "@/components/checkout/payment-method-selector";
import { toast } from "sonner";
import { User, MapPin, CreditCard, Package, AlertCircle } from "lucide-react";

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
  type: 'card' | 'bank';
  last4?: string;
  brand?: string;
  is_default: boolean;
  expiry_month?: number;
  expiry_year?: number;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
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
  }>({ pickupZone: null, deliveryZone: null, selectedDeliveryZoneId: null });

  const searchParams = useSearchParams();

  useEffect(() => {
    fetchCart();
    fetchProfile();
  }, []);

  useEffect(() => {
    // Update zone info when address changes
    if (cart && cart.totalQuantity > 0) {
      updateZoneInfo();
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
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        
        // Check if profile has complete address information
        const hasCompleteAddress = profileData.address && profileData.city && profileData.postal_code;
        setUseProfileAddress(hasCompleteAddress);
        setUseCustomAddress(!hasCompleteAddress);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateZoneInfo = async () => {
    if (!cart || cart.totalQuantity === 0) return;

    try {
      let deliveryAddress;
      
      if (useProfileAddress && profile) {
        deliveryAddress = {
          postcode: profile.postal_code || "",
          city: profile.city || "",
          countryCode: profile.country === "Sweden" ? "SE" : 
                      profile.country === "Norway" ? "NO" :
                      profile.country === "Denmark" ? "DK" :
                      profile.country === "Finland" ? "FI" :
                      profile.country === "Germany" ? "DE" :
                      profile.country === "France" ? "FR" :
                      profile.country === "United Kingdom" ? "GB" : "",
        };
      } else if (useCustomAddress) {
        deliveryAddress = {
          postcode: customAddress.postcode,
          city: customAddress.city,
          countryCode: customAddress.countryCode,
        };
      } else {
        deliveryAddress = {
          postcode: "",
          city: "",
          countryCode: "",
        };
      }

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
        const hasCompleteAddress = deliveryAddress.postcode && deliveryAddress.city && deliveryAddress.countryCode;
        
        setZoneInfo({
          pickupZone: zoneData.pickupZoneName,
          deliveryZone: hasCompleteAddress ? zoneData.deliveryZoneName : null,
          selectedDeliveryZoneId: hasCompleteAddress ? zoneData.deliveryZoneId : null,
          availableDeliveryZones: hasCompleteAddress ? zoneData.availableDeliveryZones : [],
          pallets: hasCompleteAddress ? zoneData.pallets : [],
        });
      }
    } catch (error) {
      console.error("Failed to update zone info:", error);
    }
  };

  const handleProfileSaved = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setUseProfileAddress(true);
    setUseCustomAddress(false);
    toast.success("Profile information saved!");
  };

  const handleDeliveryZoneChange = (zoneId: string) => {
    const selectedZone = zoneInfo.availableDeliveryZones?.find(z => z.id === zoneId);
    if (selectedZone) {
      setZoneInfo(prev => ({
        ...prev,
        selectedDeliveryZoneId: zoneId,
        deliveryZone: selectedZone.name,
      }));
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

    // Check if delivery zone is available
    const hasCompleteAddress = useProfileAddress ? 
      (profile?.address && profile?.city && profile?.postal_code) :
      (customAddress.street && customAddress.city && customAddress.postcode && customAddress.countryCode);
      
    if (hasCompleteAddress && !zoneInfo.selectedDeliveryZoneId) {
      toast.error("No delivery zone matches your address. Please contact support or try a different address.");
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
      formData.append("countryCode", profile.country === "Sweden" ? "SE" : 
                      profile.country === "Norway" ? "NO" :
                      profile.country === "Denmark" ? "DK" :
                      profile.country === "Finland" ? "FI" :
                      profile.country === "Germany" ? "DE" :
                      profile.country === "France" ? "FR" :
                      profile.country === "United Kingdom" ? "GB" : "");
    } else {
      formData.append("street", customAddress.street);
      formData.append("postcode", customAddress.postcode);
      formData.append("city", customAddress.city);
      formData.append("countryCode", customAddress.countryCode);
    }
    
    // Zone information
    if (zoneInfo.selectedDeliveryZoneId) {
      formData.append("selectedDeliveryZoneId", zoneInfo.selectedDeliveryZoneId);
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
        // Redirect to confirmation page or profile
        window.location.href = "/profile/reservations";
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
      <div className="max-w-4xl mx-auto p-6">
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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
        <p className="text-gray-600">
          Your cart is empty. Please add some items before proceeding to checkout.
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
  const hasCompleteProfileAddress = profile?.address && profile?.city && profile?.postal_code;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
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
                {cart.lines.map((line) => (
                  <div key={line.id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{line.merchandise.title}</span>
                      <span className="text-gray-600 ml-2">x{line.quantity}</span>
                    </div>
                    <span className="font-medium">
                      {line.cost.totalAmount.amount} {line.cost.totalAmount.currencyCode}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>
                    {cart.cost.totalAmount.amount} {cart.cost.totalAmount.currencyCode}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone Information */}
          {(zoneInfo.pickupZone || zoneInfo.deliveryZone || 
            ((useProfileAddress && profile?.address && profile?.city && profile?.postal_code) || 
             (useCustomAddress && customAddress.street && customAddress.city && customAddress.postcode))) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {zoneInfo.pickupZone && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-blue-900">Pickup Zone</p>
                        <p className="text-sm text-blue-700">{zoneInfo.pickupZone}</p>
                      </div>
                    </div>
                  )}
                  
                  {zoneInfo.availableDeliveryZones && zoneInfo.availableDeliveryZones.length > 1 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-green-900">Delivery Zone</p>
                          <p className="text-sm text-green-700">Multiple zones available</p>
                        </div>
                      </div>
                      <Select
                        value={zoneInfo.selectedDeliveryZoneId || ""}
                        onValueChange={handleDeliveryZoneChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select delivery zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zoneInfo.availableDeliveryZones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name} ({zone.radiusKm}km radius)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : zoneInfo.deliveryZone ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-green-900">Delivery Zone</p>
                        <p className="text-sm text-green-700">{zoneInfo.deliveryZone}</p>
                      </div>
                    </div>
                  ) : (useProfileAddress && profile?.address && profile?.city && profile?.postal_code) || 
                      (useCustomAddress && customAddress.street && customAddress.city && customAddress.postcode) ? (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-red-900">Delivery Zone</p>
                        <p className="text-sm text-red-700">No matching zone found for this address</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pallet Information */}
          {zoneInfo.pallets && zoneInfo.pallets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Available Pallets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {zoneInfo.pallets.map((pallet) => (
                    <div key={pallet.id} className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{pallet.name}</h4>
                          <p className="text-sm text-gray-600">
                            {pallet.pickupZoneName} → {pallet.deliveryZoneName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {pallet.currentBottles}/{pallet.maxBottles} bottles
                          </p>
                          <p className="text-xs text-gray-500">
                            {pallet.remainingBottles} remaining
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Capacity</span>
                          <span>{Math.round((pallet.currentBottles / pallet.maxBottles) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${(pallet.currentBottles / pallet.maxBottles) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      {pallet.remainingBottles > 0 && (
                        <div className="mt-3 p-2 bg-green-100 rounded text-center">
                          <p className="text-sm font-medium text-green-800">
                            ✅ This pallet can accommodate your order
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
                    <p className="text-gray-600 mb-4">Profile information missing</p>
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
                      <Label htmlFor="useProfileAddress" className="text-sm font-medium">
                        Use profile address: {profile?.address}, {profile?.postal_code} {profile?.city}
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
                      <Label htmlFor="useCustomAddress" className="text-sm font-medium">
                        Use different delivery address
                      </Label>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Delivery address missing from profile</p>
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
                        onChange={(e) => setCustomAddress({ ...customAddress, street: e.target.value })}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customPostcode">Postal Code</Label>
                        <Input
                          id="customPostcode"
                          value={customAddress.postcode}
                          onChange={(e) => setCustomAddress({ ...customAddress, postcode: e.target.value })}
                          placeholder="Enter postal code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customCity">City</Label>
                        <Input
                          id="customCity"
                          value={customAddress.city}
                          onChange={(e) => setCustomAddress({ ...customAddress, city: e.target.value })}
                          placeholder="Enter city"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="customCountry">Country</Label>
                      <Select
                        value={customAddress.countryCode}
                        onValueChange={(value) => setCustomAddress({ ...customAddress, countryCode: value })}
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
            >
              Place Reservation
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}