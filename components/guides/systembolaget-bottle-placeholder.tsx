import { cn } from "@/lib/utils";

/**
 * Neutral bottle silhouette for Systembolaget guide cards when the product
 * image is missing. No logo or wordmark — just a grey outline (~15% foreground).
 * Shared visual for ranked lists and the new-releases calendar.
 */
export function SystembolagetBottlePlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 300"
      className={cn("h-full w-full text-foreground/[0.15]", className)}
      aria-hidden
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M68 18h24v14c0 6-2 10-2 18v22c0 14 18 28 18 52v148c0 18-12 26-28 26s-28-8-28-26V124c0-24 18-38 18-52V50c0-8-2-12-2-18V18z"
      />
      {/* Capsule / foil band */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        d="M70 46h20"
      />
    </svg>
  );
}
