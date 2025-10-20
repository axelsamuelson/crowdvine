"use client";

import { motion } from "motion/react";
import { X, Package, Truck, Users, Zap } from "lucide-react";
import { useState } from "react";

interface WhySixBottlesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhySixBottlesModal({
  isOpen,
  onClose,
}: WhySixBottlesModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      icon: Package,
      title: "Efficient Packaging",
      description: "6 bottles fit perfectly in a standard wine box",
      visual: "📦",
    },
    {
      icon: Truck,
      title: "Optimized Shipping",
      description: "Reduces shipping costs and environmental impact",
      visual: "🚛",
    },
    {
      icon: Users,
      title: "Group Orders",
      description: "Multiple customers share shipping costs",
      visual: "👥",
    },
    {
      icon: Zap,
      title: "Direct from Producer",
      description: "No warehouses, no middlemen, better prices",
      visual: "⚡",
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-background/95 backdrop-blur-md border border-border/30 rounded-2xl shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <h2 className="text-lg font-semibold text-foreground">
            Why 6 bottles?
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted-foreground/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? "bg-amber-500"
                      : index < currentStep
                        ? "bg-green-500"
                        : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Current step content */}
          <div className="text-center space-y-4">
            <div className="text-4xl mb-2">{currentStepData.visual}</div>
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl flex items-center justify-center">
              <currentStepData.icon className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              {currentStepData.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-xs text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </div>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Got it!
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
