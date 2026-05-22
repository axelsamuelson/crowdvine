"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Marquee } from "@/components/magicui/marquee";
import { Progress } from "@/components/ui/progress";
import { inviteStory } from "@/components/invite-landing/invite-story-ui";
import {
  mapProductsToActivity,
  PLACEHOLDER_PRODUCERS,
  type InviteActivityItem,
  type InvitePalletSnapshot,
} from "@/lib/invite-landing/invite-landing-data";
import type { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

function ActivityCard({ item }: { item: InviteActivityItem }) {
  return (
    <div
      className={cn(
        inviteStory.card,
        "min-w-[220px] sm:min-w-[260px] mx-2 shrink-0 py-4",
      )}
    >
      <p className="font-sans text-sm font-medium text-foreground leading-snug line-clamp-2">
        {item.wineName}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          reserverad
        </span>
        <span className="text-xs text-muted-foreground">{item.reservedAgo}</span>
      </div>
      <span
        className={cn(
          inviteStory.stepPill,
          "mt-3 bg-muted text-muted-foreground text-[10px]",
        )}
      >
        {item.region}
      </span>
    </div>
  );
}

function ProducerCard({ name }: { name: string }) {
  return (
    <div
      className={cn(
        inviteStory.card,
        "min-w-[180px] sm:min-w-[200px] mx-2 shrink-0 py-4 text-center",
      )}
    >
      <p className="font-serif text-base text-foreground">{name}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
        Languedoc
      </p>
    </div>
  );
}

export function PalletActivitySection({
  pallet,
  products,
  producerNames,
}: {
  pallet: InvitePalletSnapshot;
  products?: Product[];
  producerNames: string[];
}) {
  const reducedMotion = useReducedMotion();
  const activity = mapProductsToActivity(products);
  const producers =
    producerNames.length > 0 ? producerNames : PLACEHOLDER_PRODUCERS;
  const percent =
    pallet.capacity > 0
      ? Math.round((pallet.filled / pallet.capacity) * 100)
      : 0;
  const [progressValue, setProgressValue] = useState(reducedMotion ? percent : 0);

  useEffect(() => {
    if (reducedMotion) {
      setProgressValue(percent);
      return;
    }
    const t = requestAnimationFrame(() => setProgressValue(percent));
    return () => cancelAnimationFrame(t);
  }, [percent, reducedMotion]);

  return (
    <section className="border-t border-border/80 bg-background px-6 py-20 md:py-28 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-10 md:mb-12"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className={inviteStory.eyebrow}>Just nu på palletten</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl leading-tight text-foreground">
            Fler ansluter hela tiden
          </h2>
        </motion.div>

        <Marquee pauseOnHover className="[--duration:70s] mb-4">
          {activity.map((item, i) => (
            <ActivityCard key={`${item.wineName}-${i}`} item={item} />
          ))}
        </Marquee>

        <Marquee reverse pauseOnHover className="[--duration:80s] mb-12">
          {producers.map((name) => (
            <ProducerCard key={name} name={name} />
          ))}
        </Marquee>

        <div className={cn(inviteStory.card, "max-w-3xl mx-auto")}>
          <div className="flex items-baseline justify-between gap-4 mb-3 text-sm">
            <span className="font-medium text-foreground">Palletten</span>
            <span className="tabular-nums text-muted-foreground">
              {pallet.filled} / {pallet.capacity} flaskor
            </span>
          </div>
          <Progress value={progressValue} className="h-2.5" />
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            Betalning tas först när palletten är full och avgångsdatum är
            bekräftat
          </p>
        </div>
      </div>
    </section>
  );
}
