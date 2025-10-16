"use client";

import { motion } from "motion/react";

export function PriceComparisonVisual() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto h-[280px] flex flex-col justify-center">
      {/* Wine Example Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-2"
      >
        <h3 className="text-lg font-light text-gray-900">
          Les Tremières - Same bottle, different prices
        </h3>
        <p className="text-sm text-gray-600">
          Direct from producer → Shared pallet → You
        </p>
      </motion.div>

      {/* Money Flow Visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-light text-gray-900 text-center">
          Cost breakdown (SEK)
        </h3>
        
        {/* PACT */}
        <div className="space-y-1">
          <div className="text-xs text-gray-700 text-center">PACT - 168 kr</div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex mx-auto" style={{ width: '45%' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "60%" }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Producer 100 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "8%" }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-green-300 flex items-center justify-center text-xs font-medium text-white"
            >
              Margin 13 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "32%" }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="bg-slate-400 flex items-center justify-center text-xs font-medium text-white"
            >
              Tax/VAT 55 kr
            </motion.div>
          </div>
        </div>

        {/* Systembolaget */}
        <div className="space-y-1">
          <div className="text-xs text-gray-700 text-center">Systembolaget - 210 kr</div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex mx-auto" style={{ width: '56%' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "40%" }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Taxes 84 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "25%" }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="bg-red-300 flex items-center justify-center text-xs font-medium text-white"
            >
              Retail 53 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "18%" }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="bg-red-200 flex items-center justify-center text-xs font-medium text-white"
            >
              Importer 38 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "17%" }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Producer 35 kr
            </motion.div>
          </div>
        </div>

        {/* E-commerce */}
        <div className="space-y-1">
          <div className="text-xs text-gray-700 text-center">E-commerce - 285 kr</div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex mx-auto" style={{ width: '76%' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "35%" }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Marketing 100 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "25%" }}
              transition={{ duration: 0.8, delay: 1.3 }}
              className="bg-blue-300 flex items-center justify-center text-xs font-medium text-white"
            >
              Logistics 71 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "25%" }}
              transition={{ duration: 0.8, delay: 1.4 }}
              className="bg-blue-200 flex items-center justify-center text-xs font-medium text-white"
            >
              Platform 71 kr
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "15%" }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Producer 43 kr
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}