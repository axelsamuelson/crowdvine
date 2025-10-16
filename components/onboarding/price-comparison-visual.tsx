"use client";

import { motion } from "motion/react";

export function PriceComparisonVisual() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto h-[280px] flex flex-col justify-center">

      {/* Comparison Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="text-center p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-green-600 mb-1">PACT</h3>
          <p className="text-lg font-bold text-green-600 mb-2">219 kr</p>
          <p className="text-xs text-gray-600">Direct from producer → Shared pallet → You</p>
        </div>
        
        <div className="text-center p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Systembolaget</h3>
          <p className="text-lg font-bold text-gray-900 mb-2">269 kr</p>
          <p className="text-xs text-gray-600">Producer → Importer → Systembolaget → You</p>
        </div>
        
        <div className="text-center p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">E-commerce</h3>
          <p className="text-lg font-bold text-gray-900 mb-2">369 kr</p>
          <p className="text-xs text-gray-600">Producer → Importer → Warehouse → Courier → You</p>
        </div>
      </motion.div>

      {/* Money Flow Visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-light text-gray-900 text-center">
          Who gets your money?
        </h3>
        
        {/* PACT */}
        <div className="space-y-1">
          <div className="text-xs text-gray-700 text-center">PACT</div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "85%" }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Producer 85%
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "15%" }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="bg-green-300 flex items-center justify-center text-xs font-medium text-white"
            >
              Platform 15%
            </motion.div>
          </div>
        </div>

        {/* Systembolaget */}
        <div className="space-y-1">
          <div className="text-xs text-gray-700 text-center">Systembolaget</div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "40%" }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Taxes 40%
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "25%" }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="bg-red-300 flex items-center justify-center text-xs font-medium text-white"
            >
              Retail 25%
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "20%" }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="bg-red-200 flex items-center justify-center text-xs font-medium text-white"
            >
              Importer 20%
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "15%" }}
              transition={{ duration: 0.8, delay: 1.3 }}
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Producer 15%
            </motion.div>
          </div>
        </div>

        {/* E-commerce */}
        <div className="space-y-1">
          <div className="text-xs text-gray-700 text-center">E-commerce</div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "35%" }}
              transition={{ duration: 0.8, delay: 1.4 }}
              className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Marketing 35%
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "30%" }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="bg-blue-300 flex items-center justify-center text-xs font-medium text-white"
            >
              Logistics 30%
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "25%" }}
              transition={{ duration: 0.8, delay: 1.6 }}
              className="bg-blue-200 flex items-center justify-center text-xs font-medium text-white"
            >
              Platform 25%
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "10%" }}
              transition={{ duration: 0.8, delay: 1.7 }}
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            >
              Producer 10%
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}