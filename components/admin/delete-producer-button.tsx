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
import { deleteProducer } from "@/lib/actions/producers";
import { Trash2 } from "lucide-react";

interface DeleteProducerButtonProps {
  producerId: string;
  producerName: string;
}

export function DeleteProducerButton({
  producerId,
  producerName,
}: DeleteProducerButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProducer(producerId);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete producer:", error);
      alert("Failed to delete producer. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Ta bort producent</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-xl border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">
            Ta bort producent?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
            Om du tar bort &quot;{producerName}&quot; försvinner producenten från
            admin och kopplingen till dess viner. Åtgärden kan inte ångras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            className="rounded-lg text-xs font-medium"
          >
            Behåll
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 text-xs font-medium text-white hover:bg-red-700"
          >
            {isDeleting ? "Tar bort..." : "Ta bort"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
