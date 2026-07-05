import Image from "next/image";

/** LCP hero images — Server Component so priority preload lands in initial HTML. */
export function HomeHeroImage() {
  return (
    <div className="relative order-1 min-h-0 h-full w-full md:order-2">
      <Image
        src="/images/hero_bild_4.webp"
        alt=""
        aria-hidden
        fill
        priority
        fetchPriority="high"
        className="pointer-events-none object-cover md:hidden"
        sizes="(max-width: 767px) 100vw, 50vw"
      />
      <Image
        src="/images/hero_bild_5.webp"
        alt=""
        aria-hidden
        fill
        className="pointer-events-none hidden object-cover md:block"
        sizes="(min-width: 768px) 50vw, 1px"
      />
    </div>
  );
}
