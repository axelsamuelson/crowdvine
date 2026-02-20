"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { ChevronDown, Copy } from "lucide-react";
import { getLevelInfo } from "@/lib/membership/points-engine";
import { MetallicMembershipCard } from "../metallic-membership-card";
import { DirtyWineLogo } from "../dirty-wine-logo";
import { buildInviteUrl } from "@/lib/invitation-path";

export type InvitationType = "consumer" | "producer" | "business";

export interface InvitationFormData {
  full_name: string;
  email: string;
  password: string;
  password_confirm: string;
  selected_type?: InvitationType | null;
  // Producer fields (used when isProducerOnly)
  producer_name?: string;
  producer_country_code?: string;
  producer_region?: string;
  address_street?: string;
  address_city?: string;
  address_postcode?: string;
}

type CountryOption = { code: string; name: string };
type RegionOption = { value: string; label: string };

const INVITATION_TYPE_LABELS: Record<InvitationType, string> = {
  consumer: "Consumer",
  producer: "Producer",
  business: "Business",
};

type FormStep = 1 | 2 | 3 | 4 | 5;

interface InvitationTypeSectionProps {
  allowedTypes: InvitationType[];
  defaultType: InvitationType;
  canChangeAccountType: boolean;
  initialMembershipLevel?: string | null;
  inviterName?: string | null;
  welcomeName?: string | null;
  formData: InvitationFormData;
  onFormChange: (data: Partial<InvitationFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  /** When true, show Dirty Wine logo instead of "Sign up to claim membership" */
  showDirtyWineLogo?: boolean;
  /** When true, form has 6 steps (account + producer); submit on step 6. */
  isProducerOnly?: boolean;
}

const validLevels = ["basic", "brons", "silver", "guld", "privilege"] as const;

function toTitleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function InvitationTypeSection({
  allowedTypes,
  defaultType,
  canChangeAccountType,
  initialMembershipLevel,
  inviterName,
  welcomeName,
  formData,
  onFormChange,
  onSubmit,
  submitting,
  showDirtyWineLogo = false,
  isProducerOnly = false,
}: InvitationTypeSectionProps) {
  const [step, setStep] = useState<FormStep>(1);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);

  useEffect(() => {
    if (!isProducerOnly) return;
    fetch("/api/countries")
      .then((r) => r.json())
      .then((json) => setCountries(json.countries ?? []))
      .catch(() => setCountries([]));
  }, [isProducerOnly]);

