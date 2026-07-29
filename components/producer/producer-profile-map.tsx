"use client";

import {
  WineProducerMap,
  type WineProducerMapLocation,
} from "@/components/product/wine-producer-map";

type Props = {
  producer: WineProducerMapLocation;
  className?: string;
};

/** Full-bleed map for the producer profile desktop side panel. */
export function ProducerProfileMap({ producer, className }: Props) {
  return (
    <WineProducerMap
      producer={producer}
      variant="panel"
      className={className}
    />
  );
}
