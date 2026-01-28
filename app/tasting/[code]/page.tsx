"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MemberPrice } from "@/components/ui/member-price";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Wine {
  id: string;
  wine_name: string;
  vintage: string;
  grape_varieties?: string;
  color?: string;
  label_image_path?: string;
  description?: string;
  base_price_cents?: number;
  producers?: {
    name: string;
  };
}

interface Session {
  id: string;
  session_code: string;
  name: string;
  current_wine_index: number;
  wine_order: string[];
  wines?: Wine[];
}

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

export default function TastingPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [session, setSession] = useState<Session | null>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentWineIndex, setCurrentWineIndex] = useState(0);
  const [rating, setRating] = useState<number>(50);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wineStats, setWineStats] = useState<Map<string, { averageRating: number | null; totalRatings: number }>>(new Map());

  useEffect(() => {
    if (code) {
      joinSession();
    }
  }, [code]);

  useEffect(() => {
    if (session && participant) {
      setupRealtimeSubscription();
    }
  }, [session, participant]);

  useEffect(() => {
    if (session) {
      setCurrentWineIndex(session.current_wine_index || 0);
    }
  }, [session]);

  useEffect(() => {
    if (session && participant && currentWineIndex >= 0) {
      loadCurrentRating();
    }
  }, [session, participant, currentWineIndex]);

  useEffect(() => {
    if (session) {
      fetchWineStats();
      // Set up polling to refresh stats every 3 seconds
      const interval = setInterval(() => {
        fetchWineStats();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const joinSession = async () => {
    try {
      // First, join the session
      const joinResponse = await fetch(`/api/wine-tastings/by-code/${code}/join`, {
        method: "POST",
      });

      if (!joinResponse.ok) {
        // Check if response is JSON before parsing
        const contentType = joinResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await joinResponse.json();
          toast.error(error.error || "Failed to join session");
        } else {
          toast.error("Failed to join session");
        }
        router.push("/");
        return;
      }

      const { participant: newParticipant } = await joinResponse.json();
      setParticipant(newParticipant);

      // Then fetch session details
      const sessionResponse = await fetch(
        `/api/wine-tastings/${newParticipant.session_id}`,
      );
      if (sessionResponse.ok) {
        const { session: sessionData } = await sessionResponse.json();
        setSession(sessionData);
        setCurrentWineIndex(sessionData.current_wine_index || 0);
      }
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error("Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  const fetchWineStats = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/wine-tastings/${session.id}/ratings`);
      if (response.ok) {
        const { ratings } = await response.json();
        
        // Calculate stats per wine
        const statsMap = new Map<string, { ratings: number[] }>();
        
        (ratings || []).forEach((r: any) => {
          if (!statsMap.has(r.wine_id)) {
            statsMap.set(r.wine_id, { ratings: [] });
          }
          statsMap.get(r.wine_id)!.ratings.push(r.rating);
        });
        
        // Convert to average ratings
        const newStats = new Map<string, { averageRating: number | null; totalRatings: number }>();
        statsMap.forEach((stats, wineId) => {
          const avg = stats.ratings.length > 0
            ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
            : null;
          newStats.set(wineId, {
            averageRating: avg ? Math.round(avg * 10) / 10 : null,
            totalRatings: stats.ratings.length,
          });
        });
        
        setWineStats(newStats);
      }
    } catch (error) {
      console.error("Error fetching wine stats:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!session || !participant) return;

    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`tasting-${session.id}`)
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
          setCurrentWineIndex(updatedSession.current_wine_index);
          loadCurrentRating();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wine_tasting_ratings",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          // Refresh stats when ratings change
          fetchWineStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadCurrentRating = async () => {
    if (!session || !participant) return;
    
    const wine = session.wines?.[currentWineIndex];
    if (!wine) {
      setRating(50);
      setComment("");
      setSaved(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/wine-tastings/${session.id}/ratings?participant_id=${participant.id}&wine_id=${wine.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.rating) {
          setRating(data.rating.rating);
          setComment(data.rating.comment || "");
          setSaved(true);
        } else {
          setRating(50);
          setComment("");
          setSaved(false);
        }
      }
    } catch (error) {
      console.error("Error loading rating:", error);
    }
  };

  const saveRating = async () => {
    if (!session || !participant || !currentWine) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/wine-tastings/${session.id}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participant.id,
          wine_id: currentWine.id,
          rating,
          comment: comment.trim() || null,
        }),
      });

      if (response.ok) {
        setSaved(true);
        toast.success("Rating saved!");
        // Refresh wine stats after saving
        await fetchWineStats();
      } else {
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await response.json();
            toast.error(error.error || "Failed to save rating");
          } catch {
            toast.error("Failed to save rating");
          }
        } else {
          toast.error("Failed to save rating");
        }
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Failed to save rating");
    } finally {
      setSaving(false);
    }
  };

  const navigateWine = (direction: "prev" | "next") => {
    if (!session || !session.wines) return;

    const newIndex =
      direction === "next"
        ? Math.min(currentWineIndex + 1, session.wines.length - 1)
        : Math.max(currentWineIndex - 1, 0);

    setCurrentWineIndex(newIndex);
    setSaved(false);
    loadCurrentRating();
  };

  const goToSummary = () => {
    router.push(`/tasting/${code}/summary`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Joining session...</p>
        </div>
      </div>
    );
  }

  if (!session || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              Session not found or could not join.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWine = session.wines?.[currentWineIndex];
  const allWinesRated =
    session.wines?.every((wine) => {
      // Check if this wine has been rated (simplified check)
      return saved && currentWineIndex === session.wines!.length - 1;
    }) || false;

  if (!currentWine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">No wines in this session.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-3 md:p-6 pt-top-spacing space-y-4 md:space-y-8">
        {/* Header - Compact on mobile */}
        <div className="text-center md:text-left">
          <h1 className="text-lg md:text-2xl font-medium text-gray-900 mb-0.5 md:mb-2">
            {session.name}
          </h1>
          <p className="text-xs md:text-base text-gray-500">
            Wine {currentWineIndex + 1} of {session.wines?.length || 0}
          </p>
        </div>

        {/* Wine Card - Premium Design - Compact on mobile */}
        <Card className="p-3 md:p-6 bg-white border-0 md:border border-gray-200 rounded-xl md:rounded-2xl shadow-sm md:shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 items-start">
            {/* Left: Image - Smaller on mobile */}
            <div className="md:sticky md:top-6">
              {(() => {
                const imageUrl = getImageUrl(currentWine.label_image_path);
                if (!imageUrl) {
                  return (
                    <div className="relative w-full aspect-[2/3] md:aspect-[3/4] bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 flex items-center justify-center">
                      <p className="text-xs md:text-sm text-gray-400">No image</p>
                    </div>
                  );
                }
                
                return (
                  <div className="relative w-full aspect-[2/3] md:aspect-[3/4] bg-white rounded-xl md:rounded-2xl overflow-hidden border border-gray-100">
                    <div className="absolute inset-0 flex items-center justify-center p-1.5 md:p-2">
                      <Image
                        src={imageUrl}
                        alt={`${currentWine.wine_name} ${currentWine.vintage}`}
                        width={600}
                        height={800}
                        className="object-contain w-full h-full"
                        priority
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                        onError={(e) => {
                          console.error("Image failed to load:", imageUrl, currentWine.label_image_path);
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right: Wine Info - Compact on mobile */}
            <div className="min-w-0 space-y-3 md:space-y-6">
              <div>
                <h2 className="text-lg md:text-2xl font-medium text-gray-900 mb-1.5 md:mb-2">
                  {currentWine.wine_name} {currentWine.vintage}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 md:gap-3 text-xs md:text-sm text-gray-500 mb-2 md:mb-4">
                  {currentWine.producers?.name && (
                    <span className="font-medium text-gray-700">{currentWine.producers.name}</span>
                  )}
                  {currentWine.grape_varieties && (
                    <span>• {currentWine.grape_varieties}</span>
                  )}
                  {currentWine.color && (
                    <span>• {currentWine.color}</span>
                  )}
                </div>
                {currentWine.base_price_cents && (
                  <div className="mb-2 md:mb-4">
                    <MemberPrice
                      amount={currentWine.base_price_cents / 100}
                      currencyCode="SEK"
                      className="text-base md:text-xl font-medium text-gray-900"
                    />
                  </div>
                )}
              </div>

              {currentWine.description && (
                <div className="hidden md:block prose prose-sm max-w-none">
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">{currentWine.description}</p>
                </div>
              )}

              {/* Rating Section - Compact on mobile */}
              <div className="border-t border-gray-100 md:border-gray-200 pt-3 md:pt-6 space-y-3 md:space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <Label htmlFor="rating" className="text-xs md:text-base font-medium text-gray-900">
                      Rating
                    </Label>
                    <span
                      className={`text-xl md:text-3xl font-bold ${
                        rating >= 71
                          ? "text-green-600"
                          : rating >= 41
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {rating}
                    </span>
                  </div>
                  <Slider
                    id="rating"
                    min={0}
                    max={100}
                    step={1}
                    value={[rating]}
                    onValueChange={(value) => {
                      setRating(value[0]);
                      setSaved(false);
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] md:text-xs text-gray-400 mt-1 md:mt-2">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="comment" className="text-xs md:text-base font-medium text-gray-900">
                    Comment
                  </Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="Your thoughts..."
                    rows={3}
                    className="mt-1.5 md:mt-2 rounded-lg md:rounded-xl border-gray-200 text-sm"
                  />
                </div>

                <Button
                  onClick={saveRating}
                  disabled={saving}
                  className="w-full bg-black hover:bg-black/90 text-white rounded-full text-sm md:text-base"
                  size="default"
                >
                  {saving ? (
                    "Saving..."
                  ) : saved ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                      Save Rating
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation - Compact on mobile */}
        <div className="flex items-center justify-between gap-2">
          <Button
            onClick={() => navigateWine("prev")}
            disabled={currentWineIndex === 0}
            variant="outline"
            className="rounded-full flex-1 md:flex-initial text-xs md:text-sm"
            size="default"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <Button
            onClick={goToSummary}
            variant="outline"
            className="rounded-full flex-1 md:flex-initial text-xs md:text-sm"
            size="default"
          >
            Summary
          </Button>
          <Button
            onClick={() => navigateWine("next")}
            disabled={currentWineIndex === (session.wines?.length || 0) - 1}
            variant="outline"
            className="rounded-full flex-1 md:flex-initial text-xs md:text-sm"
            size="default"
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 sm:ml-2" />
          </Button>
        </div>

        {/* Wine List - Card view on mobile, Table on desktop */}
        {session.wines && session.wines.length > 0 && (
          <Card className="p-3 md:p-6 bg-white border-0 md:border border-gray-200 rounded-xl md:rounded-2xl shadow-sm md:shadow-none">
            <CardHeader className="px-0 md:px-0 pb-2 md:pb-4">
              <CardTitle className="text-base md:text-xl font-medium text-gray-900">
                All Wines
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-gray-500">
                Tap to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 md:px-0">
              {/* Mobile: Card view */}
              <div className="md:hidden space-y-2">
                {session.wines.map((wine, index) => {
                  const stats = wineStats.get(wine.id);
                  const isCurrentWine = index === currentWineIndex;
                  const imageUrl = getImageUrl(wine.label_image_path);
                  const getRatingColor = (rating: number | null) => {
                    if (rating === null) return "text-gray-400";
                    if (rating >= 71) return "text-green-600";
                    if (rating >= 41) return "text-yellow-600";
                    return "text-red-600";
                  };
                  
                  return (
                    <div
                      key={wine.id}
                      onClick={() => setCurrentWineIndex(index)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                        isCurrentWine
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-gray-100 hover:bg-gray-50"
                      )}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {imageUrl ? (
                          <div className="relative w-12 h-16 bg-white rounded overflow-hidden border border-gray-200">
                            <Image
                              src={imageUrl}
                              alt={`${wine.wine_name} ${wine.vintage}`}
                              fill
                              className="object-contain p-0.5"
                              unoptimized
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-16 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
                            <span className="text-[8px] text-gray-300">No img</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {wine.wine_name} {wine.vintage}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {wine.producers?.name || "—"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {wine.base_price_cents && (
                              <div className="text-right">
                                <MemberPrice
                                  amount={wine.base_price_cents / 100}
                                  currencyCode="SEK"
                                  className="text-xs font-medium text-gray-900"
                                />
                              </div>
                            )}
                            <span
                              className={cn(
                                "text-sm font-bold w-10 text-right",
                                getRatingColor(stats?.averageRating ?? null)
                              )}
                            >
                              {stats?.averageRating?.toFixed(1) || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-20">Image</TableHead>
                      <TableHead>Wine</TableHead>
                      <TableHead>Producer</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {session.wines.map((wine, index) => {
                      const stats = wineStats.get(wine.id);
                      const isCurrentWine = index === currentWineIndex;
                      const imageUrl = getImageUrl(wine.label_image_path);
                      const getRatingColor = (rating: number | null) => {
                        if (rating === null) return "text-gray-400";
                        if (rating >= 71) return "text-green-600";
                        if (rating >= 41) return "text-yellow-600";
                        return "text-red-600";
                      };
                      
                      return (
                        <TableRow
                          key={wine.id}
                          className={isCurrentWine ? "bg-gray-50 font-medium" : ""}
                          onClick={() => setCurrentWineIndex(index)}
                          style={{ cursor: "pointer" }}
                        >
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            {imageUrl ? (
                              <div className="relative w-16 h-20 bg-white rounded overflow-hidden border border-gray-200">
                                <Image
                                  src={imageUrl}
                                  alt={`${wine.wine_name} ${wine.vintage}`}
                                  fill
                                  className="object-contain p-1"
                                  unoptimized
                                  sizes="64px"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                <span className="text-xs text-gray-400">No image</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {wine.wine_name} {wine.vintage}
                              </div>
                              {wine.grape_varieties && (
                                <div className="text-sm text-gray-500">
                                  {wine.grape_varieties}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {wine.producers?.name || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {wine.base_price_cents ? (
                              <MemberPrice
                                amount={wine.base_price_cents / 100}
                                currencyCode="SEK"
                                className="text-sm font-medium text-gray-900"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "text-lg font-bold",
                                getRatingColor(stats?.averageRating ?? null)
                              )}
                            >
                              {stats?.averageRating?.toFixed(1) || "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
