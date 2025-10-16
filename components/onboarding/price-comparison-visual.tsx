"use client";

import { motion } from "motion/react";
import { useState } from "react";

interface BarColumnProps {
  label: string;
  totalPrice: number;
  components: Array<{
    label: string;
    amount: number;
    color: string;
  }>;
  highlight?: boolean;
}

function BarColumn({ label, totalPrice, components, highlight = false }: BarColumnProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  
  // Calculate height as percentage of tallest bar (Systembolaget = 323)
  const maxHeight = 280; // h-80 equivalent
  const barHeight = (totalPrice / 323) * maxHeight;
  
  // Calculate cumulative heights for stacking
  let cumulativeHeight = 0;
  const segments = components.map((component, index) => {
    const segmentHeight = (component.amount / totalPrice) * barHeight;
    const currentCumulative = cumulativeHeight;
    cumulativeHeight += segmentHeight;
    
    return {
      ...component,
      height: segmentHeight,
      offset: currentCumulative,
    };
  });

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Bar */}
      <div 
        className={`relative w-16 md:w-20 transition-all duration-300 ${
          highlight ? 'ring-2 ring-green-500/30 shadow-lg' : ''
        }`}
        style={{ height: maxHeight }}
      >
        <div className="absolute bottom-0 w-full h-full flex flex-col justify-end">
          {segments.map((segment, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: segment.height }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              className={`${segment.color} relative cursor-pointer transition-all duration-200 ${
                hoveredSegment === index ? 'opacity-80 scale-105' : 'opacity-100'
              }`}
              style={{ 
                width: '100%',
                height: segment.height,
                marginBottom: index < segments.length - 1 ? '1px' : '0'
              }}
              onMouseEnter={() => setHoveredSegment(index)}
              onMouseLeave={() => setHoveredSegment(null)}
              title={`${segment.label}: ${segment.amount} kr`}
            />
          ))}
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

      {/* Hover tooltip */}
      {hoveredSegment !== null && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">
          {segments[hoveredSegment].label}: {segments[hoveredSegment].amount} kr
        </div>
      )}
    </div>
  );
}

export function PriceComparisonVisual() {
  const data = {
    pact: {
      label: "PACT",
      totalPrice: 172,
      components: [
        { label: "Producent", amount: 99, color: "bg-gray-300" },
        { label: "Transport & Logistik", amount: 13, color: "bg-blue-300" },
        { label: "Overhead & Marginal", amount: 16, color: "bg-amber-300" },
        { label: "Alkoholskatt", amount: 22, color: "bg-slate-300" },
      ],
      highlight: true
    },
    ehandel: {
      label: "E-handel",
      totalPrice: 233,
      components: [
        { label: "Producent", amount: 99, color: "bg-gray-300" },
        { label: "Transport & Logistik", amount: 33, color: "bg-blue-400" },
        { label: "Overhead & Marginal", amount: 64, color: "bg-amber-400" },
        { label: "Alkoholskatt", amount: 22, color: "bg-slate-300" },
      ]
    },
    systembolaget: {
      label: "Systembolaget",
      totalPrice: 323,
      components: [
        { label: "Producent", amount: 99, color: "bg-gray-300" },
        { label: "Transport & Logistik", amount: 22, color: "bg-blue-500" },
        { label: "Overhead & Marginal", amount: 105, color: "bg-amber-500" },
        { label: "Alkoholskatt", amount: 22, color: "bg-slate-300" },
      ]
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Explanatory text */}
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-sm text-muted-foreground text-center leading-relaxed"
      >
        We eliminate unnecessary costs by removing middlemen, lagerhållning, and traditional retail overhead.
      </motion.p>

      {/* Three column comparison */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex items-end justify-center gap-4 md:gap-6 h-80 relative"
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
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <BarColumn {...data.ehandel} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <BarColumn {...data.systembolaget} />
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
          35-50% lägre pris utan att producenten förlorar intäkt
        </p>
        <p className="text-xs text-muted-foreground">
          Baserat på ett 9 EUR producentpris per flaska
        </p>
      </motion.div>

      {/* Legend */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span>Producentpris</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-300 rounded"></div>
          <span>Transport & Logistik</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-300 rounded"></div>
          <span>Overhead & Marginal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-300 rounded"></div>
          <span>Alkoholskatt</span>
        </div>
      </motion.div>
    </div>
  );
}
