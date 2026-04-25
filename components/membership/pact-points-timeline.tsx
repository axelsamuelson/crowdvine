import { cn } from "@/lib/utils";

export type PactPointsEvent = {
  id: string;
  event_type: string;
  points_delta: number;
  bottle_count: number | null;
  related_order_id: string | null;
  related_user_id: string | null;
  description: string | null;
  expires_at: string | null;
  created_at: string;
};

type TimelineProps = {
  events: PactPointsEvent[];
  className?: string;
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

function eventLabel(event: PactPointsEvent): string {
  const bottles =
    typeof event.bottle_count === "number" && Number.isFinite(event.bottle_count)
      ? event.bottle_count
      : null;

  switch (event.event_type) {
    case "own_order":
      return bottles !== null ? `Order (${bottles} bottles)` : "Order";
    case "welcome_bonus":
      return "Welcome bonus";
    case "invite_friend_first_order":
      return "Friend's first order";
    case "review_after_delivery":
      return "Review submitted";
    case "zone_set":
      return "Set delivery zone";
    case "redemption":
      return "Used at checkout";
    case "expiration":
      return "Points expired";
    case "migration_from_ip":
      return "Migrated from Impact Points";
    case "migration_from_voucher":
      return "Migrated from voucher";
    case "manual_adjustment":
      return "Adjustment";
    case "founding_member_grant":
      return "Founding Member welcome";
    default:
      return event.event_type.replace(/_/g, " ");
  }
}

export function PactPointsTimeline({ events, className }: TimelineProps) {
  if (!events || events.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground text-center py-6", className)}>
        No activity yet
      </p>
    );
  }

  return (
    <div className={cn("divide-y divide-border", className)}>
      {events.map((event) => {
        const delta = Number(event.points_delta) || 0;
        const isPositive = delta > 0;

        return (
          <div
            key={event.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {eventLabel(event)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatTimeAgo(event.created_at)}
              </p>
            </div>

            <span
              className={cn(
                "text-sm font-medium tabular-nums shrink-0",
                isPositive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {isPositive ? "+" : ""}
              {delta} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}

