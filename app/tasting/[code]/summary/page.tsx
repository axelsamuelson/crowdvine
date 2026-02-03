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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, ArrowLeft, Save, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest">("highest");
  const [isGuest, setIsGuest] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  useEffect(() => {
    fetchSummary();
    checkAuth();
    checkGuestStatus();
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

  const checkGuestStatus = async () => {
    try {
      const response = await fetch("/api/me");
      if (response.ok) {
        const data = await response.json();
        if (data.isGuest) {
          setIsGuest(true);
          // Show signup prompt after a short delay
          setTimeout(() => {
            setShowSignupPrompt(true);
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error checking guest status:", error);
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 pt-top-spacing">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 pt-top-spacing">
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <p className="text-center text-gray-600">Summary not available.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              {summary.session.name}
            </h1>
            <p className="text-gray-500">Tasting Summary</p>
          </div>
          <Link href={`/tasting/${code}`}>
            <Button variant="outline" size="sm" className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasting
            </Button>
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <div className="text-center">
              <p className="text-2xl font-medium text-gray-900">
                {summary.statistics.totalWines}
              </p>
              <p className="text-sm text-gray-500 mt-1">Wines</p>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <div className="text-center">
              <p className="text-2xl font-medium text-gray-900">
                {summary.statistics.totalParticipants}
              </p>
              <p className="text-sm text-gray-500 mt-1">Participants</p>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <div className="text-center">
              <p className="text-2xl font-medium text-gray-900">
                {summary.statistics.totalRatings}
              </p>
              <p className="text-sm text-gray-500 mt-1">Ratings</p>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <div className="text-center">
              <p className="text-2xl font-medium text-gray-900">
                {summary.statistics.overallAverage?.toFixed(1) || "N/A"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Avg Rating</p>
            </div>
          </Card>
        </div>

        {/* Save Status */}
        {isLoggedIn ? (
          <Card className="p-6 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-900">
                  Your information is saved to your account
                </p>
                <p className="text-sm text-green-700 mt-0.5">
                  View your tasting history in your profile
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Save your results to your account?
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create an account or log in to save your tasting history
                </p>
              </div>
              <Button
                onClick={() => setShowSaveModal(true)}
                className="rounded-full bg-black hover:bg-black/90 text-white shrink-0"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Results
              </Button>
            </div>
          </Card>
        )}

        {/* Wine Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-medium text-gray-900">Wine Ratings</h2>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <Select value={sortOrder} onValueChange={(value: "highest" | "lowest") => setSortOrder(value)}>
                <SelectTrigger className="w-[140px] rounded-full border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest">Highest Score</SelectItem>
                  <SelectItem value="lowest">Lowest Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(() => {
            // Sort wines based on selected order
            const sortedWines = [...summary.wines].sort((a, b) => {
              const aRating = a.averageRating ?? 0;
              const bRating = b.averageRating ?? 0;
              return sortOrder === "highest" 
                ? bRating - aRating 
                : aRating - bRating;
            });
            
            return sortedWines.map((wineStat, index) => {
            const imageUrl = getImageUrl(wineStat.wine.label_image_path);
            return (
              <Card
                key={wineStat.wine.id}
                className="p-6 bg-white border border-gray-200 rounded-2xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left: Image */}
                  {imageUrl && (
                    <div className="md:sticky md:top-6">
                      <div className="relative w-full aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                        <Image
                          src={imageUrl}
                          alt={`${wineStat.wine.wine_name} ${wineStat.wine.vintage}`}
                          fill
                          className="object-contain p-4"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}

                  {/* Right: Content */}
                  <div className="min-w-0 space-y-6">
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-medium text-gray-900">
                            {index + 1}. {wineStat.wine.wine_name}{" "}
                            {wineStat.wine.vintage}
                          </h3>
                          {wineStat.wine.grape_varieties && (
                            <p className="text-sm text-gray-500 mt-1">
                              {wineStat.wine.grape_varieties}
                            </p>
                          )}
                          {wineStat.wine.color && (
                            <Badge
                              variant="outline"
                              className="mt-2 text-xs border-gray-300"
                            >
                              {wineStat.wine.color}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-3xl font-medium ${getRatingColor(
                              wineStat.averageRating || 0,
                            )}`}
                          >
                            {wineStat.averageRating?.toFixed(1) || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {wineStat.totalRatings} rating
                            {wineStat.totalRatings !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    {wineStat.ratings.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900">
                          Comments
                        </h4>
                        <div className="space-y-2">
                          {wineStat.ratings.map((rating, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-gray-900">
                                  {rating.participant.is_anonymous
                                    ? "Anonymous"
                                    : rating.participant.name ||
                                        rating.participant.participant_code.substring(
                                          0,
                                          8,
                                        )}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getRatingColor(
                                    rating.rating,
                                  )} border-current`}
                                >
                                  {rating.rating}
                                </Badge>
                              </div>
                              {rating.comment && (
                                <p className="text-sm text-gray-600 mt-1.5">
                                  {rating.comment}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          });
          })()}
        </div>
      </div>

      {/* Signup Prompt Modal for Guests */}
      <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Your Tasting Results</DialogTitle>
            <DialogDescription>
              Create an account to save your wine tasting ratings and access them later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-3">
              By creating an account, you can:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Save your wine tasting ratings</li>
              <li>Access your tasting history</li>
              <li>Join future tasting sessions</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignupPrompt(false)}>
              Maybe Later
            </Button>
            <Button asChild>
              <Link href="/signup">Create Account</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
