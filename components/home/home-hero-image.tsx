import Image from "next/image";

/** LCP hero images — Server Component so priority preload lands in initial HTML. */
export function HomeHeroImage() {
  return (
    <>
      <Image
        src="/images/hero_bild_4.webp"
        alt=""
        aria-hidden
        fill
        priority
        fetchPriority="high"
        className="pointer-events-none object-cover md:hidden"
        sizes="(max-width: 767px) calc(100vw - 2rem), 1px"
      />
      <Image
        src="/images/hero_bild_5.webp"
        alt=""
        aria-hidden
        fill
        className="pointer-events-none hidden object-cover md:block"
        sizes="(min-width: 768px) calc(100vw - 3rem), 1px"
      />
    </>
  );
}
