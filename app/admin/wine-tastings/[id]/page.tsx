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
import { ArrowLeft, Settings, Users, Eye, Trash2, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, ChevronsUpDown, X, QrCode, GripVertical } from "lucide-react";
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
  const [availableWines, setAvailableWines] = useState<Array<{ id: string; wine_name: string; vintage: string; grape_varieties?: string; color?: string; label_image_path?: string | null; b2b_stock?: number | null; producers?: { name: string } | null }>>([]);
  const [selectedWineIds, setSelectedWineIds] = useState<string[]>([]);
  const [wineSearch, setWineSearch] = useState("");
  const [wineStockFilter, setWineStockFilter] = useState<"all" | "in_stock">("in_stock");
  const [selectedBusinessUserId, setSelectedBusinessUserId] = useState<string | null>(null);
  const [businessUsers, setBusinessUsers] = useState<Array<{ id: string; email: string | null; full_name: string | null }>>([]);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [businessSearch, setBusinessSearch] = useState("");
  const [draggedWineIndex, setDraggedWineIndex] = useState<number | null>(null);

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
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-5xl mx-auto p-4 md:p-6 pt-6 md:pt-8">
          <div className="animate-pulse space-y-6">
            <div className="h-9 bg-neutral-200 rounded-xl w-32" />
            <div className="h-4 bg-neutral-200 rounded-xl max-w-xs" />
            <div className="h-4 bg-neutral-200 rounded-xl max-w-sm" />
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
    const filteredWines = availableWines
      .filter((w) => {
        const inStock = w.b2b_stock != null && w.b2b_stock > 0;
        if (wineStockFilter === "in_stock" && !inStock) return false;
        return true;
      })
      .filter(
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

    const moveWineByDrag = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setSelectedWineIds((prev) => {
        const copy = [...prev];
        const [removed] = copy.splice(fromIndex, 1);
        copy.splice(toIndex, 0, removed);
        return copy;
      });
    };

    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-5xl mx-auto p-4 md:p-6 pt-6 md:pt-8 pb-8 space-y-6">
          <Link href="/admin/wine-tastings">
            <Button variant="outline" size="sm" className="rounded-xl shrink-0 border-neutral-200 bg-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
          <Card className="p-5 md:p-6 bg-white border border-neutral-100 shadow-sm rounded-2xl">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-semibold text-neutral-900">Ny provningssession</CardTitle>
              <CardDescription className="text-neutral-500">
                Ge sessionen ett namn och lägg till viner i den ordning de ska provas.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form onSubmit={handleCreateSession} className="space-y-6">
                <div>
                  <Label htmlFor="session-name" className="text-neutral-700 font-medium">Sessionens namn</Label>
                  <Input
                    id="session-name"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="t.ex. Rödvinskväll"
                    className="mt-2 max-w-md rounded-xl border-neutral-200"
                    disabled={creating}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-neutral-700">Företag (valfritt)</Label>
                  <p className="text-xs text-neutral-500 mt-1 mb-2">
                    Koppla sessionen till en användare (t.ex. producent). Krävs inte för att starta.
                  </p>
                  <Popover open={businessOpen} onOpenChange={setBusinessOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={businessOpen}
                        className="w-full max-w-md justify-between rounded-xl border-neutral-200"
                        disabled={creating}
                      >
                        {selectedBusinessUserId
                          ? (() => {
                              const u = businessUsers.find((b) => b.id === selectedBusinessUserId);
                              return u ? (u.full_name || u.email || u.id) : selectedBusinessUserId;
                            })()
                          : "Välj företag..."}
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
                  <Label className="text-sm font-medium text-neutral-700">Viner i sessionen (provningsordning)</Label>
                  <p className="text-xs text-neutral-500 mt-1 mb-2">
                    Dra viner för att ändra ordning, eller använd pilarna.
                  </p>
                  {selectedWines.length === 0 ? (
                    <p className="text-sm text-neutral-500 py-4 border border-dashed border-neutral-200 rounded-xl px-4">
                      Inga viner tillagda än. Sök och lägg till nedan.
                    </p>
                  ) : (
                    <ul
                      className="space-y-2 border border-neutral-100 rounded-xl p-3 bg-neutral-50"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                    >
                      {selectedWines.map((w, index) => (
                        <li
                          key={w.id}
                          draggable
                          onDragStart={(e) => {
                            if ((e.target as HTMLElement).closest("button")) {
                              e.preventDefault();
                              return;
                            }
                            setDraggedWineIndex(index);
                            e.dataTransfer.setData("text/plain", String(index));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const from = Number(e.dataTransfer.getData("text/plain"));
                            if (Number.isNaN(from)) return;
                            moveWineByDrag(from, index);
                            setDraggedWineIndex(null);
                          }}
                          onDragEnd={() => setDraggedWineIndex(null)}
                          className={cn(
                            "flex items-center gap-3 py-2 px-3 bg-white rounded-xl border border-neutral-100 cursor-grab active:cursor-grabbing select-none transition-opacity",
                            draggedWineIndex === index && "opacity-50",
                          )}
                        >
                          <GripVertical className="w-4 h-4 shrink-0 text-neutral-400 pointer-events-none" aria-hidden />
                          <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 pointer-events-none">
                            {getImageUrl(w.label_image_path) ? (
                              <Image
                                src={getImageUrl(w.label_image_path)!}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="40px"
                                unoptimized
                                draggable={false}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">?</div>
                            )}
                          </div>
                          <span className="text-sm truncate flex-1 min-w-0 text-neutral-900">
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
                  <Label htmlFor="wine-search" className="text-sm font-medium text-neutral-700">Lägg till viner</Label>
                  <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
                    <Input
                      id="wine-search"
                      placeholder="Sök på namn, årgang, druva eller producent..."
                      value={wineSearch}
                      onChange={(e) => setWineSearch(e.target.value)}
                      className="max-w-md rounded-xl border-neutral-200"
                    />
                    <Select value={wineStockFilter} onValueChange={(v: "all" | "in_stock") => setWineStockFilter(v)}>
                      <SelectTrigger className="w-[160px] rounded-xl border-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_stock">Endast i lager</SelectItem>
                        <SelectItem value="all">Alla viner</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-neutral-200"
                      onClick={() => {
                        const toAdd = filteredWines.filter((w) => !selectedWineIds.includes(w.id)).map((w) => w.id);
                        if (toAdd.length === 0) {
                          toast.info("All filtered wines are already added.");
                          return;
                        }
                        setSelectedWineIds((prev) => [...prev, ...toAdd]);
                        toast.success(`Added ${toAdd.length} wine${toAdd.length === 1 ? "" : "s"}.`);
                      }}
                      disabled={filteredWines.filter((w) => !selectedWineIds.includes(w.id)).length === 0}
                    >
                      Lägg till alla
                    </Button>
                  </div>
                  <ul className="border border-neutral-100 rounded-xl divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                    {filteredWines.map((w) => {
                      const isSelected = selectedWineIds.includes(w.id);
                      return (
                        <li key={w.id} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50">
                          <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
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
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">?</div>
                            )}
                          </div>
                          <span className="text-sm truncate flex-1 min-w-0 text-neutral-900">
                            {w.wine_name} {w.vintage}
                            {producerName(w) ? ` · ${producerName(w)}` : ""}
                            {w.grape_varieties ? ` (${w.grape_varieties})` : ""}
                          </span>
                          <Button
                            type="button"
                            variant={isSelected ? "secondary" : "outline"}
                            size="sm"
                            className="shrink-0 rounded-xl"
                            onClick={() => (isSelected ? removeWine(w.id) : addWine(w.id))}
                          >
                            {isSelected ? "Ta bort" : <><Plus className="h-4 w-4 mr-1 hidden sm:inline" /> Lägg till</>}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  {filteredWines.length === 0 && (
                    <p className="text-sm text-neutral-500 py-2">Inga viner matchar sökningen.</p>
                  )}
                </div>

                <Button type="submit" className="rounded-xl h-11 font-medium" disabled={creating}>
                  {creating ? "Skapar…" : "Skapa session"}
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
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-5xl mx-auto p-4 md:p-6 pt-6 md:pt-8">
          <Card className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <CardContent className="pt-6">
              <p className="text-center text-neutral-600">Session not found</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-8 space-y-5 md:space-y-6">
        {/* Header: Back, title, actions */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/wine-tastings">
              <Button variant="outline" size="sm" className="rounded-xl shrink-0 border-neutral-200 bg-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 truncate">{session.name}</h1>
              <p className="text-neutral-500 font-mono text-xs md:text-sm truncate mt-0.5">{session.session_code}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-xl border-neutral-200" onClick={() => setQrDialogOpen(true)}>
              <QrCode className="w-4 h-4 mr-2" />
              QR & länk
            </Button>
            {session.session_code && (
              <Link href={`/tasting/${session.session_code}`}>
                <Button variant="outline" size="sm" className="rounded-xl border-neutral-200">
                  <Eye className="w-4 h-4 mr-2" />
                  Öppna session
                </Button>
              </Link>
            )}
            <Button variant="destructive" size="sm" onClick={openDeleteDialog} className="rounded-xl">
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

        {/* Session info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 px-4 rounded-2xl bg-white border border-neutral-100 shadow-sm text-sm">
          <span className="flex items-center gap-2">
            <span className="text-neutral-500">Status:</span>
            <Badge
              className={
                session.status === "active"
                  ? "bg-green-100 text-green-800 border-0"
                  : session.status === "completed"
                    ? "bg-blue-100 text-blue-800 border-0"
                    : "bg-neutral-100 text-neutral-700 border-0"
              }
            >
              {session.status}
            </Badge>
          </span>
          <span className="text-neutral-500">Skapad: {format(new Date(session.created_at), "d MMM yyyy, HH:mm")}</span>
          {session.completed_at && (
            <span className="text-neutral-500">Avslutad: {format(new Date(session.completed_at), "d MMM yyyy")}</span>
          )}
          {session.notes && <span className="text-neutral-600 truncate max-w-[200px]">{session.notes}</span>}
        </div>

        {/* Active session: current wine + change wine + participants */}
        {session.status === "active" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* Current wine */}
              <Card className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-base font-semibold text-neutral-900">Aktuellt vin</CardTitle>
                  <CardDescription className="text-sm text-neutral-500">
                    Vin {session.current_wine_index + 1} av {session.wines?.length || 0}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5">
                  {session.wines?.[session.current_wine_index] ? (
                    <>
                      {getImageUrl(session.wines[session.current_wine_index].label_image_path) && (
                        <div className="relative w-full aspect-[3/4] max-h-64 bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100">
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
                      <p className="font-semibold text-neutral-900">
                        {session.wines[session.current_wine_index].wine_name} {session.wines[session.current_wine_index].vintage}
                      </p>
                      {session.wines[session.current_wine_index].grape_varieties && (
                        <p className="text-sm text-neutral-500">{session.wines[session.current_wine_index].grape_varieties}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-neutral-500 text-sm">Inget vin valt</p>
                  )}
                </CardContent>
              </Card>
              {/* Change wine */}
              <Card className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 md:p-5">
                <p className="text-sm font-semibold text-neutral-900 mb-3">Byt vin</p>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl flex-1 border-neutral-200 h-11"
                      disabled={updating || session.current_wine_index === 0}
                      onClick={() => changeWine(session.current_wine_index - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Föregående
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl flex-1 border-neutral-200 h-11"
                      disabled={updating || session.current_wine_index >= (session.wines?.length ?? 0) - 1}
                      onClick={() => changeWine(session.current_wine_index + 1)}
                    >
                      Nästa <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <Select
                    value={String(session.current_wine_index)}
                    onValueChange={(v) => changeWine(Number(v))}
                    disabled={updating}
                  >
                    <SelectTrigger className="rounded-xl w-full border-neutral-200 h-11">
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
                </div>
              </Card>
            </div>
            {/* Participants */}
            <Card className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-neutral-600" />
                <CardTitle className="text-base font-semibold text-neutral-900">Deltagare</CardTitle>
              </div>
              <p className="text-xs text-neutral-500 mb-3">{participants.length} deltagare</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-sm text-neutral-500">Inga deltagare än</p>
                ) : (
                  participants.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-sm">
                      <p className="font-medium text-neutral-900 truncate">
                        {p.name || (p.is_anonymous ? "Anonym" : p.participant_code.slice(0, 8))}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">{new Date(p.joined_at).toLocaleTimeString("sv-SE")}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Wines list */}
        <Card className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 md:p-5">
          <CardTitle className="text-base font-semibold text-neutral-900 mb-1">Viner i sessionen</CardTitle>
          <p className="text-xs text-neutral-500 mb-3">
            {session.wines?.length || 0} viner · Aktuellt: {session.current_wine_index + 1}
          </p>
          <div className="space-y-2">
            {session.wines?.map((wine, index) => (
              <div
                key={wine.id}
                className={cn(
                  "flex items-center justify-between py-2.5 px-3 rounded-xl text-sm",
                  index === session.current_wine_index ? "bg-amber-50/70 border border-amber-200" : "bg-neutral-50 border border-neutral-100",
                )}
              >
                <span className="truncate font-medium text-neutral-900">
                  {index + 1}. {wine.wine_name} {wine.vintage}
                </span>
                {index === session.current_wine_index && <Badge className="bg-amber-100 text-amber-800 border-0 shrink-0">Aktuell</Badge>}
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/tasting/${session.session_code}`} className="flex-1 min-w-0">
            <Button variant="outline" className="w-full rounded-xl h-11 border-neutral-200">
              <Eye className="w-4 h-4 mr-2" /> Öppna som deltagare
            </Button>
          </Link>
          <Link href={`/tasting/${session.session_code}/summary`} className="flex-1 min-w-0">
            <Button variant="outline" className="w-full rounded-xl h-11 border-neutral-200">
              Sammanfattning
            </Button>
          </Link>
        </div>
      </div>
    </main>

    <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
      <AlertDialogContent className="max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-neutral-900">
            Ta bort session?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-neutral-600">
            Vill du verkligen ta bort &quot;{session.name}&quot;? Detta går inte att ångra och alla betyg samt deltagardata raderas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row justify-end gap-2 sm:justify-end">
          <AlertDialogCancel className="rounded-xl" disabled={deleting}>
            Avbryt
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="rounded-xl"
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
