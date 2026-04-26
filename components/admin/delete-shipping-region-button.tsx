"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteShippingRegionButtonProps {
  regionId: string;
  regionName: string;
  producerCount: number;
}

export function DeleteShippingRegionButton({
  regionId,
  regionName,
  producerCount,
}: DeleteShippingRegionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/shipping-regions/${regionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error || "Delete failed");
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to delete region");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg text-xs font-medium border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0F0F12]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-white">
            Delete shipping region?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 dark:text-zinc-400 space-y-2">
            <span>
              Are you sure you want to delete &quot;{regionName}&quot;? This
              cannot be undone.
            </span>
            {producerCount > 0 ? (
              <span className="block font-medium text-amber-700 dark:text-amber-400">
                {producerCount} producer
                {producerCount === 1 ? "" : "s"} currently assigned to this
                region will have their shipping region cleared (not deleted).
              </span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-200 dark:border-zinc-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? "Deleting…" : "Delete region"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
