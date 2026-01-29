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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Settings, Users, Eye, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { QRCodeDisplay } from "@/components/admin/qr-code-display";
import { QRCode } from "react-qr-code";

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
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/admin/wine-tastings">
            <Button variant="outline" size="sm" className="rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              {session.name}
            </h1>
            <p className="text-gray-500 font-mono text-sm truncate">
              {session.session_code}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {session.session_code && (
              <Link href={`/tasting/${session.session_code}`}>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Eye className="w-4 h-4 mr-2" />
                  View Session
                </Button>
              </Link>
            )}
            {session.status === "active" && (
              <Link href={`/admin/wine-tastings/${id}/control`}>
                <Button size="sm" className="rounded-full bg-black hover:bg-black/90 text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Control Panel
                </Button>
              </Link>
            )}
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteSession}
              className="rounded-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-medium text-gray-900">
                Session Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
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
                <p className="text-sm text-gray-500 mb-1">Created</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(session.created_at), "PPp")}
                </p>
              </div>
              {session.completed_at && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Completed</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(session.completed_at), "PPp")}
                  </p>
                </div>
              )}
              {session.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-900">{session.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-medium text-gray-900">
                QR Code
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Share this QR code with participants
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div>
                <Label>Tasting URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    value={getTastingUrl()} 
                    readOnly 
                    className="font-mono text-sm" 
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(getTastingUrl());
                      toast.success("URL copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <div
                  onClick={() => setQrDialogOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setQrDialogOpen(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  aria-label="Click to view QR code in full size"
                >
                  <QRCodeDisplay value={getTastingUrl()} size={200} />
                </div>
              </div>
              
              {/* QR Code Popup */}
              <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogContent 
                  className="max-w-[90vw] max-h-[90vh] p-8"
                  onClick={() => setQrDialogOpen(false)}
                >
                  <DialogTitle className="sr-only">QR Code - Full Size</DialogTitle>
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="p-8 bg-white rounded-lg border-2 border-gray-200">
                      <QRCode
                        id="qr-code-popup"
                        value={getTastingUrl()}
                        size={Math.min(600, typeof window !== "undefined" ? window.innerWidth * 0.7 : 600)}
                        level="H"
                      />
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Click anywhere to close
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-medium text-gray-900">
              Wines in Session
            </CardTitle>
            <CardDescription className="text-sm text-gray-500">
              {session.wines?.length || 0} wines • Current wine index:{" "}
              {session.current_wine_index}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-2">
              {session.wines?.map((wine, index) => (
                <div
                  key={wine.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index === session.current_wine_index
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {index + 1}. {wine.wine_name} {wine.vintage}
                    </p>
                    {wine.grape_varieties && (
                      <p className="text-xs text-gray-600 truncate">
                        {wine.grape_varieties}
                      </p>
                    )}
                  </div>
                  {index === session.current_wine_index && (
                    <Badge className="bg-blue-600 shrink-0 ml-2">Current</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/tasting/${session.session_code}`} className="flex-1">
            <Button variant="outline" className="w-full rounded-full">
              <Eye className="w-4 h-4 mr-2" />
              View as Participant
            </Button>
          </Link>
          <Link href={`/tasting/${session.session_code}/summary`} className="flex-1">
            <Button variant="outline" className="w-full rounded-full">
              View Summary
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
