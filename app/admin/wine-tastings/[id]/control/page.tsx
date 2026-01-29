"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Helper function to convert label_image_path to API image URL
function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  
  const cleanPath = path.trim().replace(/\n/g, "");
  
  // If it's already a full URL, return it
  if (cleanPath.startsWith("http")) {
    return cleanPath;
  }
  
  // If it starts with /uploads/, remove the prefix
  if (cleanPath.startsWith("/uploads/")) {
    const fileName = cleanPath.replace("/uploads/", "");
    return `/api/images/${fileName}`;
  }
  
  // Otherwise, assume it's just a filename
  return `/api/images/${cleanPath}`;
}

interface Wine {
  id: string;
  wine_name: string;
  vintage: string;
  grape_varieties?: string;
  color?: string;
  label_image_path?: string;
  description?: string;
}

interface Session {
  id: string;
  session_code: string;
  name: string;
  status: string;
  current_wine_index: number;
  wine_order: string[];
  wines?: Wine[];
}

interface Participant {
  id: string;
  name: string | null;
  participant_code: string;
  is_anonymous: boolean;
  joined_at: string;
}

export default function WineTastingControlPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (session) {
      setupRealtimeSubscription();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [sessionRes, participantsRes] = await Promise.all([
        fetch(`/api/wine-tastings/${id}`),
        fetch(`/api/wine-tastings/${id}/participants`),
      ]);

      if (sessionRes.ok) {
        const { session: sessionData } = await sessionRes.json();
        setSession(sessionData);
      }

      if (participantsRes.ok) {
        const { participants: participantsData } = await participantsRes.json();
        setParticipants(participantsData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!session) return;

    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`tasting-control-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wine_tasting_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updatedSession = payload.new as any;
          setSession((prev) => ({
            ...prev!,
            current_wine_index: updatedSession.current_wine_index,
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wine_tasting_participants",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const changeWine = async (newIndex: number) => {
    if (!session || newIndex < 0 || newIndex >= (session.wines?.length || 0)) {
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/wine-tastings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_wine_index: newIndex,
        }),
      });

      if (response.ok) {
        const { session: updatedSession } = await response.json();
        setSession(updatedSession);
        toast.success(`Changed to wine ${newIndex + 1}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to change wine");
      }
    } catch (error) {
      console.error("Error changing wine:", error);
      toast.error("Failed to change wine");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing">
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">Session not found</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const currentWine = session.wines?.[session.current_wine_index];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/admin/wine-tastings/${id}`}>
              <Button variant="outline" size="sm" className="rounded-full shrink-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-gray-900">
                {session.name}
              </h1>
              <p className="text-gray-500 text-sm">Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session.session_code && (
              <Link href={`/tasting/${session.session_code}`}>
                <Button variant="outline" size="sm" className="rounded-full">
                  View Session
                </Button>
              </Link>
            )}
            <Badge className="bg-green-100 text-green-800">
              {participants.length} participant{participants.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Control Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Wine */}
            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-medium text-gray-900">
                  Current Wine
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Wine {session.current_wine_index + 1} of{" "}
                  {session.wines?.length || 0}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                {currentWine ? (
                  <>
                    {(() => {
                      const imageUrl = getImageUrl(currentWine.label_image_path);
                      return imageUrl ? (
                        <div className="relative w-full h-64 md:h-96 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                          <Image
                            src={imageUrl}
                            alt={currentWine.wine_name}
                            fill
                            className="object-contain p-4"
                            unoptimized
                          />
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <h2 className="text-xl font-medium text-gray-900">
                        {currentWine.wine_name} {currentWine.vintage}
                      </h2>
                      {currentWine.grape_varieties && (
                        <p className="text-sm text-gray-500 mt-1">{currentWine.grape_varieties}</p>
                      )}
                      {currentWine.description && (
                        <p className="text-sm text-gray-600 mt-2">{currentWine.description}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No wine selected</p>
                )}
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-medium text-gray-900">
                  Change Wine
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Select which wine participants should see
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    onClick={() => changeWine(session.current_wine_index - 1)}
                    disabled={
                      updating || session.current_wine_index === 0
                    }
                    variant="outline"
                    className="flex-1 rounded-full h-12 sm:h-10"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Select
                    value={session.current_wine_index.toString()}
                    onValueChange={(value) => changeWine(parseInt(value))}
                    disabled={updating}
                  >
                    <SelectTrigger className="flex-1 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {session.wines?.map((wine, index) => (
                        <SelectItem key={wine.id} value={index.toString()}>
                          {index + 1}. {wine.wine_name} {wine.vintage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => changeWine(session.current_wine_index + 1)}
                    disabled={
                      updating ||
                      session.current_wine_index ===
                        (session.wines?.length || 0) - 1
                    }
                    variant="outline"
                    className="flex-1 rounded-full h-12 sm:h-10"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participants
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  {participants.length} active participant
                  {participants.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {participants.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No participants yet
                    </p>
                  ) : (
                    participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                      >
                        <p className="font-medium text-gray-900">
                          {participant.name ||
                            (participant.is_anonymous
                              ? "Anonymous"
                              : participant.participant_code.substring(0, 8))}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Joined {new Date(participant.joined_at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
