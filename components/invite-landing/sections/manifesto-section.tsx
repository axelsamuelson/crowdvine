"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const LINE_1 = "A private wine community.";
const LINE_2 = "Without middlemen and fully transparent.";
const LINE_3 = "On producers and consumers terms, only.";

const BUSINESS_LINE =
  'We represent the new generation of wine redefining the old "dirty" region of Languedoc.';

export function ManifestoSection({
  isBusinessOnly = false,
}: {
  isBusinessOnly?: boolean;
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const clipPath1 = useTransform(
    scrollYProgress,
    [0.2, 0.35],
    ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]
  );
  const clipPath2 = useTransform(
    scrollYProgress,
    [0.35, 0.5],
    ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]
  );
  const clipPath3 = useTransform(
    scrollYProgress,
    [0.5, 0.65],
    ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]
  );

  const clipPathBusiness = useTransform(
    scrollYProgress,
    [0.2, 0.5],
    ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]
  );

  if (isBusinessOnly) {
    return (
      <section
        ref={containerRef}
        className="relative min-h-[80vh] flex items-center justify-center bg-background px-6 py-32"
      >
        <div className="max-w-5xl mx-auto relative">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-sans leading-tight text-center text-foreground/10">
            {BUSINESS_LINE}
          </h2>

          <h2 className="absolute inset-0 text-2xl md:text-4xl lg:text-5xl font-sans leading-tight text-center text-black flex flex-col items-center justify-center gap-0">
            <motion.span className="block" style={{ clipPath: clipPathBusiness }}>
              {BUSINESS_LINE}
            </motion.span>
          </h2>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] flex items-center justify-center bg-background px-6 py-32"
    >
      <div className="max-w-5xl mx-auto relative">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-sans leading-tight text-center text-foreground/10">
          {LINE_1}
          <br />
          {LINE_2}
          <br />
          {LINE_3}
        </h2>

        <h2 className="absolute inset-0 text-2xl md:text-4xl lg:text-5xl font-sans leading-tight text-center text-black flex flex-col items-center justify-center gap-0">
          <motion.span className="block" style={{ clipPath: clipPath1 }}>
            {LINE_1}
          </motion.span>
          <motion.span className="block" style={{ clipPath: clipPath2 }}>
            {LINE_2}
          </motion.span>
          <motion.span className="block" style={{ clipPath: clipPath3 }}>
            {LINE_3}
          </motion.span>
        </h2>
      </div>
    </section>
  );
}
