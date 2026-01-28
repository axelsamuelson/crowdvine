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
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p>Session not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWine = session.wines?.[session.current_wine_index];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/wine-tastings/${id}`}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{session.name}</h1>
              <p className="text-gray-600 text-sm">Control Panel</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800">
            {participants.length} participant{participants.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Control Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Wine */}
            <Card>
              <CardHeader>
                <CardTitle>Current Wine</CardTitle>
                <CardDescription>
                  Wine {session.current_wine_index + 1} of{" "}
                  {session.wines?.length || 0}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentWine ? (
                  <>
                    {currentWine.label_image_path && (
                      <div className="relative w-full h-64 md:h-96 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={`/api/images/${currentWine.label_image_path}`}
                          alt={currentWine.wine_name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">
                        {currentWine.wine_name} {currentWine.vintage}
                      </h2>
                      {currentWine.grape_varieties && (
                        <p className="text-gray-600">{currentWine.grape_varieties}</p>
                      )}
                      {currentWine.description && (
                        <p className="text-gray-700 mt-2">{currentWine.description}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No wine selected</p>
                )}
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Change Wine</CardTitle>
                <CardDescription>
                  Select which wine participants should see
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => changeWine(session.current_wine_index - 1)}
                    disabled={
                      updating || session.current_wine_index === 0
                    }
                    variant="outline"
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Select
                    value={session.current_wine_index.toString()}
                    onValueChange={(value) => changeWine(parseInt(value))}
                    disabled={updating}
                  >
                    <SelectTrigger className="flex-1">
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
                    className="flex-1"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participants
                </CardTitle>
                <CardDescription>
                  {participants.length} active participant
                  {participants.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {participants.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No participants yet
                    </p>
                  ) : (
                    participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="p-2 bg-gray-50 rounded text-sm"
                      >
                        <p className="font-medium">
                          {participant.name ||
                            (participant.is_anonymous
                              ? "Anonymous"
                              : participant.participant_code.substring(0, 8))}
                        </p>
                        <p className="text-xs text-gray-500">
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
    </div>
  );
}
