"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, ArrowLeft, Wine, Users, Package, Truck, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    id: 1,
    title: "Welcome to PACT",
    subtitle: "A smarter way to buy wine — together",
    icon: Wine,
    content: (
      <div className="space-y-6 text-center">
        <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          PACT connects wine lovers directly with independent natural winemakers.
          No middlemen, no markups — just transparent pricing and collective shipping.
        </p>
        <div className="flex justify-center gap-2 pt-4">
          <div className="w-2 h-2 rounded-full bg-foreground/20"></div>
          <div className="w-2 h-2 rounded-full bg-foreground/20"></div>
          <div className="w-2 h-2 rounded-full bg-foreground/20"></div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "How It Works",
    subtitle: "Crowdsourcing wine, step by step",
    icon: Package,
    content: (
      <div className="space-y-4 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
            1
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Discover & Reserve</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Browse curated natural wines and reserve bottles.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
            2
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Collective Shipping</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When the pallet fills, wines ship directly from winemakers.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
            3
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Track Progress</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              See exactly where your wine is at every step.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
            4
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Receive & Enjoy</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pure wine from winemaker to your door.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Pallets & Progress",
    subtitle: "Watch your reservation come to life",
    icon: Truck,
    content: (
      <div className="space-y-6 max-w-md mx-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pallet Progress</span>
            <span className="font-medium text-foreground">487 / 700 bottles</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "70%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-foreground rounded-full"
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            213 bottles to go — estimated shipping in 2-3 weeks
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Reservation Confirmed</p>
              <p className="text-xs text-muted-foreground">Your bottles are reserved</p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-40">
            <Package className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pallet Complete</p>
              <p className="text-xs text-muted-foreground">Waiting for capacity</p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-40">
            <Truck className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Transit</p>
              <p className="text-xs text-muted-foreground">Shipping to you</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground pt-2">
          You&apos;ll receive email updates at each stage
        </p>
      </div>
    ),
  },
  {
    id: 4,
    title: "Your Membership",
    subtitle: "Earn points, unlock perks",
    icon: Users,
    content: (
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-900 text-base font-medium">
            Basic
          </div>
          <p className="text-sm text-muted-foreground">Your starting level</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground text-center">Earn Impact Points by:</p>
          <div className="space-y-2 text-sm text-muted-foreground text-center">
            <p>Inviting friends • Making reservations • Participating in pallets</p>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm font-medium">Basic</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-orange-600">Bronze</span>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            5 Impact Points to unlock Bronze
          </p>
        </div>

        <p className="text-sm text-center text-muted-foreground pt-2">
          Track your progress in your profile
        </p>
      </div>
    ),
  },
  {
    id: 5,
    title: "Ready to Start?",
    subtitle: "Explore wines and make your first reservation",
    icon: Wine,
    content: (
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            Browse our curated selection of natural wines, reserve your bottles, and watch your pallet fill up.
          </p>
          <p className="text-sm text-muted-foreground">
            Remember: wines are shipped in 6-bottle multiples per producer.
          </p>
        </div>

        <div className="bg-foreground text-background rounded-2xl p-8 space-y-4">
          <p className="text-lg font-light">Crowdsource your wine.</p>
          <p className="text-sm opacity-70">
            Buy direct, drink better, and know exactly where your money goes.
          </p>
        </div>
      </div>
    ),
  },
];

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const step = steps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // Prevent body scroll when modal is open
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-background rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleSkip}
                className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="p-8 md:p-12">
                {/* Header with Icon */}
                <div className="flex flex-col items-center text-center mb-8">
                  <motion.div
                    key={currentStep}
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
                    className="space-y-2"
                  >
                    <h2 className="text-3xl md:text-4xl font-light text-foreground">
                      {step.title}
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {step.subtitle}
                    </p>
                  </motion.div>
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                    transition={{ duration: 0.3 }}
                    className="mb-10 min-h-[280px] flex items-center justify-center"
                  >
                    {step.content}
                  </motion.div>
                </AnimatePresence>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 mb-8">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setDirection(index > currentStep ? 1 : -1);
                        setCurrentStep(index);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? "w-8 bg-foreground"
                          : "w-2 bg-foreground/20 hover:bg-foreground/40"
                      }`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="text-muted-foreground"
                  >
                    Skip
                  </Button>

                  <Button
                    onClick={handleNext}
                    className="bg-foreground text-background hover:bg-foreground/90 gap-2"
                  >
                    {currentStep === steps.length - 1 ? (
                      "Get Started"
                    ) : (
                      <>
                        Next
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

