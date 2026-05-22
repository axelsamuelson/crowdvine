"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { inviteStory } from "@/components/invite-landing/invite-story-ui";
import {
  INVITE_DEFAULT_SAVINGS_KR,
  averageSavingsKrFromProducts,
} from "@/lib/invite-landing/invite-landing-data";
import type { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

const CHAIN_NODES = [
  { key: "producent", label: "Producent" },
  { key: "negociant", label: "Négociant" },
  { key: "importor", label: "Importör" },
  { key: "distributor", label: "Distributör" },
  { key: "butik", label: "Butik" },
] as const;

const BEAM_INK = "var(--invite-ink)";

export function SavingsSection({
  products,
}: {
  products?: Product[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const producentRef = useRef<HTMLDivElement>(null);
  const negociantRef = useRef<HTMLDivElement>(null);
  const importorRef = useRef<HTMLDivElement>(null);
  const distributorRef = useRef<HTMLDivElement>(null);
  const butikRef = useRef<HTMLDivElement>(null);
  const duRef = useRef<HTMLDivElement>(null);
  const [beamsReady, setBeamsReady] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setBeamsReady(true);
  }, []);

  const savingsKr = useMemo(() => {
    const avg = averageSavingsKrFromProducts(products);
    // TODO: tie to active pallet SKUs when pallet→wine mapping exists in API
    return avg ?? INVITE_DEFAULT_SAVINGS_KR;
  }, [products]);

  return (
    <section className="border-t border-border bg-background px-6 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <div
          ref={containerRef}
          className="relative w-full min-h-[200px] md:min-h-[240px] mb-14 md:mb-16"
        >
          <div className="relative z-10 flex justify-between gap-1 sm:gap-2 px-0 sm:px-2">
            {CHAIN_NODES.map((node) => (
              <div
                key={node.key}
                className="flex flex-col items-center flex-1 min-w-0"
              >
                <div
                  ref={
                    node.key === "producent"
                      ? producentRef
                      : node.key === "negociant"
                        ? negociantRef
                        : node.key === "importor"
                          ? importorRef
                          : node.key === "distributor"
                            ? distributorRef
                            : butikRef
                  }
                  className={cn(
                    "size-9 sm:size-11 rounded-full border flex items-center justify-center shrink-0",
                    "bg-card border-border text-muted-foreground",
                  )}
                >
                  <span className="size-2 rounded-full bg-muted-foreground/50" />
                </div>
                <p className="mt-2 text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground text-center leading-tight truncate w-full">
                  {node.label}
                </p>
              </div>
            ))}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-10 flex flex-col items-center">
            <div
              ref={duRef}
              className={cn(
                "size-12 sm:size-14 rounded-full border-2 flex items-center justify-center",
                "bg-card border-border text-foreground font-sans font-medium text-sm",
              )}
            >
              Du
            </div>
          </div>

          {beamsReady && (
            <>
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={producentRef}
                toRef={negociantRef}
                pathColor={BEAM_INK}
                gradientStartColor={BEAM_INK}
                gradientStopColor={BEAM_INK}
                pathOpacity={0.15}
                pathWidth={1}
                duration={reducedMotion ? 0 : 4}
                repeat={reducedMotion ? 0 : Infinity}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={negociantRef}
                toRef={importorRef}
                pathColor={BEAM_INK}
                gradientStartColor={BEAM_INK}
                gradientStopColor={BEAM_INK}
                pathOpacity={0.15}
                pathWidth={1}
                duration={reducedMotion ? 0 : 4}
                repeat={reducedMotion ? 0 : Infinity}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={importorRef}
                toRef={distributorRef}
                pathColor={BEAM_INK}
                gradientStartColor={BEAM_INK}
                gradientStopColor={BEAM_INK}
                pathOpacity={0.15}
                pathWidth={1}
                duration={reducedMotion ? 0 : 4}
                repeat={reducedMotion ? 0 : Infinity}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={distributorRef}
                toRef={butikRef}
                pathColor={BEAM_INK}
                gradientStartColor={BEAM_INK}
                gradientStopColor={BEAM_INK}
                pathOpacity={0.15}
                pathWidth={1}
                duration={reducedMotion ? 0 : 4}
                repeat={reducedMotion ? 0 : Infinity}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={producentRef}
                toRef={duRef}
                curvature={-80}
                pathColor={BEAM_INK}
                gradientStartColor={BEAM_INK}
                gradientStopColor={BEAM_INK}
                pathOpacity={0.25}
                pathWidth={2}
                duration={reducedMotion ? 0 : 5}
                repeat={reducedMotion ? 0 : Infinity}
              />
            </>
          )}
        </div>

        <motion.div
          className="text-center"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className={inviteStory.eyebrow}>Du sparar i genomsnitt</p>
          <p className="mt-2 flex items-baseline justify-center gap-2 flex-wrap">
            <NumberTicker
              value={savingsKr}
              className="font-serif text-[clamp(4rem,14vw,6rem)] leading-none text-foreground"
            />
            <span className="font-serif text-[clamp(2rem,6vw,3rem)] text-foreground leading-none">
              kr
            </span>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            per flaska jämfört med Systembolaget
          </p>
          <p className="mt-10 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            PACT tillkommer en liten plattformsavgift och delad fraktkostnad
            — båda visas tydligt innan du bekräftar.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
