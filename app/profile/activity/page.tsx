"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import {
  UserPlus,
  Package,
  TrendingUp,
  Award,
  Calendar,
  Loader2,
  Filter,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";

interface PactPointsEvent {
  id: string;
  event_type: string;
  points_delta: number;
  description?: string | null;
  created_at: string;
  bottle_count?: number | null;
  related_user_id?: string | null;
  related_order_id?: string | null;
}

type FilterType = "all" | "invites" | "orders" | "milestones";

export default function ActivityPage() {
  const { t, context: shopping } = useShoppingContext();
  const intlLocale = shopping.intlLocale;
  const [events, setEvents] = useState<PactPointsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/user/pact-points/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    if (filter === "invites") return event.event_type.includes("invite");
    if (filter === "orders") return event.event_type === "own_order";
    if (filter === "milestones")
      return (
        event.event_type === "migration_from_ip" ||
        event.event_type === "migration_from_voucher" ||
        event.event_type === "manual_adjustment"
      );
    return true;
  });

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("invite")) return UserPlus;
    if (eventType === "own_order") return Package;
    if (eventType.startsWith("migration_")) return TrendingUp;
    return Award;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes("invite")) return "text-blue-600 bg-blue-50";
    if (eventType === "own_order") return "text-green-600 bg-green-50";
    if (eventType.startsWith("migration_")) return "text-purple-600 bg-purple-50";
    return "text-gray-600 bg-gray-50";
  };

  const labelFor = (event: PactPointsEvent) => {
    switch (event.event_type) {
      case "own_order":
        return typeof event.bottle_count === "number"
          ? t("profile.eventOrder", { count: String(event.bottle_count) })
          : t("profile.eventOrderShort");
      case "welcome_bonus":
        return t("profile.eventWelcomeBonus");
      case "invite_friend_first_order":
        return t("profile.eventFriendFirstOrder");
      case "review_after_delivery":
        return t("profile.eventReview");
      case "zone_set":
        return t("profile.eventZoneSet");
      case "redemption":
        return t("profile.eventRedemption");
      case "expiration":
        return t("profile.eventExpiration");
      case "migration_from_ip":
        return t("profile.eventMigratedIp");
      case "migration_from_voucher":
        return t("profile.eventMigratedVoucher");
      case "manual_adjustment":
        return t("profile.eventAdjustment");
      case "founding_member_grant":
        return t("profile.eventFoundingGrant");
      default:
        return event.event_type.replace(/_/g, " ");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return t("profile.justNow");
    if (diffHours < 24) return t("profile.hoursAgo", { hours: String(diffHours) });
    if (diffDays < 7) return t("profile.daysAgo", { days: String(diffDays) });
    return date.toLocaleDateString(intlLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filterLabel =
    filter === "invites"
      ? t("profile.invitesFilter")
      : filter === "orders"
        ? t("profile.ordersFilter")
        : filter === "milestones"
          ? t("profile.milestonesFilter")
          : "";

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="mb-4 -ml-2">
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t("profile.backToProfile")}
              </Button>
            </Link>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t("profile.activityTitle")}
            </h1>
            <p className="text-gray-600">{t("profile.activitySubtitle")}</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm p-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 mr-2">
                {t("profile.filter")}
              </span>

              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="rounded-full"
              >
                {t("profile.allEvents")}
              </Button>

              <Button
                variant={filter === "invites" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("invites")}
                className="rounded-full"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                {t("profile.invitesFilter")}
              </Button>

              <Button
                variant={filter === "orders" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("orders")}
                className="rounded-full"
              >
                <Package className="w-3 h-3 mr-1" />
                {t("profile.ordersFilter")}
              </Button>

              <Button
                variant={filter === "milestones" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("milestones")}
                className="rounded-full"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {t("profile.milestonesFilter")}
              </Button>
            </div>
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm p-12 text-center">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("profile.noActivityTitle")}
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === "all"
                  ? t("profile.noActivityAll")
                  : t("profile.noActivityFilter", { filter: filterLabel })}
              </p>
              {filter !== "all" && (
                <Button onClick={() => setFilter("all")} variant="outline">
                  {t("profile.showAllEvents")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event, index) => {
                const Icon = getEventIcon(event.event_type);
                const colorClass = getEventColor(event.event_type);
                const delta = Number(event.points_delta) || 0;
                const isPositive = delta > 0;
                const abs = Math.abs(delta);

                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {event.description || labelFor(event)}
                              </h3>
                            </div>

                            <div className="flex-shrink-0 text-right">
                              <div
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                  isPositive
                                    ? "bg-green-50 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {isPositive ? `+${abs} pts` : `−${abs} pts`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(event.created_at)}
                            </div>
                            <div className="capitalize">
                              {labelFor(event)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary Footer */}
          {!loading && filteredEvents.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 text-center">
                <strong>{filteredEvents.length}</strong>{" "}
                {filteredEvents.length === 1
                  ? t("profile.eventDisplayed", {
                      count: String(filteredEvents.length),
                    })
                  : t("profile.eventsDisplayed", {
                      count: String(filteredEvents.length),
                    })}
                {filter !== "all" ? ` ${t("profile.filtered")}` : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
