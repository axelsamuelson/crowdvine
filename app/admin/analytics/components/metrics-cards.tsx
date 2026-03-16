"use client";

import { Users, TrendingUp, ShoppingCart, CheckCircle } from "lucide-react";

interface MetricsCardsProps {
  data: any;
}

export function MetricsCards({ data }: MetricsCardsProps) {
  if (!data || data.total_users === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          ⚠️ Analytics tables not found. Run{" "}
          <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded text-xs">
            docs/deployment/ANALYTICS_MIGRATION.sql
          </code>{" "}
          in Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const overallConversion =
    data.total_users > 0
      ? ((data.reservation_completed / data.total_users) * 100).toFixed(1)
      : 0;

  const metrics = [
    {
      title: "Total Users",
      value: data.total_users,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Overall Conversion",
      value: `${overallConversion}%`,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Added to Cart",
      value: data.first_add_to_cart,
      icon: ShoppingCart,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Reservations",
      value: data.reservation_completed,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.title}
            className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.title}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {metric.value}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg ${metric.bgColor} border border-gray-100 dark:border-transparent`}
              >
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
