"use client";

import { LenisProvider } from "./lenis-provider";
import { CustomCursor } from "./custom-cursor";
import { HeroSection } from "./sections/hero-section";
import { ManifestoSection } from "./sections/manifesto-section";
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
}: OpusLandingViewProps) {
  return (
    <div className="invite-opus-page custom-cursor bg-background min-h-screen">
      <CustomCursor />
      <LenisProvider>
        <main className="bg-background">
          <HeroSection />
          <ManifestoSection />
          <InvitationTypeSection
            allowedTypes={allowedTypes}
            defaultType={defaultType}
            canChangeAccountType={canChangeAccountType}
            initialMembershipLevel={initialMembershipLevel}
            inviterName={inviterName}
            welcomeName={welcomeName}
            formData={formData}
            onFormChange={onFormChange}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        </main>
      </LenisProvider>
    </div>
  );
}
