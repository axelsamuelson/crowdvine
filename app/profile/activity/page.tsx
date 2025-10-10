"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { 
  UserPlus, Package, TrendingUp, Award, 
  Calendar, Loader2, Filter, ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface IPEvent {
  id: string;
  event_type: string;
  points_earned: number;
  description: string;
  created_at: string;
  related_user_email?: string;
  related_user_name?: string;
}

type FilterType = 'all' | 'invites' | 'orders' | 'milestones';

export default function ActivityPage() {
  const [events, setEvents] = useState<IPEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/user/membership/events");
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

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'invites') return event.event_type.includes('invite');
    if (filter === 'orders') return event.event_type === 'own_order';
    if (filter === 'milestones') return event.event_type === 'pallet_milestone';
    return true;
  });

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('invite')) return UserPlus;
    if (eventType === 'own_order') return Package;
    if (eventType === 'pallet_milestone') return TrendingUp;
    return Award;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('invite')) return 'text-blue-600 bg-blue-50';
    if (eventType === 'own_order') return 'text-green-600 bg-green-50';
    if (eventType === 'pallet_milestone') return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="mb-4 -ml-2">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Profile
              </Button>
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Impact Point Activity
            </h1>
            <p className="text-gray-600">
              Track your journey and see how you've earned Impact Points
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm p-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
              
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="rounded-full"
              >
                All Events
              </Button>
              
              <Button
                variant={filter === 'invites' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('invites')}
                className="rounded-full"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Invites
              </Button>
              
              <Button
                variant={filter === 'orders' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('orders')}
                className="rounded-full"
              >
                <Package className="w-3 h-3 mr-1" />
                Orders
              </Button>
              
              <Button
                variant={filter === 'milestones' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('milestones')}
                className="rounded-full"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Milestones
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
                No Activity Yet
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "Start earning Impact Points by inviting friends, making orders, or reaching milestones."
                  : `No ${filter} events yet. Try a different filter.`}
              </p>
              {filter !== 'all' && (
                <Button onClick={() => setFilter('all')} variant="outline">
                  Show All Events
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event, index) => {
                const Icon = getEventIcon(event.event_type);
                const colorClass = getEventColor(event.event_type);
                
                return (
                  <div 
                    key={event.id}
                    className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {event.description}
                              </h3>
                              {event.related_user_name && (
                                <p className="text-sm text-gray-600">
                                  {event.related_user_name} ({event.related_user_email})
                                </p>
                              )}
                            </div>
                            
                            <div className="flex-shrink-0 text-right">
                              <div className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-semibold">
                                +{event.points_earned} IP
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(event.created_at)}
                            </div>
                            <div className="capitalize">
                              {event.event_type.replace('_', ' ')}
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
                <strong>{filteredEvents.length}</strong> {filteredEvents.length === 1 ? 'event' : 'events'} displayed
                {filter !== 'all' && ' (filtered)'}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

