"use client";

import { useState, useEffect } from "react";
import { getAppUrl } from "@/lib/app-url";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Settings, Users, Eye, Trash2, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, ChevronsUpDown, X, QrCode } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";
import { QRCodeDisplay } from "@/components/admin/qr-code-display";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const cleanPath = path.trim().replace(/\n/g, "");
  if (cleanPath.startsWith("http")) return cleanPath;
  if (cleanPath.startsWith("/uploads/")) {
    const fileName = cleanPath.replace("/uploads/", "");
    return `/api/images/${fileName}`;
  }
  return `/api/images/${cleanPath}`;
}

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [participants, setParticipants] = useState<Array<{ id: string; name: string | null; participant_code: string; is_anonymous: boolean; joined_at: string }>>([]);
  const [updating, setUpdating] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [creating, setCreating] = useState(false);
  const [availableWines, setAvailableWines] = useState<Array<{ id: string; wine_name: string; vintage: string; grape_varieties?: string; color?: string; label_image_path?: string | null; producers?: { name: string } | null }>>([]);
  const [selectedWineIds, setSelectedWineIds] = useState<string[]>([]);
  const [wineSearch, setWineSearch] = useState("");
  const [selectedBusinessUserId, setSelectedBusinessUserId] = useState<string | null>(null);
  const [businessUsers, setBusinessUsers] = useState<Array<{ id: string; email: string | null; full_name: string | null }>>([]);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [businessSearch, setBusinessSearch] = useState("");

  const isNewPage = id === "new";

  useEffect(() => {
    if (isNewPage) {
      setLoading(false);
      fetchWines();
      return;
    }
    fetchSession();
  }, [id, isNewPage]);

  useEffect(() => {
    if (businessOpen && businessUsers.length === 0) {
      fetch("/api/admin/business-users")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setBusinessUsers(Array.isArray(data) ? data : []))
        .catch(() => setBusinessUsers([]));
    }
  }, [businessOpen, businessUsers.length]);

  const fetchWines = async () => {
    try {
      const response = await fetch("/api/admin/wines");
      if (response.ok) {
        const data = await response.json();
        setAvailableWines(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching wines:", error);
    }
  };

  const fetchSession = async () => {
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
        const { participants: list } = await participantsRes.json();
        setParticipants(list || []);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session || session.id !== id) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`tasting-session-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wine_tasting_sessions", filter: `id=eq.${session.id}` },
        (payload: { new: Record<string, unknown> }) => {
          const next = payload.new as Session;
          setSession((prev) => prev ? { ...prev, current_wine_index: next.current_wine_index } : null);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wine_tasting_participants", filter: `session_id=eq.${session.id}` },
        () => fetchSession(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, id]);

  const changeWine = async (newIndex: number) => {
    if (!session || newIndex < 0 || newIndex >= (session.wines?.length || 0)) return;
    try {
      setUpdating(true);
      const response = await fetch(`/api/wine-tastings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_wine_index: newIndex }),
      });
      if (response.ok) {
        const { session: updated } = await response.json();
        setSession((prev) => (prev ? { ...prev, current_wine_index: updated.current_wine_index } : null));
        toast.success(`Bytte till vin ${newIndex + 1}`);
      } else {
        const err = await response.json();
        toast.error(err.error || "Kunde inte byta vin");
      }
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte byta vin");
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSessionName.trim();
    if (!name) {
      toast.error("Please enter a session name");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/wine-tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          wine_order: selectedWineIds,
          ...(selectedBusinessUserId ? { business_user_id: selectedBusinessUserId } : {}),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create session: ${response.status}`);
      }
      const { session: newSession } = await response.json();
      toast.success("Session created");
      router.push(`/admin/wine-tastings/${newSession.id}`);
    } catch (err: unknown) {
      console.error("Error creating session:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const getTastingUrl = () => {
    if (!session) return "";
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : getAppUrl();
    return `${baseUrl}/tasting/${session.session_code}`;
  };

  const openDeleteDialog = () => setDeleteDialogOpen(true);
  const closeDeleteDialog = () => { if (!deleting) setDeleteDialogOpen(false); };

  const handleConfirmDelete = async () => {
    if (!session) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/wine-tastings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
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
      setDeleteDialogOpen(false);
      router.push("/admin/wine-tastings");
    } catch (error: unknown) {
      console.error("Error deleting session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    } finally {
      setDeleting(false);
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

  if (isNewPage) {
    const producerName = (w: (typeof availableWines)[0]) => {
      const p = w.producers;
      if (Array.isArray(p) && p[0] && "name" in p[0]) return (p[0] as { name: string }).name;
      if (p && typeof p === "object" && "name" in p) return (p as { name: string }).name;
      return "";
    };
    const filteredWines = availableWines.filter(
      (w) =>
        !wineSearch.trim() ||
        w.wine_name?.toLowerCase().includes(wineSearch.toLowerCase()) ||
        w.vintage?.toLowerCase().includes(wineSearch.toLowerCase()) ||
        w.grape_varieties?.toLowerCase().includes(wineSearch.toLowerCase()) ||
        producerName(w).toLowerCase().includes(wineSearch.toLowerCase()),
    );
    const selectedWines = selectedWineIds
      .map((wid) => availableWines.find((w) => w.id === wid))
      .filter(Boolean) as (typeof availableWines)[0][];

    const addWine = (wineId: string) => {
      if (!selectedWineIds.includes(wineId)) {
        setSelectedWineIds((prev) => [...prev, wineId]);
      }
    };
    const removeWine = (wineId: string) => {
      setSelectedWineIds((prev) => prev.filter((id) => id !== wineId));
    };
    const moveWine = (index: number, direction: 1 | -1) => {
      const next = index + direction;
      if (next < 0 || next >= selectedWineIds.length) return;
      setSelectedWineIds((prev) => {
        const copy = [...prev];
        [copy[index], copy[next]] = [copy[next], copy[index]];
        return copy;
      });
    };

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing space-y-6">
          <Link href="/admin/wine-tastings">
            <Button variant="outline" size="sm" className="rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">New tasting session</CardTitle>
              <CardDescription>
                Name the session and add wines in the order they will be tasted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSession} className="space-y-6">
                <div>
                  <Label htmlFor="session-name">Session name</Label>
                  <Input
                    id="session-name"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="e.g. Red wine evening"
                    className="mt-2 max-w-md"
                    disabled={creating}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Business (optional)</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Link session and ratings to a user (e.g. producer). Not required to start a session.
                  </p>
                  <Popover open={businessOpen} onOpenChange={setBusinessOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={businessOpen}
                        className="w-full max-w-md justify-between"
                        disabled={creating}
                      >
                        {selectedBusinessUserId
                          ? (() => {
                              const u = businessUsers.find((b) => b.id === selectedBusinessUserId);
                              return u ? (u.full_name || u.email || u.id) : selectedBusinessUserId;
                            })()
                          : "Select business..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search by name or email..."
                          value={businessSearch}
                          onValueChange={setBusinessSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No business user found.</CommandEmpty>
                          <CommandGroup>
                            {businessUsers
                              .filter(
                                (u) =>
                                  !businessSearch.trim() ||
                                  (u.full_name ?? "").toLowerCase().includes(businessSearch.toLowerCase()) ||
                                  (u.email ?? "").toLowerCase().includes(businessSearch.toLowerCase()),
                              )
                              .map((u) => (
                                <CommandItem
                                  key={u.id}
                                  value={[u.full_name ?? "", u.email ?? "", u.id].join(" ")}
                                  onSelect={() => {
                                    setSelectedBusinessUserId(u.id);
                                    setBusinessSearch("");
                                    setBusinessOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedBusinessUserId === u.id ? "opacity-100" : "opacity-0")} />
                                  {u.full_name || u.email || u.id}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedBusinessUserId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-muted-foreground"
                      onClick={() => setSelectedBusinessUserId(null)}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Clear business
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Wines in this session (tasting order)</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Add wines below and use arrows to reorder.
                  </p>
                  {selectedWines.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg px-4">
                      No wines added yet. Search and add wines below.
                    </p>
                  ) : (
                    <ul className="space-y-2 border rounded-lg p-3 bg-gray-50">
                      {selectedWines.map((w, index) => (
                        <li
                          key={w.id}
                          className="flex items-center gap-3 py-2 px-3 bg-white rounded border"
                        >
                          <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden bg-gray-100 border border-gray-200">
                            {getImageUrl(w.label_image_path) ? (
                              <Image
                                src={getImageUrl(w.label_image_path)!}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">?</div>
                            )}
                          </div>
                          <span className="text-sm truncate flex-1 min-w-0">
                            {index + 1}. {w.wine_name} {w.vintage}
                            {producerName(w) ? ` · ${producerName(w)}` : ""}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveWine(index, -1)}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveWine(index, 1)}
                              disabled={index === selectedWines.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeWine(w.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <Label htmlFor="wine-search" className="text-sm font-medium">Add wines</Label>
                  <Input
                    id="wine-search"
                    placeholder="Search by name, vintage, grape or producer..."
                    value={wineSearch}
                    onChange={(e) => setWineSearch(e.target.value)}
                    className="mt-2 mb-3 max-w-md"
                  />
                  <ul className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {filteredWines.map((w) => {
                      const isSelected = selectedWineIds.includes(w.id);
                      return (
                        <li key={w.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                          <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden bg-gray-100 border border-gray-200">
                            {getImageUrl(w.label_image_path) ? (
                              <Image
                                src={getImageUrl(w.label_image_path)!}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">?</div>
                            )}
                          </div>
                          <span className="text-sm truncate flex-1 min-w-0">
                            {w.wine_name} {w.vintage}
                            {producerName(w) ? ` · ${producerName(w)}` : ""}
                            {w.grape_varieties ? ` (${w.grape_varieties})` : ""}
                          </span>
                          <Button
                            type="button"
                            variant={isSelected ? "secondary" : "outline"}
                            size="sm"
                            className="shrink-0"
                            onClick={() => (isSelected ? removeWine(w.id) : addWine(w.id))}
                          >
                            {isSelected ? "Remove" : <><Plus className="h-4 w-4 mr-1 hidden sm:inline" /> Add</>}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  {filteredWines.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">No wines match your search.</p>
                  )}
                </div>

                <Button type="submit" className="rounded-full" disabled={creating}>
                  {creating ? "Creating…" : "Create session"}
                </Button>
              </form>
            </CardContent>
          </Card>
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
    <>
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing space-y-6 md:space-y-8">
        {/* Header: Back, title, actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/wine-tastings">
              <Button variant="outline" size="sm" className="rounded-full shrink-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-medium text-gray-900 truncate">{session.name}</h1>
              <p className="text-gray-500 font-mono text-xs sm:text-sm truncate">{session.session_code}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setQrDialogOpen(true)}>
              <QrCode className="w-4 h-4 mr-2" />
              QR & länk
            </Button>
            {session.session_code && (
              <Link href={`/tasting/${session.session_code}`}>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Öppna session
                </Button>
              </Link>
            )}
            <Button variant="destructive" size="sm" onClick={openDeleteDialog} className="rounded-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Ta bort
            </Button>
          </div>
        </div>

        {/* QR & link popup */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="rounded-2xl border border-gray-200 p-6 max-w-[min(90vw,340px)]">
            <DialogTitle className="sr-only">QR-kod och länk</DialogTitle>
            <div className="flex flex-col items-center gap-4">
              <QRCodeDisplay
                value={getTastingUrl()}
                size={Math.min(220, typeof window !== "undefined" ? window.innerWidth * 0.6 : 220)}
                showTitle={false}
                showDownload={false}
              />
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => {
                  navigator.clipboard.writeText(getTastingUrl());
                  toast.success("Länk kopierad");
                }}
              >
                Kopiera länk
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Compact session info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 px-3 rounded-xl bg-white border border-gray-200 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-gray-500">Status:</span>
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
          </span>
          <span className="text-gray-500">Skapad: {format(new Date(session.created_at), "d MMM yyyy, HH:mm")}</span>
          {session.completed_at && (
            <span className="text-gray-500">Avslutad: {format(new Date(session.completed_at), "d MMM yyyy")}</span>
          )}
          {session.notes && <span className="text-gray-600 truncate max-w-[200px]">{session.notes}</span>}
        </div>

        {/* Active session: current wine + change wine + participants */}
        {session.status === "active" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* Current wine */}
              <Card className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Aktuellt vin</CardTitle>
                  <CardDescription className="text-sm">
                    Vin {session.current_wine_index + 1} av {session.wines?.length || 0}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.wines?.[session.current_wine_index] ? (
                    <>
                      {getImageUrl(session.wines[session.current_wine_index].label_image_path) && (
                        <div className="relative w-full h-48 sm:h-64 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                          <Image
                            src={getImageUrl(session.wines[session.current_wine_index].label_image_path)!}
                            alt=""
                            fill
                            className="object-contain p-3"
                            sizes="(max-width:640px) 100vw, 50vw"
                            unoptimized
                          />
                        </div>
                      )}
                      <p className="font-medium text-gray-900">
                        {session.wines[session.current_wine_index].wine_name} {session.wines[session.current_wine_index].vintage}
                      </p>
                      {session.wines[session.current_wine_index].grape_varieties && (
                        <p className="text-sm text-gray-500">{session.wines[session.current_wine_index].grape_varieties}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Inget vin valt</p>
                  )}
                </CardContent>
              </Card>
              {/* Change wine */}
              <Card className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-medium text-gray-900 mb-3">Byt vin</p>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full flex-1"
                    disabled={updating || session.current_wine_index === 0}
                    onClick={() => changeWine(session.current_wine_index - 1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Föregående
                  </Button>
                  <Select
                    value={String(session.current_wine_index)}
                    onValueChange={(v) => changeWine(Number(v))}
                    disabled={updating}
                  >
                    <SelectTrigger className="rounded-full flex-1 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {session.wines?.map((w, i) => (
                        <SelectItem key={w.id} value={String(i)}>
                          {i + 1}. {w.wine_name} {w.vintage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="rounded-full flex-1"
                    disabled={updating || session.current_wine_index >= (session.wines?.length ?? 0) - 1}
                    onClick={() => changeWine(session.current_wine_index + 1)}
                  >
                    Nästa <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            </div>
            {/* Participants */}
            <Card className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-600" />
                <CardTitle className="text-base font-medium">Deltagare</CardTitle>
              </div>
              <p className="text-xs text-gray-500 mb-3">{participants.length} deltagare</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-sm text-gray-500">Inga deltagare än</p>
                ) : (
                  participants.map((p) => (
                    <div key={p.id} className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                      <p className="font-medium text-gray-900 truncate">
                        {p.name || (p.is_anonymous ? "Anonym" : p.participant_code.slice(0, 8))}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(p.joined_at).toLocaleTimeString("sv-SE")}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Wines list (compact) */}
        <Card className="rounded-2xl border border-gray-200 bg-white p-4">
          <CardTitle className="text-base font-medium mb-1">Viner i sessionen</CardTitle>
          <p className="text-xs text-gray-500 mb-3">
            {session.wines?.length || 0} viner · Aktuellt: {session.current_wine_index + 1}
          </p>
          <div className="space-y-1.5">
            {session.wines?.map((wine, index) => (
              <div
                key={wine.id}
                className={cn(
                  "flex items-center justify-between py-2 px-3 rounded-lg text-sm",
                  index === session.current_wine_index ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-100",
                )}
              >
                <span className="truncate">
                  {index + 1}. {wine.wine_name} {wine.vintage}
                </span>
                {index === session.current_wine_index && <Badge className="bg-blue-600 shrink-0">Aktuell</Badge>}
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/tasting/${session.session_code}`} className="flex-1">
            <Button variant="outline" className="w-full rounded-full">
              <Eye className="w-4 h-4 mr-2" /> Öppna som deltagare
            </Button>
          </Link>
          <Link href={`/tasting/${session.session_code}/summary`} className="flex-1">
            <Button variant="outline" className="w-full rounded-full">
              Sammanfattning
            </Button>
          </Link>
        </div>
      </div>
    </main>

    <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
      <AlertDialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-medium text-gray-900">
            Ta bort session?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-600">
            Vill du verkligen ta bort &quot;{session.name}&quot;? Detta går inte att ångra och alla betyg samt deltagardata raderas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row justify-end gap-2 sm:justify-end">
          <AlertDialogCancel className="rounded-full" disabled={deleting}>
            Avbryt
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="rounded-full"
            disabled={deleting}
            onClick={handleConfirmDelete}
          >
            {deleting ? "Raderar…" : "Ta bort"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
