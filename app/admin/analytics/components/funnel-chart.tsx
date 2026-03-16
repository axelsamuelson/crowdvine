"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FunnelChartProps {
  data: any;
}

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data || data.total_users === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          No conversion data available yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Run the analytics migration to start tracking user journeys. See
          docs/deployment/ANALYTICS_MIGRATION.sql
        </p>
      </div>
    );
  }

  const funnelSteps = [
    { name: "Access Requested", value: data.access_requested, color: "#3b82f6" },
    { name: "Access Approved", value: data.access_approved, color: "#10b981" },
    { name: "First Login", value: data.first_login, color: "#8b5cf6" },
    { name: "Product Viewed", value: data.first_product_view, color: "#f59e0b" },
    { name: "Added to Cart", value: data.first_add_to_cart, color: "#ec4899" },
    { name: "Cart Validated", value: data.cart_validation_passed, color: "#14b8a6" },
    { name: "Checkout Started", value: data.checkout_started, color: "#f97316" },
    { name: "Completed", value: data.reservation_completed, color: "#22c55e" },
  ];

  // Calculate conversion rates
  const stepsWithRates = funnelSteps.map((step, index) => {
    const prevValue = index === 0 ? step.value : funnelSteps[index - 1].value;
    const conversionRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;
    const dropOff = prevValue - step.value;
    
    return {
      ...step,
      conversionRate: conversionRate.toFixed(1),
      dropOff,
    };
  });

  return (
    <div className="space-y-4 text-gray-700 dark:text-gray-300">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={stepsWithRates}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.4} />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: "currentColor" }} stroke="currentColor" />
          <YAxis tick={{ fill: "currentColor" }} stroke="currentColor" />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-[#1F1F23] p-3 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg text-gray-900 dark:text-white">
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-sm">Users: {d.value}</p>
                    <p className="text-sm">Conversion: {d.conversionRate}%</p>
                    {d.dropOff > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400">Drop-off: {d.dropOff}</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {stepsWithRates.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6">
        <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
          Identified Bottlenecks
        </h4>
        <div className="space-y-2">
          {stepsWithRates
            .filter((step, index) => index > 0 && parseFloat(step.conversionRate) < 50)
            .map((step) => (
              <div
                key={step.name}
                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
              >
                <p className="font-medium text-red-900 dark:text-red-200">{step.name}</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Only {step.conversionRate}% conversion rate - {step.dropOff} users dropped off
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