  useEffect(() => {
    if (!isProducerOnly || !formData.producer_country_code) {
      setRegions([]);
      return;
    }
    const url = `/api/regions?country_code=${encodeURIComponent(formData.producer_country_code)}`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => setRegions(json.regions ?? []))
      .catch(() => setRegions([]));
  }, [isProducerOnly, formData.producer_country_code]);

  const currentType =
    canChangeAccountType && formData.selected_type && allowedTypes.includes(formData.selected_type)
      ? formData.selected_type
      : defaultType;

  const levelKey =
    initialMembershipLevel && validLevels.includes(initialMembershipLevel as (typeof validLevels)[number])
      ? (initialMembershipLevel as (typeof validLevels)[number])
      : "basic";
  const inviterDisplayName = inviterName?.trim() || "a member";
  const isWelcome = !!welcomeName?.trim();
  const displayName = welcomeName ? toTitleCase(welcomeName) : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmError(null);
    // Producer invite: only allow submit when step 5 is reached (producer part complete)
    if (isProducerOnly && step !== 5) {
      return;
    }
    if (formData.password !== formData.password_confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    onSubmit(e);
  };

  const goToStep = (next: FormStep) => {
    if (next <= step) {
      setStep(next);
      return;
    }
    if (step === 1 && next === 2 && formData.full_name.trim()) setStep(2);
    if (step === 2 && next === 3 && formData.email.trim()) setStep(3);
    if (step === 3 && next === 4 && formData.password && formData.password_confirm) setStep(4);
    if (step === 4 && next === 5 && formData.producer_name?.trim() && formData.producer_country_code && formData.producer_region) setStep(5);
  };

  const canProceedFrom1 = formData.full_name.trim().length > 0;
  const canProceedFrom2 = formData.email.trim().length > 0;
  const canProceedFrom4 =
    (formData.producer_name?.trim()?.length ?? 0) > 0 &&
    (formData.producer_country_code?.length ?? 0) > 0 &&
    (formData.producer_region?.length ?? 0) > 0;
  const showSubmitButton = isProducerOnly ? step === 5 : step === 3;
  const showContinueOn3 = isProducerOnly && step === 3;

  const isConsumerOnly =
    allowedTypes.length === 1 && allowedTypes[0] === "consumer";

  // Invite-friends section state (consumer welcome only)
  const inviteSectionRef = useRef<HTMLDivElement>(null);
  const [inviteData, setInviteData] = useState<{
    active: Array<{ id: string; code: string; signupUrl?: string; allowed_types?: string[] }>;
    used: Array<unknown>;
  } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatingSlot, setGeneratingSlot] = useState<number | null>(null);
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);

  const fetchInvitations = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/user/invitations");
      if (!res.ok) return;
      const data = await res.json();
      const active = (data.active || []).map((inv: { code: string; allowed_types?: string[] }) => ({
        ...inv,
        signupUrl: inv.signupUrl || buildInviteUrl(inv.code, inv.allowed_types || ["consumer"]),
      }));
      setInviteData({ active, used: data.used || [] });
    } finally {
      setInviteLoading(false);
    }
  };

  useEffect(() => {
    if (isWelcome && isConsumerOnly) fetchInvitations();
  }, [isWelcome, isConsumerOnly]);

  const scrollToInviteSection = () => {
    inviteSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateInvite = async (slotIndex: number) => {
    setGeneratingSlot(slotIndex);
    try {
      const res = await fetch("/api/invitations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation_type: "consumer" }),
      });
      const json = await res.json();
      if (json.invitation?.signupUrl) {
        setInviteData((prev) =>
          prev
            ? {
                ...prev,
                active: [...prev.active, { id: json.invitation.id, code: json.invitation.code, signupUrl: json.invitation.signupUrl, allowed_types: ["consumer"] }],
              }
            : null,
        );
      }
    } finally {
      setGeneratingSlot(null);
    }
  };

  const copyInviteLink = (url: string, slotIndex: number) => {
    navigator.clipboard.writeText(url);
    setCopiedSlot(slotIndex);
    setTimeout(() => setCopiedSlot(null), 2000);
  };

  const usedCount = inviteData?.used?.length ?? 0;
  const progress = Math.min(usedCount, 3) / 3;

  // Welcome view (card + Go to platform): only after signup success. For producer, no membership card.
  if (isWelcome) {
    return (
      <>
        <section className="relative py-24 px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="max-w-md mx-auto text-center"
          >
            {!isProducerOnly && (
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 1,
                  delay: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <MetallicMembershipCard
                  variant={levelKey}
                  memberName={displayName}
                  usePactLogo={isConsumerOnly}
                />
              </motion.div>
            )}
            <motion.h2
              className="text-2xl font-semibold text-foreground mb-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: isProducerOnly ? 0.2 : 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              Welcome, {displayName}
            </motion.h2>
            <motion.p
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: isProducerOnly ? 0.4 : 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {isProducerOnly
                ? "Your producer profile is set up. You can now access the platform."
                : "You are now a member of PACT and can access the platform."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: isProducerOnly ? 0.6 : 1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap"
            >
              {isProducerOnly && (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="/producer/wines/new">Add first wine</a>
                </Button>
              )}
              <Button asChild className="w-full sm:w-auto bg-black text-white hover:bg-black/90 hover:text-white">
                <a href="/">Go to platform</a>
              </Button>
              {isConsumerOnly && (
                <button
                  type="button"
                  onClick={scrollToInviteSection}
                  className="w-full sm:w-auto rounded-2xl border-2 border-foreground/15 bg-muted/50 hover:bg-muted/80 transition-colors px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      Invite friends. Bottles on us.
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">
                      When a friend joins, you unlock credits toward bottles.
                    </span>
                    <span className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-foreground">
                      Invite friends
                      <motion.span
                        animate={{ y: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        aria-hidden
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.span>
                    </span>
                  </div>
                </button>
              )}
            </motion.div>
          </motion.div>
        </section>

        {isConsumerOnly && (
          <section
            id="invite-friends-section"
            ref={inviteSectionRef}
            className="relative py-20 px-6 border-t border-border/80 bg-gradient-to-b from-muted/40 to-background"
          >
            <div className="max-w-md mx-auto">
              {/* Headline & intro */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold text-foreground tracking-tight">
                  Invite 3 friends, get a free case of wine
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Each friend who joins unlocks credits toward bottles. Share your links below.
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-8 p-4 rounded-2xl bg-background/80 border border-border/60 shadow-sm">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Your progress
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {Math.min(usedCount, 3)} of 3 friends joined
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>

              {/* Three invite link slots */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Your invite links
                </p>
                {[0, 1, 2].map((slotIndex) => {
                  const inv = inviteData?.active?.[slotIndex];
                  const url = inv?.signupUrl;
                  return (
                    <div
                      key={slotIndex}
                      className="flex items-center gap-3 p-4 rounded-2xl border border-border/70 bg-background shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                        {slotIndex + 1}
                      </span>
                      {url ? (
                        <>
                          <input
                            readOnly
                            value={url}
                            className="flex-1 min-w-0 text-xs bg-muted/40 px-3 py-2 rounded-lg border border-border/50 truncate font-mono text-muted-foreground focus:outline-none"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant={copiedSlot === slotIndex ? "secondary" : "outline"}
                            className="shrink-0 rounded-lg"
                            onClick={() => copyInviteLink(url, slotIndex)}
                          >
                            {copiedSlot === slotIndex ? (
                              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                Copied
                              </span>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                Copy
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1 justify-center rounded-lg h-10 font-medium"
                          disabled={inviteLoading || generatingSlot !== null}
                          onClick={() => generateInvite(slotIndex)}
                        >
                          {generatingSlot === slotIndex
                            ? "Generating…"
                            : "Unlock invite link"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <section className="relative py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md mx-auto"
      >
        <div className="mb-8 text-center">
          {showDirtyWineLogo ? (
            <>
              <div className="mb-4 flex justify-center">
                <DirtyWineLogo className="max-w-[200px] w-full h-auto" />
              </div>
              <p className="text-muted-foreground text-sm">
                {inviterDisplayName} invited you to join. Create your account
                below.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {isProducerOnly ? (
                  <>Welcome. You have been invited to join PACT as a producer.</>
                ) : (
                  <>
                    Welcome. You are invited by {inviterDisplayName} to join PACT
                    with a{" "}
                    <span
                      className={`invitation-level-name invitation-level-${levelKey}`}
                    >
                      {getLevelInfo(levelKey).name.toUpperCase()}
                    </span>{" "}
                    membership.
                  </>
                )}
              </h2>
              <p className="text-muted-foreground text-sm">
                {isProducerOnly
                  ? `Sign up and set up your producer profile — part ${step} of 5`
                  : "Sign up to claim your membership"}
              </p>
            </>
          )}
        </div>

        {canChangeAccountType && allowedTypes.length > 1 && (
          <div className="mb-6">
            <Label className="text-muted-foreground">Account type</Label>
            <div className="flex gap-2 mt-2">
              {allowedTypes.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={currentType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFormChange({ selected_type: t })}
                >
                  {INVITATION_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {allowedTypes.length === 1 && allowedTypes[0] === "consumer" && (
          <div className="mb-6 flex justify-center">
            <MetallicMembershipCard variant={levelKey} usePactLogo />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">
              {currentType === "business" ? "Company name" : "Full name"}
            </Label>
            <Input
              id="full_name"
              type="text"
              placeholder={currentType === "business" ? "Your company" : "Your name"}
              value={formData.full_name}
              onChange={(e) => onFormChange({ full_name: e.target.value })}
              required
              className="bg-background"
            />
            {step < 2 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => goToStep(2)}
                disabled={!canProceedFrom1}
              >
                Continue
              </Button>
            )}
          </div>

          {/* Step 2: Email */}
          {step >= 2 && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => onFormChange({ email: e.target.value })}
                required
                className="bg-background"
              />
              {step < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => goToStep(3)}
                  disabled={!canProceedFrom2}
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          {/* Step 3: Password */}
          {step >= 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => onFormChange({ password: e.target.value })}
                  required
                  minLength={6}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm">Confirm password</Label>
                <Input
                  id="password_confirm"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password_confirm}
                  onChange={(e) => onFormChange({ password_confirm: e.target.value })}
                  required
                  minLength={6}
                  className="bg-background"
                />
                {confirmError && (
                  <p className="text-sm text-destructive">{confirmError}</p>
                )}
              </div>
              {showContinueOn3 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => goToStep(4)}
                  disabled={!formData.password || formData.password.length < 6 || formData.password !== formData.password_confirm}
                >
                  Continue
                </Button>
              )}
              {!isProducerOnly && step === 3 && (
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-black/90 hover:text-white"
                  disabled={submitting}
                >
                  {submitting ? "Creating account..." : "Create account"}
                </Button>
              )}
            </>
          )}

          {/* Step 4: Producer name, country, region */}
          {isProducerOnly && step >= 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="producer_name">Producer / winery name *</Label>
                <Input
                  id="producer_name"
                  type="text"
                  placeholder="Your winery name"
                  value={formData.producer_name ?? ""}
                  onChange={(e) => onFormChange({ producer_name: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="producer_country">Country *</Label>
                <Select
                  value={formData.producer_country_code ?? undefined}
                  onValueChange={(v) =>
                    onFormChange({ producer_country_code: v, producer_region: "" })
                  }
                >
                  <SelectTrigger id="producer_country" className="bg-background">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="producer_region">Region *</Label>
                <Select
                  value={formData.producer_region ?? undefined}
                  onValueChange={(v) => onFormChange({ producer_region: v })}
                >
                  <SelectTrigger id="producer_region" className="bg-background">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {step === 4 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => goToStep(5)}
                  disabled={!canProceedFrom4}
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          {/* Step 5: Address */}
          {isProducerOnly && step >= 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_street">Street address</Label>
                <Input
                  id="address_street"
                  type="text"
                  placeholder="Street and number"
                  value={formData.address_street ?? ""}
                  onChange={(e) => onFormChange({ address_street: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_city">City</Label>
                  <Input
                    id="address_city"
                    type="text"
                    placeholder="City"
                    value={formData.address_city ?? ""}
                    onChange={(e) => onFormChange({ address_city: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_postcode">Postal code</Label>
                  <Input
                    id="address_postcode"
                    type="text"
                    placeholder="Postcode"
                    value={formData.address_postcode ?? ""}
                    onChange={(e) => onFormChange({ address_postcode: e.target.value })}
                    className="bg-background"
                  />
                </div>
              </div>
              {step === 5 && (
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-black/90 hover:text-white"
                  disabled={submitting}
                >
                  {submitting ? "Creating account..." : "Create account"}
                </Button>
              )}
            </div>
          )}
        </form>

        {step >= 2 && (
          <button
            type="button"
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            onClick={() =>
              setStep(
                step === 5 ? 4 : step === 4 ? 3 : step === 3 ? 2 : 1
              )
            }
          >
            Back
          </button>
        )}
      </motion.div>
    </section>
  );
}
