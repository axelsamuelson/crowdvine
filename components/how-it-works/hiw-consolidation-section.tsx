"use client";

import { useCallback, useRef, useState } from "react";
import {
  measureElementViewportProgress,
  measureSectionScrollProgress,
  useHiwScrollListener,
} from "@/lib/hooks/use-hiw-scroll";

const TITLES = ["Färre händer.", "Större gårdar."];

const BODY_TEXT =
  "Sedan år 2000 har antalet vinproducerande företag i Frankrike minskat med 41 procent. De som försvann var framför allt de små och medelstora. De som blev kvar är större. Genomsnittsgården har vuxit med 19 procent det senaste decenniet. Var fjärde aktiv vingårdsmästare i Frankrike är idag över 65 år. Det är inte en kris. Det är en strukturomvandling. Och den pågår fortfarande.";

export function HiwConsolidationSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [titleProgress, setTitleProgress] = useState(0);
  const [descriptionProgress, setDescriptionProgress] = useState(0);

  const updateTransforms = useCallback(() => {
    if (!sectionRef.current) return;

    setTitleProgress(measureSectionScrollProgress(sectionRef.current));

    if (descriptionRef.current) {
      setDescriptionProgress(
        measureElementViewportProgress(descriptionRef.current),
      );
    }
  }, []);

  useHiwScrollListener(updateTransforms);

  const bodyWords = BODY_TEXT.split(" ");

  return (
    <section className="bg-white">
      <div ref={sectionRef} className="relative" style={{ height: "300vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-7xl px-4">
            <div
              className="pointer-events-none flex items-center justify-center"
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative w-full"
                style={{ transformStyle: "preserve-3d", minHeight: "150px" }}
              >
                {TITLES.map((title, index) => {
                  const isLastText = index === TITLES.length - 1;
                  const segmentSize = 1 / TITLES.length;
                  const startProgress = index * segmentSize;
                  const endProgress = (index + 1) * segmentSize;

                  let rotateX = 0;
                  let opacity = 0;

                  if (titleProgress >= startProgress && titleProgress < endProgress) {
                    const localProgress =
                      (titleProgress - startProgress) / segmentSize;
                    rotateX = (1 - localProgress) * 90;
                    opacity = localProgress;
                  } else if (titleProgress >= endProgress) {
                    if (isLastText) {
                      rotateX = 0;
                      opacity = 1;
                    } else {
                      rotateX = -90;
                      opacity = 0;
                    }
                  } else {
                    rotateX = 90;
                    opacity = 0;
                  }

                  return (
                    <h2
                      key={title}
                      className="absolute inset-0 flex items-center justify-center px-4 text-center text-4xl font-medium leading-tight tracking-tighter text-stone-900 sm:text-5xl md:text-6xl lg:text-7xl"
                      style={{
                        transform: `rotateX(${rotateX}deg) translateZ(0)`,
                        opacity,
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        willChange: "transform, opacity",
                      }}
                    >
                      {title}
                    </h2>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={descriptionRef}
        className="px-6 pb-20 pt-8 md:px-12 md:pb-28 md:pt-12 lg:px-20 lg:pb-36 lg:pt-16"
      >
        <p className="mx-auto max-w-3xl text-center text-2xl leading-relaxed text-stone-600 md:text-3xl">
          {bodyWords.map((word, index, array) => {
            const wordProgress = Math.max(
              0,
              Math.min(1, descriptionProgress * array.length - index),
            );
            return (
              <span
                key={index}
                style={{
                  opacity: wordProgress,
                  filter: `blur(${(1 - wordProgress) * 40}px)`,
                  transition: "opacity 0.3s ease, filter 0.3s ease",
                }}
              >
                {word}
                {index < array.length - 1 ? " " : ""}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
