"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MixedCaseGalleryImage = { url: string; alt: string };

interface MixedCaseWineGalleryProps {
  images: MixedCaseGalleryImage[];
  className?: string;
}

/**
 * Horizontal Embla carousel with `axis: "x"` only. The Embla viewport uses
 * `touchAction: "pan-y"` so vertical gestures scroll the parent detail panel
 * on mobile; horizontal swipes still advance slides. Each slide’s image frame
 * uses `overflow-clip` (not `overflow-hidden`) to avoid an extra scroll port
 * around the image.
 */
export function MixedCaseWineGallery({
  images,
  className,
}: MixedCaseWineGalleryProps) {
  const valid = images.filter((i) => i?.url);

  const emblaOptions = useMemo(
    () => ({
      axis: "x" as const,
      loop: valid.length > 1,
      align: "center" as const,
      dragFree: false,
    }),
    [valid.length],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const key = valid.map((i) => i.url).join("|");

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    emblaApi.scrollTo(0, true);
  }, [key, emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, valid.length]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (valid.length === 0) return null;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={emblaRef}
        className="overflow-hidden rounded-lg bg-muted"
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex">
          {valid.map((image, i) => (
            <div
              key={`${image.url}-${i}`}
              className="min-w-0 shrink-0 grow-0 basis-full"
            >
              <div className="relative aspect-square w-full overflow-clip rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover select-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {valid.length > 1 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border-border/60 bg-background/90 shadow-sm hover:bg-background"
            onClick={scrollPrev}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border-border/60 bg-background/90 shadow-sm hover:bg-background"
            onClick={scrollNext}
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white tabular-nums">
            {selectedIndex + 1} / {valid.length}
          </div>
        </>
      )}
    </div>
  );
}
