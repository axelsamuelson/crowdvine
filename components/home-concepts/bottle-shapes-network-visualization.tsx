"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Play, Pause, Package, ShoppingCart, Users, Truck, Wine, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
  visualization: "select" | "cart" | "reservation" | "pallet" | "complete";
}

export function BottleShapesNetworkVisualization() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps: Step[] = [
    {
      id: 0,
      title: "Du väljer viner från olika producenter",
      description: "Bläddra genom viner från olika producenter i Frankrike. Varje vin kommer från en specifik producent.",
      visualization: "select",
    },
    {
      id: 1,
      title: "Du lägger till i varukorg och gör reservation",
      description: "När du lägger till viner i varukorgen (i multiplar av 6) skapas en reservation som kopplas till en delad pall.",
      visualization: "cart",
    },
    {
      id: 2,
      title: "Fler användare gör reservationer till samma pall",
      description: "Andra användare gör också reservationer. Alla reservationer samlas i samma pall, oavsett vilken producent vinet kommer från.",
      visualization: "reservation",
    },
    {
      id: 3,
      title: "Pallen fylls gradvis med flaskor",
      description: "När fler användare reserverar växer antalet flaskor i pallen. Varje producent bidrar med sina viner till samma pall.",
      visualization: "pallet",
    },
    {
      id: 4,
      title: "Pallen når 100% → vinet skickas",
      description: "När pallen når full kapacitet (700 flaskor) samlas allt vinet från alla producenter och skickas direkt till Sverige.",
      visualization: "complete",
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const renderVisualization = () => {
    const step = steps[currentStep];

    switch (step.visualization) {
      case "select":
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Multiple producers */}
            {[
              { id: 1, name: "Producent A", x: "15%", y: "30%", color: "bg-primary/20" },
              { id: 2, name: "Producent B", x: "50%", y: "20%", color: "bg-primary/15" },
              { id: 3, name: "Producent C", x: "85%", y: "30%", color: "bg-primary/25" },
            ].map((producer, idx) => (
              <motion.div
                key={producer.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className="absolute"
                style={{ left: producer.x, top: producer.y }}
              >
                <div className={cn("w-16 h-16 rounded-2xl border-2 border-primary/30 backdrop-blur-sm flex items-center justify-center shadow-button", producer.color)}>
                  <Wine className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs font-medium text-foreground mt-2 text-center whitespace-nowrap">{producer.name}</p>
              </motion.div>
            ))}

            {/* User selecting */}
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex items-center gap-3 px-6 py-3 bg-background/90 backdrop-blur-sm border-2 border-primary/30 rounded-full shadow-button">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Du väljer viner</span>
              </div>
            </motion.div>

            {/* Selection arrows */}
            {[0, 1, 2].map((i) => (
              <motion.svg
                key={i}
                className="absolute"
                style={{ left: `${20 + i * 30}%`, top: "45%" }}
                width="60"
                height="40"
                viewBox="0 0 60 40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <motion.path
                  d="M 0 20 L 40 20 M 40 20 L 30 10 M 40 20 L 30 30"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.9 + i * 0.1 }}
                />
              </motion.svg>
            ))}
          </div>
        );

      case "cart":
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Producer (left) */}
            <div className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-20 rounded-2xl bg-primary/20 border-2 border-primary/30 backdrop-blur-sm flex items-center justify-center shadow-button">
                <Wine className="w-8 h-8 text-primary" />
              </div>
              <p className="text-xs font-medium text-foreground mt-2 text-center">Producent</p>
            </div>

            {/* Cart in middle */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="px-6 py-4 bg-background/90 backdrop-blur-sm border-2 border-border rounded-2xl shadow-button">
                <div className="flex items-center gap-3 mb-3">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Din varukorg</span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="w-3 h-6 rounded-sm bg-primary/60"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">6 flaskor</p>
              </div>
            </motion.div>

            {/* Pallet (right) */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute right-1/4 top-1/2 translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-24 h-24 rounded-2xl bg-muted/50 border-2 border-border backdrop-blur-sm flex items-center justify-center shadow-button">
                <Package className="w-10 h-10 text-foreground/70" />
              </div>
              <p className="text-xs font-medium text-foreground mt-2 text-center">Delad pall</p>
            </motion.div>

            {/* Arrows */}
            <motion.svg
              className="absolute left-1/3 top-1/2 -translate-y-1/2"
              width="33%"
              height="2"
              viewBox="0 0 100 2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              />
            </motion.svg>
            <motion.svg
              className="absolute left-1/2 top-1/2 -translate-y-1/2"
              width="25%"
              height="2"
              viewBox="0 0 100 2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <motion.line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              />
            </motion.svg>
          </div>
        );

      case "reservation":
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Multiple producers */}
            {[
              { id: 1, x: "10%", y: "25%", bottles: 6 },
              { id: 2, x: "30%", y: "20%", bottles: 12 },
              { id: 3, x: "50%", y: "15%", bottles: 6 },
            ].map((producer, idx) => (
              <motion.div
                key={producer.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.15 }}
                className="absolute"
                style={{ left: producer.x, top: producer.y }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Wine className="w-5 h-5 text-primary" />
                </div>
              </motion.div>
            ))}

            {/* Multiple users */}
            {[
              { id: 1, x: "15%", y: "50%", name: "Du", bottles: 6 },
              { id: 2, x: "40%", y: "55%", name: "Användare 2", bottles: 12 },
              { id: 3, x: "65%", y: "50%", name: "Användare 3", bottles: 6 },
            ].map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + idx * 0.2 }}
                className="absolute"
                style={{ left: user.x, top: user.y }}
              >
                <div className="flex flex-col items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm border border-border rounded-full">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{user.name}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(user.bottles, 6) }).map((_, i) => (
                      <div key={i} className="w-1.5 h-3 rounded-sm bg-primary/50" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Pallet in center */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-32 h-32 rounded-2xl bg-muted/50 border-2 border-border backdrop-blur-sm flex flex-col items-center justify-center shadow-button">
                <Package className="w-12 h-12 text-foreground/70 mb-2" />
                <Badge variant="outline" className="text-xs">
                  24 flaskor
                </Badge>
              </div>
            </motion.div>

            {/* Connection lines */}
            {[0, 1, 2].map((i) => (
              <motion.svg
                key={i}
                className="absolute"
                style={{ left: `${20 + i * 25}%`, top: "40%" }}
                width="15%"
                height="2"
                viewBox="0 0 100 2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <motion.line
                  x1="0"
                  y1="1"
                  x2="100"
                  y2="1"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 + i * 0.1 }}
                />
              </motion.svg>
            ))}
          </div>
        );

      case "pallet":
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Multiple producers on left */}
            <div className="absolute left-1/6 top-1/2 -translate-y-1/2 flex flex-col gap-4">
              {[
                { name: "Prod. A", bottles: 24 },
                { name: "Prod. B", bottles: 36 },
                { name: "Prod. C", bottles: 18 },
              ].map((producer, idx) => (
                <motion.div
                  key={producer.name}
                  initial={{ scale: 0, opacity: 0, x: -30 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Wine className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{producer.name}</p>
                    <p className="text-xs text-muted-foreground">{producer.bottles} flaskor</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Growing pallet in center */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: [0.9, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-40 h-40 rounded-2xl bg-muted/60 border-2 border-border backdrop-blur-sm flex flex-col items-center justify-center shadow-button relative overflow-hidden">
                {/* Progress fill */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-primary/20"
                  initial={{ height: "0%" }}
                  animate={{ height: "45%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
                <Package className="w-14 h-14 text-foreground/70 mb-2 relative z-10" />
                <Badge variant="default" className="text-xs relative z-10">
                  315 / 700
                </Badge>
                <p className="text-xs text-muted-foreground mt-1 relative z-10">45% full</p>
              </div>
            </motion.div>

            {/* Multiple users on right */}
            <div className="absolute right-1/6 top-1/2 -translate-y-1/2 flex flex-col gap-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0, x: 30 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="w-1 h-2 rounded-sm bg-primary/40" />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Connection lines */}
            <motion.svg
              className="absolute left-1/4 top-1/2 -translate-y-1/2"
              width="25%"
              height="2"
              viewBox="0 0 100 2"
            >
              <line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="hsl(var(--foreground))"
                strokeWidth="3"
              />
            </motion.svg>
            <motion.svg
              className="absolute left-1/2 top-1/2 -translate-y-1/2"
              width="25%"
              height="2"
              viewBox="0 0 100 2"
            >
              <line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="hsl(var(--foreground))"
                strokeWidth="3"
              />
            </motion.svg>
          </div>
        );

      case "complete":
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Producers on left */}
            <div className="absolute left-1/6 top-1/2 -translate-y-1/2 flex flex-col gap-3">
              {[
                { name: "Prod. A", bottles: 120 },
                { name: "Prod. B", bottles: 180 },
                { name: "Prod. C", bottles: 90 },
              ].map((producer) => (
                <div key={producer.name} className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Wine className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{producer.name}</p>
                </div>
              ))}
            </div>

            {/* Full pallet */}
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-44 h-44 rounded-2xl bg-primary/30 border-2 border-primary/50 backdrop-blur-sm flex flex-col items-center justify-center shadow-button-hover relative overflow-hidden">
                {/* Full fill */}
                <div className="absolute bottom-0 left-0 right-0 bg-primary/30 h-full" />
                <Package className="w-16 h-16 text-primary mb-2 relative z-10" />
                <Badge variant="default" className="text-sm relative z-10">
                  700 / 700
                </Badge>
                <p className="text-xs font-semibold text-primary mt-1 relative z-10">100% FULL</p>
              </div>
            </motion.div>

            {/* Shipping arrow and truck */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute right-1/6 top-1/2 -translate-y-1/2 flex flex-col items-center"
            >
              <motion.div
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Truck className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs font-semibold text-primary mt-2"
              >
                Skickas till Sverige
              </motion.span>
            </motion.div>

            {/* Thick connection line */}
            <svg
              className="absolute left-1/4 top-1/2 -translate-y-1/2"
              width="50%"
              height="4"
              viewBox="0 0 100 4"
            >
              <line
                x1="0"
                y1="2"
                x2="100"
                y2="2"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
              />
            </svg>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col gap-6">
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary/30 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 bg-muted/30 rounded-2xl border border-border p-8 md:p-12">
        <div className="h-full flex flex-col">
          {/* Visualization area */}
          <div className="flex-1 relative min-h-[400px]">{renderVisualization()}</div>

          {/* Step indicators with badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStep(index);
                  setIsPlaying(false);
                }}
                className="focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md"
              >
                <Badge
                  variant={index === currentStep ? "default" : "outline"}
                  className={cn(
                    "transition-all cursor-pointer",
                    index === currentStep
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-transparent hover:bg-muted/50"
                  )}
                >
                  {index + 1}. {step.title.split(" ").slice(0, 2).join(" ")}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
            {steps[currentStep].title}
          </h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
            {steps[currentStep].description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={() => {
            setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
            setIsPlaying(false);
          }}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="w-4 h-4" />
          Föregående
        </Button>
        <Button
          variant="default"
          size="default"
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-full sm:w-auto"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              Pausa
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Spela
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => {
            setCurrentStep((prev) => (prev + 1) % steps.length);
            setIsPlaying(false);
          }}
          className="w-full sm:w-auto"
        >
          Nästa
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
