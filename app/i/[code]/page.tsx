"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLayout } from "@/components/layout/page-layout";
import { UserPlus, Check, X, Loader2, ArrowRight, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";


interface Pallet {
  id: string;
  name: string;
  description?: string;
  bottle_capacity: number;
  total_booked_bottles: number;
  remaining_bottles: number;
  completion_percentage: number;
  wine_summary: Array<{
    wine_name: string;
    vintage: string;
    grape_varieties: string;
    color: string;
    producer: string;
    total_quantity: number;
  }>;
  delivery_zone?: {
    name: string;
  };
  pickup_zone?: {
    name: string;
  };
}

interface Invitation {
  id: string;
  code: string;
  created_by: string;
  current_uses: number;
  max_uses: number;
  expires_at: string;
  initial_level?: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export default function InviteSignupPage() {
  const params = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [palletLoading, setPalletLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const code = params.code as string;

  useEffect(() => {
    if (code) {
      // Run both functions in parallel but ensure loading is set to false
      Promise.all([
        validateInvitation(),
        fetchCurrentPallet()
      ]).catch((error) => {
        console.error("Error in useEffect:", error);
        setLoading(false);
      });
    }
  }, [code]);

  const validateInvitation = async () => {
    try {
      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        setInvitation(data.invitation);
      } else {
        toast.error(data.error || "Invalid invitation code");
        router.push("/access-request");
      }
    } catch (error) {
      console.error("Error validating invitation:", error);
      toast.error("Failed to validate invitation");
      router.push("/access-request");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPallet = async () => {
    try {
      setPalletLoading(true);
      console.log("[INVITE-PAGE] Fetching pallet data");
      const response = await fetch("/api/pallet-data");
      
      if (!response.ok) {
        console.log("[INVITE-PAGE] Pallet API not available, status:", response.status);
        // Fall back to mock data
        setMockPalletData();
        setPalletLoading(false);
        return;
      }
      
      const pallets = await response.json();
      console.log("[INVITE-PAGE] Received pallets:", pallets?.length || 0);
      
      if (pallets && pallets.length > 0) {
        // Get the most filled OPEN pallet
        const openPallets = pallets.filter((p: any) => 
          p.status === 'placed' || p.status === 'pending' || p.status === 'confirmed'
        );
        
        console.log("[INVITE-PAGE] Open pallets found:", openPallets.length);
        
        if (openPallets.length > 0) {
          // Sort by fill percentage (descending)
          const sortedPallets = openPallets.sort((a: any, b: any) => {
            const aPercent = (a.total_bottles_on_pallet / a.capacity_bottles) * 100;
            const bPercent = (b.total_bottles_on_pallet / b.capacity_bottles) * 100;
            return bPercent - aPercent;
          });
          
          const mostFilledPallet = sortedPallets[0];
          console.log("[INVITE-PAGE] Most filled pallet:", mostFilledPallet.from_zone_name, "to", mostFilledPallet.to_zone_name);
          
          setPallet({
            id: mostFilledPallet.id,
            name: `${mostFilledPallet.from_zone_name} to ${mostFilledPallet.to_zone_name}`,
            description: `A curated selection of wines from ${mostFilledPallet.from_zone_name}`,
            bottle_capacity: mostFilledPallet.capacity_bottles,
            total_booked_bottles: mostFilledPallet.total_bottles_on_pallet,
            remaining_bottles: mostFilledPallet.capacity_bottles - mostFilledPallet.total_bottles_on_pallet,
            completion_percentage: (mostFilledPallet.total_bottles_on_pallet / mostFilledPallet.capacity_bottles) * 100,
            wine_summary: [],
            delivery_zone: { name: mostFilledPallet.to_zone_name },
            pickup_zone: { name: mostFilledPallet.from_zone_name }
          });
        } else {
          console.log("[INVITE-PAGE] No open pallets, using mock data");
          setMockPalletData();
        }
      } else {
        console.log("[INVITE-PAGE] No pallets returned, using mock data");
        setMockPalletData();
      }
    } catch (error) {
      console.error("[INVITE-PAGE] Error fetching pallet:", error);
      setMockPalletData();
    } finally {
      setPalletLoading(false);
    }
  };

  const setMockPalletData = () => {
    setPallet({
      id: "mock-pallet",
      name: "Beziers to Stockholm",
      description: "A curated selection of exceptional wines from Beziers, delivered to Stockholm",
      bottle_capacity: 600,
      total_booked_bottles: 542,
      remaining_bottles: 58,
      completion_percentage: 90.3,
      wine_summary: [
        {
          wine_name: "Matiere Noire",
          vintage: "2024",
          grape_varieties: "Grenache",
          color: "White",
          producer: "Domaine de la Côte",
          total_quantity: 150
        },
        {
          wine_name: "Les Vignes de l'Étoile",
          vintage: "2023",
          grape_varieties: "Syrah, Grenache",
          color: "Red",
          producer: "Château de la Mer",
          total_quantity: 200
        },
        {
          wine_name: "Côte de Languedoc",
          vintage: "2023",
          grape_varieties: "Carignan, Cinsault",
          color: "Red",
          producer: "Domaine des Collines",
          total_quantity: 192
        }
      ],
      delivery_zone: { name: "Stockholm 50km" },
      pickup_zone: { name: "Stockholm Pickup Point" }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitation_code: code,
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          full_name: formData.full_name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.autoSignedIn && data.session) {
          // User was automatically signed in
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          toast.success("Account created and signed in successfully!");
          
          // Redirect to home page after a short delay
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        } else {
          // Auto sign-in failed, redirect to login
          toast.success("Account created successfully! Please log in.");
          router.push("/log-in");
        }
      } else {
        // Handle security validation errors
        if (data.error && data.error.includes("Security validation failed")) {
          toast.error("Security validation failed. Please try signing in manually.");
          router.push("/log-in");
        } else {
          toast.error(data.error || "Failed to create account");
        }
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!invitation) {
    return (
      <PageLayout>
        <div className="text-center py-10">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-4">
            This invitation code is not valid or has expired.
          </p>
          <Button onClick={() => router.push("/access-request")}>
            Request Access
          </Button>
        </div>
      </PageLayout>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isUsed = invitation.current_uses > 0;

  if (isExpired || isUsed) {
    return (
      <PageLayout>
        <div className="text-center py-10">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? "Invitation Expired" : "Invitation Already Used"}
          </h1>
          <p className="text-gray-600 mb-4">
            {isExpired
              ? "This invitation has expired. Please request a new one."
              : "This invitation has already been used."}
          </p>
          <Button onClick={() => router.push("/access-request")}>
            Request Access
          </Button>
        </div>
      </PageLayout>
    );
  }

  // Get sender name from invitation data with safe access
  const senderName = (() => {
    try {
      // Try full_name first, then email username, then fallback
      if (invitation?.profiles?.full_name) {
        return invitation.profiles.full_name;
      }
      if (invitation?.profiles?.email) {
        return invitation.profiles.email.split('@')[0];
      }
      return "A friend";
    } catch (error) {
      console.error("Error getting sender name:", error);
      return "A friend";
    }
  })();

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="text-2xl font-bold tracking-tight text-gray-900">
              PACT
            </div>
          </div>

          {/* Personal Intro Section */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              🎉 Congratulations!
            </h1>
            <p className="text-lg text-gray-700 mb-4">
              {senderName} has given you access to PACT.
            </p>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              PACT is a members-only platform where people buy wine together by sharing pallets – just like a wine importer.
            </p>
          </div>

          {/* Membership Level Info */}
          {invitation.initial_level && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 border border-blue-200/50 shadow-sm">
              <div className="flex flex-col items-center text-center">
                {/* Circle Badge with Icon */}
                <div className="relative mb-4">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
                    invitation.initial_level === 'guld' ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600' :
                    invitation.initial_level === 'silver' ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500' :
                    invitation.initial_level === 'brons' ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600' :
                    'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600'
                  }`}>
                    <UserPlus className="w-12 h-12 text-white" />
                  </div>
                  {/* Ring decoration */}
                  <div className={`absolute inset-0 rounded-full border-4 ${
                    invitation.initial_level === 'guld' ? 'border-yellow-300' :
                    invitation.initial_level === 'silver' ? 'border-gray-300' :
                    invitation.initial_level === 'brons' ? 'border-orange-300' :
                    'border-blue-300'
                  } opacity-30 scale-110`}></div>
                </div>

                {/* Membership Level Text */}
                <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-3 ${
                  invitation.initial_level === 'guld' ? 'bg-yellow-600 text-white' :
                  invitation.initial_level === 'silver' ? 'bg-gray-600 text-white' :
                  invitation.initial_level === 'brons' ? 'bg-orange-600 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {invitation.initial_level.charAt(0).toUpperCase() + invitation.initial_level.slice(1)} Membership
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  You're joining as a {invitation.initial_level.charAt(0).toUpperCase() + invitation.initial_level.slice(1)} member!
                </h3>

                <p className="text-sm text-gray-600 mb-5 max-w-md">
                  {invitation.initial_level === 'guld' && 'Top-tier access with maximum invite quota and exclusive perks'}
                  {invitation.initial_level === 'silver' && 'Trusted member status with early access to drops and priority shipping'}
                  {invitation.initial_level === 'brons' && 'Active member with increased invite quota and queue priority'}
                  {invitation.initial_level === 'basic' && 'Start your PACT journey and earn Impact Points to unlock higher tiers'}
                </p>

                {/* Perks Grid */}
                <div className="flex flex-wrap justify-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-full">
                    <span className="font-semibold text-gray-700">Invite Quota:</span>
                    <span className="font-bold text-gray-900">
                      {invitation.initial_level === 'guld' && '50/month'}
                      {invitation.initial_level === 'silver' && '12/month'}
                      {invitation.initial_level === 'brons' && '5/month'}
                      {invitation.initial_level === 'basic' && '2/month'}
                    </span>
                  </div>
                  
                  {invitation.initial_level === 'guld' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-full">
                      <span className="font-semibold text-gray-700">Fees:</span>
                      <span className="font-bold text-green-600">Waived</span>
                    </div>
                  )}
                  
                  {invitation.initial_level === 'silver' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-full">
                      <span className="font-semibold text-gray-700">Fee:</span>
                      <span className="font-bold text-blue-600">Capped</span>
                    </div>
                  )}
                  
                  {(invitation.initial_level === 'silver' || invitation.initial_level === 'guld') && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-full">
                      <span className="font-semibold text-gray-700">Access:</span>
                      <span className="font-bold text-purple-600">Early Drops</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Signup Form */}
          <Card className="border border-gray-200">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Join PACT Wines
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Create your account to join the platform
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Join the platform
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600"
                    onClick={() => router.push("/log-in")}
                  >
                    Sign in
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar Section */}
          {palletLoading ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-8 animate-pulse">
              <div className="text-center mb-6">
                <div className="h-5 bg-gray-200 rounded w-32 mx-auto mb-3"></div>
                <div className="h-7 bg-gray-200 rounded w-48 mx-auto mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
              </div>
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3"></div>
                <div className="h-4 bg-gray-200 rounded w-24 mx-auto mt-2"></div>
              </div>
            </div>
          ) : pallet ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Join this pallet
                </h3>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {pallet.name}
                </h4>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{pallet.total_booked_bottles}</span>
                  <span>/</span>
                  <span>{pallet.bottle_capacity} bottles</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{pallet.remaining_bottles} remaining</span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-600 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(pallet.completion_percentage, 100)}%` }}
                  />
                </div>
                <div className="text-center mt-2 text-sm font-medium text-gray-700">
                  {pallet.completion_percentage.toFixed(0)}% filled
                </div>
              </div>

              <p className="text-xs text-center text-gray-500">
                When this pallet is full, it ships to {pallet.delivery_zone?.name || 'Stockholm'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}