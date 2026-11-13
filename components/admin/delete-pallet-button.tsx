"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

interface DeletePalletButtonProps {
  palletId: string;
  palletName: string;
  onDeleted: () => void;
}

export function DeletePalletButton({
  palletId,
  palletName,
  onDeleted,
}: DeletePalletButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/pallets/${palletId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete pallet");
      }

      toast({
        title: "Pallet deleted",
        description: `${palletName} has been successfully deleted.`,
      });
      onDeleted();
    } catch (error) {
      console.error("Error deleting pallet:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete pallet",
        variant: "destructive",
      });
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
          className="rounded-lg border-gray-200 text-red-600 shadow-none ring-0 ring-offset-0 hover:bg-red-50 hover:text-red-700 focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-0 dark:border-zinc-700 dark:hover:bg-red-950/30"
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Pallet</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{palletName}"? This action cannot
            be undone.
            <br />
            <br />
            <strong>Warning:</strong> This will also delete all associated
            bookings and reservations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Pallet"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
