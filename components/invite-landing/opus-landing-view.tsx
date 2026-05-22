"use client";

import { useRef } from "react";
import { LenisProvider } from "./lenis-provider";
import { HeroSection } from "./sections/hero-section";
import { ManifestoSection } from "./sections/manifesto-section";
import { PactStorySections } from "./pact-story-sections";
import { SavingsSection } from "@/components/invite/SavingsSection";
import { PalletActivitySection } from "@/components/invite/PalletActivitySection";
import { WineDiscoverySection } from "@/components/invite/WineDiscoverySection";
import { InviteWinesSection } from "./sections/invite-wines-section";
import type { InvitePalletSnapshot } from "@/lib/invite-landing/invite-landing-data";
import type { Product } from "@/lib/shopify/types";
import {
  InvitationTypeSection,
  type InvitationFormData,
  type InvitationType,
  type InviteWineZoneGeoProps,
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
  /** Optional IP geo zone preselect + US hints (consumer invite). */
  wineZoneGeo?: InviteWineZoneGeoProps;
  /** Consumer invite: wines + pallet snapshot from page (no fetch in sections). */
  inviteLandingData?: {
    products?: Product[];
    pallet: InvitePalletSnapshot;
    producerNames: string[];
  };
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
  wineZoneGeo,
  inviteLandingData,
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
          merged.active_geo_zone_id?.trim() ||
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
    <div className="invite-opus-page bg-background min-h-screen">
      <LenisProvider>
        <main className="bg-background">
          <HeroSection showDirtyWineLogo={isBusinessOnly} />
          <ManifestoSection isBusinessOnly={isBusinessOnly} isProducerOnly={isProducerOnly} />
          {!isBusinessOnly && (
            <>
              <SavingsSection products={inviteLandingData?.products} />
              <PalletActivitySection
                pallet={
                  inviteLandingData?.pallet ?? {
                    filled: 143,
                    capacity: 180,
                  }
                }
                products={inviteLandingData?.products}
                producerNames={inviteLandingData?.producerNames ?? []}
              />
              <WineDiscoverySection products={inviteLandingData?.products} />
            </>
          )}
          {!isBusinessOnly && <PactStorySections />}
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
            wineZoneGeo={wineZoneGeo}
          />
          {extraContent}
        </main>
      </LenisProvider>
    </div>
  );
}
