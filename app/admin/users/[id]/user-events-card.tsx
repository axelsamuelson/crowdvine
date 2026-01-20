"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Search, X } from "lucide-react";

type UserEvent = {
  id: string;
  session_id: string;
  event_type: string;
  event_category: string;
  event_metadata: any;
  page_url: string | null;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
};

export function UserEventsCard({ userId }: { userId: string }) {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(200);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UserEvent | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchPage = async (targetPage: number) => {
    const url = new URL(
      `/api/admin/users/${userId}/events`,
      window.location.origin,
    );
    url.searchParams.set("page", String(targetPage));
    url.searchParams.set("pageSize", String(pageSize));
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Failed to fetch events");
    }
    return data as { events: UserEvent[]; total: number; page: number };
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEvents([]);
    setTotal(0);
    setPage(1);

    fetchPage(1)
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data.events) ? data.events : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pageSize]);

  const categories = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.event_category))).filter(
      Boolean,
    ) as string[];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      if (selectedCategory !== "all" && event.event_category !== selectedCategory)
        return false;
      if (
        q &&
        !event.event_type.toLowerCase().includes(q) &&
        !(event.page_url || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const canLoadMore = events.length < total;

  const getEventColor = (category: string) => {
    const colors: Record<string, string> = {
      auth: "bg-blue-100 text-blue-800",
      navigation: "bg-purple-100 text-purple-800",
      cart: "bg-orange-100 text-orange-800",
      checkout: "bg-green-100 text-green-800",
      validation: "bg-yellow-100 text-yellow-800",
      engagement: "bg-pink-100 text-pink-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const loadMore = async () => {
    if (!canLoadMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchPage(nextPage);
      setEvents((prev) => [...prev, ...(data.events || [])]);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-light text-foreground">Events</h2>
            <p className="text-xs text-muted-foreground">
              Showing {events.length} of {total}
            </p>
          </div>
          <Badge variant="outline">{filteredEvents.length} filtered</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Filter by Category
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Search Events
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by event type or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-sm text-muted-foreground">No events found.</div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getEventColor(
                            event.event_category,
                          )}`}
                        >
                          {event.event_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(event.created_at), "MMM d, HH:mm:ss")}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.event_category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {event.page_url || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {canLoadMore && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>Full event payload</DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Event Type</p>
                  <Badge className={getEventColor(selectedEvent.event_category)}>
                    {selectedEvent.event_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Category</p>
                  <Badge variant="outline">{selectedEvent.event_category}</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">URL</p>
                <p className="text-sm break-words">{selectedEvent.page_url || "—"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Timestamp</p>
                <p className="text-sm">
                  {format(new Date(selectedEvent.created_at), "PPpp")}
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Metadata</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[300px]">
{JSON.stringify(selectedEvent.event_metadata || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

