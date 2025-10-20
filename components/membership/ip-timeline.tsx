import {
  UserPlus,
  ShoppingBag,
  Package,
  TrendingUp,
  Award,
  ShoppingCart,
  Star,
  Share2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IPEvent {
  id: string;
  event_type: string;
  points_earned: number;
  description: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

interface IPTimelineProps {
  events: IPEvent[];
  className?: string;
}

const eventIcons: Record<string, any> = {
  // Original events
  invite_signup: UserPlus,
  invite_reservation: ShoppingBag,
  own_order: ShoppingBag,
  pallet_milestone: Package,
  level_upgrade: TrendingUp,
  manual_adjustment: Award,
  migration: Award,

  // New events (v2)
  invite_second_order: ShoppingCart, // Friend's 2nd order
  own_order_large: ShoppingCart, // Large order (12+ bottles)
  pallet_milestone_6: Package, // 6 pallets milestone
  pallet_milestone_12: Package, // 12 pallets milestone
  review_submitted: Star, // Review submitted
  share_action: Share2, // Shared wine/pallet
};

const eventColors: Record<string, string> = {
  // Original events
  invite_signup: "text-blue-600 bg-blue-50",
  invite_reservation: "text-green-600 bg-green-50",
  own_order: "text-purple-600 bg-purple-50",
  pallet_milestone: "text-orange-600 bg-orange-50",
  level_upgrade: "text-yellow-600 bg-yellow-50",
  manual_adjustment: "text-gray-600 bg-gray-50",
  migration: "text-gray-600 bg-gray-50",

  // New events (v2)
  invite_second_order: "text-emerald-600 bg-emerald-50",
  own_order_large: "text-indigo-600 bg-indigo-50",
  pallet_milestone_6: "text-amber-600 bg-amber-50",
  pallet_milestone_12: "text-rose-600 bg-rose-50",
  review_submitted: "text-cyan-600 bg-cyan-50",
  share_action: "text-pink-600 bg-pink-50",
};

// Event labels for better display
const eventLabels: Record<string, string> = {
  invite_signup: "Friend joined",
  invite_reservation: "Friend's first order",
  invite_second_order: "Friend's 2nd order",
  own_order: "Order completed",
  own_order_large: "Large order (12+ bottles)",
  pallet_milestone: "3 Pallet milestone",
  pallet_milestone_6: "6 Pallet milestone",
  pallet_milestone_12: "12 Pallet milestone",
  review_submitted: "Review submitted",
  share_action: "Shared wine/pallet",
  level_upgrade: "Level upgraded",
  manual_adjustment: "Manual adjustment",
  migration: "System migration",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

export function IPTimeline({ events, className }: IPTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-gray-500">No impact point events yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Start by inviting friends or making reservations
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {events.map((event) => {
        const Icon = eventIcons[event.event_type] || Award;
        const colorClass =
          eventColors[event.event_type] || "text-gray-600 bg-gray-50";
        const isPositive = event.points_earned > 0;

        return (
          <div
            key={event.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-200/50 hover:bg-gray-50/50 transition-colors"
          >
            {/* Icon */}
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                colorClass,
              )}
            >
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 mb-0.5">
                {event.description}
                {event.profiles?.full_name && (
                  <span className="text-gray-600 ml-1">
                    ({event.profiles.full_name})
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {formatTimeAgo(event.created_at)}
              </p>
            </div>

            {/* Points Badge */}
            {isPositive && (
              <div className="flex-shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    event.points_earned > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  +{event.points_earned} IP
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
