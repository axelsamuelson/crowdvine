"use client";

import { useRef } from "react";
import { LenisProvider } from "./lenis-provider";
import { CustomCursor } from "./custom-cursor";
import { HeroSection } from "./sections/hero-section";
import { ManifestoSection } from "./sections/manifesto-section";
import { InviteWinesSection } from "./sections/invite-wines-section";
import {
  InvitationTypeSection,
  type InvitationFormData,
  type InvitationType,
} from "./sections/invitation-type-section";

export interface OpusLandingViewProps {
  /** Types the user can sign up as. At least one. */
  allowedTypes: InvitationType[];
  /** Default/initial type when user cannot change. */
  defaultType: InvitationType;
  /** If true, user can switch between allowed types on the invite page. */
  canChangeAccountType: boolean;
  /** Membership level from invitation – only this card is shown. */
  initialMembershipLevel?: string | null;
  /** Name of the person who sent the invitation. */
  inviterName?: string | null;
  formData: InvitationFormData;
  onFormChange: (data: Partial<InvitationFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  /** When set, the invitation section is replaced by "Welcome {name}" and user stays on the page. */
  welcomeName?: string | null;
  /** When true and welcomeName is set, show producer setup steps instead of "Go to platform". */
  isProducerOnly?: boolean;
  /** Optional extra content (e.g. links) rendered below the form. */
  extraContent?: React.ReactNode;
  /** Fires once when the user first edits a signup field (analytics). */
  onSignupStarted?: () => void;
}

/**
 * Invite landing page. Used on /i/[code] when the invitation is valid.
 */
export function OpusLandingView({
  allowedTypes,
  defaultType,
  canChangeAccountType,
  initialMembershipLevel,
  inviterName,
  formData,
  onFormChange,
  onSubmit,
  submitting,
  welcomeName,
  isProducerOnly = false,
  extraContent,
  onSignupStarted,
}: OpusLandingViewProps) {
  const isBusinessOnly =
    allowedTypes.length === 1 && allowedTypes[0] === "business";
  const signupStartedRef = useRef(false);

  const handleFormChange = (data: Partial<InvitationFormData>) => {
    onFormChange(data);
    if (!signupStartedRef.current && onSignupStarted) {
      const merged = { ...formData, ...data };
      const touched = Boolean(
        merged.full_name?.trim() ||
          merged.email?.trim() ||
          merged.password ||
          merged.password_confirm ||
          merged.producer_name?.trim() ||
          merged.producer_country_code ||
          merged.producer_region,
      );
      if (touched) {
        signupStartedRef.current = true;
        onSignupStarted();
      }
    }
  };

  return (
    <div className="invite-opus-page custom-cursor bg-background min-h-screen">
      <CustomCursor />
      <LenisProvider>
        <main className="bg-background">
          <HeroSection showDirtyWineLogo={isBusinessOnly} />
          <ManifestoSection isBusinessOnly={isBusinessOnly} isProducerOnly={isProducerOnly} />
          {isBusinessOnly && <InviteWinesSection />}
          <InvitationTypeSection
            allowedTypes={allowedTypes}
            defaultType={defaultType}
            canChangeAccountType={canChangeAccountType}
            initialMembershipLevel={initialMembershipLevel}
            inviterName={inviterName}
            welcomeName={welcomeName}
            isProducerOnly={isProducerOnly}
            formData={formData}
            onFormChange={handleFormChange}
            onSubmit={onSubmit}
            submitting={submitting}
            showDirtyWineLogo={isBusinessOnly}
          />
          {extraContent}
        </main>
      </LenisProvider>
    </div>
  );
}
