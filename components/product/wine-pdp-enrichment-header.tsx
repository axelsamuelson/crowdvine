interface WinePdpEnrichmentHeaderProps {
  title?: string;
}

/** Panel heading — same scale as Price breakdown / other PDP boxes. */
export function WinePdpEnrichmentHeader({
  title = "Vinets karaktär",
}: WinePdpEnrichmentHeaderProps) {
  return (
    <h2 className="mb-4 shrink-0 text-lg font-semibold text-foreground md:mb-6 lg:text-xl 2xl:text-2xl">
      {title}
    </h2>
  );
}
