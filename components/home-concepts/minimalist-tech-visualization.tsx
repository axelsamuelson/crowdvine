"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface InteractiveZone {
  id: string;
  title: string;
  description: string;
  link: string;
  visualization: "pallets" | "producers" | "how-it-works";
}

const zones: InteractiveZone[] = [
  {
    id: "pallets",
    title: "Se pallar",
    description: "Utforska aktiva pallar och se deras progress i realtid",
    link: "/shop",
    visualization: "pallets",
  },
  {
    id: "producers",
    title: "Utforska producenter",
    description: "Upptäck naturviner direkt från små producenter",
    link: "/shop",
    visualization: "producers",
  },
  {
    id: "how-it-works",
    title: "Hur det funkar",
    description: "Lär dig hur crowdsourcade pallbeställningar fungerar",
    link: "/about",
    visualization: "how-it-works",
  },
];

function PalletsMiniDiagram() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="space-y-3 w-full">
        {[
          { name: "Languedoc Pall", progress: 69, bottles: 487 },
          { name: "Roussillon Pick", progress: 27, bottles: 189 },
          { name: "Mixed #1", progress: 89, bottles: 623 },
        ].map((pallet, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">{pallet.name}</span>
              <span className="text-muted-foreground">{pallet.progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pallet.progress}%` }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                className="h-full bg-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">{pallet.bottles} flaskor</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ProducersMiniDiagram() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { name: "Domaine de la Clape", bottles: 120 },
          { name: "Le Bouc", bottles: 95 },
          { name: "Mas Seranne", bottles: 150 },
        ].map((producer, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="text-center space-y-2"
          >
            <div className="w-12 h-12 rounded-full bg-foreground mx-auto flex items-center justify-center text-background text-xs font-medium">
              {producer.name.charAt(0)}
            </div>
            <p className="text-xs text-foreground font-medium">{producer.name}</p>
            <p className="text-xs text-muted-foreground">{producer.bottles} flaskor</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function HowItWorksMiniDiagram() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="flex items-center justify-between w-full">
        {[
          { step: "1", label: "Reservera" },
          { step: "2", label: "Pallen fylls" },
          { step: "3", label: "Vi sköter allt" },
          { step: "4", label: "Mottag" },
        ].map((item, index) => (
          <div key={index} className="flex items-center flex-1">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-medium mb-2">
                {item.step}
              </div>
              <p className="text-xs text-muted-foreground text-center">{item.label}</p>
            </motion.div>
            {index < 3 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="flex-1 h-0.5 bg-foreground mx-2"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MinimalistTechVisualization() {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const renderVisualization = (visualization: string) => {
    switch (visualization) {
      case "pallets":
        return <PalletsMiniDiagram />;
      case "producers":
        return <ProducersMiniDiagram />;
      case "how-it-works":
        return <HowItWorksMiniDiagram />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-12 p-8">
        {/* Mobile-only headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden text-2xl font-light tracking-tight text-foreground text-center max-w-4xl leading-tight"
        >
          Producers And Consumers Together
          <br />
          <span className="text-lg text-muted-foreground">
            Crowdsourcing directly from natural winemakers.
          </span>
          <br />
          <span className="text-base text-muted-foreground">
            A smarter way to buy wine — together.
          </span>
        </motion.h1>

        {/* Three Interactive Zones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {zones.map((zone, index) => {
            const isHovered = hoveredZone === zone.id;

            return (
              <motion.a
                key={zone.id}
                href={zone.link}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                className="relative group"
              >
                <div
                  className={`h-64 border-2 rounded-2xl p-6 transition-all ${
                    isHovered
                      ? "border-foreground bg-foreground/5"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {/* Zone Content */}
                  <div className="h-full flex flex-col">
                    <h3 className="text-xl font-medium text-foreground mb-2">
                      {zone.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {zone.description}
                    </p>

                    {/* Mini Diagram on Hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 border-t border-border pt-4"
                        >
                          <div className="h-24">
                            {renderVisualization(zone.visualization)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Arrow indicator */}
                    <div className="mt-auto flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>Utforska</span>
                      <motion.span
                        animate={{ x: isHovered ? 4 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        →
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

