"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MemberPrice } from "@/components/ui/member-price";
import { Settings } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLayout } from "@/components/layout/page-layout";
import { SidebarLinks } from "@/components/layout/sidebar/product-sidebar-links";
import { getColorHex } from "@/lib/utils";
import { ScorePickerDrawer } from "@/components/wine-tasting/score-picker-drawer";

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
    logo_image_path?: string | null;
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
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wineStats, setWineStats] = useState<Map<string, { averageRating: number | null; totalRatings: number }>>(new Map());
  const [participantRatingsMap, setParticipantRatingsMap] = useState<Map<string, number>>(new Map());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scoreDrawerOpen, setScoreDrawerOpen] = useState(false);

  // When guest selects a wine in the table, we ignore server updates until admin changes wine again
  const guestHasOverriddenWineRef = useRef(false);
  const lastServerWineIndexRef = useRef(0);

  useEffect(() => {
    setImageDimensions(null);
  }, [currentWineIndex]);

  // Check admin status from API (checks both profile role and admin cookie)
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/me/admin");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
          console.log("[Tasting] Admin check:", data);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    
    checkAdmin();
  }, []);

  // Check if user is a guest (not logged in)
  useEffect(() => {
    const checkGuestStatus = async () => {
      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const data = await response.json();
          setIsGuest(data.isGuest || false);
        } else {
          setIsGuest(true);
        }
      } catch (error) {
        console.error("Error checking guest status:", error);
        setIsGuest(true);
      }
    };
    checkGuestStatus();
  }, []);

  // Prevent navigation away from tasting pages for guests
  useEffect(() => {
    if (isGuest) {
      // Store original push function
      const originalPush = router.push.bind(router);
      
      // Override router.push to prevent navigation away from tasting pages
      (router as any).push = (url: string | { pathname: string }) => {
        const path = typeof url === "string" ? url : url.pathname;
        if (!path.startsWith("/tasting/")) {
          toast.error("Please log in to access other pages");
          return Promise.resolve(false);
        }
        return originalPush(url);
      };

      return () => {
        // Restore original push function
        router.push = originalPush;
      };
    }
  }, [isGuest, code, router]);

  useEffect(() => {
    if (code) {
      joinSession();
    }
  }, [code]);

  useEffect(() => {
    if (!session || !participant) return;
    return setupRealtimeSubscription();
  }, [session?.id, participant?.id]);

  useEffect(() => {
    if (session && participant && currentWineIndex >= 0) {
      loadCurrentRating();
    }
  }, [session, participant, currentWineIndex]);

  useEffect(() => {
    if (session && participant) {
      fetchWineStats();
      // Set up polling to refresh stats every 3 seconds
      const interval = setInterval(() => {
        fetchWineStats();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [session, participant]);

  // Poll current_wine_index so guest sees admin changes even if Realtime is unavailable
  useEffect(() => {
    if (!session || !participant) return;
    const pollCurrentWine = async () => {
      try {
        const res = await fetch(`/api/wine-tastings/${session.id}`);
        if (!res.ok) return;
        const { session: sessionData } = await res.json();
        const serverIndex = sessionData?.current_wine_index ?? 0;
        const shouldFollow = !guestHasOverriddenWineRef.current;
        const adminChangedWine = guestHasOverriddenWineRef.current && serverIndex !== lastServerWineIndexRef.current;
        if (shouldFollow || adminChangedWine) {
          if (adminChangedWine) guestHasOverriddenWineRef.current = false;
          lastServerWineIndexRef.current = serverIndex;
          setSession((prev) => {
            if (!prev || prev.current_wine_index === serverIndex) return prev;
            return { ...prev, current_wine_index: serverIndex };
          });
          setCurrentWineIndex(serverIndex);
        }
      } catch (_) {}
    };
    const interval = setInterval(pollCurrentWine, 2500);
    return () => clearInterval(interval);
  }, [session?.id, participant?.id]);

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
        // Don't redirect guests away from tasting pages
        if (!isGuest) {
          router.push("/");
        }
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
        const serverIndex = sessionData.current_wine_index ?? 0;
        setSession(sessionData);
        setCurrentWineIndex(serverIndex);
        lastServerWineIndexRef.current = serverIndex;
        guestHasOverriddenWineRef.current = false;
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

        // Build map of this participant's ratings so table can show "Your rating" for every wine
        if (participant) {
          const myRatings = new Map<string, number>();
          (ratings || []).forEach((r: any) => {
            if (r.participant_id === participant.id) {
              myRatings.set(r.wine_id, r.rating);
            }
          });
          setParticipantRatingsMap(myRatings);
        }
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
          const serverIndex = updatedSession?.current_wine_index ?? 0;
          const shouldFollow = !guestHasOverriddenWineRef.current;
          const adminChangedWine = guestHasOverriddenWineRef.current && serverIndex !== lastServerWineIndexRef.current;
          if (shouldFollow || adminChangedWine) {
            if (adminChangedWine) guestHasOverriddenWineRef.current = false;
            lastServerWineIndexRef.current = serverIndex;
            setSession((prev) => (prev ? { ...prev, current_wine_index: serverIndex } : null));
            setCurrentWineIndex(serverIndex);
            loadCurrentRating();
          }
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
      setRating(0);
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
          setRating(0);
          setComment("");
          setSaved(false);
        }
      }
    } catch (error) {
      console.error("Error loading rating:", error);
    }
  };

  const saveRating = async (overrideRating?: number, overrideComment?: string) => {
    if (!session || !participant || !currentWine) return;
    const valueToSave = overrideRating ?? rating;
    const commentToSave = overrideComment !== undefined ? overrideComment : comment;

    try {
      setSaving(true);
      const response = await fetch(`/api/wine-tastings/${session.id}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participant.id,
          wine_id: currentWine.id,
          rating: Math.round(valueToSave),
          comment: commentToSave.trim() || null,
        }),
      });

      if (response.ok) {
        if (overrideRating != null) setRating(overrideRating);
        if (overrideComment !== undefined) setComment(overrideComment);
        setSaved(true);
        setParticipantRatingsMap((prev) => new Map(prev).set(currentWine.id, Math.round(valueToSave)));
        toast.success("Rating saved!");
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

  const goToSummary = () => {
    router.push(`/tasting/${code}/summary`);
  };

  if (loading) {
    return (
      <PageLayout className="bg-neutral-50 min-h-screen" noPadding={true}>
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-6 min-h-max p-4 md:pl-sides">
          <div className="col-span-5 2xl:col-span-4 space-y-4">
            <Skeleton className="h-4 w-32 rounded-xl" />
            <Skeleton className="h-8 w-48 rounded-xl" />
            <div className="rounded-2xl bg-white border border-neutral-100 p-5 space-y-3">
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
          <div className="hidden md:block col-span-7 col-start-6">
            <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          </div>
        </div>
        <p className="text-center text-sm text-neutral-500 py-8">Joining session...</p>
      </PageLayout>
    );
  }

  if (!session || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <Card className="max-w-md rounded-2xl border-neutral-200 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-neutral-600">
              Session not found or could not join.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWine = session.wines?.[currentWineIndex];

  if (!currentWine) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <Card className="max-w-md rounded-2xl border-neutral-200 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-neutral-600">No wines in this session.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalWines = session.wines?.length || 0;
  const imageUrl = getImageUrl(currentWine.label_image_path);
  const producerLogoUrl = currentWine.producers?.logo_image_path
    ? getImageUrl(currentWine.producers.logo_image_path)
    : null;

  return (
    <PageLayout className="bg-neutral-50 min-h-screen" noPadding={true}>
      <TooltipProvider>
        {isAdmin && (
          <div className="fixed top-4 left-4 z-50">
            <Button variant="outline" size="sm" className="shrink-0 rounded-xl border-neutral-200 bg-white shadow-sm" asChild>
              <Link href={`/admin/wine-tastings/${session.id}/control`} prefetch={false}>
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Link>
            </Button>
          </div>
        )}
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-6 min-h-max max-md:pb-8">
          {/* Mobile gallery - soft rounded bottom */}
          <div
            className="md:hidden col-span-full h-[55vh] min-h-[360px] overflow-clip rounded-b-3xl bg-white shadow-sm relative"
            style={{ touchAction: "pan-y", overscrollBehavior: "auto" }}
          >
            <button
              type="button"
              onClick={() => setScoreDrawerOpen(true)}
              className="absolute top-4 right-4 z-20 min-w-[3.5rem] min-h-[3.5rem] px-3 rounded-full bg-rose-100 border-2 border-rose-200 shadow-md flex items-center justify-center text-sm font-bold text-rose-900 hover:bg-rose-200 transition-colors"
              aria-label={saved ? "Change score" : "Score wine"}
            >
              {saved ? rating : "No Score"}
            </button>
            {imageUrl ? (
              <div className="relative w-full h-full">
                <div className="overflow-clip h-full">
                  <div className="flex h-full">
                    <div className="flex-shrink-0 w-full h-full relative">
                      <Image
                        src={imageUrl}
                        alt={`${currentWine.wine_name} ${currentWine.vintage}`}
                        width={imageDimensions?.width ?? 600}
                        height={imageDimensions?.height ?? 800}
                        style={{ aspectRatio: imageDimensions ? `${imageDimensions.width} / ${imageDimensions.height}` : "3/4" }}
                        className="w-full h-full object-cover"
                        priority
                        unoptimized
                        sizes="100vw"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalWidth && img.naturalHeight) {
                            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                          }
                        }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-100 rounded-b-3xl">No image</div>
            )}
          </div>

          {/* Mobile only: full-width score button */}
          <div className="md:hidden mx-4 -mt-2 relative z-10">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100">
              <Button
                type="button"
                size="lg"
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white border-0 rounded-xl h-12 text-base font-medium"
                onClick={() => setScoreDrawerOpen(true)}
              >
                {saved ? "Change Score" : "Score Wine"}
              </Button>
            </div>
          </div>

          {/* Left column: white info card */}
          <div className="flex flex-col col-span-5 2xl:col-span-4 max-md:col-span-full min-h-max max-md:px-4 md:pl-sides max-md:static">
            <div className="col-span-full">
              <div className="flex flex-col col-span-full gap-5 md:mb-10 max-md:order-2">
                <div className="flex flex-col grid-cols-2 rounded-2xl bg-white shadow-sm border border-neutral-100 md:grid md:gap-x-6 md:gap-y-6 place-items-baseline p-5 md:p-6">
                  <div className="md:col-start-1 md:row-start-1">
                    <h1 className="text-xl font-semibold text-neutral-900 lg:text-2xl 2xl:text-3xl text-balance max-md:mb-1 leading-tight">
                      {currentWine.wine_name} {currentWine.vintage}
                    </h1>
                    {currentWine.producers?.name && (
                      <div className="flex items-center gap-2 mt-2 mb-1">
                        {producerLogoUrl && (
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg">
                            <Image src={producerLogoUrl} alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
                          </div>
                        )}
                        <p className="text-sm text-neutral-500">{currentWine.producers.name}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 md:col-start-2 md:row-start-1 leading-relaxed">
                    {currentWine.description?.trim() || "—"}
                  </p>
                  <div className="flex gap-3 items-center text-lg font-semibold text-neutral-900 lg:text-xl 2xl:text-2xl max-md:mt-2 md:col-start-1 md:row-start-2">
                    {currentWine.base_price_cents ? (
                      <MemberPrice
                        amount={currentWine.base_price_cents / 100}
                        currencyCode="SEK"
                        className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
                        showBadge={true}
                      />
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </div>

                  <div className="col-span-full w-full mt-2 space-y-4">
                    <Button
                      type="button"
                      size="lg"
                      className="w-full max-md:hidden bg-neutral-900 hover:bg-neutral-800 text-white border-0 rounded-xl h-12 font-medium"
                      onClick={() => setScoreDrawerOpen(true)}
                    >
                      {saved ? "Change Score" : "Score Wine"}
                    </Button>
                    <ScorePickerDrawer
                      key={currentWine.id}
                      open={scoreDrawerOpen}
                      onOpenChange={setScoreDrawerOpen}
                      value={saved ? rating : 50}
                      comment={comment}
                      initialScrollOnly={!saved}
                      onConfirm={(newValue, newComment) => {
                        setRating(newValue);
                        setComment(newComment);
                        saveRating(newValue, newComment);
                      }}
                    />
                    <div className="flex gap-2 pt-2">
                      <Button variant="secondary" size="sm" className="rounded-xl" onClick={goToSummary}>Summary</Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <dl className="flex items-center gap-4 rounded-xl bg-neutral-50/80 py-3.5 px-4 justify-between border border-neutral-100">
                    <dt className="text-sm font-semibold text-neutral-700">Grapes</dt>
                    <dd className="text-sm text-neutral-600">{currentWine.grape_varieties || "—"}</dd>
                  </dl>
                  <dl className="flex items-center gap-4 rounded-xl bg-neutral-50/80 py-3.5 px-4 justify-between border border-neutral-100">
                    <dt className="text-sm font-semibold text-neutral-700">Color</dt>
                    <dd className="flex flex-wrap gap-2 items-center">
                      {currentWine.color ? (
                        <>
                          <div
                            className="w-6 h-6 rounded-full border border-neutral-200 shadow-inner"
                            style={{ backgroundColor: (() => { const hex = getColorHex(currentWine.color); return Array.isArray(hex) ? hex[0] : hex; })() }}
                            title={currentWine.color}
                          />
                          <span className="text-sm text-neutral-600">{currentWine.color}</span>
                        </>
                      ) : (
                        <span className="text-sm text-neutral-500">—</span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <SidebarLinks className="flex-col-reverse max-md:hidden py-sides w-full max-w-[408px] pr-sides max-md:pr-0 max-md:py-0" />
          </div>

          {/* Desktop gallery */}
          <div
            className="hidden overflow-clip relative col-span-7 col-start-6 w-full md:block rounded-2xl bg-white shadow-sm border border-neutral-100"
            style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
          >
            <button
              type="button"
              onClick={() => setScoreDrawerOpen(true)}
              className="absolute top-6 right-6 z-20 min-w-[4rem] min-h-[4rem] px-4 rounded-full bg-rose-100 border-2 border-rose-200 shadow-md flex items-center justify-center text-base font-bold text-rose-900 hover:bg-rose-200 transition-colors"
              aria-label={saved ? "Change score" : "Score wine"}
            >
              {saved ? rating : "No Score"}
            </button>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`${currentWine.wine_name} ${currentWine.vintage}`}
                width={imageDimensions?.width ?? 600}
                height={imageDimensions?.height ?? 800}
                style={{ aspectRatio: imageDimensions ? `${imageDimensions.width} / ${imageDimensions.height}` : "3/4" }}
                className="w-full object-cover"
                priority
                unoptimized
                sizes="(min-width: 768px) 58vw, 100vw"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                  }
                }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[60vh] text-neutral-400 bg-neutral-100 rounded-2xl">No image</div>
            )}
          </div>

          {/* All Wines table - overflow-clip + touchAction so page scrolls when over table */}
          <div
            className="col-span-full px-4 md:pl-sides md:pb-sides pt-6 md:pt-8"
            style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
          >
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">All wines</h2>
            <div
              className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-clip"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
            >
              <Table scrollContainer={false}>
                <TableHeader>
                  <TableRow className="border-neutral-100 hover:bg-transparent">
                    <TableHead className="w-14 text-neutral-500 font-medium"> </TableHead>
                    <TableHead className="w-12 text-neutral-500 font-medium">#</TableHead>
                    <TableHead className="text-neutral-500 font-medium">Wine</TableHead>
                    <TableHead className="text-neutral-500 font-medium">Vintage</TableHead>
                    <TableHead className="text-right text-neutral-500 font-medium">Your rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.wines?.map((wine, index) => {
                    const isCurrent = index === currentWineIndex;
                    const wineImageUrl = getImageUrl(wine.label_image_path);
                    return (
                      <TableRow
                        key={wine.id}
                        className={isCurrent ? "bg-amber-50/70" : "cursor-pointer hover:bg-neutral-50 transition-colors"}
                        onClick={() => {
                          if (!isCurrent) {
                            guestHasOverriddenWineRef.current = true;
                            setCurrentWineIndex(index);
                            setSaved(false);
                          }
                        }}
                      >
                        <TableCell className="w-14 p-2">
                          <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-neutral-50 border border-neutral-100 flex-shrink-0">
                            {wineImageUrl ? (
                              <Image
                                src={wineImageUrl}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">—</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-neutral-900">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-neutral-900">{wine.wine_name}</span>
                            <span className="text-sm text-neutral-500">{wine.producers?.name ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-neutral-600">{wine.vintage || "—"}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-amber-700">
                          {(() => {
                            const savedRating = participantRatingsMap.get(wine.id);
                            if (savedRating !== undefined) return savedRating;
                            if (isCurrent) return rating;
                            return "—";
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </PageLayout>
  );
}
