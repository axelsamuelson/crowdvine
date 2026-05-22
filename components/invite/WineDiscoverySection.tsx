"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CardBody, CardContainer, CardItem } from "@/components/ui/card-3d";
import { inviteStory } from "@/components/invite-landing/invite-story-ui";
import {
  mapProductsToFeaturedWines,
  type InviteFeaturedWine,
} from "@/lib/invite-landing/invite-landing-data";
import { formatInviteKr } from "@/lib/invite-landing/distribution-chain-pricing";
import type { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

function scrollToSignup(reducedMotion: boolean) {
  const el = document.querySelector(".invitation-section-platform");
  if (!el) return;
  el.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

function WineCard({
  wine,
  disable3d,
  reducedMotion,
}: {
  wine: InviteFeaturedWine;
  disable3d: boolean;
  reducedMotion: boolean;
}) {
  const showPrices =
    wine.producerPriceKr != null && wine.retailChainKr != null;

  return (
    <CardContainer disable3d={disable3d} className="w-full">
      <CardBody
        className={cn(
          inviteStory.card,
          "min-h-[280px] flex flex-col justify-between",
        )}
      >
        <CardItem translateZ={disable3d ? 0 : 40} disable3d={disable3d}>
          <h3 className="font-serif text-lg text-foreground leading-snug">
            {wine.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {wine.producerName}
          </p>
          <span
            className={cn(
              inviteStory.stepPill,
              "mt-3 bg-muted text-muted-foreground text-[10px]",
            )}
          >
            {wine.region}
          </span>
        </CardItem>

        <CardItem
          translateZ={disable3d ? 0 : 20}
          disable3d={disable3d}
          className="mt-6"
        >
          {showPrices ? (
            <div className="space-y-1">
              <p className="text-foreground font-sans font-semibold tabular-nums">
                {formatInviteKr(wine.producerPriceKr!)}
              </p>
              <p className="text-xs text-muted-foreground">
                vs{" "}
                <span className="line-through decoration-muted-foreground text-muted-foreground">
                  {formatInviteKr(wine.retailChainKr!)} på Systembolaget
                </span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pris visas vid reservering
            </p>
          )}
        </CardItem>

        <CardItem translateZ={disable3d ? 0 : 30} disable3d={disable3d}>
          <button
            type="button"
            className="mt-6 w-full text-sm font-medium text-foreground hover:text-muted-foreground transition-colors text-left"
            onClick={() => scrollToSignup(reducedMotion)}
          >
            Reservera →
          </button>
        </CardItem>
      </CardBody>
    </CardContainer>
  );
}

export function WineDiscoverySection({
  products,
}: {
  products?: Product[];
}) {
  const reducedMotion = useReducedMotion();
  const wines = mapProductsToFeaturedWines(products, 3);
  const [disable3d, setDisable3d] = useState(true);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 639px)");
    const update = () => setDisable3d(narrow.matches);
    update();
    narrow.addEventListener("change", update);
    return () => narrow.removeEventListener("change", update);
  }, []);

  const motionDisabled = reducedMotion || disable3d;

  return (
    <section className="border-t border-border/80 bg-background px-6 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12 md:mb-14"
          initial={motionDisabled ? false : { opacity: 0, y: 16 }}
          whileInView={motionDisabled ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className={inviteStory.eyebrow}>På den här palletten</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl leading-tight text-foreground">
            Viner valda direkt vid <em className="italic">källan</em>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          {wines.map((wine) => (
            <WineCard
              key={wine.id}
              wine={wine}
              disable3d={motionDisabled}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
