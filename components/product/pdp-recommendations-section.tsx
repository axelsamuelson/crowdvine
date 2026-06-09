"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ProductCard } from "@/app/vin/components/product-card";
import { ProductGrid } from "@/app/vin/components/product-grid";
import type { PdpRecommendationsResult } from "@/lib/product/recommendations";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

interface PdpRecommendationsSectionProps {
  recommendations: PdpRecommendationsResult;
  className?: string;
}

export function PdpRecommendationsSection({
  recommendations,
  className,
}: PdpRecommendationsSectionProps) {
  const { t } = useTranslations();
  const reduceMotion = useReducedMotion();
  const items = recommendations.items.slice(0, 4);

  if (items.length === 0) return null;

  const header = (
    <h2 className="mb-4 text-sm font-semibold text-foreground md:mb-6">
      {t("product.pdp.recommendationsTitle")}
    </h2>
  );

  const grid = (
    <ProductGrid className="overflow-visible pt-2 xl:grid-cols-4">
      {items.map((recommendation, index) => (
        <ProductCard
          key={recommendation.product.id}
          product={recommendation.product}
          index={index}
          showMembershipTab
          recommendationReason={recommendation.reason}
        />
      ))}
    </ProductGrid>
  );

  return (
    <section
      className={cn(
        "col-span-full w-full bg-muted",
        className,
      )}
      aria-label={t("product.pdp.recommendationsTitle")}
    >
      <div className="w-full">
        {reduceMotion ? (
          <>
            <div className="px-sides">{header}</div>
            {grid}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="px-sides">{header}</div>
            {grid}
          </motion.div>
        )}
      </div>
    </section>
  );
}
