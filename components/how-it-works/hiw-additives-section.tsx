"use client";

import Image from "next/image";
import { useCallback } from "react";
import {
  measureViewportScrollProgress,
  useHiwScrollProgress,
} from "@/lib/hooks/use-hiw-scroll";

const TEXT_CYCLES = [
  "Inom EU tillåts över 60 olika tillsatser och processtekniker i vinframställning — syror, enzymer, klarningsmedel, konserveringsmedel.",
  "De flesta är ofarliga. Många är osynliga. Och fram till 2023 behövde ingen av dem stå på etiketten.",
  "Naturvin är inte en certifiering. Det är ett löfte: inga tillsatser, indigena jästsvampar, ingen manipulation av det naturen ger.",
] as const;

const SECTION_TITLE = "Vin är inte bara jästa druvor längre.";

const CENTER_IMAGES = [
  { src: "/images/mono-1.png", alt: "Vin vid soluppgång" },
  { src: "/images/mono-2.png", alt: "Vin i dagsljus" },
  { src: "/images/mono-3.png", alt: "Vin i skymning" },
  { src: "/images/mono-4.png", alt: "Vin på kvällen" },
] as const;

export function HiwAdditivesSection() {
  const measure = useCallback(
    (element: HTMLElement) => measureViewportScrollProgress(element, 3),
    [],
  );
  const [sectionRef, scrollProgress] = useHiwScrollProgress(measure);

  const titleOpacity = Math.max(0, 1 - scrollProgress / 0.15);
  const layoutProgress = Math.max(0, Math.min(1, (scrollProgress - 0.15) / 0.85));

  const centerWidth = 100 - layoutProgress * 52;
  const sideWidth = layoutProgress * 24;
  const sideOpacity = layoutProgress;
  const sideTranslateLeft = -100 + layoutProgress * 100;
  const sideTranslateRight = 100 - layoutProgress * 100;
  const gap = layoutProgress * 16;

  return (
    <section ref={sectionRef} className="relative bg-stone-900">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="flex h-full w-full items-center justify-center px-4 md:px-8">
          <div
            className="relative flex h-full w-full max-w-7xl items-stretch justify-center py-16"
            style={{ gap: `${gap}px` }}
          >
            <div
              className="relative overflow-hidden will-change-transform"
              style={{
                width: `${sideWidth}%`,
                transform: `translateX(${sideTranslateLeft}%)`,
                opacity: sideOpacity,
              }}
            >
              <Image
                src="/images/interior-view.png"
                alt="Interiör med landskap"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-start justify-center px-4 md:px-6">
                <p className="text-6xl font-medium leading-none tracking-tight text-white md:text-8xl">
                  60+
                </p>
                <p className="mt-4 text-xl font-medium text-white/90 md:text-2xl">
                  tillåtna tillsatser
                </p>
                <p className="mt-2 text-sm uppercase tracking-widest text-white/60 md:text-base">
                  i EU-vin
                </p>
              </div>
            </div>

            <div
              className="relative flex flex-col items-center justify-center overflow-hidden will-change-transform"
              style={{
                width: `${centerWidth}%`,
                flex: "0 0 auto",
              }}
            >
              <Image
                src={CENTER_IMAGES[0].src}
                alt={CENTER_IMAGES[0].alt}
                fill
                className="object-cover"
              />
              <Image
                src={CENTER_IMAGES[1].src}
                alt={CENTER_IMAGES[1].alt}
                fill
                className="absolute inset-0 object-cover"
                style={{
                  opacity: Math.max(0, Math.min(1, (scrollProgress - 0.1) / 0.2)),
                  transition: "opacity 0.3s ease",
                }}
              />
              <Image
                src={CENTER_IMAGES[2].src}
                alt={CENTER_IMAGES[2].alt}
                fill
                className="absolute inset-0 object-cover"
                style={{
                  opacity: Math.max(0, Math.min(1, (scrollProgress - 0.4) / 0.2)),
                  transition: "opacity 0.3s ease",
                }}
              />
              <Image
                src={CENTER_IMAGES[3].src}
                alt={CENTER_IMAGES[3].alt}
                fill
                className="absolute inset-0 object-cover"
                style={{
                  opacity: Math.max(0, Math.min(1, (scrollProgress - 0.7) / 0.2)),
                  transition: "opacity 0.3s ease",
                }}
              />

              <div className="absolute inset-0 bg-stone-950/40" />

              <div
                className="absolute inset-x-0 top-8 z-10 px-6 text-center md:top-12"
                style={{ opacity: titleOpacity }}
              >
                <h2 className="text-2xl font-medium leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                  {SECTION_TITLE}
                </h2>
              </div>

              <div className="absolute inset-0 z-10 flex items-center justify-center px-6 md:px-10">
                {TEXT_CYCLES.map((text, cycleIndex) => {
                  const cycleStart = cycleIndex / TEXT_CYCLES.length;
                  const cycleEnd = (cycleIndex + 1) / TEXT_CYCLES.length;
                  const words = text.split(" ");

                  return (
                    <p
                      key={cycleIndex}
                      className="absolute max-w-2xl text-center text-lg leading-relaxed text-white md:text-xl lg:text-2xl"
                    >
                      {words.map((word, wordIndex) => {
                        let wordOpacity = 0;
                        let wordBlur = 40;

                        if (
                          scrollProgress >= cycleStart &&
                          scrollProgress < cycleEnd
                        ) {
                          const localProgress =
                            (scrollProgress - cycleStart) /
                            (cycleEnd - cycleStart);

                          if (localProgress < 0.5) {
                            const appearProgress =
                              (localProgress / 0.5) * (words.length + 1);
                            const wordAppearProgress = Math.max(
                              0,
                              Math.min(1, appearProgress - wordIndex),
                            );
                            wordOpacity = wordAppearProgress;
                            wordBlur = (1 - wordAppearProgress) * 40;
                          } else {
                            const disappearProgress =
                              ((localProgress - 0.5) / 0.5) *
                              (words.length + 1);
                            const wordDisappearProgress = Math.max(
                              0,
                              Math.min(1, disappearProgress - wordIndex),
                            );
                            wordOpacity = 1 - wordDisappearProgress;
                            wordBlur = wordDisappearProgress * 40;
                          }
                        }

                        return (
                          <span
                            key={wordIndex}
                            className="inline-block"
                            style={{
                              opacity: wordOpacity,
                              filter: `blur(${wordBlur}px)`,
                              transition:
                                "opacity 0.1s linear, filter 0.1s linear",
                              marginRight: "0.3em",
                            }}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </p>
                  );
                })}
              </div>
            </div>

            <div
              className="relative overflow-hidden will-change-transform"
              style={{
                width: `${sideWidth}%`,
                transform: `translateX(${sideTranslateRight}%)`,
                opacity: sideOpacity,
              }}
            >
              <Image
                src="/images/rusted-metal.png"
                alt="Rostig metallyta"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-[300vh]" aria-hidden />
    </section>
  );
}
