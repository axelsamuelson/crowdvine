"use client";

import { motion } from "framer-motion";
import type { MembershipLevel } from "@/lib/membership/points-engine";
import { INVITE_QUOTAS } from "@/lib/membership/points-engine";
import { LogoSvg } from "@/components/layout/header/logo-svg";
import { PactLogo } from "./pact-logo";

const MEMBERSHIP_LEVELS: Exclude<MembershipLevel, "requester" | "admin">[] = [
  "basic",
  "brons",
  "silver",
  "guld",
  "privilege",
];

const MEMBERSHIP_CONFIG: Record<
  Exclude<MembershipLevel, "requester" | "admin">,
  { name: string; description: string }
> = {
  basic: {
    name: "Basic",
    description: "Entry level access to all wines and basic community features",
  },
  brons: {
    name: "Plus",
    description: "Enhanced invite quota and queue priority for popular drops",
  },
  silver: {
    name: "Premium",
    description: "Early access to new releases and reduced service fees",
  },
  guld: {
    name: "Priority",
    description: "High invite quota, priority access, and exclusive perks",
  },
  privilege: {
    name: "Privilege",
    description: "Maximum invite quota, top priority, and exclusive benefits",
  },
};

interface MetallicMembershipCardProps {
  variant: Exclude<MembershipLevel, "requester" | "admin">;
  /** When set, shows member name with engraving animation. */
  memberName?: string | null;
  /** When true, use PACT logo instead of host-based logo. For consumer invitations. */
  usePactLogo?: boolean;
}

export function MetallicMembershipCard({
  variant,
  memberName,
  usePactLogo = false,
}: MetallicMembershipCardProps) {
  const config = MEMBERSHIP_CONFIG[variant];
  const quota = INVITE_QUOTAS[variant];
  const showEngravedName = !!memberName?.trim();

  return (
    <div className={`membership-card-wrapper variant-${variant}`} data-variant={variant}>
      <div className="membership-card-container">
        <div className="membership-card-inner">
          <div className="membership-card-border-outer">
            <div className="membership-card-main" />
          </div>
          <div className="membership-card-glow-1" />
          <div className="membership-card-glow-2" />
        </div>
        <div className="membership-card-overlay-1" />
        <div className="membership-card-overlay-2" />
        <div className="membership-card-bg-glow" />
        <div className="membership-card-content">
          <div className="membership-card-content-top">
            <div className="membership-card-logo-wrapper">
              {usePactLogo ? (
                <PactLogo className="membership-card-logo h-8 w-auto" />
              ) : (
                <LogoSvg className="membership-card-logo h-8 w-auto" />
              )}
            </div>
            <div className="membership-card-scrollbar-glass">{config.name}</div>
            {showEngravedName && (
              <div className="membership-card-member-name">
                <motion.span
                  className="membership-card-engraved-name"
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  animate={{ clipPath: "inset(0 0 0 0)" }}
                  transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {memberName}
                </motion.span>
              </div>
            )}
          </div>
          <hr className="membership-card-divider" />
          <div className="membership-card-content-bottom">
            <p className="membership-card-description">{config.description}</p>
            <p className="membership-card-quota">{quota} invites/month</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const VALID_LEVELS = new Set(MEMBERSHIP_LEVELS);

export function MembershipCardsGrid({
  initialMembershipLevel,
  memberName,
}: {
  initialMembershipLevel?: string | null;
  memberName?: string | null;
} = {}) {
  const levelToShow =
    initialMembershipLevel && VALID_LEVELS.has(initialMembershipLevel as (typeof MEMBERSHIP_LEVELS)[number])
      ? (initialMembershipLevel as (typeof MEMBERSHIP_LEVELS)[number])
      : "basic";

  return (
    <div className="membership-cards-grid">
      <MetallicMembershipCard variant={levelToShow} memberName={memberName} />
    </div>
  );
}
