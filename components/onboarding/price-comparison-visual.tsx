"use client";

import { motion } from "motion/react";

interface BarColumnProps {
  label: string;
  totalPrice: number;
  essentialCosts: number;
  overheadCosts: number;
  highlight?: boolean;
}

function BarColumn({ label, totalPrice, essentialCosts, overheadCosts, highlight = false }: BarColumnProps) {
  // Fixed height for all bars to ensure consistent module sizes
  const barHeight = 200;
  const essentialHeight = (essentialCosts / totalPrice) * barHeight;
  const overheadHeight = (overheadCosts / totalPrice) * barHeight;
  
  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Bar */}
      <div 
        className={`relative w-16 md:w-20 transition-all duration-300 ${
          highlight ? 'ring-2 ring-green-500/30 shadow-lg' : ''
        }`}
        style={{ height: barHeight }}
      >
        <div className="absolute bottom-0 w-full flex flex-col">
          {/* Essential costs - same for all */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: essentialHeight }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="bg-gray-300 w-full"
            style={{ height: essentialHeight }}
          />
          
          {/* Overhead costs - varies significantly */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: overheadHeight }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className={`w-full ${highlight ? 'bg-green-300' : 'bg-amber-400'}`}
            style={{ height: overheadHeight }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={`text-sm font-medium ${
          highlight ? 'text-green-600' : 'text-foreground'
        }`}>
          {label}
        </p>
        <p className={`text-lg font-semibold ${
          highlight ? 'text-green-600' : 'text-foreground'
        }`}>
          {totalPrice} kr
        </p>
      </div>
    </div>
  );
}

export function PriceComparisonVisual() {
  // Simplified data - focus on the key difference
  const data = {
    pact: {
      label: "PACT",
      totalPrice: 172,
      essentialCosts: 143, // Producentpris + alkoholskatt + minimal overhead
      overheadCosts: 29,   // Minimal overhead - no lager, no middlemen
      highlight: true
    },
    traditional: {
      label: "Traditionell handel",
      totalPrice: 280,     // Average of Systembolaget + E-handel
      essentialCosts: 143, // Same essential costs
      overheadCosts: 137,  // Lagerhållning, mellanhänder, butiksdrifter
      highlight: false
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto min-h-[280px] flex flex-col justify-center">
      {/* Explanatory text */}
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-sm text-muted-foreground text-center leading-relaxed"
      >
        Genom att eliminera lagerhållning och mellanhänder får du bättre priser
      </motion.p>

      {/* Two column comparison */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex items-end justify-center gap-8 h-52"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <BarColumn {...data.pact} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <BarColumn {...data.traditional} />
        </motion.div>
      </motion.div>

      {/* Key insight */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.0 }}
        className="text-center space-y-2"
      >
        <p className="text-sm font-medium text-foreground">
          {data.traditional.totalPrice - data.pact.totalPrice} kr billigare per flaska
        </p>
        <p className="text-xs text-muted-foreground">
          Utan lagerhållning och mellanhänder
        </p>
      </motion.div>

      {/* Simple legend */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.2 }}
        className="flex justify-center gap-6 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span>Grundkostnader</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-400 rounded"></div>
          <span>Lager & mellanhänder</span>
        </div>
      </motion.div>
    </div>
  );
}
