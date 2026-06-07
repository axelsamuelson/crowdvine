"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  measureElementViewportProgress,
  useHiwScrollContainer,
  useHiwScrollListener,
} from "@/lib/hooks/use-hiw-scroll";

const FLOW_STEPS = [
  { label: "Producent", detail: null },
  { label: "Importör", detail: "+25–30%" },
  { label: "Grossist", detail: null },
  { label: "Butik", detail: null },
  { label: "Du", detail: null },
] as const;

const BODY_TEXT =
  "En flaska vin rör sig genom ett system med flera led innan den når dig. Importören lägger typiskt till 25–30 procent. Grossisten tar sin del. Butiken tar sin. Producenten säljer till grossistpriset — inte konsumentpriset. Det är skillnaden mellan vad producenten tjänar och vad du betalar som finansierar kedjan däremellan. En liten producent i Languedoc med 1 500 flaskor per år och säljer genom traditionell distribution kan aldrig ta det pris för sitt arbete som en direktförsäljning skulle ge.";

function FlowDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRoot = useHiwScrollContainer();
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        FLOW_STEPS.forEach((_, index) => {
          window.setTimeout(() => {
            setVisibleSteps((c) => Math.max(c, index + 1));
          }, index * 220);
        });
      },
      { threshold: 0.2, rootMargin: "40px", root: scrollRoot },
    );

    const node = ref.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [scrollRoot]);

  return (
    <div ref={ref} className="mt-12 flex flex-col items-stretch gap-0 md:flex-row md:items-center md:justify-between">
      {FLOW_STEPS.map((step, index) => (
        <div key={step.label} className="flex flex-col items-center md:flex-1 md:flex-row">
          <div
            className={`flex w-full flex-col items-center rounded-lg border border-stone-200 bg-white px-4 py-5 text-center transition-all duration-700 ease-out md:min-h-[88px] md:justify-center ${
              index < visibleSteps
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <span className="text-sm font-medium text-stone-900 md:text-base">
              {step.label}
            </span>
            {step.detail ? (
              <span className="mt-1 text-xs text-stone-500">{step.detail}</span>
            ) : null}
          </div>
          {index < FLOW_STEPS.length - 1 ? (
            <div
              className={`my-2 flex h-8 items-center justify-center text-stone-400 transition-opacity duration-700 md:my-0 md:h-auto md:w-10 md:flex-shrink-0 ${
                index + 1 < visibleSteps ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden
            >
              <span className="md:hidden">↓</span>
              <span className="hidden md:inline">→</span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function HiwMoneySection() {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateParallax = useCallback(() => {
    if (!parallaxRef.current) return;
    setScrollProgress(measureElementViewportProgress(parallaxRef.current));
  }, []);

  useHiwScrollListener(updateParallax);

  const parallaxY = (scrollProgress - 0.5) * 30;
  const bodyWords = BODY_TEXT.split(" ");

  return (
    <section className="bg-stone-50">
      <div
        ref={parallaxRef}
        className="relative overflow-hidden bg-stone-200"
        style={{ minHeight: "40vh" }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(1.12) translate3d(0, ${parallaxY}px, 0)`,
            willChange: "transform",
          }}
        >
          <Image
            src="/images/mono-3.png"
            alt=""
            fill
            className="object-cover"
            aria-hidden
          />
        </div>
        <div className="absolute inset-0 bg-stone-950/30" aria-hidden />
        <div className="relative z-10 flex min-h-[40vh] items-end px-6 pb-12 pt-24 md:px-12 lg:px-20">
          <h2 className="max-w-3xl text-3xl font-medium leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            Producenten är sist i kön.
          </h2>
        </div>
      </div>

      <div className="px-6 py-16 md:px-12 md:py-24 lg:px-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-lg leading-relaxed text-stone-600 md:text-xl">
            {bodyWords.map((word, index, array) => (
              <span key={index}>
                {word}
                {index < array.length - 1 ? " " : ""}
              </span>
            ))}
          </p>

          <FlowDiagram />
        </div>
      </div>
    </section>
  );
}
