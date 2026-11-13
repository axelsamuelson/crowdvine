/**
 * Welcome modal — short 3-step copy (Margaux kort-v2, sha256 3a51bb47…).
 * Mount is gated by OnboardingProvider + WELCOME_MODAL_ENABLED (default OFF).
 * Preview: /dev/welcome-modal
 */
"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, ArrowLeft, Wine, Package, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locale";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";
import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";
import { shopPathForLocale } from "@/lib/i18n/localized-routes";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import {
  welcomeModalLevelDisplayName,
  welcomeModalTier,
  type WelcomeModalMembershipLevel,
} from "@/lib/onboarding/welcome-modal-membership";
import {
  WELCOME_MODAL_COPY,
  welcomeModalStep1Body,
  welcomeModalStep2Card2Body,
  welcomeModalStep3Body,
} from "@/lib/onboarding/welcome-modal-copy";
import {
  applyNaturalWineCopyVariant,
  contentVariantFromAuthUser,
  isNaturalWineHiddenVariantTag,
} from "@/lib/onboarding/welcome-modal-content-variant";
import { createClient } from "@/utils/supabase/client";

export type WelcomeDismissMethod = "close" | "skip";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: (opts?: { method?: WelcomeDismissMethod | "cta" }) => void;
  /** Override shopping locale (e.g. screenshot preview). */
  locale?: AppLocale;
  /** Preview overrides (dev harness / screenshots). */
  previewMembershipLevel?: WelcomeModalMembershipLevel;
  previewEarningEnabled?: boolean;
  /** Override DIRECT_BOX_CHECKOUT_ENABLED (pass from server; env is not on the client). */
  directBoxCheckoutEnabled?: boolean;
  /** 0-based step index. */
  initialStep?: number;
  /** When true, skip membership fetch (preview). */
  previewMode?: boolean;
  /**
   * Force Axel 12/11 content variant (hide naturvin / natural wine).
   * Preview harness: ?hideNatural=1
   */
  previewHideNaturalWine?: boolean;
}

