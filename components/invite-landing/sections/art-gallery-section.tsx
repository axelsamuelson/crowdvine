"use client";

import { ArtGallerySlider } from "@/components/invite-landing/art-gallery/art-gallery-slider";

export function ArtGallerySection() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <ArtGallerySlider />
    </section>
  );
}
