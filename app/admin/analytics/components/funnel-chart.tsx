"use client";

import { Card } from "@/components/ui/card";
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
  if (!data) return null;

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
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={stepsWithRates}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-sm">Users: {data.value}</p>
                      <p className="text-sm">Conversion: {data.conversionRate}%</p>
                      {data.dropOff > 0 && (
                        <p className="text-sm text-red-600">Drop-off: {data.dropOff}</p>
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

        {/* Bottleneck identification */}
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Identified Bottlenecks</h4>
          <div className="space-y-2">
            {stepsWithRates
              .filter((step, index) => index > 0 && parseFloat(step.conversionRate) < 50)
              .map((step) => (
                <div
                  key={step.name}
                  className="p-3 bg-red-50 border border-red-200 rounded"
                >
                  <p className="font-medium text-red-900">{step.name}</p>
                  <p className="text-sm text-red-700">
                    Only {step.conversionRate}% conversion rate - {step.dropOff} users dropped off
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
