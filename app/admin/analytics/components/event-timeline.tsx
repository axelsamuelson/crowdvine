"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface EventTimelineProps {
  events: any[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const getEventColor = (category: string) => {
    const colors = {
      auth: "bg-blue-100 text-blue-800",
      navigation: "bg-purple-100 text-purple-800",
      cart: "bg-orange-100 text-orange-800",
      checkout: "bg-green-100 text-green-800",
      validation: "bg-yellow-100 text-yellow-800",
      engagement: "bg-pink-100 text-pink-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getEventColor(event.event_category)}`}
                    >
                      {event.event_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(event.created_at), "MMM d, HH:mm:ss")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{event.page_url}</p>
                  {event.event_metadata && Object.keys(event.event_metadata).length > 0 && (
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(event.event_metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
