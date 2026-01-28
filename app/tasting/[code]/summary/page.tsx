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
import { CheckCircle, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { SummaryModal } from "@/components/wine-tasting/summary-modal";

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

interface WineStat {
  wine: {
    id: string;
    wine_name: string;
    vintage: string;
    grape_varieties?: string;
    color?: string;
    label_image_path?: string;
  };
  totalRatings: number;
  averageRating: number | null;
  ratings: Array<{
    rating: number;
    comment: string | null;
    participant: {
      id: string;
      name: string | null;
      participant_code: string;
      is_anonymous: boolean;
    };
    tasted_at: string;
  }>;
}

interface Summary {
  session: {
    id: string;
    name: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  };
  statistics: {
    totalWines: number;
    totalParticipants: number;
    totalRatings: number;
    overallAverage: number | null;
  };
  wines: WineStat[];
}

export default function TastingSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
    checkAuth();
  }, [code]);

  const checkAuth = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (user) {
        // Check if data is already saved
        setIsSaved(true);
      }
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  const fetchSummary = async () => {
    try {
      // First get session by code
      const sessionResponse = await fetch(`/api/wine-tastings/by-code/${code}/join`, {
        method: "POST",
      });

      if (!sessionResponse.ok) {
        // Check if response is JSON before parsing
        const contentType = sessionResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await sessionResponse.json();
            toast.error(error.error || "Session not found");
          } catch {
            toast.error("Session not found");
          }
        } else {
          toast.error("Session not found");
        }
        router.push("/");
        return;
      }

      const { participant } = await sessionResponse.json();
      setParticipantId(participant.id);

      // Then get summary
      const summaryResponse = await fetch(
        `/api/wine-tastings/${participant.session_id}/summary`,
      );

      if (summaryResponse.ok) {
        const data = await summaryResponse.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 71) return "text-green-600";
    if (rating >= 41) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Summary not available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{summary.session.name}</h1>
            <p className="text-gray-600">Tasting Summary</p>
          </div>
          <Link href={`/tasting/${code}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasting
            </Button>
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.statistics.totalWines}</p>
                <p className="text-sm text-gray-600">Wines</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {summary.statistics.totalParticipants}
                </p>
                <p className="text-sm text-gray-600">Participants</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {summary.statistics.totalRatings}
                </p>
                <p className="text-sm text-gray-600">Ratings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {summary.statistics.overallAverage?.toFixed(1) || "N/A"}
                </p>
                <p className="text-sm text-gray-600">Avg Rating</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Status */}
        {isLoggedIn ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    Your information is saved to your account
                  </p>
                  <p className="text-sm text-green-700">
                    View your tasting history in your profile
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Save your results to your account?
                  </p>
                  <p className="text-sm text-gray-600">
                    Create an account or log in to save your tasting history
                  </p>
                </div>
                <Button onClick={() => setShowSaveModal(true)}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Results
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wine Results */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Wine Ratings</h2>
          {summary.wines.map((wineStat, index) => (
            <Card key={wineStat.wine.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>
                      {index + 1}. {wineStat.wine.wine_name} {wineStat.wine.vintage}
                    </CardTitle>
                    {wineStat.wine.grape_varieties && (
                      <CardDescription>
                        {wineStat.wine.grape_varieties}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-3xl font-bold ${getRatingColor(
                        wineStat.averageRating || 0,
                      )}`}
                    >
                      {wineStat.averageRating?.toFixed(1) || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {wineStat.totalRatings} rating
                      {wineStat.totalRatings !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const imageUrl = getImageUrl(wineStat.wine.label_image_path);
                  return imageUrl ? (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={`${wineStat.wine.wine_name} ${wineStat.wine.vintage}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : null;
                })()}

                {wineStat.ratings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Comments</h3>
                    {wineStat.ratings.map((rating, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {rating.participant.is_anonymous
                              ? "Anonymous"
                              : rating.participant.name ||
                                  rating.participant.participant_code.substring(0, 8)}
                          </span>
                          <Badge
                            className={`${getRatingColor(rating.rating)} bg-opacity-10`}
                          >
                            {rating.rating}
                          </Badge>
                        </div>
                        {rating.comment && (
                          <p className="text-gray-700 mt-1">{rating.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {participantId && summary && (
        <SummaryModal
          open={showSaveModal}
          onOpenChange={setShowSaveModal}
          participantId={participantId}
          sessionId={summary.session.id}
          onSaved={() => {
            setIsSaved(true);
            setIsLoggedIn(true);
          }}
        />
      )}
    </div>
  );
}
