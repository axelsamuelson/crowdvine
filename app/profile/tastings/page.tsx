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
import { ArrowLeft, Wine, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Tasting {
  participant: {
    id: string;
    joined_at: string;
  };
  session: {
    id: string;
    session_code: string;
    name: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  };
  ratings: Array<{
    id: string;
    rating: number;
    comment: string | null;
    tasted_at: string;
    wine: {
      id: string;
      wine_name: string;
      vintage: string;
      grape_varieties?: string;
      color?: string;
    };
  }>;
}

export default function ProfileTastingsPage() {
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTastings();
  }, []);

  const fetchTastings = async () => {
    try {
      const response = await fetch("/api/user/tastings");
      if (response.ok) {
        const data = await response.json();
        setTastings(data.tastings || []);
      }
    } catch (error) {
      console.error("Error fetching tastings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 71) return "bg-green-100 text-green-800";
    if (rating >= 41) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/profile">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">My Tasting History</h1>
          <p className="text-gray-600">All your wine tasting sessions</p>
        </div>
      </div>

      {tastings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wine className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No tasting sessions yet</p>
            <p className="text-sm text-gray-400">
              Join a tasting session to see your history here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tastings.map((tasting) => (
            <Card key={tasting.participant.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{tasting.session.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {tasting.session.session_code}
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      tasting.session.status === "active"
                        ? "bg-green-100 text-green-800"
                        : tasting.session.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }
                  >
                    {tasting.session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(tasting.participant.joined_at), "PPp")}
                  </div>
                  <span>•</span>
                  <span>{tasting.ratings.length} wines rated</span>
                </div>

                {tasting.ratings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Your Ratings</h3>
                    <div className="grid gap-2">
                      {tasting.ratings.map((rating) => (
                        <div
                          key={rating.id}
                          className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {rating.wine.wine_name} {rating.wine.vintage}
                            </p>
                            {rating.wine.grape_varieties && (
                              <p className="text-sm text-gray-600">
                                {rating.wine.grape_varieties}
                              </p>
                            )}
                            {rating.comment && (
                              <p className="text-sm text-gray-700 mt-1">
                                {rating.comment}
                              </p>
                            )}
                          </div>
                          <Badge className={getRatingColor(rating.rating)}>
                            {rating.rating}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/tasting/${tasting.session.session_code}/summary`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      View Summary
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
