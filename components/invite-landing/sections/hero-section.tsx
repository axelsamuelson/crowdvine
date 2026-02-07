"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const FALLBACK_WINE_IMAGE = "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=800&fit=crop";

type HeroImage = { url: string; altText: string };

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<HeroImage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/crowdvine/products?limit=3&sortKey=CREATED_AT&reverse=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Array<{ featuredImage?: { url: string; altText?: string }; title?: string }> | null) => {
        if (cancelled || !Array.isArray(data)) return;
        const next = data.slice(0, 3).map((p) => ({
          url: p.featuredImage?.url?.trim() || FALLBACK_WINE_IMAGE,
          altText: p.featuredImage?.altText || p.title || "Wine",
        }));
        // Ensure we always have exactly 3 slots (fill missing with generic wine image)
        while (next.length < 3) {
          next.push({ url: FALLBACK_WINE_IMAGE, altText: "Wine" });
        }
        setImages(next);
      })
      .catch(() => {
        if (!cancelled) {
          setImages(
            Array(3).fill({ url: FALLBACK_WINE_IMAGE, altText: "Wine" }),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const rotate1 = useTransform(scrollYProgress, [0, 1], [0, -15]);
  const rotate2 = useTransform(scrollYProgress, [0, 1], [0, 0]);
  const rotate3 = useTransform(scrollYProgress, [0, 1], [0, 15]);
  const x1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const x3 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-6 py-24"
    >
      <div className="relative flex items-center justify-center">
        {!images ? (
          <>
            <div className="absolute w-[280px] md:w-[320px] aspect-[3/4] rounded-xl bg-muted/50 shadow-2xl animate-pulse" style={{ zIndex: 1 }} />
            <div className="relative w-[280px] md:w-[320px] aspect-[3/4] rounded-xl bg-muted/50 shadow-2xl animate-pulse" style={{ zIndex: 2 }} />
            <div className="absolute w-[280px] md:w-[320px] aspect-[3/4] rounded-xl bg-muted/50 shadow-2xl animate-pulse" style={{ zIndex: 1 }} />
          </>
        ) : (
          <>
            <motion.div
              className="absolute w-[280px] md:w-[320px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl"
              style={{ rotate: rotate1, x: x1, y, zIndex: 1 }}
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={{ clipPath: "inset(0 0 0 0)" }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src={images[0].url}
                alt={images[0].altText}
                className="w-full h-full object-cover"
              />
            </motion.div>

            <motion.div
              className="relative w-[280px] md:w-[320px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl"
              style={{ rotate: rotate2, y, zIndex: 2 }}
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={{ clipPath: "inset(0 0 0 0)" }}
              transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src={images[1].url}
                alt={images[1].altText}
                className="w-full h-full object-cover"
              />
            </motion.div>

            <motion.div
              className="absolute w-[280px] md:w-[320px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl"
              style={{ rotate: rotate3, x: x3, y, zIndex: 1 }}
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={{ clipPath: "inset(0 0 0 0)" }}
              transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src={images[2].url}
                alt={images[2].altText}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </>
        )}
      </div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-center text-foreground mix-blend-difference">
          You are <em className="italic">invited</em>.
        </h1>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-foreground/30 flex items-start justify-center p-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        >
          <div className="w-1 h-2 rounded-full bg-foreground/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
