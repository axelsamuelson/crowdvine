"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OpusLandingView } from "@/components/invite-landing/opus-landing-view";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { trackInvitationValidationClientFailure } from "@/lib/analytics/invitation-client-helpers";
import {
  matchGeoZone,
  type DetectedLocation,
  type GeoZoneMatchRow,
} from "@/lib/geo-zones/detect-zone";
import type { EligibleGeoZoneRow } from "@/components/market/invite-wine-zone-field";
import type { Product } from "@/lib/shopify/types";
import {
  pickInvitePallet,
  uniqueProducerNames,
  type InvitePalletSnapshot,
  INVITE_PALLET_DISPLAY_CAPACITY,
  INVITE_PALLET_PLACEHOLDER_FILLED,
} from "@/lib/invite-landing/invite-landing-data";

export type InvitationPageType = "consumer" | "producer" | "business";

interface Invitation {
  id: string;
  code: string;
  created_by: string;
  max_uses: number;
  expires_at: string;
  initial_level?: string;
  invitation_type?: InvitationPageType;
  allowed_types?: InvitationPageType[];
  can_change_account_type?: boolean;
  used_at?: string | null;
  /** Reusable /i personal link — never "consumed" as single-use */
  is_personal_link?: boolean;
  /** From validate API when invitation_codes.default_geo_zone_id is set (migration 146). */
  defaultGeoZoneId?: string | null;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export default function InviteSignupPage() {
  const params = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    full_name: "",
    active_geo_zone_id: "",
    selected_type: null as InvitationPageType | null,
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] =
    useState<DetectedLocation | null>(null);
  const [eligibleZones, setEligibleZones] = useState<EligibleGeoZoneRow[]>([]);
  const [zoneAutoDetected, setZoneAutoDetected] = useState(false);
  const [zoneManuallyChanged, setZoneManuallyChanged] = useState(false);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [inviteProducts, setInviteProducts] = useState<Product[] | undefined>(
    undefined,
  );
  const [invitePallet, setInvitePallet] = useState<InvitePalletSnapshot>({
    filled: INVITE_PALLET_PLACEHOLDER_FILLED,
    capacity: INVITE_PALLET_DISPLAY_CAPACITY,
  });

  const code = params.code as string;

  useEffect(() => {
    if (code) {
      validateInvitation();
    }
  }, [code]);

  useEffect(() => {
    if (!loading && invitation) {
      window.scrollTo(0, 0);
    }
  }, [loading, invitation]);

