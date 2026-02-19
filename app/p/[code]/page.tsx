"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OpusLandingView } from "@/components/invite-landing/opus-landing-view";

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
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export default function ProducerInvitePage() {
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
    selected_type: null as InvitationPageType | null,
    producer_name: "",
    producer_country_code: "",
    producer_region: "",
    address_street: "",
    address_city: "",
    address_postcode: "",
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState<string | null>(null);

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
        const allowed = inv?.allowed_types ?? (inv?.invitation_type ? [inv.invitation_type] : ["producer"]);
        const hasProducer = allowed.includes("producer");
        if (!hasProducer || inv?.used_at) {
          router.push("/access-request");
          return;
        }
        // If consumer-only, redirect to consumer invite URL
        if (allowed.length === 1 && allowed[0] === "consumer") {
          router.replace(`/i/${code}`);
          return;
        }
        if (allowed.includes("business")) {
          router.replace(`/b/${code}`);
          return;
        }
        setInvitation(inv);
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
          ...(invitation?.can_change_account_type && {
            selected_type: formData.selected_type ?? "producer",
          }),
          producer_data: {
            name: formData.producer_name?.trim() || formData.full_name?.trim(),
            country_code: formData.producer_country_code || "",
            region: formData.producer_region || "",
            address_street: formData.address_street || "",
            address_city: formData.address_city || "",
            address_postcode: formData.address_postcode || "",
          },
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

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isUsed = !!invitation.used_at;

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
      : ["producer"];
  const defaultType: InvitationPageType = "producer";
  const canChangeAccountType = !!invitation.can_change_account_type;

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
      isProducerOnly={true}
    />
  );
}
