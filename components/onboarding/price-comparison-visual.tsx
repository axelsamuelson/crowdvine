"use client";

import { motion } from "motion/react";

export function PriceComparisonVisual() {
  return (
    <div className="max-w-4xl mx-auto h-[280px] flex flex-col justify-center px-6">
      {/* Money Flow Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-light text-foreground tracking-wide">
            Cost breakdown
          </h3>
          <div className="w-12 h-px bg-foreground/20 mx-auto"></div>
        </div>

        {/* Comparison Bars */}
        <div className="space-y-6">
          {/* PACT */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-foreground">
                  PACT
                </span>
              </div>
              <span className="text-lg font-light text-foreground">168 kr</span>
            </div>
            <div
              className="h-6 bg-foreground/5 rounded-full overflow-hidden flex"
              style={{ width: "100%" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "60%" }}
                transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                className="bg-green-500 flex items-center justify-end pr-3"
              >
                <span className="text-xs font-medium text-white">
                  Producer 100 kr
                </span>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "8%" }}
                transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                className="bg-green-400 flex items-center justify-center"
              >
                <span className="text-xs font-medium text-white">13 kr</span>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "32%" }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                className="bg-foreground/20 flex items-center justify-center"
              >
                <span className="text-xs font-medium text-foreground">
                  42 kr
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Systembolaget */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-foreground/40 rounded-full"></div>
                <span className="text-sm font-medium text-foreground/80">
                  Systembolaget
                </span>
              </div>
              <span className="text-lg font-light text-foreground/80">
                210 kr
              </span>
            </div>
            <div
              className="h-6 bg-foreground/5 rounded-full overflow-hidden flex"
              style={{ width: "100%" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "48%" }}
                transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                className="bg-green-500 flex items-center justify-end pr-3"
              >
                <span className="text-xs font-medium text-white">
                  Producer 100 kr
                </span>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "28%" }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                className="bg-foreground/30 flex items-center justify-center"
              >
                <span className="text-xs font-medium text-white">59 kr</span>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "24%" }}
                transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
                className="bg-foreground/20 flex items-center justify-center"
              >
                <span className="text-xs font-medium text-foreground">
                  53 kr
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* E-commerce */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-foreground/60 rounded-full"></div>
                <span className="text-sm font-medium text-foreground/70">
                  E-commerce
                </span>
              </div>
              <span className="text-lg font-light text-foreground/70">
                285 kr
              </span>
            </div>
            <div
              className="h-6 bg-foreground/5 rounded-full overflow-hidden flex"
              style={{ width: "100%" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "35%" }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                className="bg-green-500 flex items-center justify-end pr-3"
              >
                <span className="text-xs font-medium text-white">
                  Producer 100 kr
                </span>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "51%" }}
                transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
                className="bg-foreground/40 flex items-center justify-center"
              >
                <span className="text-xs font-medium text-white">146 kr</span>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "14%" }}
                transition={{ duration: 1, delay: 1.0, ease: "easeOut" }}
                className="bg-foreground/20 flex items-center justify-center"
              >
                <span className="text-xs font-medium text-foreground">
                  71 kr
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex items-center justify-center gap-8 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span>Producer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-foreground/30 rounded-sm"></div>
            <span>Margin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-foreground/20 rounded-sm"></div>
            <span>Tax/VAT</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
