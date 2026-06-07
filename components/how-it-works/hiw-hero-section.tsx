"use client";

import Image from "next/image";
import { useCallback } from "react";
import {
  measureViewportScrollProgress,
  useHiwScrollProgress,
} from "@/lib/hooks/use-hiw-scroll";

const HEADLINE = "Vin är mer än en dryck.";

const HERO_LOGO_SRC = "/uploads/69c23225-7eb9-4592-8120-ca78cf336436.svg";

function HeroLogoBackdrop({ opacity }: { opacity: number }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-0"
      style={{
        top: "17%",
        width: "62vw",
        opacity,
        transform: "translate(-50%, -220px)",
      }}
    >
      <img
        src={HERO_LOGO_SRC}
        alt=""
        aria-hidden
        className="hiw-animate-fade-in block h-auto w-full max-w-none opacity-0"
      />
    </div>
  );
}

const sideImages = [
  { src: "/images/hero-side-1.png", alt: "Vingård vid solnedgång", position: "left" as const },
  { src: "/images/hero-side-2.png", alt: "Druvor på rankan", position: "left" as const },
  { src: "/images/hero-side-3.png", alt: "Vinmakare i källaren", position: "right" as const },
  { src: "/images/hero-side-4.png", alt: "Flaskor på pall", position: "right" as const },
];

export function HiwHeroSection() {
  const measure = useCallback(
    (element: HTMLElement) => measureViewportScrollProgress(element, 2),
    [],
  );
  const [sectionRef, scrollProgress] = useHiwScrollProgress(measure);

  const textOpacity = Math.max(0, 1 - scrollProgress / 0.2);
  const imageProgress = Math.max(0, Math.min(1, (scrollProgress - 0.2) / 0.8));

  const centerWidth = 100 - imageProgress * 80;
  const sideWidth = imageProgress * 40;
  const sideOpacity = imageProgress;
  const sideTranslateLeft = -100 + imageProgress * 100;
  const sideTranslateRight = 100 - imageProgress * 100;
  const gap = imageProgress * 8;
  const sideTranslateY = -(imageProgress * 15);

  return (
    <section ref={sectionRef} className="relative bg-white">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="relative flex h-full w-full items-center justify-center">
          <div
            className="relative flex h-full w-full items-stretch justify-center"
            style={{ gap: `${gap}px` }}
          >
            <div
              className="flex h-full flex-row will-change-transform"
              style={{
                width: `${sideWidth}%`,
                gap: `${gap}px`,
                transform: `translateX(${sideTranslateLeft}%) translateY(${sideTranslateY}%)`,
                opacity: sideOpacity,
              }}
            >
              {sideImages
                .filter((img) => img.position === "left")
                .map((img, idx) => (
                  <div
                    key={idx}
                    className="relative h-full overflow-hidden will-change-transform"
                    style={{ flex: 1 }}
                  >
                    <Image src={img.src} alt={img.alt} fill className="object-cover" />
                  </div>
                ))}
            </div>

            <div
              className="relative overflow-visible will-change-transform bg-stone-200"
              style={{
                width: `${centerWidth}%`,
                height: "100%",
                flex: "0 0 auto",
              }}
            >
              <HeroLogoBackdrop opacity={textOpacity} />
              <p className="sr-only">{HEADLINE}</p>

              <div className="absolute inset-0 z-10 overflow-hidden">
                <Image
                src="/images/vines_background_hero.png"
                alt="Vingård i solnedgång"
                  fill
                  className="object-cover"
                  priority
                  sizes="100vw"
                />
              </div>
            </div>

            <div
              className="flex h-full flex-row will-change-transform"
              style={{
                width: `${sideWidth}%`,
                gap: `${gap}px`,
                transform: `translateX(${sideTranslateRight}%) translateY(${sideTranslateY}%)`,
                opacity: sideOpacity,
              }}
            >
              {sideImages
                .filter((img) => img.position === "right")
                .map((img, idx) => (
                  <div
                    key={idx}
                    className="relative h-full overflow-hidden will-change-transform"
                    style={{ flex: 1 }}
                  >
                    <Image src={img.src} alt={img.alt} fill className="object-cover" />
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-6 pb-12 md:px-12 md:pb-16 lg:px-20 lg:pb-20"
          style={{ opacity: textOpacity }}
        >
          <p className="mx-auto max-w-2xl text-center leading-relaxed text-white drop-shadow-md">
            <span className="mb-4 block text-2xl font-medium md:text-3xl lg:text-4xl">
              {HEADLINE}
            </span>
            <span className="block text-xl md:text-2xl lg:text-3xl lg:leading-snug">
              En berättelse om vem som gör det.
              <br />
              Och vem som tjänar på det.
            </span>
          </p>
        </div>
      </div>

      <div className="h-[200vh]" aria-hidden />
    </section>
  );
}