  useEffect(() => {
    const id = invitation?.defaultGeoZoneId?.trim();
    if (!id) return;
    setFormData((prev) => ({
      ...prev,
      active_geo_zone_id: prev.active_geo_zone_id || id,
    }));
  }, [invitation?.defaultGeoZoneId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/geo-zones/eligible", { cache: "no-store" });
        const data = (await res.json()) as { geoZones?: EligibleGeoZoneRow[] };
        if (!cancelled) {
          setEligibleZones(Array.isArray(data.geoZones) ? data.geoZones : []);
        }
      } catch {
        if (!cancelled) setEligibleZones([]);
      } finally {
        if (!cancelled) setZonesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!invitation || !zonesLoaded) return;
    if (invitation.defaultGeoZoneId?.trim()) return;
    if (!detectedLocation) return;
    const hasGeo =
      detectedLocation.country ||
      detectedLocation.city ||
      detectedLocation.region;
    if (!hasGeo) return;

    const matchedId = matchGeoZone(
      eligibleZones as GeoZoneMatchRow[],
      detectedLocation,
    );
    if (!matchedId) return;

    setZoneAutoDetected(true);
    setFormData((prev) => {
      if (prev.active_geo_zone_id?.trim()) return prev;
      return { ...prev, active_geo_zone_id: matchedId };
    });
  }, [invitation, zonesLoaded, eligibleZones, detectedLocation]);

  useEffect(() => {
    if (!invitation) return;
    let cancelled = false;
    (async () => {
      try {
        const [productsRes, palletRes] = await Promise.all([
          fetch("/api/crowdvine/products?limit=24", { cache: "no-store" }),
          fetch("/api/pallet-data", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (productsRes.ok) {
          const list = (await productsRes.json()) as Product[];
          setInviteProducts(Array.isArray(list) ? list : []);
        }
        if (palletRes.ok) {
          const rows = (await palletRes.json()) as Parameters<
            typeof pickInvitePallet
          >[0];
          setInvitePallet(pickInvitePallet(rows));
        }
      } catch {
        /* placeholders remain */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invitation]);

  const validateInvitation = async () => {
    try {
      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        const inv = data.invitation;
        const allowed = inv?.allowed_types ?? inv?.invitation_type ? [inv.invitation_type] : ["consumer"];
        const hasBusiness = allowed.includes("business");
        const hasConsumer = allowed.includes("consumer");
        const hasProducer = allowed.includes("producer");
        const hasUser = hasConsumer || hasProducer;
        if (hasBusiness && hasUser) {
          router.replace(`/ib/${code}`);
          return;
        }
        if (hasProducer && !hasConsumer) {
          router.replace(`/p/${code}`);
          return;
        }
        setInvitation(inv);
        if (data.detectedLocation) {
          setDetectedLocation(data.detectedLocation as DetectedLocation);
        }
      } else {
        trackInvitationValidationClientFailure(
          String(data.error || "Invalid invitation code"),
        );
        toast.error(data.error || "Invalid invitation code");
        router.push("/access-request");
      }
    } catch (error) {
      console.error("Error validating invitation:", error);
      trackInvitationValidationClientFailure("network_error");
      toast.error("Failed to validate invitation");
      router.push("/access-request");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.password_confirm) {
      toast.error("Passwords do not match.");
      return;
    }
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
          activeGeoZoneId: formData.active_geo_zone_id,
          ...(invitation?.can_change_account_type && {
            selected_type: formData.selected_type ?? allowedTypes[0],
          }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.autoSignedIn && data.session) {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
        setRegisteredName((formData.full_name || "").trim() || "there");
        setSignupSuccess(true);
      } else {
        if (data.error && data.error.includes("Security validation failed")) {
          toast.error(
            "Security validation failed. Please try signing in manually.",
          );
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <X className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-light text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            This invitation code is not valid or has expired.
          </p>
          <Button
            onClick={() => router.push("/access-request")}
            className="bg-black hover:bg-black/90 text-white"
          >
            Request Access
          </Button>
        </div>
      </div>
    );
  }

  const isPersonal = !!invitation.is_personal_link;
  const isExpired =
    !!invitation.expires_at &&
    !isPersonal &&
    new Date(invitation.expires_at) < new Date();
  const isUsed = !!invitation.used_at && !isPersonal;

  if (isExpired || isUsed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <X className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-light text-gray-900 mb-2">
            {isExpired ? "Invitation Expired" : "Invitation Already Used"}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {isExpired
              ? "This invitation has expired. Please request a new one."
              : "This invitation has already been used."}
          </p>
          <Button
            onClick={() => router.push("/access-request")}
            className="bg-black hover:bg-black/90 text-white"
          >
            Request Access
          </Button>
        </div>
      </div>
    );
  }

  const allowedTypes: InvitationPageType[] =
    invitation.allowed_types && invitation.allowed_types.length > 0
      ? invitation.allowed_types
      : invitation.invitation_type === "producer" ||
          invitation.invitation_type === "business"
        ? [invitation.invitation_type]
        : ["consumer"];
  const defaultType: InvitationPageType = allowedTypes[0];
  const canChangeAccountType = !!invitation.can_change_account_type;

  // Initialize selected_type when can change and not yet set
  const effectiveFormData =
    canChangeAccountType && formData.selected_type == null
      ? { ...formData, selected_type: defaultType }
      : formData;

  return (
    <OpusLandingView
      allowedTypes={allowedTypes}
      defaultType={defaultType}
      canChangeAccountType={canChangeAccountType}
      initialMembershipLevel={invitation.initial_level}
      inviterName={invitation.profiles?.full_name}
      formData={effectiveFormData}
      onFormChange={(data) =>
        setFormData((prev) => ({ ...prev, ...data }))
      }
      onSubmit={handleSubmit}
      submitting={submitting}
      welcomeName={signupSuccess ? registeredName : null}
      onSignupStarted={() =>
        void AnalyticsTracker.trackEvent({
          eventType: "invitation_signup_started",
          eventCategory: "invitation",
          metadata: { surface: "i_consumer" },
        })
      }
      wineZoneGeo={{
        zones: eligibleZones,
        detectedLocation,
        zoneAutoDetected,
        zoneManuallyChanged,
        showUsNoMatchHint:
          detectedLocation?.country?.trim().toUpperCase() === "US" &&
          !invitation.defaultGeoZoneId?.trim() &&
          zonesLoaded &&
          !zoneAutoDetected,
        onZoneManualChange: () => setZoneManuallyChanged(true),
      }}
      inviteLandingData={{
        products: inviteProducts,
        pallet: invitePallet,
        producerNames: uniqueProducerNames(inviteProducts),
      }}
    />
  );
}
