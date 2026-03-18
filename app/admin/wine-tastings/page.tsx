"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Wine, Calendar, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface WineTastingSession {
  id: string;
  session_code: string;
  name: string;
  status: string;
  current_wine_index: number;
  created_at: string;
  completed_at: string | null;
  created_by_profile: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export default function WineTastingsPage() {
  const [sessions, setSessions] = useState<WineTastingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; sessionId: string | null; sessionName: string }>({
    open: false,
    sessionId: null,
    sessionName: "",
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const url =
        statusFilter === "all"
          ? "/api/wine-tastings"
          : `/api/wine-tastings?status=${statusFilter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            Active
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            Completed
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-400">
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
            {status}
          </span>
        );
    }
  };

  const openDeleteDialog = (sessionId: string, sessionName: string) => {
    setDeleteDialog({ open: true, sessionId, sessionName });
  };

  const closeDeleteDialog = () => {
    if (!deleting) setDeleteDialog({ open: false, sessionId: null, sessionName: "" });
  };

  const handleConfirmDelete = async () => {
    const { sessionId, sessionName } = deleteDialog;
    if (!sessionId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/wine-tastings/${sessionId}`, {
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
      setDeleteDialog({ open: false, sessionId: null, sessionName: "" });
      fetchSessions();
    } catch (error: unknown) {
      console.error("Error deleting session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <main className="min-h-screen bg-gray-50 dark:bg-[#0A0A0B]">
      <div className="max-w-5xl mx-auto p-4 md:p-6 pt-top-spacing space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
              <Wine className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Wine Tasting Sessions
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Create and manage digital wine tasting sessions
              </p>
            </div>
          </div>
          <Link href="/admin/wine-tastings/new" prefetch={false}>
            <Button size="sm" className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200 w-full sm:w-auto">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Session
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            size="sm"
            className={
              statusFilter === "all"
                ? "rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                : "rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
            }
          >
            All
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            onClick={() => setStatusFilter("active")}
            size="sm"
            className={
              statusFilter === "active"
                ? "rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                : "rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
            }
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            onClick={() => setStatusFilter("completed")}
            size="sm"
            className={
              statusFilter === "completed"
                ? "rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                : "rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
            }
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === "archived" ? "default" : "outline"}
            onClick={() => setStatusFilter("archived")}
            size="sm"
            className={
              statusFilter === "archived"
                ? "rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                : "rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
            }
          >
            Archived
          </Button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-zinc-700 border-t-gray-900 dark:border-t-zinc-100 mx-auto" />
            <p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">Loading sessions…</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center py-12">
            <Wine className="w-12 h-12 text-gray-400 dark:text-zinc-500 mb-4" />
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">No sessions found</p>
            <Link href="/admin/wine-tastings/new" prefetch={false}>
              <Button size="sm" className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Your First Session
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-6 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 line-clamp-2">
                      {session.name}
                    </h2>
                    {getStatusBadge(session.status)}
                  </div>
                  <p className="font-mono text-xs text-gray-500 dark:text-zinc-400">
                    {session.session_code}
                  </p>
                  <div className="flex items-center text-xs text-gray-600 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                    <span className="truncate">
                      {format(new Date(session.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  {session.created_by_profile && (
                    <p className="text-xs text-gray-600 dark:text-zinc-400 truncate">
                      Created by: {session.created_by_profile.full_name || session.created_by_profile.email}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Link href={`/admin/wine-tastings/${session.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700">
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Öppna
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => openDeleteDialog(session.id, session.name)}
                      className="shrink-0 rounded-lg h-9 w-9"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>

    <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && closeDeleteDialog()}>
      <AlertDialogContent className="max-w-md rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            Ta bort session?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-600 dark:text-zinc-400">
            Vill du verkligen ta bort &quot;{deleteDialog.sessionName}&quot;? Detta går inte att ångra och alla betyg samt deltagardata raderas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row justify-end gap-2 sm:justify-end">
          <AlertDialogCancel className="rounded-lg text-xs font-medium" disabled={deleting}>
            Avbryt
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="rounded-lg text-xs font-medium"
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
