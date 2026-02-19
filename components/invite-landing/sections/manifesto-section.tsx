"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const LINE_1 = "A private wine community.";
const LINE_2 = "Without middlemen and fully transparent.";
const LINE_3 = "On producers and consumers terms, only.";

const PRODUCER_LINE_1 = "A community for producers to connect directly with wine lovers.";
const PRODUCER_LINE_2 = "No middlemen. Fully transparent. You set the terms.";

const BUSINESS_LINE =
  'We represent the new generation of wine redefining the old "dirty" region of Languedoc.';

export function ManifestoSection({
  isBusinessOnly = false,
  isProducerOnly = false,
}: {
  isBusinessOnly?: boolean;
  isProducerOnly?: boolean;
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Same scroll ranges as original consumer: each line reveals in sequence
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

  const line1 = isProducerOnly ? PRODUCER_LINE_1 : LINE_1;
  const line2 = isProducerOnly ? PRODUCER_LINE_2 : LINE_2;
  const line3 = isProducerOnly ? null : LINE_3;

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] flex items-center justify-center bg-background px-6 py-32"
    >
      <div className="max-w-5xl mx-auto relative">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-sans leading-tight text-center text-foreground/10">
          {isProducerOnly ? (
            <>
              {line1}
              <br />
              {line2}
            </>
          ) : (
            <>
              {line1}
              <br />
              {line2}
              <br />
              {line3}
            </>
          )}
        </h2>

        <h2 className="absolute inset-0 text-2xl md:text-4xl lg:text-5xl font-sans leading-tight text-center text-black flex flex-col items-center justify-center gap-0">
          {isProducerOnly ? (
            <>
              <motion.span className="block" style={{ clipPath: clipPath1 }}>
                {line1}
              </motion.span>
              <motion.span className="block" style={{ clipPath: clipPath2 }}>
                {line2}
              </motion.span>
            </>
          ) : (
            <>
              <motion.span className="block" style={{ clipPath: clipPath1 }}>
                {line1}
              </motion.span>
              <motion.span className="block" style={{ clipPath: clipPath2 }}>
                {line2}
              </motion.span>
              <motion.span className="block" style={{ clipPath: clipPath3 }}>
                {line3}
              </motion.span>
            </>
          )}
        </h2>
      </div>
    </section>
  );
}
