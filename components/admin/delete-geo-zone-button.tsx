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
import { deleteGeoZone } from "@/lib/actions/geo-zones";
import { Trash2 } from "lucide-react";

interface DeleteGeoZoneButtonProps {
  zoneId: string;
  zoneName: string;
  hasLinkedDelivery?: boolean;
}

export function DeleteGeoZoneButton({
  zoneId,
  zoneName,
  hasLinkedDelivery = false,
}: DeleteGeoZoneButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteGeoZone(zoneId);
      if (result.deliveryWarning) {
        console.warn("Geo zone deleted; delivery zone kept:", result.deliveryWarning);
      }
      router.push("/admin/geo-zones");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete geo zone:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Kunde inte radera zonen. Försök igen.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Radera zon
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Radera vinzon?</AlertDialogTitle>
          <AlertDialogDescription>
            Är du säker på att du vill radera &quot;{zoneName}&quot;? Detta kan
            inte ångras.
            {hasLinkedDelivery
              ? " Kopplad leveranszon raderas också om den inte används av pallar eller reservationer."
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Raderar…" : "Radera"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
