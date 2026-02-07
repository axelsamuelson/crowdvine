"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OpusLandingView } from "@/components/invite-landing/opus-landing-view";

type InvitationPageType = "consumer" | "producer" | "business";

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

export default function BusinessInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    full_name: "",
    selected_type: null as InvitationPageType | null,
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch("/api/invitations/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          router.push("/access-request");
          return;
        }
        const inv = data.invitation;
        const allowed = inv?.allowed_types ?? (inv?.invitation_type ? [inv.invitation_type] : []);
        const hasBusiness = allowed.includes("business");
        const hasUser = allowed.some((t: string) => ["consumer", "producer"].includes(t));
        if (inv?.used_at || !hasBusiness) {
          router.push("/access-request");
          return;
        }
        if (hasBusiness && hasUser) {
          router.replace(`/ib/${code}`);
          return;
        }
        setInvitation(inv);
      })
      .catch(() => router.push("/access-request"))
      .finally(() => setLoading(false));
  }, [code, router]);

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
            selected_type: formData.selected_type ?? ["business"][0],
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
      <PageLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!invitation) return null;

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isUsed = !!invitation.used_at;

  if (isExpired || isUsed) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-24 p-4">
          <div className="w-full max-w-md text-center">
            <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-light text-foreground mb-2">
              {isExpired ? "Invitation Expired" : "Invitation Already Used"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
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
      </PageLayout>
    );
  }

  const allowedTypes: InvitationPageType[] = ["business"];
  const defaultType: InvitationPageType = "business";
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
    />
  );
}
