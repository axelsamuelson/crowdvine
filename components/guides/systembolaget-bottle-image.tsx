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
<<<<<<< HEAD
 * Fixed bottle frame at mobile and desktop. The grey outline is always painted
 * under the photo so the frame is never empty while a lazy image loads, or if
 * the CDN asset fails without a usable onError. The photo layers on top when
 * it loads; missing/broken URLs leave the outline visible.
 *
 * Image URLs go through `systembolagetImageUrl`, which appends `_{size}.png`
 * when the stored CDN path has no extension (bare paths 404).
=======
 * Fixed bottle frame at mobile and desktop. Missing or broken Systembolaget
 * images show a neutral grey outline (no PACT logo) so every card keeps the
 * same rhythm and height.
>>>>>>> 38979294 ([agent] Neutral grey bottle outline placeholder (no PACT logo))
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
<<<<<<< HEAD
  const showPhoto = Boolean(remote) && !failed;
=======
  const showPlaceholder = !remote || failed;
>>>>>>> 38979294 ([agent] Neutral grey bottle outline placeholder (no PACT logo))

  return (
    <div
      className="relative flex h-[120px] w-16 shrink-0 items-center justify-center overflow-hidden md:h-[300px] md:w-40"
      style={{
        aspectRatio: `${SB_BOTTLE_FRAME_WIDTH} / ${SB_BOTTLE_FRAME_HEIGHT}`,
      }}
    >
<<<<<<< HEAD
      <SystembolagetBottlePlaceholder className="absolute inset-0 h-full w-full" />
      {showPhoto ? (
        <Image
          src={remote!}
          alt={alt}
          width={SB_BOTTLE_FRAME_WIDTH}
          height={SB_BOTTLE_FRAME_HEIGHT}
          className="relative z-10 block h-full w-full object-contain object-top"
=======
      {showPlaceholder ? (
        <SystembolagetBottlePlaceholder />
      ) : (
        <Image
          src={remote}
          alt={alt}
          width={SB_BOTTLE_FRAME_WIDTH}
          height={SB_BOTTLE_FRAME_HEIGHT}
          className="block h-full w-full object-contain object-top"
>>>>>>> 38979294 ([agent] Neutral grey bottle outline placeholder (no PACT logo))
          sizes="(min-width: 768px) 160px, 64px"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onError={() => setFailed(true)}
        />
<<<<<<< HEAD
      ) : null}
=======
      )}
>>>>>>> 38979294 ([agent] Neutral grey bottle outline placeholder (no PACT logo))
    </div>
  );
}
