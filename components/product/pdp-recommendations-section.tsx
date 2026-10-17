"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ProductCard } from "@/app/vin/components/product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type {
  PdpRecommendation,
  PdpRecommendationsResult,
} from "@/lib/product/recommendations";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

interface PdpRecommendationsSectionProps {
  recommendations: PdpRecommendationsResult;
  className?: string;
}

const carouselArrowClassName = cn(
  "absolute top-[calc(50%+0.25rem)] z-20 h-9 w-9 rounded-full border-border/60 bg-background/90 shadow-sm backdrop-blur-sm",
  "disabled:pointer-events-none disabled:opacity-0",
);

function RecommendationCarouselRow({
  title,
  items,
}: {
  title: string;
  items: PdpRecommendation[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="px-sides text-xs font-medium uppercase tracking-[0.12em] text-foreground/70">
        {title}
      </h3>
      <Carousel
        opts={{
          align: "start",
          containScroll: "trimSnaps",
          slidesToScroll: "auto",
          dragFree: false,
        }}
        className="w-full"
        aria-label={title}
      >
        {/* pt keeps membership / reason peek-tabs inside Embla's overflow clip */}
        <CarouselContent className="-ml-0" viewportClassName="pt-6">
          {items.map((recommendation, index) => (
            <CarouselItem
              key={recommendation.product.id}
              className="basis-1/2 pl-0 md:basis-1/4"
            >
              <ProductCard
                product={recommendation.product}
                index={index}
                showMembershipTab
                recommendationReason={recommendation.reason}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          variant="outline"
          className={cn(carouselArrowClassName, "left-2")}
        />
        <CarouselNext
          variant="outline"
          className={cn(carouselArrowClassName, "right-2")}
        />
      </Carousel>
    </div>
  );
}

export function PdpRecommendationsSection({
  recommendations,
  className,
}: PdpRecommendationsSectionProps) {
  const { t } = useTranslations();
  const reduceMotion = useReducedMotion();
  const sameProducer = recommendations.sameProducer;
  const similar = recommendations.similar;

  if (sameProducer.length === 0 && similar.length === 0) return null;

  const header = (
    <h2 className="mb-4 text-sm font-semibold text-foreground md:mb-6">
      {t("product.pdp.recommendationsTitle")}
    </h2>
  );

  const rows = (
    <div className="space-y-8 md:space-y-10">
      <RecommendationCarouselRow
        title={t("product.pdp.reasonSameProducer")}
        items={sameProducer}
      />
      <RecommendationCarouselRow
        title={t("product.pdp.reasonSimilar")}
        items={similar}
      />
    </div>
  );

  return (
    <section
      className={cn("col-span-full w-full bg-muted pb-8 md:pb-10", className)}
      aria-label={t("product.pdp.recommendationsTitle")}
    >
      <div className="w-full">
        {reduceMotion ? (
          <>
            <div className="px-sides">{header}</div>
            {rows}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="px-sides">{header}</div>
            {rows}
          </motion.div>
        )}
      </div>
    </section>
  );
}
