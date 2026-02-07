"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Always log; digest helps debug Server Component errors in production
  console.error("[Error boundary]", error.message, "digest:", error.digest);
  const showDigest =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("vercel.app") ||
      process.env.NODE_ENV === "development");

  return (
    <div className="mx-auto mb-4 mt-top-spacing flex max-w-xl flex-col rounded-lg border border-border bg-white p-8 md:p-12">
      <h2 className="text-xl font-bold">Oh no!</h2>
      <p className="my-2">
        There was an issue with our storefront. This could be a temporary issue,
        please try your action again.
      </p>
      {showDigest && error.digest && (
        <p className="my-2 font-mono text-xs text-muted-foreground">
          Error digest: {error.digest}
        </p>
      )}
      <Button size="lg" className="mt-4" onClick={() => reset()}>
        Try Again
      </Button>
    </div>
  );
}
