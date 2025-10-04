"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  Edit,
  Save,
  X,
  Calendar,
  Package,
  Settings,
  LogOut,
  Wine,
  UserPlus,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Gift,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PaymentMethodCard } from "@/components/ui/payment-method-card";
import { useHybridInvitationUpdates } from "@/lib/hooks/use-hybrid-invitation-updates";

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Sweden",
  });
  const [invitation, setInvitation] = useState<{
    code: string;
    signupUrl: string;
    codeSignupUrl?: string;
    expiresAt: string;
    currentUses?: number;
    maxUses?: number;
    usedBy?: string;
    usedAt?: string;
    isActive?: boolean;
  } | null>(null);
  const [usedInvitations, setUsedInvitations] = useState<
    Array<{
      code: string;
      usedAt: string;
      usedBy?: string;
      currentUses: number;
    }>
  >([]);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);

  // Hybrid updates (polling + webhooks)
  const {
    isConnected: invitationConnected,
    lastUpdate: invitationLastUpdate,
    checkStatus,
  } = useHybridInvitationUpdates({
    invitation,
    onInvitationUpdate: (updatedInvitation) => {
      console.log("Invitation updated via hybrid system:", updatedInvitation);
      setInvitation(updatedInvitation);
      localStorage.setItem(
        "currentInvitation",
        JSON.stringify(updatedInvitation),
      );

      // If invitation was just used, refresh used invitations from database
      if (
        updatedInvitation.currentUses &&
        updatedInvitation.currentUses > 0 &&
        invitation &&
        (!invitation.currentUses || invitation.currentUses === 0)
      ) {
        fetchUsedInvitations();
      }
    },
  });

  useEffect(() => {
    fetchProfile();
    fetchPaymentMethods();
    fetchUsedInvitations(); // Fetch used invitations from database
    fetchReservations(); // Fetch user reservations

    // Load invitation from localStorage
    const savedInvitation = localStorage.getItem("currentInvitation");
    if (savedInvitation) {
      try {
        const parsedInvitation = JSON.parse(savedInvitation);
        setInvitation(parsedInvitation);

        // Hybrid system will handle status updates automatically
      } catch (error) {
        console.error("Error loading invitation from localStorage:", error);
        localStorage.removeItem("currentInvitation");
      }
    }

    // Used invitations are now fetched from database instead of localStorage

    // No more polling - using realtime updates instead

    // Check for payment method success/cancel messages
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment_method_added") === "true") {
      toast.success("Payment method added successfully!");
      // Clean up URL
      window.history.replaceState({}, "", "/profile");
    } else if (urlParams.get("payment_method_canceled") === "true") {
      toast.error("Payment method setup was canceled");
      // Clean up URL
      window.history.replaceState({}, "", "/profile");
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        if (response.status === 401) {
          // User is not authenticated, redirect to login
          setIsAuthenticated(false);
          toast.error("Please log in to view your profile");
          setTimeout(() => {
            window.location.href = "/log-in";
          }, 1000);
          return;
        }
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setProfile(data);
      setEditForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        postal_code: data.postal_code || "",
        country: data.country || "Sweden",
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to fetch profile");
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/user/payment-methods");
      if (!response.ok) {
        if (response.status === 401) {
          // User is not authenticated, don't try to fetch payment methods
          return;
        }
        throw new Error("Failed to fetch payment methods");
      }
      const data = await response.json();
      setPaymentMethods(data);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      // Don't show error toast for payment methods as they might not be implemented yet
    }
  };


  const fetchUsedInvitations = async () => {
    try {
      const response = await fetch("/api/invitations/used");
      if (response.ok) {
        const data = await response.json();
        setUsedInvitations(data.usedInvitations || []);
      } else {
        console.error("Failed to load used invitations");
        setUsedInvitations([]);
      }
    } catch (error) {
      console.error("Error fetching used invitations:", error);
      setUsedInvitations([]);
    }
  };

  const fetchReservations = async () => {
    try {
      setReservationsLoading(true);
      console.log("🔄 Fetching reservations...");
      const response = await fetch("/api/user/reservations");
      console.log("📡 Reservations response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📊 Reservations data:", data);
        // /api/user/reservations returns array directly, not {reservations: [...]}
        setReservations(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Failed to load reservations:", response.status, errorData);
        setReservations([]);
      }
    } catch (error) {
      console.error("💥 Error fetching reservations:", error);
      setReservations([]);
    } finally {
      setReservationsLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const addPaymentMethod = async () => {
    try {
      // Get user profile to get email and name
      const profileResponse = await fetch("/api/user/profile");
      if (!profileResponse.ok) {
        toast.error("Please add your profile information first");
        return;
      }

      const profile = await profileResponse.json();
      if (!profile.email) {
        toast.error("Email is required to add payment method");
        return;
      }

      // Redirect to Stripe setup (no parameters needed - user is authenticated)
      const response = await fetch(`/api/checkout/setup`);

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to setup payment method");
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to setup payment method");
      }
    } catch (error) {
      console.error("Error adding payment method:", error);
      toast.error("Failed to add payment method");
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(
        `/api/user/payment-methods/${methodId}/set-default`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to set default payment method");
      }

      // Update local state
      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          is_default: method.id === methodId,
        })),
      );

      toast.success("Default payment method updated");
    } catch (error) {
      console.error("Error setting default payment method:", error);
      toast.error("Failed to update default payment method");
    }
  };

  const deletePaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/user/payment-methods/${methodId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete payment method");
      }

      setPaymentMethods((prev) =>
        prev.filter((method) => method.id !== methodId),
      );
      toast.success("Payment method deleted");
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast.error("Failed to delete payment method");
    }
  };

  const generateInvitation = async () => {
    setGeneratingInvite(true);
    try {
      // Refresh used invitations from database when generating new invitation
      fetchUsedInvitations();

      const response = await fetch("/api/invitations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 30 }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate invitation");
      }

      const data = await response.json();
      setInvitation(data.invitation);

      // Save invitation to localStorage
      localStorage.setItem(
        "currentInvitation",
        JSON.stringify(data.invitation),
      );

      toast.success("Invitation generated successfully!");
    } catch (error) {
      console.error("Error generating invitation:", error);
      toast.error("Failed to generate invitation");
    } finally {
      setGeneratingInvite(false);
    }
  };

  // Realtime updates handle status changes automatically

  const copyToClipboard = async (text: string, type: "code" | "url") => {
    try {
      // Clean the text to remove any potential line breaks and normalize whitespace
      // For URLs, preserve the structure but remove unwanted line breaks
      const cleanText = text.trim().replace(/\n/g, "").replace(/\r/g, "").replace(/\s+/g, " ");
      await navigator.clipboard.writeText(cleanText);
      if (type === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
      toast.success(`${type === "code" ? "Code" : "URL"} copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to logout");
      }

      toast.success("Logged out successfully");

      // Clear local state
      setIsAuthenticated(false);
      setProfile(null);

      // Redirect to access request page (not home) since user should re-request access
      setTimeout(() => {
        window.location.href = "/access-request";
      }, 1000);
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Please log in
            </h2>
            <p className="text-gray-600 mb-4">
              You need to be logged in to view your profile.
            </p>
            <Button onClick={() => (window.location.href = "/log-in")}>
              Go to Login
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="pt-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {profile?.full_name || "Profile"}
              </h1>
              <p className="text-gray-500">{profile?.email}</p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-gray-600 hover:text-red-600 hover:border-red-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-gray-900">
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, full_name: e.target.value })
                      }
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      placeholder="Enter your address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm({ ...editForm, city: e.target.value })
                        }
                        placeholder="Enter your city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={editForm.postal_code}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            postal_code: e.target.value,
                          })
                        }
                        placeholder="Enter postal code"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm({ ...editForm, country: e.target.value })
                      }
                      placeholder="Enter your country"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={updateProfile} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{profile?.email}</p>
                    </div>
                  </div>

                  {profile?.full_name && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium">{profile.full_name}</p>
                      </div>
                    </div>
                  )}

                  {profile?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{profile.phone}</p>
                      </div>
                    </div>
                  )}

                  {(profile?.address || profile?.city) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">
                          {[
                            profile.address,
                            profile.city,
                            profile.postal_code,
                            profile.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Member Since</p>
                      <p className="font-medium">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setEditing(true)}
                    className="w-full mt-6"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-gray-900">
                  Payment Methods
                </CardTitle>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <rect width="24" height="24" rx="4" fill="#635BFF" />
                    <path
                      d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.274 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.407-2.2 1.407-1.99 0-4.043-.921-5.827-1.845L4.717 24c1.73.921 4.351 1.685 7.552 1.685 2.508 0 4.682-.657 6.104-1.892 1.545-1.31 2.352-3.147 2.352-5.373 0-4.039-2.467-5.76-6.476-7.219z"
                      fill="white"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-600">
                    Powered by Stripe
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    No payment methods added yet
                  </p>
                  <Button onClick={addPaymentMethod}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      onSetDefault={setDefaultPaymentMethod}
                      onDelete={deletePaymentMethod}
                    />
                  ))}

                  <Button
                    onClick={addPaymentMethod}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invite Friends */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite Friends
              {invitation && (
                <div className="flex items-center gap-2 ml-auto">
                  {invitationConnected ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <Wifi className="w-3 h-3" />
                      <span>Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <WifiOff className="w-3 h-3" />
                      <span>Offline</span>
                    </div>
                  )}
                </div>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Share the love and earn rewards when friends join!
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rewards Summary */}
            {usedInvitations.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-gray-600" />
                      Total Rewards Earned
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {usedInvitations.length} friend{usedInvitations.length > 1 ? 's' : ''} joined
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {usedInvitations.length * 6}
                    </p>
                    <p className="text-xs text-gray-500">bottles with 5% discount</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Pending reservation rewards:</span>
                    <span className="font-medium text-gray-900">
                      {usedInvitations.length * 6} bottles with 10% discount
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Accepted Invitations - Collapsible */}
            {usedInvitations.length > 0 && (
              <div className="space-y-3">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-600" />
                      Accepted Invitations ({usedInvitations.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 group-open:hidden">Click to expand</span>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <svg className="w-3 h-3 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {usedInvitations.map((usedInvite, index) => (
                      <div
                        key={index}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-gray-900 truncate">
                                {usedInvite.profiles?.email || 'Unknown User'}
                              </p>
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {new Date(usedInvite.usedAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {/* Status and Rewards */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                <span className="text-sm text-gray-600">Account created</span>
                                <Badge className="bg-gray-100 text-gray-800 text-xs ml-auto">
                                  6 bottles @ 5%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                <span className="text-sm text-gray-500">Reservation pending</span>
                                <Badge variant="outline" className="text-xs ml-auto">
                                  6 bottles @ 10%
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Current invitation section - Compact */}
            {!invitation ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Invite Your Friends</h3>
                      <p className="text-sm text-gray-600">Earn rewards when they join</p>
                    </div>
                  </div>
                  <Button
                    onClick={generateInvitation}
                    disabled={generatingInvite}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    size="sm"
                  >
                    {generatingInvite ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Rewards info - compact */}
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-gray-600" />
                      <span className="text-gray-700">6 bottles @ 5%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gift className="w-3 h-3 text-gray-600" />
                      <span className="text-gray-700">6 bottles @ 10%</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : invitation.currentUses && invitation.currentUses > 0 ? (
              // Used invitation - success state - compact
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Invitation Accepted!</h3>
                      <p className="text-sm text-gray-600">{invitation.profiles?.email || 'Your friend'} joined PACT</p>
                    </div>
                  </div>
                  <Button
                    onClick={generateInvitation}
                    disabled={generatingInvite}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    size="sm"
                  >
                    {generatingInvite ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 mr-2" />
                        Invite Another
                      </>
                    )}
                  </Button>
                </div>

                {/* Rewards status - compact */}
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-gray-700">6 bottles @ 5%</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">Earned</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gift className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-700">6 bottles @ 10%</span>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Active invitation - compact sharing options
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {/* Status Header - compact */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Invitation Ready</h3>
                      <p className="text-sm text-gray-600">Expires: {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    onClick={generateInvitation}
                    disabled={generatingInvite}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    size="sm"
                  >
                    {generatingInvite ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 mr-2" />
                        New Invite
                      </>
                    )}
                  </Button>
                </div>

                {/* Sharing Options - compact */}
                <div className="space-y-3">
                  {/* Invitation Code */}
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-1 block">Invitation Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={invitation.code}
                        readOnly
                        className="font-mono text-sm bg-white h-8"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(invitation.code, "code")}
                        className="bg-white hover:bg-gray-50 h-8 px-2"
                      >
                        {copiedCode ? (
                          <Check className="w-3 h-3 text-gray-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Direct Signup Link */}
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-1 block">Signup Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={invitation.signupUrl?.replace(/\s+/g, "") || ""}
                        readOnly
                        className="text-xs font-mono whitespace-nowrap overflow-hidden bg-white h-8"
                        style={{ wordBreak: "keep-all" }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(invitation.signupUrl?.replace(/\s+/g, "") || "", "url")
                        }
                        className="bg-white hover:bg-gray-50 h-8 px-2"
                      >
                        {copiedUrl ? (
                          <Check className="w-3 h-3 text-gray-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - compact */}
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => {
                      setInvitation(null);
                      localStorage.removeItem("currentInvitation");
                      toast.success("Invitation cleared");
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-gray-50"
                  >
                    <X className="w-3 h-3 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservations Overview */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-gray-900">
                My Reservations
              </CardTitle>
              <Link href="/profile/reservations">
                <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">Loading reservations...</div>
              </div>
            ) : reservations && reservations.length > 0 ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">{reservations.length}</div>
                    <div className="text-xs text-gray-600">Reservations</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {reservations.reduce((total, res) => total + (res.items?.reduce((itemTotal, item) => itemTotal + item.quantity, 0) || 0), 0)}
                    </div>
                    <div className="text-xs text-gray-600">Total Bottles</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {new Set(reservations.map(res => res.pickup_zone_id || res.delivery_zone_id).filter(Boolean)).size}
                    </div>
                    <div className="text-xs text-gray-600">Zones</div>
                  </div>
                </div>

                {/* Recent Reservations Preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Recent Reservations</h4>
                  {reservations.slice(0, 3).map((reservation) => (
                    <div key={reservation.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <Package className="w-3 h-3 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            Order {reservation.order_id?.substring(0, 8) || reservation.id.substring(0, 8)}
                          </span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {reservation.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-4">
                          <span>{reservation.items?.length || 0} wines</span>
                          <span>{reservation.items?.reduce((total, item) => total + item.quantity, 0) || 0} bottles</span>
                        </div>
                        <span>{new Date(reservation.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 pt-2">
                  <Link href="/profile/reservations" className="flex-1">
                    <Button variant="outline" className="w-full bg-white hover:bg-gray-50">
                      <Package className="w-4 h-4 mr-2" />
                      View All Reservations
                    </Button>
                  </Link>
                  <Link href="/shop" className="flex-1">
                    <Button variant="outline" className="w-full bg-white hover:bg-gray-50">
                      <Wine className="w-4 h-4 mr-2" />
                      Browse Wines
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reservations Yet</h3>
                <p className="text-gray-600 mb-6">Start exploring our wine collection and make your first reservation.</p>
                <Link href="/shop">
                  <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                    <Wine className="w-4 h-4 mr-2" />
                    Browse Wines
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
