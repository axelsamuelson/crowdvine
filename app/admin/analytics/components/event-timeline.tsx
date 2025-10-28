"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface EventTimelineProps {
  events: any[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
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
    <>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
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
                      <div className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                        {Object.entries(event.event_metadata).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="truncate">
                            <strong>{key}:</strong> {String(value).substring(0, 50)}
                            {String(value).length > 50 ? '...' : ''}
                          </div>
                        ))}
                        {Object.keys(event.event_metadata).length > 3 && (
                          <div className="text-gray-400 mt-1">Click to see more...</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              Detailed information about this event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4 mt-4">
              {/* Event Type & Category */}
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

              {/* Timestamp */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Timestamp</p>
                <p className="text-sm">
                  {format(new Date(selectedEvent.created_at), "PPpp")}
                </p>
              </div>

              <Separator />

              {/* Page URL */}
              {selectedEvent.page_url && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Page URL</p>
                  <a 
                    href={selectedEvent.page_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {selectedEvent.page_url}
                  </a>
                </div>
              )}

              <Separator />

              {/* Event Metadata */}
              {selectedEvent.event_metadata && Object.keys(selectedEvent.event_metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Event Data</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedEvent.event_metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {selectedEvent.user_id && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">User ID</p>
                    <p className="text-xs font-mono">{selectedEvent.user_id}</p>
                  </div>
                )}
                {selectedEvent.session_id && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Session ID</p>
                    <p className="text-xs font-mono">{selectedEvent.session_id}</p>
                  </div>
                )}
                {selectedEvent.user_agent && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500">User Agent</p>
                    <p className="text-xs break-all">{selectedEvent.user_agent}</p>
                  </div>
                )}
                {selectedEvent.referrer && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500">Referrer</p>
                    <p className="text-xs break-all">{selectedEvent.referrer || 'Direct'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
