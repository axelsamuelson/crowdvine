"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface ReservationLoadingModalProps {
  open: boolean;
}

export function ReservationLoadingModal({ open }: ReservationLoadingModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm border-none shadow-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black" aria-describedby="reservation-loading-description">
        <div className="text-center py-8">
          {/* Wine Glass Animation */}
          <motion.div
            className="relative mx-auto mb-6"
            animate={{
              rotate: [0, -10, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Wine Glass SVG */}
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto"
            >
              {/* Glass outline */}
              <path
                d="M6 2L5 9C5 12 7 14 10 14.5V20H8V22H16V20H14V14.5C17 14 19 12 19 9L18 2H6Z"
                stroke="#e5e7eb"
                strokeWidth="1.5"
                fill="none"
              />
              {/* Wine (filling animation) */}
              <motion.path
                d="M6.5 3H17.5L18 7C18 9.5 16 11 12 11C8 11 6 9.5 6 7L6.5 3Z"
                fill="#8B0000"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </svg>
          </motion.div>

          {/* Loading Text */}
          <h3 className="text-xl font-light text-white mb-2">
            Confirming Your Reservation
          </h3>
          
          {/* Animated Dots */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          <p id="reservation-loading-description" className="text-sm text-gray-400">
            Please wait while we process your order...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