export function WelcomeModal({
  isOpen,
  onClose,
  locale: localeProp,
  previewMembershipLevel,
  previewEarningEnabled,
  directBoxCheckoutEnabled,
  initialStep = 0,
  previewMode = false,
  previewHideNaturalWine,
}: WelcomeModalProps) {
  const { context } = useTranslations();
  const locale: AppLocale = localeProp ?? context.locale;
  const router = useRouter();
  const copy = WELCOME_MODAL_COPY[locale];
  const nav = copy.nav;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const [membershipLevel, setMembershipLevel] =
    useState<WelcomeModalMembershipLevel>(previewMembershipLevel ?? "basic");
  const [earningEnabled, setEarningEnabled] = useState(
    previewEarningEnabled ?? false,
  );
  const [hideNaturalWine, setHideNaturalWine] = useState(
    Boolean(previewHideNaturalWine),
  );
  const [loading, setLoading] = useState(
    !previewMode && previewMembershipLevel == null,
  );
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shownTracked = useRef(false);
  const lastStepTracked = useRef<number | null>(null);

  const directBoxEnabled =
    directBoxCheckoutEnabled !== undefined
      ? directBoxCheckoutEnabled
      : isDirectBoxCheckoutEnabled();

  const minSwipeDistance = 50;
  const stepCount = 3;
  const stepNumber = currentStep + 1;

  const v = (text: string) =>
    applyNaturalWineCopyVariant(text, locale, hideNaturalWine);

  useEffect(() => {
    if (previewMode || previewMembershipLevel != null) {
      setMembershipLevel(previewMembershipLevel ?? "basic");
      setEarningEnabled(previewEarningEnabled ?? false);
      setHideNaturalWine(Boolean(previewHideNaturalWine));
      setLoading(false);
      return;
    }

    const fetchMembership = async () => {
      try {
        const response = await fetch("/api/user/membership", {
          credentials: "same-origin",
        });
        if (response.ok) {
          const data = await response.json();
          setMembershipLevel(
            welcomeModalTier(data.membership?.level || "basic"),
          );
          setEarningEnabled(Boolean(data.pactPointsEarningEnabled));
        } else {
          setMembershipLevel("basic");
          setEarningEnabled(false);
        }
      } catch {
        setMembershipLevel("basic");
        setEarningEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    const resolveVariant = async () => {
      // No cookie / localStorage — tag must follow the person (canvas 12/11).
      if (previewHideNaturalWine != null) {
        setHideNaturalWine(Boolean(previewHideNaturalWine));
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const tag = contentVariantFromAuthUser(data.user);
        setHideNaturalWine(isNaturalWineHiddenVariantTag(tag));
      } catch {
        setHideNaturalWine(false);
      }
    };

    if (isOpen) {
      void fetchMembership();
      void resolveVariant();
    }
  }, [
    isOpen,
    previewMode,
    previewMembershipLevel,
    previewEarningEnabled,
    previewHideNaturalWine,
  ]);

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (!isOpen || loading) return;
    if (!shownTracked.current) {
      shownTracked.current = true;
      void AnalyticsTracker.trackEvent({
        eventType: "welcome_shown",
        eventCategory: "engagement",
      });
    }
    if (lastStepTracked.current !== stepNumber) {
      lastStepTracked.current = stepNumber;
      void AnalyticsTracker.trackEvent({
        eventType: "welcome_step_viewed",
        eventCategory: "engagement",
        metadata: { step: stepNumber },
      });
    }
  }, [isOpen, loading, stepNumber]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const levelName = welcomeModalLevelDisplayName(membershipLevel, locale);

  const steps: {
    id: number;
    title: string;
    subtitle?: string;
    icon: typeof Wine;
    content: ReactNode;
  }[] = [
    {
      id: 1,
      title: v(copy.step1.title),
      subtitle: v(copy.step1.subtitle),
      icon: Wine,
      content: (
        <div className="space-y-6 text-center flex flex-col justify-center">
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            {v(welcomeModalStep1Body(locale, directBoxEnabled))}
          </p>
        </div>
      ),
    },
    {
      id: 2,
      title: v(copy.step2.title),
      icon: Package,
      content: (
        <div className="space-y-4 max-w-md mx-auto flex flex-col justify-center">
          {copy.step2.cards.map((card, index) => {
            const body =
              index === 1
                ? welcomeModalStep2Card2Body(locale, directBoxEnabled)
                : card.body;
            return (
              <div key={card.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm mb-1">
                    {v(card.title)}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {v(body)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: 3,
      title: v(copy.step3.title),
      icon: Users,
      content: (
        <div className="space-y-4 text-center max-w-md mx-auto flex flex-col justify-center">
          <p className="text-base text-muted-foreground leading-relaxed">
            {v(welcomeModalStep3Body(locale, levelName))}
          </p>
          {earningEnabled ? (
            <p className="text-sm text-foreground font-medium">
              {v(copy.step3.bodyPointsBonus)}
            </p>
          ) : null}
        </div>
      ),
    },
  ];

  const step = steps[currentStep] ?? steps[0];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < stepCount - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
      return;
    }
    void AnalyticsTracker.trackEvent({
      eventType: "welcome_cta_clicked",
      eventCategory: "engagement",
      metadata: { step: stepNumber },
    });
    onClose({ method: "cta" });
    router.push(shopPathForLocale(locale));
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDismiss = (method: WelcomeDismissMethod) => {
    void AnalyticsTracker.trackEvent({
      eventType: "welcome_dismissed",
      eventCategory: "engagement",
      metadata: { step: stepNumber, method },
    });
    onClose({ method });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && currentStep < stepCount - 1) {
      handleNext();
    } else if (distance < -minSwipeDistance && currentStep > 0) {
      handlePrev();
    }
  };

  if (loading && isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => handleDismiss("close")}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="welcome-modal-title"
              data-testid="welcome-modal"
              data-hide-natural-wine={hideNaturalWine ? "1" : "0"}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-background rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => handleDismiss("close")}
                className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                aria-label={nav.close}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div
                className={cn(
                  "p-8 md:p-12",
                  locale === "sv" && "max-md:px-4 max-md:py-6",
                )}
              >
                <div className="flex flex-col items-center text-center mb-8">
                  {/* Icon chrome on every step (incl. step 1) — grey circle like 2/3 */}
                  <motion.div
                    key={`icon-${currentStep}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-6"
                  >
                    <Icon className="w-8 h-8 text-foreground" />
                  </motion.div>

                  <motion.div
                    key={`title-${currentStep}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="space-y-2 w-full"
                  >
                    <h2
                      id="welcome-modal-title"
                      className="text-3xl md:text-4xl font-light text-foreground px-12 max-md:px-12"
                    >
                      {step.title}
                    </h2>
                    {step.subtitle ? (
                      <p className="text-sm md:text-base text-muted-foreground px-12 max-md:px-12">
                        {step.subtitle}
                      </p>
                    ) : null}
                  </motion.div>
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    ref={contentRef}
                    key={currentStep}
                    custom={direction}
                    initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                    transition={{ duration: 0.3 }}
                    className="mb-10 touch-pan-y"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {step.content}
                  </motion.div>
                </AnimatePresence>

                <div
                  className="flex justify-center gap-2 mb-8"
                  data-testid="welcome-modal-dots"
                  data-dot-count={stepCount}
                >
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setDirection(index > currentStep ? 1 : -1);
                        setCurrentStep(index);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? "w-8 bg-foreground"
                          : "w-2 bg-foreground/20 hover:bg-foreground/40"
                      }`}
                      aria-label={nav.goToStep.replace(
                        "{n}",
                        String(index + 1),
                      )}
                    />
                  ))}
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between whitespace-nowrap",
                    locale === "sv" ? "gap-0.5 md:gap-4" : "gap-4",
                  )}
                >
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    aria-hidden={currentStep === 0}
                    tabIndex={currentStep === 0 ? -1 : undefined}
                    className={cn(
                      "gap-2 shrink-0",
                      locale === "sv" &&
                        "gap-0.5 px-1.5 text-[13px] md:gap-2 md:px-4 md:text-sm",
                      // Keep layout space on step 1; invisible, not removed.
                      currentStep === 0 && "invisible pointer-events-none",
                    )}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {nav.back}
                  </Button>

                  {currentStep < stepCount - 1 ? (
                    <Button
                      onClick={() => handleDismiss("skip")}
                      variant="ghost"
                      className={cn(
                        "text-muted-foreground min-w-0",
                        locale === "sv" &&
                          "shrink px-1.5 text-[13px] md:px-4 md:text-sm",
                      )}
                    >
                      {nav.skip}
                    </Button>
                  ) : (
                    <span className="min-w-0" />
                  )}

                  <Button
                    onClick={handleNext}
                    className={cn(
                      "bg-foreground text-background hover:bg-foreground/90 gap-2 shrink-0",
                      locale === "sv" &&
                        "gap-1 px-2.5 text-[13px] md:gap-2 md:px-4 md:text-sm",
                    )}
                  >
                    {currentStep === stepCount - 1 ? (
                      nav.cta
                    ) : (
                      <>
                        {nav.next}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
