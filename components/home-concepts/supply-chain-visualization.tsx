"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SupplyChainStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

const supplyChainSteps: SupplyChainStep[] = [
  {
    id: "producer",
    title: "Producent",
    description: "Vinet odlas och produceras direkt på vinmakarens gård",
    icon: "🍷",
    details: [
      "Naturvin från små producenter",
      "Inga mellanhänder",
      "Direktkontakt med vinmakaren",
      "Transparent produktion",
    ],
  },
  {
    id: "pallet",
    title: "Pall",
    description: "Crowdsourcade beställningar samlas i en delad pall",
    icon: "📦",
    details: [
      "600-700 flaskor per pall",
      "Samlas från flera producenter",
      "Du betalar inte förrän pallen är full",
      "Gemensam fraktkostnad",
    ],
  },
  {
    id: "transport",
    title: "Transport",
    description: "Logistik, tull och import hanteras av oss",
    icon: "🚚",
    details: [
      "Samlastning från producenter",
      "Tullhantering",
      "Importdokumentation",
      "Spårbar transport",
    ],
  },
  {
    id: "sweden",
    title: "Sverige",
    description: "Vinet anländer direkt till dig, orört och spårbart",
    icon: "🇸🇪",
    details: [
      "Direktleverans eller upphämtning",
      "Full spårbarhet",
      "Rätt vin, rättvist pris",
      "Inga mellanhänder",
    ],
  },
];

export function SupplyChainVisualization() {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col">
      {/* Main visualization */}
      <div className="flex-1 bg-muted/30 rounded-2xl border border-border p-8 relative overflow-hidden">
        {/* Supply chain flow */}
        <div className="h-full flex items-center justify-center">
          <div className="w-full max-w-4xl">
            {/* Steps container */}
            <div className="relative flex items-center justify-between">
              {supplyChainSteps.map((step, index) => {
                const isHovered = hoveredStep === step.id;
                const isSelected = selectedStep === step.id;
                const isLast = index === supplyChainSteps.length - 1;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    {/* Step node */}
                    <div className="relative flex flex-col items-center flex-1">
                      <motion.button
                        onMouseEnter={() => setHoveredStep(step.id)}
                        onMouseLeave={() => setHoveredStep(null)}
                        onClick={() =>
                          setSelectedStep(
                            selectedStep === step.id ? null : step.id
                          )
                        }
                        className="relative z-10 w-20 h-20 rounded-full bg-foreground flex items-center justify-center text-3xl hover:scale-110 transition-transform cursor-pointer"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {step.icon}
                        {/* Pulse effect when hovered */}
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-foreground"
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                          />
                        )}
                      </motion.button>

                      {/* Step label */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="mt-4 text-center"
                      >
                        <h3 className="text-sm font-medium text-foreground mb-1">
                          {step.title}
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-[120px]">
                          {step.description}
                        </p>
                      </motion.div>

                      {/* Tooltip on hover */}
                      <AnimatePresence>
                        {isHovered && !isSelected && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-background border border-border rounded-lg p-4 shadow-lg min-w-[200px]"
                          >
                            <p className="text-sm text-foreground font-medium mb-2">
                              {step.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs font-medium text-foreground mb-2">
                                Detaljer:
                              </p>
                              <ul className="space-y-1">
                                {step.details.slice(0, 2).map((detail, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-muted-foreground flex items-start gap-2"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-foreground mt-1.5 flex-shrink-0"></span>
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expanded details when selected */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="absolute top-32 left-1/2 -translate-x-1/2 z-30 bg-background border border-border rounded-lg p-6 shadow-xl min-w-[280px] max-w-[320px]"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">
                                  {step.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {step.description}
                                </p>
                              </div>
                              <button
                                onClick={() => setSelectedStep(null)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-foreground mb-2">
                                Detaljer:
                              </p>
                              {step.details.map((detail, i) => (
                                <div
                                  key={i}
                                  className="text-xs text-muted-foreground flex items-start gap-2"
                                >
                                  <span className="w-1 h-1 rounded-full bg-foreground mt-1.5 flex-shrink-0"></span>
                                  {detail}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Arrow connector */}
                    {!isLast && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                        className="flex-1 h-0.5 bg-foreground mx-4 relative"
                      >
                        <motion.div
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-foreground border-t-4 border-t-transparent border-b-4 border-b-transparent"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.8 }}
                        />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Background infrastructure pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="infrastructure-pattern"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="20" cy="20" r="1" fill="#000" />
                <line
                  x1="0"
                  y1="20"
                  x2="40"
                  y2="20"
                  stroke="#000"
                  strokeWidth="0.5"
                />
                <line
                  x1="20"
                  y1="0"
                  x2="20"
                  y2="40"
                  stroke="#000"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#infrastructure-pattern)" />
          </svg>
        </div>
      </div>

      {/* Bottom message */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground italic">
          This isn't e-commerce, this is infrastructure.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Teknik och community ersätter mellanhänder
        </p>
      </div>
    </div>
  );
}

