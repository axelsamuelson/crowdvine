import { cn } from "@/lib/utils";

interface WineEnrichmentSectionLabelProps {
  title: string;
  className?: string;
}

export function WineEnrichmentSectionLabel({
  title,
  className,
}: WineEnrichmentSectionLabelProps) {
  return (
    <h3
      className={cn(
        "mb-3 text-sm font-semibold text-foreground",
        className,
      )}
    >
      {title}
    </h3>
  );
}
