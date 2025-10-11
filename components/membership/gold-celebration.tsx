"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, X } from "lucide-react";
import { LevelBadge } from "./level-badge";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface GoldCelebrationProps {
  show: boolean;
  onClose: () => void;
  userName?: string;
}

/**
 * Celebration modal shown when user reaches Gold level
 * Features confetti animation and congratulatory message
 */
export function GoldCelebration({ show, onClose, userName }: GoldCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF8C00'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF8C00'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Auto-close after 8 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  if (!show && !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute -top-4 -right-4 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Card */}
            <div className="bg-gradient-to-br from-amber-50 via-white to-yellow-50 rounded-2xl shadow-2xl border-2 border-amber-200 p-8 text-center">
              {/* Trophy icon with glow */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 blur-2xl bg-amber-400/40 rounded-full animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Congratulations{userName ? `, ${userName}` : ''}!
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  You've reached
                </p>
              </motion.div>

              {/* Gold Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center mb-6"
              >
                <LevelBadge 
                  level="guld" 
                  size="xl" 
                  showLabel={true}
                />
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="space-y-4 mb-6"
              >
                <p className="text-sm text-gray-700">
                  You're now part of our most exclusive tier!
                </p>
                <div className="bg-white/80 rounded-xl p-4 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700">50 invites per month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700">48h early access to new releases</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700">Fee waived up to 30 bottles/month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700">Top priority in oversubscribed pallets</span>
                  </div>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <Button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold shadow-lg"
                >
                  Continue to Profile
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to detect and show Gold celebration
 * Call this in profile page or after level-up detection
 */
export function useGoldCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const checkAndShowCelebration = (level: string, justUpgraded: boolean) => {
    // Show if user is Gold and just upgraded and hasn't been shown yet
    if (level === 'guld' && justUpgraded && !hasShown) {
      setShowCelebration(true);
      setHasShown(true);
      
      // Store in localStorage to not show again
      if (typeof window !== 'undefined') {
        localStorage.setItem('gold_celebration_shown', 'true');
      }
    }
  };

  const closeCelebration = () => {
    setShowCelebration(false);
  };

  return {
    showCelebration,
    checkAndShowCelebration,
    closeCelebration,
  };
}

