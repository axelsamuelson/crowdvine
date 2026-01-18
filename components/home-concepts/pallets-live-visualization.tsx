"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LivingPalletVisualization } from "./living-pallet-visualization";

interface Pallet {
  id: string;
  name: string;
  currentBottles: number;
  capacity: number;
  percentage: number;
  status: string;
  isComplete: boolean;
  producerCount: number;
}

export function PalletsLiveVisualization() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPalletId, setSelectedPalletId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPallets = async () => {
      try {
        const response = await fetch("/api/admin/pallets/network-data");
        if (response.ok) {
          const result = await response.json();
          if (result.pallets && result.pallets.length > 0) {
            // Take top 3 pallets
            setPallets(result.pallets.slice(0, 3));
          } else {
            // Use mock data
            setPallets(getMockPallets());
          }
        } else {
          setPallets(getMockPallets());
        }
      } catch (error) {
        console.error("Error fetching pallets:", error);
        setPallets(getMockPallets());
      } finally {
        setLoading(false);
      }
    };

    fetchPallets();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPallets, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMockPallets = (): Pallet[] => {
    return [
      {
        id: "pallet-1",
        name: "Languedoc Early November",
        currentBottles: 487,
        capacity: 700,
        percentage: 69.6,
        status: "active",
        isComplete: false,
        producerCount: 4,
      },
      {
        id: "pallet-2",
        name: "Roussillon Community Pick",
        currentBottles: 189,
        capacity: 700,
        percentage: 27,
        status: "active",
        isComplete: false,
        producerCount: 3,
      },
      {
        id: "pallet-3",
        name: "Mixed Pallet #1",
        currentBottles: 623,
        capacity: 700,
        percentage: 89,
        status: "active",
        isComplete: false,
        producerCount: 6,
      },
    ];
  };

  if (loading) {
    return (
      <div className="w-full min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar pallar...</p>
        </div>
      </div>
    );
  }

  if (selectedPalletId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedPalletId(null)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          ← Tillbaka till pallar
        </button>
        <div className="min-h-[600px]">
          <LivingPalletVisualization palletId={selectedPalletId} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Three pallets in rows */}
      {pallets.map((pallet, index) => (
        <motion.div
          key={pallet.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-muted/30 border border-border rounded-2xl p-6 hover:border-foreground/40 transition-all cursor-pointer group"
          onClick={() => setSelectedPalletId(pallet.id)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center text-background font-medium text-lg">
                {Math.round(pallet.percentage)}%
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {pallet.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {pallet.currentBottles} / {pallet.capacity} flaskor
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">
                {pallet.producerCount} producenter
              </p>
              <p className="text-xs text-muted-foreground">
                {pallet.isComplete ? "Klar" : "Aktiv"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pallet.percentage}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
              className="h-full bg-foreground"
            />
          </div>

          {/* Click hint */}
          <div className="mt-4 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Klicka för att se network-diagram →
          </div>
        </motion.div>
      ))}

      {pallets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Inga aktiva pallar just nu</p>
        </div>
      )}
    </div>
  );
}

