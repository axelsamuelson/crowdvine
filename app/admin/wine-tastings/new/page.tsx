"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Plus, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { QRCodeDisplay } from "@/components/admin/qr-code-display";

interface Wine {
  id: string;
  wine_name?: string; // From API if available
  vintage?: string; // From API if available
  title?: string; // Shopify format: "Wine Name Vintage"
  producerName?: string; // Shopify format
  grape_varieties?: string;
  color?: string;
  label_image_path?: string;
  description?: string;
}

export default function NewWineTastingPage() {
  const router = useRouter();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedWineIds, setSelectedWineIds] = useState<string[]>([]);
  const [wineOrder, setWineOrder] = useState<string[]>([]);
  const [createdSession, setCreatedSession] = useState<any>(null);

  useEffect(() => {
    fetchWines();
  }, []);

  const fetchWines = async () => {
    try {
      const response = await fetch("/api/crowdvine/products");
      if (response.ok) {
        const data = await response.json();
        // API returns an array directly, not wrapped in an object
        const winesArray = Array.isArray(data) ? data : (data.products || []);
        
        // Map Shopify format to our Wine interface
        const mappedWines = winesArray.map((wine: any) => {
          // Extract wine_name and vintage from title if needed
          let wine_name = wine.wine_name;
          let vintage = wine.vintage;
          
          if (wine.title && !wine_name) {
            // Title format is usually "Wine Name Vintage"
            const titleParts = wine.title.split(/\s+/);
            if (titleParts.length >= 2) {
              // Assume last part is vintage
              vintage = titleParts[titleParts.length - 1];
              wine_name = titleParts.slice(0, -1).join(" ");
            } else {
              wine_name = wine.title;
            }
          }
          
          return {
            id: wine.id,
            wine_name: wine_name || wine.title || "Unknown Wine",
            vintage: vintage || "",
            title: wine.title || `${wine_name || ""} ${vintage || ""}`.trim(),
            producerName: wine.producerName,
            grape_varieties: wine.grape_varieties || wine.options?.find((opt: any) => opt.name === "Grape Varieties")?.values?.map((v: any) => v.name).join(", "),
            color: wine.color || wine.options?.find((opt: any) => opt.name === "Color")?.values?.[0]?.name,
            label_image_path: wine.label_image_path || wine.featuredImage?.url,
            description: wine.description,
          };
        });
        
        console.log("Mapped wines:", mappedWines.slice(0, 3)); // Debug first 3 wines
        setWines(mappedWines);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch wines" }));
        console.error("Error fetching wines:", errorData);
        toast.error(errorData.error || "Failed to load wines");
      }
    } catch (error) {
      console.error("Error fetching wines:", error);
      toast.error("Failed to load wines");
    } finally {
      setLoading(false);
    }
  };

  const handleWineToggle = (wineId: string) => {
    if (selectedWineIds.includes(wineId)) {
      setSelectedWineIds(selectedWineIds.filter((id) => id !== wineId));
      setWineOrder(wineOrder.filter((id) => id !== wineId));
    } else {
      setSelectedWineIds([...selectedWineIds, wineId]);
      setWineOrder([...wineOrder, wineId]);
    }
  };

  const moveWine = (index: number, direction: "up" | "down") => {
    const newOrder = [...wineOrder];
    if (direction === "up" && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [
        newOrder[index - 1],
        newOrder[index],
      ];
    } else if (direction === "down" && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [
        newOrder[index + 1],
        newOrder[index],
      ];
    }
    setWineOrder(newOrder);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    if (wineOrder.length === 0) {
      toast.error("Please select at least one wine");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/wine-tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          wine_ids: wineOrder,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedSession(data.session);
        toast.success("Session created successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create session");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    } finally {
      setSaving(false);
    }
  };

  const getTastingUrl = () => {
    if (!createdSession) return "";
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/tasting/${createdSession.session_code}`;
  };


  if (createdSession) {
    const tastingUrl = getTastingUrl();

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Session Created</h1>
          <Link href="/admin/wine-tastings">
            <Button variant="outline">Back to Sessions</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{createdSession.name}</CardTitle>
            <CardDescription>Session Code: {createdSession.session_code}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Tasting URL</Label>
              <div className="flex gap-2 mt-2">
                <Input value={tastingUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(tastingUrl);
                    toast.success("URL copied to clipboard");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <QRCodeDisplay value={tastingUrl} title="QR Code" />

            <div className="flex gap-2">
              <Link href={`/admin/wine-tastings/${createdSession.id}`} className="flex-1">
                <Button className="w-full">View Session</Button>
              </Link>
              <Link
                href={`/admin/wine-tastings/${createdSession.id}/control`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full">Control Panel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/wine-tastings">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Wine Tasting Session</h1>
          <p className="text-gray-600">Create a new digital wine tasting session</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Session Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Restaurant Tasting - January 2025"
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Admin Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this session..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Wines</CardTitle>
            <CardDescription>
              Choose wines for this tasting session and arrange them in order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-gray-500">Loading wines...</p>
            ) : (
              <>
                <div className="grid gap-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {wines.map((wine) => (
                    <label
                      key={wine.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedWineIds.includes(wine.id)}
                        onChange={() => handleWineToggle(wine.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {wine.title || `${wine.wine_name || "Unknown Wine"} ${wine.vintage || ""}`.trim()}
                        </div>
                        {wine.producerName && (
                          <div className="text-xs text-gray-400 mb-1">
                            {wine.producerName}
                          </div>
                        )}
                        {(wine.grape_varieties || wine.description) && (
                          <div className="text-sm text-gray-500">
                            {wine.grape_varieties || wine.description?.substring(0, 50)}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {wineOrder.length > 0 && (
                  <div className="mt-4">
                    <Label>Wine Order (drag to reorder)</Label>
                    <div className="space-y-2 mt-2 border rounded-lg p-4">
                      {wineOrder.map((wineId, index) => {
                        const wine = wines.find((w) => w.id === wineId);
                        if (!wine) return null;

                        return (
                          <div
                            key={wineId}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                          >
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <span className="flex-1">
                              {index + 1}. {wine.title || `${wine.wine_name || "Unknown Wine"} ${wine.vintage || ""}`.trim()}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveWine(index, "up")}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveWine(index, "down")}
                              disabled={index === wineOrder.length - 1}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedWineIds(
                                  selectedWineIds.filter((id) => id !== wineId),
                                );
                                setWineOrder(wineOrder.filter((id) => id !== wineId));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/admin/wine-tastings">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving || wineOrder.length === 0}>
            {saving ? "Creating..." : "Create Session"}
          </Button>
        </div>
      </form>
    </div>
  );
}
