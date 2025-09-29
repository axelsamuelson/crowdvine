"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Clock, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface PalletData {
  id: string;
  name: string;
  description?: string;
  bottle_capacity: number;
  cost_cents: number;
  delivery_zone: {
    id: string;
    name: string;
    zone_type: string;
  };
  pickup_zone: {
    id: string;
    name: string;
    zone_type: string;
  };
  created_at: string;
}

interface ProgressData {
  bottles_reserved: number;
  total_capacity: number;
  percentage: number;
  days_until_deadline: number;
}

interface Producer {
  id: string;
  name: string;
  region: string;
  country_code: string;
}

interface PalletResponse {
  pallet: PalletData;
  progress: ProgressData;
  producers: Producer[];
}

export default function PalletInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const [palletData, setPalletData] = useState<PalletResponse | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const code = params.code as string;

  useEffect(() => {
    if (code) {
      validateInvitationAndLoadPallet();
    }
  }, [code]);

  const validateInvitationAndLoadPallet = async () => {
    try {
      // Validate invitation
      const invitationResponse = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const invitationData = await invitationResponse.json();

      if (!invitationData.success) {
        toast.error(invitationData.error || "Invalid invitation code");
        router.push("/access-request");
        return;
      }

      setInvitation(invitationData.invitation);

      // Load current pallet data
      const palletResponse = await fetch("/api/pallets/current");
      const palletData = await palletResponse.json();

      if (palletResponse.ok) {
        setPalletData(palletData);
      } else {
        console.error("Failed to load pallet data:", palletData.error);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load invitation data");
      router.push("/access-request");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPallet = async () => {
    setJoining(true);
    try {
      // Redirect to shop with pallet context
      router.push(`/shop?pallet=${palletData?.pallet.id}&invitation=${code}`);
    } catch (error) {
      console.error("Error joining pallet:", error);
      toast.error("Failed to join pallet");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!invitation || !palletData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Invalid Invitation
            </h1>
            <p className="text-slate-600 mb-6">
              This invitation is not valid or has expired.
            </p>
            <Button onClick={() => router.push("/access-request")}>
              Request Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { pallet, progress, producers } = palletData;
  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isUsed = invitation.currentUses > 0;

  if (isExpired || isUsed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              {isExpired ? "Invitation Expired" : "Invitation Already Used"}
            </h1>
            <p className="text-slate-600 mb-6">
              {isExpired
                ? "This invitation has expired. Please request a new one."
                : "This invitation has already been used."}
            </p>
            <Button onClick={() => router.push("/access-request")}>
              Request Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              🎉 Congratulations! You've been invited to PACT
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              PACT is a members-only platform where people buy wine together by sharing pallets – just like a wine importer.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Current Pallet Section */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {pallet.name}
              </h2>
              <p className="text-slate-600 text-lg">
                {pallet.description || "Join this exclusive pallet and get access to premium wines at wholesale prices."}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold text-slate-900">
                  {progress.bottles_reserved} / {progress.total_capacity} bottles reserved
                </span>
                <Badge variant="outline" className="text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  Closes in {progress.days_until_deadline} days
                </Badge>
              </div>
              
              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="text-center mt-2 text-sm text-slate-600">
                {progress.percentage}% complete
              </div>
            </div>

            {/* Producers */}
            {producers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">
                  Featured Producers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {producers.map((producer) => (
                    <div key={producer.id} className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="font-medium text-slate-900">{producer.name}</div>
                      <div className="text-sm text-slate-600">{producer.region}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="text-center">
              <Button
                onClick={handleJoinPallet}
                disabled={joining}
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {joining ? (
                  "Joining..."
                ) : (
                  <>
                    Join the pallet
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
              <p className="text-sm text-slate-500 mt-4 max-w-md mx-auto">
                No commitment – just reserve your share. Your spot is safe until the pallet is full.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Proof */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-slate-600">
            <Users className="w-5 h-5" />
            <span className="text-lg">
              PACT members already saved 37% vs retail prices. Invitation-only access means only a few can join each pallet.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
