"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import {
  measureSectionScrollProgress,
  useHiwScrollProgress,
} from "@/lib/hooks/use-hiw-scroll";

const TITLE = "Det började inte med Instagram.";

const BODY_TEXT =
  "Jules Chauvet, biokemist och vinmakare i Beaujolais, experimenterade redan på 1950- och 60-talet med vinifiering utan svavel och utan tillsatser. Hans arbete influerade en generation av vinmakare som vägrade kompromissa. I Italien har antalet naturvinsverksamheter vuxit med 49 procent per år sedan 2016. I Tyskland med 42 procent. La Revue du Vin de France — länge öppet fientlig mot rörelsen — har sedan 2018 utsett naturvinsproducenter till årets vinmakare fem gånger av sju. Det är inte en trend. Det är ett läger som vinner mark.";

const GALLERY_ITEMS = [
  {
    src: "/images/mono-1.png",
    alt: "Naturvinproducent i vingården",
    fallback: "bg-stone-100",
  },
  {
    src: "/images/mono-2.png",
    alt: "Vinmakare i källaren",
    fallback: "bg-stone-200",
  },
  {
    src: "/images/mono-3.png",
    alt: "Druvor skördade för hand",
    fallback: "bg-stone-300",
  },
  {
    src: "/images/mono-4.png",
    alt: "Naturvin på fat",
    fallback: "bg-stone-200",
  },
] as const;

function GallerySlideImage({
  src,
  alt,
  fallback,
  priority,
}: {
  src: string;
  alt: string;
  fallback: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={`absolute inset-0 ${fallback}`} aria-hidden />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 80vw"
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}

export function HiwMovementSection() {
  const measure = useCallback(
    (element: HTMLElement) => measureSectionScrollProgress(element),
    [],
  );
  const [galleryRef, scrollProgress] = useHiwScrollProgress(measure);

  const lastIndex = GALLERY_ITEMS.length - 1;
  const fullscreenStartProgress = 0.6;
  const fullscreenProgress = Math.max(
    0,
    Math.min(
      1,
      (scrollProgress - fullscreenStartProgress) / (1 - fullscreenStartProgress),
    ),
  );
  const easedFullscreenProgress = 1 - Math.pow(1 - fullscreenProgress, 3);

  const titleOpacity = Math.max(0, 1 - scrollProgress / 0.25);
  const bodyWords = BODY_TEXT.split(" ");
  const bodyRevealProgress = Math.max(0, Math.min(1, (scrollProgress - 0.35) / 0.45));

  return (
    <section
      ref={galleryRef}
      className="relative bg-stone-950"
      style={{ minHeight: `${(GALLERY_ITEMS.length + 1) * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="pointer-events-none z-20 px-6 pt-24 md:px-12 lg:px-20">
          <h2
            className="max-w-4xl text-3xl font-medium leading-tight tracking-tight text-white md:text-5xl"
            style={{ opacity: titleOpacity }}
          >
            {TITLE}
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/80 md:text-lg">
            {bodyWords.map((word, index, array) => {
              const wordProgress = Math.max(
                0,
                Math.min(1, bodyRevealProgress * (array.length + 1) - index),
              );
              return (
                <span
                  key={index}
                  style={{
                    opacity: wordProgress,
                    filter: `blur(${(1 - wordProgress) * 24}px)`,
                    transition: "opacity 0.1s linear, filter 0.1s linear",
                  }}
                >
                  {word}
                  {index < array.length - 1 ? " " : ""}
                </span>
              );
            })}
          </p>
        </div>

        <div className="relative flex flex-1 items-center justify-center px-4 pb-8">
          <div className="relative h-[50vh] w-full max-w-5xl md:h-[55vh]">
            {GALLERY_ITEMS.map((image, index) => {
              const isLast = index === lastIndex;
              const imageProgress = scrollProgress * GALLERY_ITEMS.length - index;
              const stackProgress = Math.max(0, Math.min(1, imageProgress));

              let translateY = (1 - stackProgress) * 100;
              let scale = 0.8 + stackProgress * 0.2;
              let opacity = stackProgress;

              if (isLast) {
                const normalScale = 0.8 + stackProgress * 0.2;
                const expandedScale = 1 + easedFullscreenProgress * 0.8;
                scale =
                  normalScale +
                  Math.max(0, stackProgress - 0.8) *
                    5 *
                    (expandedScale - normalScale);
              }

              const borderRadius =
                isLast && easedFullscreenProgress > 0.3
                  ? (1 - easedFullscreenProgress) * 16
                  : undefined;

              return (
                <div
                  key={image.src}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    zIndex: index,
                    transform: `translate3d(0, ${translateY}%, 0) scale(${scale}) translateZ(0)`,
                    opacity,
                    willChange: "transform, opacity",
                  }}
                >
                  <div
                    className={`relative h-full w-full overflow-hidden rounded-xl md:rounded-2xl ${image.fallback}`}
                    style={{
                      borderRadius:
                        borderRadius !== undefined
                          ? `${borderRadius}px`
                          : undefined,
                    }}
                  >
                    <GallerySlideImage
                      src={image.src}
                      alt={image.alt}
                      fallback={image.fallback}
                      priority={index < 2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
