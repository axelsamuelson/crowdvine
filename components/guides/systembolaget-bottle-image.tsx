"use client";

import Image from "next/image";
import { useState } from "react";

import { SystembolagetBottlePlaceholder } from "@/components/guides/systembolaget-bottle-placeholder";
import {
  systembolagetImageUrl,
  type SystembolagetGuideWine,
} from "@/lib/systembolaget/guide-wines";

/** Fixed frame matching typical SB bottle photo aspect (160×300). */
export const SB_BOTTLE_FRAME_WIDTH = 160;
export const SB_BOTTLE_FRAME_HEIGHT = 300;

function bottleAlt(wine: SystembolagetGuideWine): string {
  return [wine.producer_name, wine.name_bold, wine.name_thin]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Fixed bottle frame at mobile and desktop. Missing or broken Systembolaget
 * images show a neutral grey outline (no PACT logo) so every card keeps the
 * same rhythm and height.
 */
export function SystembolagetBottleImage({
  wine,
  priority,
  size,
}: {
  wine: SystembolagetGuideWine;
  priority: boolean;
  size: 100 | 200 | 400;
}) {
  const alt = bottleAlt(wine);
  const remote = systembolagetImageUrl(wine.image_url, size);
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !remote || failed;

  return (
    <div
      className="relative flex h-[120px] w-16 shrink-0 items-center justify-center overflow-hidden md:h-[300px] md:w-40"
      style={{
        aspectRatio: `${SB_BOTTLE_FRAME_WIDTH} / ${SB_BOTTLE_FRAME_HEIGHT}`,
      }}
    >
      {showPlaceholder ? (
        <SystembolagetBottlePlaceholder />
      ) : (
        <Image
          src={remote}
          alt={alt}
          width={SB_BOTTLE_FRAME_WIDTH}
          height={SB_BOTTLE_FRAME_HEIGHT}
          className="block h-full w-full object-contain object-top"
          sizes="(min-width: 768px) 160px, 64px"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
