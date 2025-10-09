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
  profiles?: {
    email: string;
  };
}

export default function InviteSignupPage() {
  const params = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [loading, setLoading] = useState(true);
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
      const response = await fetch("/api/admin/pallets");
      
      if (!response.ok) {
        console.log("Pallet API not available, using mock data");
        setMockPalletData();
        setLoading(false);
        return;
      }
      
      const pallets = await response.json();
      
      if (pallets && pallets.length > 0) {
        // Get the most recent active pallet
        const activePallet = pallets.find((p: Pallet) => !p.is_complete) || pallets[0];
        setPallet(activePallet);
      } else {
        // Create mock pallet data for demonstration
        setMockPalletData();
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching pallet:", error);
      // Create mock pallet data for demonstration
      setMockPalletData();
      setLoading(false);
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
        <div className="max-w-2xl mx-auto px-4 py-12">
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
          {pallet && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Help {senderName === "A friend" ? "your friend" : senderName} bring this pallet home
                </h3>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {pallet.name}
                </h4>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{pallet.total_booked_bottles} / {pallet.bottle_capacity} bottles reserved</span>
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-600 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(pallet.completion_percentage, 100)}%` }}
                  />
                </div>
                <div className="text-center mt-2 text-sm text-gray-600">
                  {pallet.completion_percentage.toFixed(1)}% complete
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}