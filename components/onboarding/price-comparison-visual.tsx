"use client";

import { motion } from "motion/react";

interface ComparisonCardProps {
  model: string;
  price: string;
  description: string;
  highlight?: boolean;
}

function ComparisonCard({ model, price, description, highlight = false }: ComparisonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={`p-6 bg-white border border-gray-200 rounded-lg ${
        highlight ? 'border-green-500 shadow-lg' : 'shadow-sm'
      }`}
    >
      <h3 className={`text-lg font-semibold mb-2 ${
        highlight ? 'text-green-600' : 'text-gray-900'
      }`}>
        {model}
      </h3>
      <p className={`text-2xl font-bold mb-4 ${
        highlight ? 'text-green-600' : 'text-gray-900'
      }`}>
        {price}
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

interface MoneyFlowBarProps {
  sections: Array<{
    label: string;
    percentage: number;
    color: string;
  }>;
  title: string;
}

function MoneyFlowBar({ sections, title }: MoneyFlowBarProps) {
  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold text-gray-900 mb-4 text-center">
        {title}
      </h4>
      <div className="w-full h-8 bg-gray-100 rounded-full overflow-hidden flex">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ width: 0 }}
            animate={{ width: `${section.percentage}%` }}
            transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
            className={`${section.color} flex items-center justify-center text-xs font-medium text-white`}
            style={{ minWidth: section.percentage > 15 ? 'auto' : '15%' }}
          >
            {section.percentage > 15 && section.label}
          </motion.div>
        ))}
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs text-gray-600">
        {sections.map((section, index) => (
          <div key={index} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${section.color}`}></div>
            <span>{section.label} ({section.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PriceComparisonVisual() {
  const comparisonData = [
    {
      model: "PACT",
      price: "219 kr",
      description: "Direct from producer → Shared pallet → You",
      highlight: true
    },
    {
      model: "Systembolaget",
      price: "269 kr",
      description: "Producer → Importer → Systembolaget → You",
      highlight: false
    },
    {
      model: "E-commerce",
      price: "369 kr",
      description: "Producer → Importer → Warehouse → Courier → You",
      highlight: false
    }
  ];

  const moneyFlowData = [
    {
      title: "PACT",
      sections: [
        { label: "Producer", percentage: 85, color: "bg-green-500" },
        { label: "Platform", percentage: 15, color: "bg-green-300" }
      ]
    },
    {
      title: "Systembolaget",
      sections: [
        { label: "Taxes", percentage: 40, color: "bg-red-500" },
        { label: "Retail", percentage: 25, color: "bg-red-300" },
        { label: "Importer", percentage: 20, color: "bg-red-200" },
        { label: "Producer", percentage: 15, color: "bg-green-500" }
      ]
    },
    {
      title: "E-commerce",
      sections: [
        { label: "Marketing", percentage: 35, color: "bg-blue-500" },
        { label: "Logistics", percentage: 30, color: "bg-blue-300" },
        { label: "Platform", percentage: 25, color: "bg-blue-200" },
        { label: "Producer", percentage: 10, color: "bg-green-500" }
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto h-[280px] flex flex-col justify-center">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-3"
      >
        <h2 className="text-2xl font-light text-gray-900">
          Why is wine cheaper with PACT?
        </h2>
        <p className="text-sm text-gray-600">
          No middlemen. No warehouses. No hidden costs.
        </p>
      </motion.div>

      {/* Comparison Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {comparisonData.map((data, index) => (
          <ComparisonCard key={index} {...data} />
        ))}
      </motion.div>

      {/* Money Flow Visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="space-y-6"
      >
        <h3 className="text-lg font-light text-gray-900 text-center">
          Who gets your money?
        </h3>
        <div className="space-y-4">
          {moneyFlowData.map((data, index) => (
            <div key={index} className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 text-center">
                {data.title}
              </h4>
              <MoneyFlowBar {...data} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="text-center"
      >
        <p className="text-sm font-medium text-gray-900">
          Crowdsource your next wine – start your first PACT.
        </p>
      </motion.div>
    </div>
  );
}