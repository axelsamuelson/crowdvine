"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Wine, Users, Calendar, Eye, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface WineTastingSession {
  id: string;
  session_code: string;
  name: string;
  status: string;
  current_wine_index: number;
  created_at: string;
  completed_at: string | null;
  created_by_profile: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export default function WineTastingsPage() {
  const [sessions, setSessions] = useState<WineTastingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const url =
        statusFilter === "all"
          ? "/api/wine-tastings"
          : `/api/wine-tastings?status=${statusFilter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${sessionName}"? This action cannot be undone and will delete all ratings and participant data.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/wine-tastings/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete session: ${response.status}`);
        } else {
          throw new Error(`Failed to delete session: ${response.status} ${response.statusText}`);
        }
      }

      const result = await response.json();
      toast.success(result.message || "Session deleted successfully");
      fetchSessions(); // Refresh the list
    } catch (error: any) {
      console.error("Error deleting session:", error);
      toast.error(error.message || "Failed to delete session");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Wine Tasting Sessions
            </h1>
            <p className="text-gray-500">
              Create and manage digital wine tasting sessions
            </p>
          </div>
          <Link href="/admin/wine-tastings/new">
            <Button className="rounded-full bg-black hover:bg-black/90 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="rounded-full"
            size="sm"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            onClick={() => setStatusFilter("active")}
            className="rounded-full"
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            onClick={() => setStatusFilter("completed")}
            className="rounded-full"
            size="sm"
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === "archived" ? "default" : "outline"}
            onClick={() => setStatusFilter("archived")}
            className="rounded-full"
            size="sm"
          >
            Archived
          </Button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <CardContent className="py-12 text-center">
              <Wine className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No sessions found</p>
              <Link href="/admin/wine-tastings/new">
                <Button className="rounded-full bg-black hover:bg-black/90 text-white">
                  Create Your First Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <Card 
                key={session.id} 
                className="p-6 bg-white border border-gray-200 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <CardHeader className="px-0 pt-0">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg font-medium text-gray-900 line-clamp-2">
                      {session.name}
                    </CardTitle>
                    {getStatusBadge(session.status)}
                  </div>
                  <CardDescription className="font-mono text-xs text-gray-500">
                    {session.session_code}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">
                      {format(new Date(session.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  {session.created_by_profile && (
                    <div className="text-sm text-gray-600 truncate">
                      Created by: {session.created_by_profile.full_name || session.created_by_profile.email}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Link
                      href={`/admin/wine-tastings/${session.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full rounded-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    {session.status === "active" && (
                      <Link
                        href={`/admin/wine-tastings/${session.id}/control`}
                        className="flex-1"
                      >
                        <Button className="w-full rounded-full bg-black hover:bg-black/90 text-white">
                          <Settings className="w-4 h-4 mr-2" />
                          Control
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteSession(session.id, session.name)}
                      className="shrink-0 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
