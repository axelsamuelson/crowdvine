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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Users, Eye, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { QRCodeDisplay } from "@/components/admin/qr-code-display";

interface Session {
  id: string;
  session_code: string;
  name: string;
  status: string;
  current_wine_index: number;
  wine_order: string[];
  created_at: string;
  completed_at: string | null;
  notes: string | null;
  wines?: any[];
}

export default function WineTastingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/wine-tastings/${id}`);
      if (response.ok) {
        const { session: sessionData } = await response.json();
        setSession(sessionData);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTastingUrl = () => {
    if (!session) return "";
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/tasting/${session.session_code}`;
  };

  const handleDeleteSession = async () => {
    if (!session) return;

    if (
      !confirm(
        `Are you sure you want to delete "${session.name}"? This action cannot be undone and will delete all ratings and participant data.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/wine-tastings/${id}`, {
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
      router.push("/admin/wine-tastings");
    } catch (error: any) {
      console.error("Error deleting session:", error);
      toast.error(error.message || "Failed to delete session");
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/wine-tastings">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{session.name}</h1>
          <p className="text-gray-600 font-mono text-sm">{session.session_code}</p>
        </div>
        <div className="flex gap-2">
          {session.status === "active" && (
            <Link href={`/admin/wine-tastings/${id}/control`}>
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                Control Panel
              </Button>
            </Link>
          )}
          <Button variant="destructive" onClick={handleDeleteSession}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Session
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge
                className={
                  session.status === "active"
                    ? "bg-green-100 text-green-800"
                    : session.status === "completed"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }
              >
                {session.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p>{format(new Date(session.created_at), "PPp")}</p>
            </div>
            {session.completed_at && (
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p>{format(new Date(session.completed_at), "PPp")}</p>
              </div>
            )}
            {session.notes && (
              <div>
                <p className="text-sm text-gray-600">Notes</p>
                <p className="text-sm">{session.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>Share this QR code with participants</CardDescription>
          </CardHeader>
          <CardContent>
            <QRCodeDisplay value={getTastingUrl()} size={200} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wines in Session</CardTitle>
          <CardDescription>
            {session.wines?.length || 0} wines • Current wine index:{" "}
            {session.current_wine_index}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {session.wines?.map((wine, index) => (
              <div
                key={wine.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index === session.current_wine_index
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {index + 1}. {wine.wine_name} {wine.vintage}
                  </p>
                  {wine.grape_varieties && (
                    <p className="text-sm text-gray-600">{wine.grape_varieties}</p>
                  )}
                </div>
                {index === session.current_wine_index && (
                  <Badge className="bg-blue-600">Current</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href={`/tasting/${session.session_code}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <Eye className="w-4 h-4 mr-2" />
            View as Participant
          </Button>
        </Link>
        <Link href={`/tasting/${session.session_code}/summary`} className="flex-1">
          <Button variant="outline" className="w-full">
            View Summary
          </Button>
        </Link>
      </div>
    </div>
  );
}
