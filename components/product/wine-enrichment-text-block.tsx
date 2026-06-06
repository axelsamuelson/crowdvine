import { WineEnrichmentSectionLabel } from "@/components/product/wine-enrichment-section-label";

interface WineEnrichmentTextBlockProps {
  label: string;
  text: string;
}

export function WineEnrichmentTextBlock({
  label,
  text,
}: WineEnrichmentTextBlockProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <div>
      <WineEnrichmentSectionLabel title={label} />
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {trimmed}
      </p>
    </div>
  );
}
