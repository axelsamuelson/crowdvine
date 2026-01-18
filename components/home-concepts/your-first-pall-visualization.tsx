"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LivingPalletVisualization } from "./living-pallet-visualization";

interface Preference {
  id: string;
  label: string;
  options: string[];
}

const winePreferences: Preference = {
  id: "wine-types",
  label: "Vilka typer av naturvin gillar du?",
  options: [
    "Rött vin",
    "Vitt vin",
    "Rosé",
    "Orange vin",
    "Alla typer",
  ],
};

const quantityPreferences: Preference = {
  id: "quantity",
  label: "Hur många flaskor vill du handla per månad?",
  options: [
    "1-3 flaskor",
    "4-6 flaskor",
    "7-12 flaskor",
    "13+ flaskor",
  ],
};

interface RecommendedPallet {
  id: string;
  name: string;
  percentage: number;
  producerCount: number;
  bottles: number;
  description: string;
}

export function YourFirstPallVisualization() {
  const [step, setStep] = useState<"questions" | "recommendation">("questions");
  const [wineType, setWineType] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<string | null>(null);
  const [recommendedPallet, setRecommendedPallet] = useState<RecommendedPallet | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If both preferences are selected, show recommendation
    if (wineType && quantity && step === "questions") {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const pallet = getRecommendedPallet(wineType, quantity);
        setRecommendedPallet(pallet);
        setLoading(false);
        setStep("recommendation");
      }, 1000);
    }
  }, [wineType, quantity, step]);

  const getRecommendedPallet = (
    wineType: string,
    quantity: string
  ): RecommendedPallet => {
    // Mock recommendation logic
    const pallets: RecommendedPallet[] = [
      {
        id: "pallet-1",
        name: "Languedoc Early November",
        percentage: 64,
        producerCount: 9,
        bottles: 212,
        description: "Perfekt för dig som gillar rött och vitt vin. Denna pall innehåller viner från 9 producenter i Languedoc-regionen.",
      },
      {
        id: "pallet-2",
        name: "Roussillon Community Pick",
        percentage: 27,
        producerCount: 3,
        bottles: 189,
        description: "Idealisk för dig som vill utforska olika vintyper. Blandad pall med rött, vitt och rosé.",
      },
      {
        id: "pallet-3",
        name: "Mixed Pallet #1",
        percentage: 89,
        producerCount: 6,
        bottles: 623,
        description: "Perfekt match för dig som handlar regelbundet. Stor variation med 6 producenter.",
      },
    ];

    // Simple matching logic
    if (quantity === "13+ flaskor") {
      return pallets[2]; // Mixed Pallet
    } else if (wineType === "Alla typer") {
      return pallets[1]; // Roussillon
    } else {
      return pallets[0]; // Languedoc
    }
  };

  const handleReset = () => {
    setWineType(null);
    setQuantity(null);
    setRecommendedPallet(null);
    setStep("questions");
  };

  if (step === "questions") {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-12">
          {/* Question 1: Wine Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-light text-foreground">
              {winePreferences.label}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {winePreferences.options.map((option) => (
                <motion.button
                  key={option}
                  onClick={() => setWineType(option)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    wineType === option
                      ? "border-foreground bg-foreground/5"
                      : "border-border hover:border-foreground/40"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-sm text-foreground">{option}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Question 2: Quantity */}
          {wineType && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-light text-foreground">
                {quantityPreferences.label}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {quantityPreferences.options.map((option) => (
                  <motion.button
                    key={option}
                    onClick={() => setQuantity(option)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      quantity === option
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/40"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-sm text-foreground">{option}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading state */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">
                  Hittar din perfekta pall...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Recommendation view
  return (
    <div className="w-full h-full min-h-[600px] flex flex-col">
      {/* Recommendation Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-light text-foreground mb-2">
              Din perfekta pall
            </h2>
            <p className="text-sm text-muted-foreground">
              Baserat på dina preferenser
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Börja om
          </button>
        </div>

        {recommendedPallet && (
          <div className="bg-muted/30 border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-medium text-foreground mb-1">
                  {recommendedPallet.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {recommendedPallet.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-light text-foreground mb-1">
                  {recommendedPallet.percentage}%
                </div>
                <p className="text-xs text-muted-foreground">full</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Producenter</span>
                <span className="text-foreground font-medium">
                  {recommendedPallet.producerCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reserverade flaskor</span>
                <span className="text-foreground font-medium">
                  {recommendedPallet.bottles}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${recommendedPallet.percentage}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-foreground"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Network Visualization - Zoomed in on recommended pallet */}
      <div className="flex-1 min-h-[400px]">
        {recommendedPallet && (
          <LivingPalletVisualization palletId={recommendedPallet.id} />
        )}
      </div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex gap-4"
      >
        <a
          href="/shop"
          className="flex-1 px-6 py-4 bg-foreground text-background rounded-full font-medium hover:bg-foreground/90 transition-all text-center text-sm"
        >
          Utforska viner i denna pall
        </a>
        <button
          onClick={handleReset}
          className="px-6 py-4 border border-foreground text-foreground rounded-full font-medium hover:bg-foreground/5 transition-all text-sm"
        >
          Se andra pallar
        </button>
      </motion.div>
    </div>
  );
}

