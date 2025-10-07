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
import { RewardTierCard } from "@/components/ui/reward-tier-card";
import { MiniProgress, ProgressHalo } from "@/components/ui/progress-components";
import { getPercentFilled, formatPercent, shouldShowPercent } from "@/lib/utils/pallet-progress";
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
      <PageLayout className="px-sides">
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
      <PageLayout className="px-sides">
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
    <PageLayout className="pt-8 md:pt-12 px-sides">
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
        {/* Minimalist Header */}
        <div className="flex items-start justify-between pb-6 border-b border-gray-200/50">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-light text-gray-900">
              {profile?.full_name || "Welcome"}
            </h1>
            <p className="text-sm md:text-base text-gray-500">{profile?.email}</p>
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
              <span>Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 p-2 transition-colors"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            <span className="sr-only">Logout</span>
          </button>
        </div>

        {/* Profile Top Sections - Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Personal Information */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-light text-gray-900">Personal Information</h2>
              {!editing && (
                <Button
                  onClick={() => setEditing(true)}
                  className="rounded-full px-4 md:px-6 bg-gray-900 hover:bg-gray-800 text-white text-sm"
                  size="sm"
                >
                  <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name" className="text-sm text-gray-600">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, full_name: e.target.value })
                      }
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm text-gray-600">Phone Number</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      placeholder="Enter your phone number"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm text-gray-600">Address</Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      placeholder="Enter your address"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="city" className="text-sm text-gray-600">City</Label>
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm({ ...editForm, city: e.target.value })
                        }
                        placeholder="City"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code" className="text-sm text-gray-600">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={editForm.postal_code}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            postal_code: e.target.value,
                          })
                        }
                        placeholder="Postal code"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country" className="text-sm text-gray-600">Country</Label>
                    <Input
                      id="country"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm({ ...editForm, country: e.target.value })
                      }
                      placeholder="Enter your country"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={updateProfile} className="flex-1 rounded-full bg-gray-900 hover:bg-gray-800 text-sm">
                      <Save className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="flex-1 rounded-full border-gray-200 hover:bg-gray-50 text-sm"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Mail className="w-3 h-3" />
                      <span className="text-xs">Email</span>
                    </div>
                    <p className="text-sm text-gray-900">{profile?.email}</p>
                  </div>

                  {profile?.full_name && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <User className="w-3 h-3" />
                        <span className="text-xs">Full Name</span>
                      </div>
                      <p className="text-sm text-gray-900">{profile.full_name}</p>
                    </div>
                  )}

                  {profile?.phone && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">Phone</span>
                      </div>
                      <p className="text-sm text-gray-900">{profile.phone}</p>
                    </div>
                  )}

                  {(profile?.address || profile?.city) && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">Address</span>
                      </div>
                      <p className="text-sm text-gray-900">
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
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Payment Methods */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-light text-gray-900">Payment Methods</h2>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg viewBox="0 0 24 24" className="w-3 h-3">
                  <rect width="24" height="24" rx="4" fill="#635BFF" />
                  <path
                    d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.274 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.407-2.2 1.407-1.99 0-4.043-.921-5.827-1.845L4.717 24c1.73.921 4.351 1.685 7.552 1.685 2.508 0 4.682-.657 6.104-1.892 1.545-1.31 2.352-3.147 2.352-5.373 0-4.039-2.467-5.76-6.476-7.219z"
                    fill="white"
                  />
                </svg>
                <span className="hidden sm:inline">Stripe</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base md:text-lg font-light text-gray-900 mb-1">No payment methods</h3>
                  <p className="text-sm text-gray-500 mb-6">Add a payment method to start making reservations</p>
                  <Button 
                    onClick={addPaymentMethod}
                    className="rounded-full px-6 md:px-8 bg-gray-900 hover:bg-gray-800 text-white text-sm"
                  >
                    <Plus className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="bg-gray-50/50 rounded-xl p-4 border border-gray-200/50 hover:bg-gray-100/50 transition-colors">
                      <PaymentMethodCard
                        method={method}
                        onSetDefault={setDefaultPaymentMethod}
                        onDelete={deletePaymentMethod}
                      />
                    </div>
                  ))}

                  <Button
                    onClick={addPaymentMethod}
                    className="w-full rounded-full border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 py-4 text-sm"
                    variant="ghost"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Add Another Payment Method</span>
                    <span className="sm:hidden">Add Payment Method</span>
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Invite Friends */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-light text-gray-900">Invite Friends</h2>
              <p className="text-sm text-gray-500 mt-0.5">Invite friends, unlock rewards.</p>
            </div>
            {invitation && (
              <div className="flex items-center gap-1.5">
                {invitationConnected ? (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Wifi className="w-3 h-3" />
                    <span className="hidden sm:inline">Live</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <WifiOff className="w-3 h-3" />
                    <span className="hidden sm:inline">Offline</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm">
            {/* Generate Invite - Primary CTA */}
            {!invitation && (
              <div className="text-center mb-6">
                <Button
                  onClick={generateInvitation}
                  disabled={generatingInvite}
                  className="rounded-full px-6 md:px-8 bg-gray-900 hover:bg-gray-800 text-white text-sm md:text-base"
                >
                  {generatingInvite ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Generate Invite
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Rewards Levels */}
            <div className="mb-6">
              <h3 className="text-base md:text-lg font-light text-gray-900 mb-3">Your Rewards</h3>
              
              {/* Calculate rewards based on invitations */}
              {(() => {
                // Calculate rewards based on invitation status
                // 5% rewards: 6 bottles per friend who joined (account created)
                // 10% rewards: same 6 bottles but upgraded when friend makes reservation
                
                const totalEligibleBottles = usedInvitations.length * 6;
                
                // For now, assume no bottles have been used/applied
                // TODO: Replace with actual backend data for applied bottles
                const used5Percent = 0; // Should come from backend
                const used10Percent = 0; // Should come from backend
                
                // TODO: Get actual reservation data from backend
                // For now, assume no friends have made reservations yet
                const friendsWithReservations = 0; // Should come from backend
                
                // 5% rewards: available for all friends who joined
                const available5Percent = Math.max(totalEligibleBottles - used5Percent, 0);
                
                // 10% rewards: only available for friends who have made reservations
                const available10Percent = Math.max((friendsWithReservations * 6) - used10Percent, 0);
                
                return (
                  <>
                    {/* Two-level rewards display */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <RewardTierCard 
                        tierPercent={5}
                        used={used5Percent}
                        available={available5Percent}
                      />
                      <RewardTierCard 
                        tierPercent={10}
                        used={used10Percent}
                        available={available10Percent}
                      />
                    </div>

                    <div className="text-center">
                      <p className="text-xs md:text-sm text-gray-500 mb-1">
                        {usedInvitations.length} friend{usedInvitations.length > 1 ? 's' : ''} joined
                      </p>
                      <p className="text-xs text-gray-400">
                        Used = already applied • Available = ready to use
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Accepted Invitations - Collapsible */}
            {usedInvitations.length > 0 && (
              <div className="border-t border-gray-200/50 pt-4">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <h4 className="text-sm font-light text-gray-900 flex items-center gap-2">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                      <span>Accepted Invitations</span>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {usedInvitations.length}
                      </span>
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 group-open:hidden hidden sm:inline">View</span>
                      <div className="w-3 h-3 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {usedInvitations.map((usedInvite, index) => (
                      <div
                        key={index}
                        className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/50"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm text-gray-900 truncate">
                                {usedInvite.profiles?.email || 'Unknown User'}
                              </p>
                              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {new Date(usedInvite.usedAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {/* Status and Rewards */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-gray-500">Account created</span>
                                <Badge className="bg-white text-gray-600 text-xs ml-auto border border-gray-200 px-2 py-0">
                                  6 @ 5%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
                                <span className="text-xs text-gray-400">Reservation pending</span>
                                <Badge variant="outline" className="text-xs ml-auto border-gray-200 text-gray-400 px-2 py-0">
                                  6 @ 10%
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

            {/* Current Invitation States */}
            {!invitation ? (
              // No invitation - already handled above with Generate Invite CTA
              null
            ) : invitation.currentUses && invitation.currentUses > 0 ? (
              // Used invitation - success state
              <div className="border-t border-gray-200/50 pt-4">
                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center">
                      <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-light text-gray-900">Invitation Accepted!</h3>
                      <p className="text-xs md:text-sm text-gray-500 truncate">{invitation.profiles?.email || 'Your friend'} joined PACT</p>
                    </div>
                    <Button
                      onClick={generateInvitation}
                      disabled={generatingInvite}
                      className="rounded-full px-3 md:px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm flex-shrink-0"
                      size="sm"
                    >
                      {generatingInvite ? (
                        <>
                          <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white mr-1.5"></div>
                          <span className="hidden sm:inline">Generating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1.5" />
                          <span className="hidden sm:inline">Invite Another</span>
                          <span className="sm:hidden">+</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Rewards status */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200/50">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:items-center">
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-gray-600" />
                        <span className="text-xs text-gray-600">6 bottles @ 5%</span>
                        <Badge className="bg-gray-100 text-gray-800 text-xs px-2 py-0">Earned</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gift className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">6 bottles @ 10%</span>
                        <Badge variant="outline" className="text-xs border-gray-200 text-gray-400 px-2 py-0">Pending</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Active invitation - sharing options
              <div className="border-t border-gray-200/50 pt-4">
                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center">
                      <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-light text-gray-900">Invitation Ready</h3>
                      <p className="text-xs md:text-sm text-gray-500">Expires: {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      onClick={generateInvitation}
                      disabled={generatingInvite}
                      className="rounded-full px-3 md:px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm flex-shrink-0"
                      size="sm"
                    >
                      {generatingInvite ? (
                        <>
                          <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white mr-1.5"></div>
                          <span className="hidden sm:inline">Generating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1.5" />
                          <span className="hidden sm:inline">New Invite</span>
                          <span className="sm:hidden">+</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Sharing Options */}
                  <div className="space-y-3">
                    {/* Invitation Code */}
                    <div>
                      <Label className="text-xs text-gray-600 mb-1.5 block">Invitation Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={invitation.code}
                          readOnly
                          className="font-mono text-xs md:text-sm bg-white border-gray-200 rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(invitation.code, "code")}
                          className="bg-white hover:bg-gray-50 border-gray-200 rounded-lg px-3 flex-shrink-0"
                        >
                          {copiedCode ? (
                            <Check className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
                          ) : (
                            <Copy className="w-3 h-3 md:w-4 md:h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Direct Signup Link */}
                    <div>
                      <Label className="text-xs text-gray-600 mb-1.5 block">Signup Link</Label>
                      <div className="flex gap-2">
                        <Input
                          value={invitation.signupUrl?.replace(/\s+/g, "") || ""}
                          readOnly
                          className="text-xs md:text-sm font-mono bg-white border-gray-200 rounded-lg truncate"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(invitation.signupUrl?.replace(/\s+/g, "") || "", "url")
                          }
                          className="bg-white hover:bg-gray-50 border-gray-200 rounded-lg px-3 flex-shrink-0"
                        >
                          {copiedUrl ? (
                            <Check className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
                          ) : (
                            <Copy className="w-3 h-3 md:w-4 md:h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => {
                        setInvitation(null);
                        localStorage.removeItem("currentInvitation");
                        toast.success("Invitation cleared");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 p-2 transition-colors"
                    >
                      <X className="w-3 h-3 mr-1 inline" />
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My Reservations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-light text-gray-900">My Reservations</h2>
            <Link href="/profile/reservations">
              <Button variant="outline" size="sm" className="rounded-full border-gray-200 hover:bg-gray-50 text-xs md:text-sm px-3 md:px-4">
                View All
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm">
            {reservationsLoading ? (
              <div className="flex items-center justify-center py-8 md:py-12">
                <div className="text-sm text-gray-400">Loading reservations...</div>
              </div>
            ) : reservations && reservations.length > 0 ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                {(() => {
                  // Calculate unique bottles based on wine characteristics
                  const uniqueBottles = new Set();
                  const totalBottles = reservations.reduce((total, res) => {
                    if (res.items) {
                      res.items.forEach(item => {
                        // Create unique key for each wine
                        const wineKey = `${item.wine_name}_${item.vintage || 'unknown'}_${item.color || 'unknown'}`;
                        uniqueBottles.add(wineKey);
                        total += item.quantity;
                      });
                    }
                    return total;
                  }, 0);

                  // Calculate unique pallets
                  const uniquePallets = new Set();
                  reservations.forEach(res => {
                    if (res.pallet_id) {
                      uniquePallets.add(res.pallet_id);
                    }
                  });

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <Wine className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                        </div>
                        <div className="text-xl md:text-2xl font-light text-gray-900">{uniqueBottles.size}</div>
                        <div className="text-xs md:text-sm text-gray-500">Unique Bottles</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2 relative">
                          <Package className="w-5 h-5 md:w-6 md:h-6 text-gray-400 relative z-10" />
                          {/* Progress halo showing max % among active pallets */}
                          {(() => {
                            // Calculate max percent among active pallets
                            const activePallets = reservations.filter(res => 
                              res.status === 'OPEN' || res.status === 'CONSOLIDATING'
                            );
                            
                            if (activePallets.length === 0) return null;
                            
                            const maxPercent = Math.max(...activePallets.map(res => {
                              const percent = getPercentFilled({
                                reserved_bottles: res.items?.reduce((total, item) => total + item.quantity, 0) || 0,
                                capacity_bottles: res.pallet_capacity,
                                percent_filled: undefined,
                                status: res.status.toUpperCase() as any
                              });
                              return percent || 0;
                            }));
                            
                            return maxPercent > 0 ? (
                              <ProgressHalo 
                                valuePercent={maxPercent} 
                                size="md" 
                                className="absolute inset-0"
                              />
                            ) : null;
                          })()}
                        </div>
                        <div className="text-xl md:text-2xl font-light text-gray-900">{totalBottles}</div>
                        <div className="text-xs md:text-sm text-gray-500">Total Bottles</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Pallet Overview */}
                <div className="space-y-3">
                  <h3 className="text-base md:text-lg font-light text-gray-900">Pallet Overview</h3>
                  <div className="space-y-2">
                    {(() => {
                      // Group reservations by pallet_id and aggregate data
                      const palletMap = new Map();
                      
                      reservations.forEach(reservation => {
                        const palletId = reservation.pallet_id || 'unassigned';
                        const palletName = reservation.pallet_name || 'Pallet Assignment Pending';
                        
                        if (!palletMap.has(palletId)) {
                          palletMap.set(palletId, {
                            id: palletId,
                            name: palletName,
                            capacity: reservation.pallet_capacity,
                            status: reservation.status || 'OPEN',
                            reservedBottles: 0,
                            deliveredBottles: 0,
                            latestDate: reservation.created_at,
                            reservations: []
                          });
                        }
                        
                        const pallet = palletMap.get(palletId);
                        pallet.reservedBottles += reservation.items?.reduce((total, item) => total + item.quantity, 0) || 0;
                        pallet.deliveredBottles += 0; // TODO: Get from backend
                        pallet.reservations.push(reservation);
                        
                        // Use most recent status
                        if (new Date(reservation.created_at) > new Date(pallet.latestDate)) {
                          pallet.latestDate = reservation.created_at;
                        }
                      });
                      
                      // Sort pallets: OPEN/CONSOLIDATING first, then by date
                      const sortedPallets = Array.from(palletMap.values()).sort((a, b) => {
                        const statusOrder = { 'OPEN': 0, 'CONSOLIDATING': 1, 'SHIPPED': 2, 'DELIVERED': 3 };
                        const aOrder = statusOrder[a.status] || 0;
                        const bOrder = statusOrder[b.status] || 0;
                        if (aOrder !== bOrder) return aOrder - bOrder;
                        return new Date(b.latestDate) - new Date(a.latestDate);
                      });
                      
                      return sortedPallets.slice(0, 3).map((pallet) => {
                        // Calculate pallet fill percentage
                        const percentFilled = getPercentFilled({
                          reserved_bottles: pallet.reservedBottles,
                          capacity_bottles: pallet.capacity, // Use pallet capacity
                          percent_filled: undefined, // TODO: Get from backend if available
                          status: pallet.status.toUpperCase() as any
                        });
                        
                        const showPercent = shouldShowPercent(pallet.status);
                        const displayPercent = showPercent ? formatPercent(percentFilled) : '—%';
                        
                        return (
                          <Link key={pallet.id} href={`/pallet/${pallet.id}`}>
                            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/50 hover:bg-gray-100/50 transition-colors cursor-pointer">
                            {/* Row 1: Pallet name + status tag */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="w-3 h-3 text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-900 truncate">{pallet.name}</p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(pallet.latestDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Badge 
                                className={`text-xs rounded-full px-2 py-0 flex-shrink-0 ${
                                  pallet.status === 'confirmed' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                  pallet.status === 'pending' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                  pallet.status === 'shipped' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                  pallet.status === 'delivered' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                  'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                {pallet.status === 'confirmed' ? 'CONSOLIDATING' : 
                                 pallet.status === 'pending' ? 'OPEN' : 
                                 pallet.status === 'shipped' ? 'SHIPPED' :
                                 pallet.status === 'delivered' ? 'DELIVERED' : 'OPEN'}
                              </Badge>
                            </div>
                            
                            {/* Row 2: Meta info with percentage */}
                            <div className="space-y-1.5">
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">{displayPercent}</span>
                                <span> • Reserved: {pallet.reservedBottles} • ETA: {pallet.status === 'confirmed' ? 'Q1 2025' : 'TBD'}</span>
                              </div>
                              
                              {/* Micro progress bar */}
                              <MiniProgress valuePercent={showPercent ? percentFilled : null} />
                            </div>
                            </div>
                          </Link>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3">
                  <Link href="/profile/reservations" className="flex-1">
                    <Button className="w-full rounded-full bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm">
                      <Package className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      <span className="hidden sm:inline">View All Reservations</span>
                      <span className="sm:hidden">View All</span>
                    </Button>
                  </Link>
                  <Link href="/shop" className="flex-1">
                    <Button variant="outline" className="w-full rounded-full border-gray-200 hover:bg-gray-50 text-xs md:text-sm">
                      <Wine className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Browse Wines
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 md:py-16">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-7 h-7 md:w-8 md:h-8 text-gray-400" />
                </div>
                <h3 className="text-base md:text-lg font-light text-gray-900 mb-2">No reservations yet</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto px-4">Start exploring our wine collection and make your first reservation</p>
                <Link href="/shop">
                  <Button className="rounded-full px-6 md:px-8 bg-gray-900 hover:bg-gray-800 text-white text-sm">
                    <Wine className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Browse Wines
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
