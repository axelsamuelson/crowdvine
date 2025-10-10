"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface ReservationLoadingModalProps {
  open: boolean;
}

export function ReservationLoadingModal({ open }: ReservationLoadingModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-md border border-gray-200 shadow-2xl bg-white" 
        aria-describedby="reservation-loading-description"
      >
        <div className="text-center py-12 px-6">
          {/* Minimalist Wine Bottle Animation */}
          <motion.div
            className="relative mx-auto mb-8 w-20 h-20 flex items-center justify-center"
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Simple Wine Bottle SVG - Minimalist */}
            <svg
              width="48"
              height="72"
              viewBox="0 0 48 72"
              fill="none"
              className="mx-auto"
            >
              {/* Bottle neck */}
              <rect
                x="18"
                y="0"
                width="12"
                height="16"
                rx="2"
                fill="#1f2937"
              />
              {/* Bottle body */}
              <path
                d="M12 16 C12 16 10 18 10 22 L10 64 C10 68 12 70 16 70 L32 70 C36 70 38 68 38 64 L38 22 C38 18 36 16 36 16 Z"
                fill="#1f2937"
              />
              {/* Wine level - animated fill */}
              <motion.path
                d="M12 30 L12 64 C12 67 14 68 16 68 L32 68 C34 68 36 67 36 64 L36 30 Z"
                fill="#991b1b"
                initial={{ opacity: 0.4 }}
                animate={{ 
                  opacity: [0.4, 0.7, 0.4],
                  y: [0, -2, 0],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              {/* Bottle highlight */}
              <motion.rect
                x="14"
                y="24"
                width="3"
                height="12"
                rx="1.5"
                fill="white"
                opacity="0.15"
                animate={{
                  opacity: [0.15, 0.25, 0.15],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </svg>

            {/* Subtle glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(156, 163, 175, 0.1) 0%, transparent 70%)",
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Loading Text - Minimalist Typography */}
          <h3 className="text-lg font-light text-gray-900 mb-1 tracking-wide">
            Confirming Reservation
          </h3>
          
          {/* Subtle progress indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <p id="reservation-loading-description" className="text-sm text-gray-500 font-light">
            Processing your order
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

