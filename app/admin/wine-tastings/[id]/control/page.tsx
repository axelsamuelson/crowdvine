"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect legacy /control URL to the merged session page.
 */
export default function ControlRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) router.replace(`/admin/wine-tastings/${id}`);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <p className="text-gray-500 text-sm">Omdirigerar…</p>
    </div>
  );
}
